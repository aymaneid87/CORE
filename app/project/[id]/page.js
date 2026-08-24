import { createClient } from '../../../lib/supabase/server';
import ProjectClient from './ProjectClient';
import { notFound } from 'next/navigation';

export default async function ProjectPage({ params }) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('*, transactions(*)')
    .eq('id', params.id)
    .single();

  if (!project) notFound();

  return <ProjectClient project={project} />;
}
