import { createClient } from '../../../lib/supabase/server';
import BulletinsClient from './BulletinsClient';

export const dynamic = 'force-dynamic';

export default async function BulletinsPage() {
  const supabase = createClient();
  const { data: imports } = await supabase
    .from('bulletin_imports')
    .select('id, title, effective_date, status, page_count, approved_count, created_at')
    .order('created_at', { ascending: false });
  return <BulletinsClient imports={imports || []} />;
}
