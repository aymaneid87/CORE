import test from 'node:test';
import assert from 'node:assert/strict';
import { BULLETIN_ITEMS, bulletinProducts, bulletinBenchmarks } from '../lib/estimation/bulletins/2026-06.js';
import { CATEGORY_BY_CODE } from '../lib/estimation/categories.js';
import { SAMPLE_PRODUCTS } from '../lib/estimation/sample-products.js';
import { computeEstimate, indexCatalog, defaultProductFor } from '../lib/estimation/engine.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`);

test('بيانات النشرة: كل سطر له صفحة وسعر موجب وتصنيف معروف، وافتراضي واحد لكل تصنيف ومنطقة', () => {
  for (const i of BULLETIN_ITEMS) {
    assert.ok(i.page >= 1 && i.page <= 13, i.name);
    assert.ok(i.price > 0, i.name);
    if (i.use === 'product') assert.ok(CATEGORY_BY_CODE[i.category], i.category);
    // الوحدة لازم تطابق وحدة الحصر للتصنيف عشان المقارنة تبقى صح
    if (i.use === 'product') assert.equal(i.unit.replace('م2', 'م²'), CATEGORY_BY_CODE[i.category].measure_unit, i.name);
  }
  const keys = bulletinProducts().filter(p => p.is_default).map(p => `${p.category_code}|${p.specs.region}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(new Set(bulletinProducts().map(p => p.id)).size, bulletinProducts().length);
});

test('المنتج الافتراضي حسب المنطقة: النشرة أولى من التجريبي، ومصنعية الرخام الشاملة للوزرة مش افتراضية', () => {
  const cat = indexCatalog([...SAMPLE_PRODUCTS, ...bulletinProducts()]);
  assert.equal(defaultProductFor(cat, 'labor_floor_tiling', 'cairo').price, 130);
  assert.equal(defaultProductFor(cat, 'labor_floor_tiling', 'upper').price, 150);
  assert.equal(defaultProductFor(cat, 'labor_porcelain_tiling', 'cairo').price, 150);
  assert.equal(defaultProductFor(cat, 'tile_ceramic_floor', 'upper').price, 150, 'بدون منطقة → ينفع للكل');
  assert.equal(defaultProductFor(cat, 'hdf_floor', 'cairo').price, 550);
  assert.ok(defaultProductFor(cat, 'labor_marble', 'cairo').is_sample, 'الشاملة للوزرة مش افتراضية');
});

test('مقارنة الدهان بسعر النشرة: تكلفة المتر = مجموع سطور المنظومة ÷ مسطح الحوائط', () => {
  const P = (id, category_code, price, coverage) => ({ id, category_code, brand: 'X', name: id, unit: 'u', coverage, price, sold_by_pack: false, is_default: true });
  const products = [P('pu', 'paint_putty', 300, 30), P('se', 'paint_sealer', 450, 90), P('tc', 'paint_topcoat', 800, 80), P('lb', 'labor_paint', 60, 1)];
  const room = { id: 'r', name: 'نوم', type: 'bedroom', length: 5, width: 4, height: 3 };
  const r = computeEstimate({
    spaces: [room],
    selections: { r: { wall_finish: { groups: { wall_type: 'paint' }, params: { topcoats: 2 } } } },
    settings: { region: 'cairo' },
  }, products, { benchmarks: bulletinBenchmarks() });
  const b = r.benchmarks.find(x => x.code === 'interior_plastic_paint');
  assert.equal(b.price, 180, 'مرجع القاهرة');
  // لكل م²: معجون 2×1.05×300/30 + سيلر 1.05×450/90 + بلاستيك 2×1.05×800/80 + مصنعية 60
  const perM2 = 2 * 1.05 * 10 + 1.05 * 5 + 2 * 1.05 * 10 + 60;
  close(b.actual, perM2, 'تكلفة المتر');
  close(b.qty, 54, 'مسطح الحوائط');
  close(b.deviationPct, (perM2 / 180 - 1) * 100, 'الانحراف');
  assert.equal(b.withinTolerance, false, '107 مقابل 180 = أقل بـ 40%');
  assert.ok(r.issues.some(i => i.message.includes('أقل من المرجع')));

  // مصنعية 130 → 177.25 للمتر: جوّه حدود المرجع
  const r1 = computeEstimate({ spaces: [room], selections: { r: { wall_finish: { groups: { wall_type: 'paint' } } } }, settings: { region: 'cairo' } },
    products.map(p => (p.id === 'lb' ? { ...p, price: 130 } : p)), { benchmarks: bulletinBenchmarks() });
  close(r1.benchmarks[0].actual, perM2 + 70, 'تكلفة المتر');
  assert.equal(r1.benchmarks[0].withinTolerance, true);

  const r2 = computeEstimate({ spaces: [room], selections: { r: { wall_finish: { groups: { wall_type: 'paint' } } } }, settings: { region: 'upper' } },
    products.map(p => (p.id === 'lb' ? { ...p, price: 250 } : p)), { benchmarks: bulletinBenchmarks() });
  const b2 = r2.benchmarks[0];
  assert.equal(b2.price, 200, 'مرجع الصعيد');
  assert.equal(b2.withinTolerance, false);
  assert.ok(r2.issues.some(i => i.level === 'warning' && i.message.includes('أعلى من المرجع')));
});
