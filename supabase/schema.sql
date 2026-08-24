-- ==========================================================
-- سكيما قاعدة البيانات الأساسية
-- انسخ الملف ده كامل، وحطه في Supabase -> SQL Editor -> Run
-- ==========================================================

-- جدول المشاريع
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
  name text not null,
  status text not null default 'قيد التنفيذ',
  stage int not null default 1,
  total_stages int not null default 6,
  fees_pct numeric not null default 10,
  created_at timestamptz default now()
);

-- جدول المعاملات المالية (مصاريف ودفعات)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  item text not null,
  amount numeric not null, -- موجب = دفعة داخلة / سالب = مصروف
  category text,
  created_at timestamptz default now()
);

-- تفعيل حماية الصفوف (كل مستخدم يشوف بياناته بس)
alter table projects enable row level security;
alter table transactions enable row level security;

create policy "المستخدم يشوف مشاريعه بس"
  on projects for select using (auth.uid() = owner_id);
create policy "المستخدم يضيف مشاريعه بس"
  on projects for insert with check (auth.uid() = owner_id);
create policy "المستخدم يعدّل مشاريعه بس"
  on projects for update using (auth.uid() = owner_id);
create policy "المستخدم يحذف مشاريعه بس"
  on projects for delete using (auth.uid() = owner_id);

create policy "المستخدم يشوف معاملات مشاريعه بس"
  on transactions for select using (
    exists (select 1 from projects where projects.id = transactions.project_id and projects.owner_id = auth.uid())
  );
create policy "المستخدم يضيف معاملات لمشاريعه بس"
  on transactions for insert with check (
    exists (select 1 from projects where projects.id = transactions.project_id and projects.owner_id = auth.uid())
  );
