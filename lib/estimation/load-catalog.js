import { mergeCatalog } from './catalog.js';

// Supabase بيرجّع 1000 صف كحد أقصى في الطلب الواحد — بنجيب على صفحات عشان الكتالوج ما يتقصّش
async function fetchAll(query) {
  const PAGE = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) return rows;
    from += PAGE;
  }
}

export async function loadCatalog(supabase) {
  const [products, prices] = await Promise.all([
    fetchAll(() => supabase.from('products').select('*').eq('active', true).order('category_code').order('id')),
    fetchAll(() => supabase.from('current_prices').select('*').order('product_id')),
  ]);
  return mergeCatalog(products, prices);
}
