-- ==========================================================
-- مصادر الأسعار: نشرات الأسعار + المنطقة الجغرافية + الأسعار المرجعية للبنود المركّبة
-- شغّله بعد 003_seed_catalog.sql، وبعده 005_seed_bulletin_2026_06.sql
-- ==========================================================

-- المنتج الافتراضي بقى واحد لكل (شركة، تصنيف، منطقة) — مصنعية القاهرة غير الصعيد
drop index if exists products_one_default_idx;
create unique index if not exists products_one_default_region_idx
  on products (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), category_code, coalesce(specs->>'region', ''))
  where is_default and active;

-- مصدر كل سعر (نشرة / قائمة مورد / إدخال يدوي)
alter table product_prices add column if not exists source text;

-- أسعار مرجعية لبنود مركّبة (زي "توريد وعمل دهانات بلاستيك") للمقارنة بتكلفة المقايسة
create table if not exists price_benchmarks (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  unit text not null,
  region text,
  price numeric(14, 2) not null check (price > 0),
  effective_date date not null,
  source text not null,
  page int,
  selectors jsonb not null,
  unique nulls not distinct (code, region, source)
);
alter table price_benchmarks enable row level security;
drop policy if exists "الأسعار المرجعية للقراءة" on price_benchmarks;
create policy "الأسعار المرجعية للقراءة" on price_benchmarks for select to authenticated using (true);
