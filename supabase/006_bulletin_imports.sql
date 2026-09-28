-- ==========================================================
-- استيراد نشرات الأسعار: مسودة ← مراجعة ← اعتماد (عملية واحدة)
-- شغّله بعد 005_seed_bulletin_2026_06.sql
-- ==========================================================

create table if not exists bulletin_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  title text not null,
  effective_date date not null,
  file_name text,
  page_count int,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  rows jsonb not null default '[]'::jsonb, -- السطور المستخرجة + قرار كل سطر
  approved_count int,
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- المطابقات اللي المستخدم أكّدها: النشرة الجاية بتتصنّف تلقائي
create table if not exists bulletin_mappings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  item_key text not null,
  name_key text,
  unit text not null,
  use text not null check (use in ('product', 'benchmark', 'ignore')),
  category_code text references product_categories(code),
  benchmark_code text,
  label text,
  is_default boolean not null default false,
  updated_at timestamptz default now(),
  unique (owner_id, item_key, unit)
);

-- الأسعار المرجعية: العامة (owner null) + الخاصة بكل شركة من نشراتها
-- (القيد الفريد (code, region, source) من 004 كفاية: مصدر كل نشرة مستوردة = 'import:<id>')
alter table price_benchmarks add column if not exists owner_id uuid references auth.users(id);

alter table bulletin_imports enable row level security;
alter table bulletin_mappings enable row level security;

drop policy if exists "نشرات الشركة" on bulletin_imports;
create policy "نشرات الشركة" on bulletin_imports for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "مطابقات الشركة" on bulletin_mappings;
create policy "مطابقات الشركة" on bulletin_mappings for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "الأسعار المرجعية للقراءة" on price_benchmarks;
create policy "الأسعار المرجعية للقراءة" on price_benchmarks for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
drop policy if exists "إضافة أسعار مرجعية" on price_benchmarks;
create policy "إضافة أسعار مرجعية" on price_benchmarks for insert with check (owner_id = auth.uid());

-- ----------------------------------------------------------
-- اعتماد النشرة: كل السطور تتسجّل أو ولا سطر (transaction واحدة)
-- الدالة بتعيد التحقق من كل حاجة بنفسها ومش بتثق في المتصفح:
-- السعر > 0، التصنيف موجود، والوحدة مطابقة لوحدة حصر التصنيف.
-- ----------------------------------------------------------
create or replace function approve_bulletin_import(import_id uuid) returns int
language plpgsql security invoker set search_path = public as $$
declare
  imp bulletin_imports;
  r record;
  mu text;
  pid uuid;
  n int := 0;
  region_title text;
  src text := 'import:' || import_id;
begin
  select * into imp from bulletin_imports
    where id = import_id and owner_id = auth.uid() and status = 'draft' for update;
  if not found then raise exception 'النشرة غير موجودة أو معتمدة بالفعل'; end if;

  for r in
    select * from jsonb_to_recordset(imp.rows) as x(
      key text, name_key text, product_key text, name text, section text, unit text, price numeric, region text, page int,
      decision jsonb, reviewed boolean, flags jsonb
    )
  loop
    -- حفظ المطابقة (حتى التجاهل) عشان النشرة الجاية
    insert into bulletin_mappings (owner_id, item_key, name_key, unit, use, category_code, benchmark_code, label, is_default)
    values (auth.uid(), r.key, r.decision->>'name_key', r.unit, r.decision->>'use',
            nullif(r.decision->>'category', ''), nullif(r.decision->>'benchmark', ''), nullif(r.decision->>'label', ''),
            coalesce((r.decision->>'is_default')::boolean, false))
    on conflict (owner_id, item_key, unit) do update set
      name_key = excluded.name_key, use = excluded.use, category_code = excluded.category_code,
      benchmark_code = excluded.benchmark_code, label = excluded.label, is_default = excluded.is_default, updated_at = now();

    continue when r.decision->>'use' = 'ignore';

    if r.price is null or r.price <= 0 then
      raise exception 'سعر غير صالح: «%» (ص %)', r.name, r.page;
    end if;
    if (r.flags ? 'pass_mismatch' or r.flags ? 'unreadable') and not coalesce(r.reviewed, false) then
      raise exception 'البند «%» (ص %) محتاج مراجعة وتأكيد قبل الاعتماد', r.name, r.page;
    end if;

    region_title := case r.region when 'cairo' then 'القاهرة الكبرى'
                                  when 'upper' then 'الصعيد والبحر الأحمر وجنوب سيناء' end;

    if r.decision->>'use' = 'product' then
      select measure_unit into mu from product_categories where code = r.decision->>'category';
      if not found then raise exception 'تصنيف غير معروف للبند «%»', r.name; end if;
      if mu <> r.unit then
        raise exception 'وحدة البند «%» (%) لا تطابق وحدة التصنيف (%)', r.name, r.unit, mu;
      end if;

      select id into pid from products
        where owner_id = auth.uid() and specs->>'bulletin_key' = r.product_key
          and coalesce(specs->>'region', '') = coalesce(r.region, '');

      if coalesce((r.decision->>'is_default')::boolean, false) then
        update products set is_default = false
          where owner_id = auth.uid() and category_code = r.decision->>'category'
            and coalesce(specs->>'region', '') = coalesce(r.region, '')
            and is_default and id is distinct from pid;
      end if;

      if pid is null then
        insert into products (owner_id, category_code, brand, model, name, unit, coverage, sold_by_pack, is_default, is_sample, specs)
        values (auth.uid(), r.decision->>'category', 'نشرة الأسعار', region_title,
                coalesce(nullif(r.decision->>'label', ''), r.name), r.unit, 1, false,
                coalesce((r.decision->>'is_default')::boolean, false), false,
                jsonb_build_object('bulletin_key', r.product_key, 'region', r.region, 'source', src,
                                   'page', r.page, 'source_name', r.name, 'section', r.section))
        returning id into pid;
      else
        update products set
          category_code = r.decision->>'category',
          name = coalesce(nullif(r.decision->>'label', ''), r.name),
          is_default = coalesce((r.decision->>'is_default')::boolean, false),
          active = true,
          specs = specs || jsonb_build_object('source', src, 'page', r.page, 'source_name', r.name, 'section', r.section)
        where id = pid;
      end if;

      insert into product_prices (owner_id, product_id, price, effective_date, approved, source)
      values (auth.uid(), pid, r.price, imp.effective_date, true, src);
    else
      if r.decision->>'benchmark' is null or r.decision->'benchmark_def' is null then
        raise exception 'سعر مرجعي غير محدد للبند «%»', r.name;
      end if;
      if r.unit <> r.decision->'benchmark_def'->>'unit' then
        raise exception 'وحدة البند «%» لا تطابق السعر المرجعي', r.name;
      end if;
      insert into price_benchmarks (owner_id, code, title, unit, region, price, effective_date, source, page, selectors)
      values (auth.uid(), r.decision->>'benchmark', r.decision->'benchmark_def'->>'title', r.unit, r.region,
              r.price, imp.effective_date, src, r.page, r.decision->'benchmark_def'->'selectors');
    end if;
    n := n + 1;
  end loop;

  update bulletin_imports set status = 'approved', approved_at = now(), approved_count = n where id = import_id;
  return n;
end $$;
revoke all on function approve_bulletin_import(uuid) from public;
grant execute on function approve_bulletin_import(uuid) to authenticated;
