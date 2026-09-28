import { notFound } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { loadCatalog } from '../../../../lib/estimation/load-catalog';
import ImportClient from './ImportClient';

export const dynamic = 'force-dynamic';

export default async function ImportPage({ params }) {
  const supabase = createClient();
  const { data: imp } = await supabase.from('bulletin_imports').select('*').eq('id', params.id).single();
  if (!imp) notFound();
  const [catalog, { data: mappings }] = await Promise.all([
    loadCatalog(supabase),
    supabase.from('bulletin_mappings').select('item_key, name_key, unit, use, category_code, benchmark_code, label, is_default'),
  ]);
  return <ImportClient initialImport={imp} catalog={catalog} userMappings={mappings || []} />;
}
