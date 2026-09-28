import { createClient } from '../../lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();

  // الطلبين بيشتغلوا مع بعض بدل ما واحد يستنى التاني،
  // ومن المعاملات بنجيب المبلغ بس (مش كل الأعمدة) عشان الصفحة تبقى أخف
  const [{ data: { user } }, { data: projects }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('projects')
      .select('id, name, fees_pct, created_at, transactions(amount)')
      .order('created_at', { ascending: false }),
  ]);

  return <DashboardClient initialProjects={projects || []} userEmail={user?.email} />;
}
