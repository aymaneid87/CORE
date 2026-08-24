import { createClient } from '../../lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from('projects')
    .select('*, transactions(*)')
    .order('created_at', { ascending: false });

  return <DashboardClient initialProjects={projects || []} userEmail={user?.email} />;
}
