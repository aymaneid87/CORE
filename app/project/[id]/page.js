import { createClient } from '../../../lib/supabase/server';
import ProjectClient from './ProjectClient';
import { notFound } from 'next/navigation';

export default async function ProjectPage({ params }) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, fees_pct, transactions(id, item, amount, created_at)')
    .eq('id', params.id)
    .order('created_at', { referencedTable: 'transactions', ascending: true })
    .single();

  if (!project) notFound();

  return <ProjectClient project={project} />;
}
