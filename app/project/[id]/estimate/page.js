import { notFound } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { loadCatalog, loadBenchmarks } from '../../../../lib/estimation/load-catalog';
import EstimateClient from './EstimateClient';

export const dynamic = 'force-dynamic';

export default async function EstimatePage({ params }) {
  const supabase = createClient();
  const { data: project } = await supabase.from('projects').select('id, name').eq('id', params.id).single();
  if (!project) notFound();

  let { data: estimate } = await supabase
    .from('estimates')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!estimate) {
    const { data, error } = await supabase
      .from('estimates')
      .insert({ project_id: project.id, title: `مقايسة ${project.name}` })
      .select()
      .single();
    if (error) throw new Error(error.message);
    estimate = data;
  }

  const [catalog, benchmarks, { data: versions }] = await Promise.all([
    loadCatalog(supabase),
    loadBenchmarks(supabase),
    supabase.from('estimate_versions').select('id, version, totals, created_at').eq('estimate_id', estimate.id).order('version', { ascending: false }),
  ]);

  return <EstimateClient project={project} initialEstimate={estimate} catalog={catalog} benchmarks={benchmarks} initialVersions={versions || []} />;
}
