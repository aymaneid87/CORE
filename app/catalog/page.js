import { createClient } from '../../lib/supabase/server';
import { loadCatalog } from '../../lib/estimation/load-catalog';
import CatalogClient from './CatalogClient';

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [catalog, { data: suppliers }] = await Promise.all([
    loadCatalog(supabase),
    supabase.from('suppliers').select('id, name').order('name'),
  ]);
  return <CatalogClient initialCatalog={catalog} suppliers={suppliers || []} userId={user?.id} />;
}
