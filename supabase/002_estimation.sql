-- ==========================================================
-- سكيما المقايسات + كتالوج الخامات والأسعار
-- شغّله بعد schema.sql في Supabase -> SQL Editor -> Run
-- وبعده شغّل 003_seed_catalog.sql (بيتولّد بـ: npm run seed:generate)
-- ==========================================================

-- ---------- تصنيفات الخامات (مرجعية، مشتركة للكل) ----------
create table if not exists product_categories (
  code text primary key,
  group_code text not null,
  title text not null,
  kind text not null check (kind in ('material', 'fixture', 'labor', 'rough')),
  unit text not null,
  measure_unit text not null,
  default_waste_pct numeric not null default 0 check (default_waste_pct >= 0 and default_waste_pct < 100)
);

-- ---------- الموردين ----------
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  name text not null,
  phone text,
  notes text,
  created_at timestamptz default now()
);

-- ---------- المنتجات (شركة + موديل) ----------
-- owner_id = null → منتج عام (بيانات تجريبية مشتركة)، غير كده منتج خاص بالشركة
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) default auth.uid(),
  category_code text references product_categories(code) not null,
  brand text not null,
  model text,
  name text not null,
  unit text not null,
  coverage numeric not null default 1 check (coverage > 0), -- كمية الحصر اللي بتغطيها وحدة التسعير (للوش الواحد)
  sold_by_pack boolean not null default false,               -- بيتباع بعبوات كاملة
  is_default boolean not null default false,
  is_sample boolean not null default false,
  active boolean not null default true,
  specs jsonb not null default '{}'::jsonb,
  image_url text,
  created_at timestamptz default now()
);
create index if not exists products_category_idx on products (category_code) where active;
-- منتج افتراضي واحد بس لكل تصنيف لكل شركة
create unique index if not exists products_one_default_idx
  on products (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), category_code) where is_default and active;

