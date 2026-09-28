// يولّد supabase/003_seed_catalog.sql من ملفات الكود (مصدر واحد للتصنيفات والمنتجات التجريبية)
// التشغيل: npm run seed:generate
import { writeFileSync } from 'node:fs';
import { CATEGORIES } from '../lib/estimation/categories.js';
import { SAMPLE_PRODUCTS } from '../lib/estimation/sample-products.js';
import { BULLETIN, bulletinProducts, bulletinBenchmarks } from '../lib/estimation/bulletins/2026-06.js';

const q = v => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

// uuid ثابت لكل منتج تجريبي عشان إعادة تشغيل الملف تحدّث نفس الصفوف
export const sampleUuid = id => `00000000-0000-4000-8000-${id.replace(/\D/g, '').padStart(12, '0')}`;
const bulletinUuid = id => `00000000-0000-4000-9${id.replace(/\D/g, '').slice(0, 3)}-${id.replace(/\D/g, '').slice(3).padStart(12, '0')}`;

const out = [];
out.push('-- ==========================================================');
out.push('-- ملف مولّد تلقائياً من lib/estimation — متعدّلوش بإيدك، عدّل الكود وشغّل npm run seed:generate');
out.push('-- المنتجات هنا تجريبية (is_sample = true) وأسعارها تقديرية للتجربة فقط');
out.push('-- ==========================================================');
out.push('begin;');
out.push('');
out.push('insert into product_categories (code, group_code, title, kind, unit, measure_unit, default_waste_pct) values');
out.push(CATEGORIES.map(c => `  (${[c.code, c.group, c.title, c.kind, c.unit, c.measure_unit, c.default_waste_pct].map(q).join(', ')})`).join(',\n'));
out.push('on conflict (code) do update set group_code = excluded.group_code, title = excluded.title, kind = excluded.kind,');
out.push('  unit = excluded.unit, measure_unit = excluded.measure_unit, default_waste_pct = excluded.default_waste_pct;');
out.push('');
out.push('insert into products (id, owner_id, category_code, brand, model, name, unit, coverage, sold_by_pack, is_default, is_sample, active) values');
out.push(SAMPLE_PRODUCTS.map(p => `  (${[sampleUuid(p.id)].map(q).join()}, null, ${[p.category_code, p.brand, p.model, p.name, p.unit, p.coverage, p.sold_by_pack, p.is_default, true, true].map(q).join(', ')})`).join(',\n'));
out.push('on conflict (id) do update set category_code = excluded.category_code, brand = excluded.brand, model = excluded.model, name = excluded.name,');
// is_default مش بيتحدّث عند إعادة التشغيل — النشرة/الشركة ممكن تكون ألغت الافتراضي التجريبي
out.push('  unit = excluded.unit, coverage = excluded.coverage, sold_by_pack = excluded.sold_by_pack;');
out.push('');
out.push('-- الأسعار التجريبية (بتاريخ ثابت عشان أي سعر حقيقي يتضاف بعد كده ياخد الأولوية)');
out.push("delete from product_prices where owner_id is null and product_id in (select id from products where is_sample and owner_id is null);");
out.push('insert into product_prices (owner_id, product_id, price, effective_date, approved) values');
out.push(SAMPLE_PRODUCTS.map(p => `  (null, ${q(sampleUuid(p.id))}, ${p.price}, '2026-01-01', true)`).join(',\n') + ';');
out.push('');
out.push('commit;');

writeFileSync(new URL('../supabase/003_seed_catalog.sql', import.meta.url), out.join('\n') + '\n');
console.log(`✓ ${CATEGORIES.length} تصنيف، ${SAMPLE_PRODUCTS.length} منتج تجريبي → supabase/003_seed_catalog.sql`);

// ---------- نشرة الأسعار ----------
const bp = bulletinProducts();
const bb = bulletinBenchmarks();
const src = BULLETIN.id;
const b = [];
b.push('-- ==========================================================');
b.push(`-- ${BULLETIN.title} — ملف مولّد تلقائياً من lib/estimation/bulletins`);
b.push(`-- ${BULLETIN.source_note}`);
b.push('-- الأسعار غير شاملة ضريبة القيمة المضافة');
b.push('-- ==========================================================');
b.push('begin;');
const defCats = [...new Set(bp.filter(p => p.is_default).map(p => p.category_code))];
b.push('-- المنتج التجريبي ما يفضلش افتراضي في التصنيفات اللي ليها سعر من النشرة');
b.push(`update products set is_default = false where owner_id is null and is_sample and category_code in (${defCats.map(q).join(', ')});`);
b.push('insert into products (id, owner_id, category_code, brand, model, name, unit, coverage, sold_by_pack, is_default, is_sample, active, specs) values');
b.push(bp.map(p => `  (${[bulletinUuid(p.id)].map(q).join()}, null, ${[p.category_code, p.brand, p.model, p.name, p.unit, p.coverage, p.sold_by_pack, p.is_default, false, true, JSON.stringify(p.specs)].map(q).join(', ')})`).join(',\n'));
b.push('on conflict (id) do update set category_code = excluded.category_code, brand = excluded.brand, model = excluded.model, name = excluded.name,');
b.push('  unit = excluded.unit, is_default = excluded.is_default, specs = excluded.specs;');
b.push(`delete from product_prices where owner_id is null and source = ${q(src)};`);
b.push('insert into product_prices (owner_id, product_id, price, effective_date, approved, source) values');
b.push(bp.map(p => `  (null, ${q(bulletinUuid(p.id))}, ${p.price}, ${q(BULLETIN.effective_date)}, true, ${q(src)})`).join(',\n') + ';');
b.push('insert into price_benchmarks (code, title, unit, region, price, effective_date, source, page, selectors) values');
b.push(bb.map(x => `  (${[x.code, x.title, x.unit, x.region, x.price, BULLETIN.effective_date, src, x.page, JSON.stringify(x.selectors)].map(q).join(', ')})`).join(',\n'));
b.push('on conflict (code, region, source) do update set price = excluded.price, title = excluded.title, selectors = excluded.selectors, page = excluded.page;');
b.push('commit;');
writeFileSync(new URL('../supabase/005_seed_bulletin_2026_06.sql', import.meta.url), b.join('\n') + '\n');
console.log(`✓ ${bp.length} منتج + ${bb.length} سعر مرجعي من النشرة → supabase/005_seed_bulletin_2026_06.sql`);
