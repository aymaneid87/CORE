-- شغّل الملف ده مرة واحدة في Supabase -> SQL Editor -> Run
-- بيسرّع تحميل صفحة المشاريع وصفحة المشروع (خصوصاً مع زيادة عدد المعاملات)
create index if not exists projects_owner_created_idx on projects (owner_id, created_at desc);
create index if not exists transactions_project_created_idx on transactions (project_id, created_at);