-- ---------- قوائم أسعار الموردين ----------
create table if not exists price_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null default auth.uid(),
  supplier_id uuid references suppliers(id) on delete set null,
  title text not null,
  effective_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  notes text,
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- ---------- الأسعار (تاريخ كامل — مفيش تعديل على سعر قديم، كل تحديث = صف جديد) ----------
create table if not exists product_prices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) default auth.uid(),
  product_id uuid references products(id) on delete cascade not null,
  price_list_id uuid references price_lists(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  price numeric(14, 2) not null check (price >= 0),
  effective_date date not null default current_date,
  approved boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists product_prices_lookup_idx on product_prices (product_id, effective_date desc, created_at desc) where approved;

-- آخر سعر معتمد لكل منتج (لكل مستخدم: أسعاره الخاصة ليها أولوية على الأسعار العامة)
create or replace view current_prices with (security_invoker = true) as
select distinct on (pp.product_id)
  pp.product_id, pp.price, pp.effective_date, pp.supplier_id, pp.price_list_id
from product_prices pp
where pp.approved and pp.effective_date <= current_date
order by pp.product_id, (pp.owner_id is null), pp.effective_date desc, pp.created_at desc;

-- اعتماد قائمة أسعار: كل أسعارها تبقى معتمدة مرة واحدة
-- security definer لأن المستخدم مش مسموح له يعدّل الأسعار مباشرة — الدالة بتتحقق من الملكية بنفسها
create or replace function approve_price_list(list_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update price_lists set status = 'approved', approved_at = now()
    where id = list_id and owner_id = auth.uid() and status = 'draft';
  if not found then raise exception 'قائمة الأسعار غير موجودة أو معتمدة بالفعل'; end if;
  update product_prices set approved = true where price_list_id = list_id and owner_id = auth.uid();
end $$;
revoke all on function approve_price_list(uuid) from public;
grant execute on function approve_price_list(uuid) to authenticated;

-- ---------- المقايسات ----------
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  owner_id uuid references auth.users(id) not null default auth.uid(),
  title text not null default 'مقايسة تشطيب',
  unit_type text not null default 'apartment',
  status text not null default 'draft' check (status in ('draft', 'final')),
  spaces jsonb not null default '[]'::jsonb,      -- الفراغات بالأبعاد والفتحات
  selections jsonb not null default '{}'::jsonb,  -- اختيارات التشطيب لكل فراغ
  settings jsonb not null default '{"overheadPct":0,"profitPct":15,"vatPct":0}'::jsonb,
  totals jsonb,                                   -- آخر إجماليات محسوبة (للعرض السريع في اللوحة)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists estimates_project_idx on estimates (project_id);

-- نسخ معتمدة من المقايسة: الأسعار والكميات بتتجمّد وقت الاعتماد
create table if not exists estimate_versions (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade not null,
  version int not null,
  lines jsonb not null,
  purchase jsonb not null,
  totals jsonb not null,
  input jsonb not null, -- spaces + selections + settings وقت الاعتماد
  created_at timestamptz default now(),
  unique (estimate_id, version)
);

-- ---------- حماية الصفوف ----------
alter table product_categories enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table price_lists enable row level security;
alter table product_prices enable row level security;
alter table estimates enable row level security;
alter table estimate_versions enable row level security;

drop policy if exists "التصنيفات للقراءة" on product_categories;
create policy "التصنيفات للقراءة" on product_categories for select to authenticated using (true);

drop policy if exists "موردين الشركة" on suppliers;
create policy "موردين الشركة" on suppliers for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "قراءة المنتجات العامة والخاصة" on products;
create policy "قراءة المنتجات العامة والخاصة" on products for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
drop policy if exists "إضافة منتجات خاصة" on products;
create policy "إضافة منتجات خاصة" on products for insert with check (owner_id = auth.uid());
drop policy if exists "تعديل منتجات خاصة" on products;
create policy "تعديل منتجات خاصة" on products for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "حذف منتجات خاصة" on products;
create policy "حذف منتجات خاصة" on products for delete using (owner_id = auth.uid());

drop policy if exists "قوائم أسعار الشركة" on price_lists;
create policy "قوائم أسعار الشركة" on price_lists for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "قراءة الأسعار" on product_prices;
create policy "قراءة الأسعار" on product_prices for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
drop policy if exists "إضافة أسعار" on product_prices;
create policy "إضافة أسعار" on product_prices for insert with check (
  owner_id = auth.uid()
  and exists (select 1 from products p where p.id = product_id and (p.owner_id is null or p.owner_id = auth.uid()))
  and (price_list_id is null or exists (select 1 from price_lists l where l.id = price_list_id and l.owner_id = auth.uid() and l.status = 'draft'))
);
-- الأسعار مش بتتعدّل بعد الاعتماد (عشان التاريخ يفضل سليم) — المسموح حذف سعر في قائمة لسه مسودة
drop policy if exists "حذف أسعار المسودة" on product_prices;
create policy "حذف أسعار المسودة" on product_prices for delete using (owner_id = auth.uid() and not approved);

drop policy if exists "مقايسات مشاريعي" on estimates;
create policy "مقايسات مشاريعي" on estimates for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from projects where projects.id = project_id and projects.owner_id = auth.uid()));

drop policy if exists "نسخ مقايساتي" on estimate_versions;
create policy "نسخ مقايساتي" on estimate_versions for select
  using (exists (select 1 from estimates e where e.id = estimate_id and e.owner_id = auth.uid()));
drop policy if exists "اعتماد نسخة" on estimate_versions;
create policy "اعتماد نسخة" on estimate_versions for insert
  with check (exists (select 1 from estimates e where e.id = estimate_id and e.owner_id = auth.uid()));

-- تحديث updated_at تلقائي
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists estimates_touch on estimates;
create trigger estimates_touch before update on estimates for each row execute function touch_updated_at();
