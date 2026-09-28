import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEstimate, resolveSelection, defaultSpaceSelections, defaultSelection, ceilUnits, round2,
} from '../lib/estimation/engine.js';
import { TEMPLATE_BY_CODE, TEMPLATES } from '../lib/estimation/templates.js';
import { CATEGORY_BY_CODE } from '../lib/estimation/categories.js';
import { SAMPLE_PRODUCTS } from '../lib/estimation/sample-products.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`);

const bedroom = {
  id: 'b1', name: 'نوم 1', type: 'bedroom', length: 4, width: 3, height: 3,
  openings: [
    { type: 'door', width: 0.9, height: 2.2 },
    { type: 'window', width: 1.2, height: 1.2, sill: 1.0 },
  ],
};
const bath = { id: 'w1', name: 'حمام رئيسي', type: 'bathroom', length: 2.5, width: 2, height: 3, openings: [{ type: 'door', width: 0.8, height: 2.2 }] };

const P = (id, category_code, price, extra = {}) => ({ id, category_code, brand: 'X', name: id, unit: 'عدد', coverage: 1, price, sold_by_pack: false, is_default: true, ...extra });

test('منظومة الدهان: معجون وشين + سيلر + أوجه نهائية + مصنعية — بالهالك والتقريب للبستلة', () => {
  const products = [
    P('putty', 'paint_putty', 420, { coverage: 30, sold_by_pack: true }),
    P('sealer', 'paint_sealer', 520, { coverage: 90, sold_by_pack: true }),
    P('top', 'paint_topcoat', 750, { coverage: 80, sold_by_pack: true }),
    P('lab', 'labor_paint', 85),
  ];
  const r = computeEstimate({
    spaces: [bedroom],
    selections: { b1: { wall_finish: { groups: { wall_type: 'paint' }, params: { topcoats: 3 } } } },
  }, products);
  const net = 42 - 1.98 - 1.44;
  const line = code => r.lines.find(l => l.categoryCode === code);
  close(line('paint_putty').neededQty, net * 2 * 1.05, 'المعجون');
  close(line('paint_topcoat').neededQty, net * 3 * 1.05, 'البلاستيك 3 أوجه');
  close(line('labor_paint').neededQty, net, 'المصنعية بدون هالك وبدون أوجه');
  const putty = r.purchase.find(p => p.product.id === 'putty');
  assert.equal(putty.units, Math.ceil(net * 2 * 1.05 / 30));
  assert.equal(putty.cost, putty.units * 420);
  assert.ok(r.complete);
  assert.equal(r.totals.direct, round2(r.purchase.reduce((s, p) => s + p.cost, 0)));
  close(r.totals.packRounding, r.totals.direct - r.totals.linesTotal, 'فرق التقريب');
});

test('سباكة حمام: قاعدة معلقة + بانيو فري ستاند + خلاط أرضي', () => {
  const r = computeEstimate({
    spaces: [bath],
    selections: {
      w1: {
        bathroom_plumbing: {
          groups: { toilet: 'wall_hung', basin: 'vanity', basin_mixer: 'concealed', shower: 'bathtub', bathtub_type: 'freestanding', shower_mixer: 'floor', floor_drain: 'yes', water_heater: 'none', bidet: 'shattaf' },
        },
      },
    },
  }, SAMPLE_PRODUCTS);
  const qty = code => r.lines.filter(l => l.categoryCode === code).reduce((s, l) => s + l.measureQty, 0);
  assert.equal(qty('concealed_cistern'), 1, 'صندوق الدفن');
  assert.equal(r.lines.find(l => l.categoryCode === 'concealed_cistern').phase, 'rough', 'صندوق الدفن في التأسيس');
  assert.equal(qty('toilet_wall_hung'), 1);
  assert.equal(qty('flush_plate'), 1);
  assert.equal(qty('toilet_floor'), 0, 'مفيش قاعدة أرضية');
  assert.equal(qty('bathtub_freestanding'), 1);
  assert.equal(qty('floor_tub_mixer'), 1);
  assert.equal(qty('concealed_mixer_body'), 1, 'جسم دفن لخلاط الحوض بس');
  assert.equal(qty('plumb_water_point'), 1 + 2 + 2, 'نقاط التغذية: قاعدة + حوض + بانيو');
  assert.equal(qty('plumb_drain_point'), 3, 'نقاط الصرف');
  assert.equal(qty('labor_fixture_install'), 3, 'تركيب: قاعدة + حوض + بانيو');
  assert.equal(qty('labor_bathtub_masonry'), 0, 'الفري ستاند مش محتاج مباني');
});

test('الاختيارات الشرطية: الخلاط الأرضي بيختفي لو البانيو مبني، وأسئلة الشاور بتختفي لو بدون', () => {
  const t = TEMPLATE_BY_CODE.bathroom_plumbing;
  const s1 = resolveSelection(t, { groups: { shower: 'bathtub', bathtub_type: 'builtin', shower_mixer: 'floor' } });
  assert.equal(s1.groups.shower_mixer, 'exposed', 'رجع للافتراضي');
  const mixerGroup = s1.visibleGroups.find(v => v.group.code === 'shower_mixer');
  assert.ok(!mixerGroup.available.some(o => o.code === 'floor'));

  const s2 = resolveSelection(t, { groups: { shower: 'none', shower_mixer: 'concealed', shower_enclosure: 'glass' } });
  assert.equal(s2.groups.shower_mixer, undefined);
  assert.equal(s2.groups.shower_enclosure, undefined);
  assert.equal(s2.groups.bathtub_type, undefined);

  const s3 = resolveSelection(t, { groups: { shower: 'shower' } });
  assert.equal(s3.groups.shower_base, 'tiled');
  assert.equal(s3.groups.bathtub_type, undefined);
});

test('الحمام متجلّد لحد السقف: مفيش سطور دهان حوائط فاضية', () => {
  const r = computeEstimate({ spaces: [bath], selections: { w1: defaultSpaceSelections('bathroom') } }, SAMPLE_PRODUCTS);
  const walls = r.lines.filter(l => l.templateCode === 'wall_finish');
  assert.ok(walls.every(l => !l.categoryCode.startsWith('paint_')));
  close(walls.find(l => l.categoryCode === 'tile_ceramic_wall').measureQty, 9 * 3 - 0.8 * 2.2, 'التجليد لحد السقف');
});

test('التقريب للكراتين بيتم على إجمالي المشروع مش لكل غرفة', () => {
  const products = [P('tile', 'tile_porcelain_floor', 500, { coverage: 1.44, sold_by_pack: true }), P('lab', 'labor_floor_tiling', 100)];
  const room = id => ({ id, name: id, type: 'bedroom', length: 2, width: 1, height: 3 });
  const sel = { floor_finish: { groups: { floor_type: 'porcelain', skirting: 'none' } } };
  const r = computeEstimate({
    spaces: [room('a'), room('b')],
    selections: { a: sel, b: sel },
    settings: { wasteOverrides: { tile_porcelain_floor: 0 } },
  }, products);
  const tile = r.purchase.find(p => p.product.id === 'tile');
  close(tile.unitsRaw, 4 / 1.44, 'الوحدات الخام');
  assert.equal(tile.units, 3, 'كراتين: 3 مش 4');
  assert.equal(ceilUnits(2.0000000001), 2);
  assert.equal(ceilUnits(2.01), 3);
});

test('منتج ناقص أو سعر تجريبي بيتعلّم عليه — المقايسة ما تبقاش "كاملة" بسعر صفر', () => {
  const r = computeEstimate({
    spaces: [bedroom],
    selections: { b1: { floor_finish: { groups: { floor_type: 'marble', skirting: 'marble' } } } },
  }, [P('m', 'marble_floor', 1000)]);
  assert.equal(r.complete, false);
  assert.ok(r.issues.some(i => i.level === 'error' && i.message.includes('مصنعية تركيب رخام')));

  const r2 = computeEstimate({ spaces: [bedroom], selections: { b1: defaultSpaceSelections('bedroom') } }, SAMPLE_PRODUCTS);
  assert.ok(r2.complete);
  assert.ok(r2.issues.some(i => i.level === 'warning' && i.message.includes('تجريبي')));
});

test('منتج مختار اتحذف من الكتالوج → خطأ صريح مش رجوع صامت للافتراضي', () => {
  const r = computeEstimate({
    spaces: [bedroom],
    selections: { b1: { floor_finish: { groups: { floor_type: 'hdf', skirting: 'none' }, products: { 'floor_type.hdf.hdf': 'deleted-id' } } } },
  }, [P('h', 'hdf_floor', 500), P('l', 'labor_hdf', 90)]);
  assert.equal(r.complete, false);
  assert.ok(r.issues.some(i => i.message.includes('لم يعد متاحاً')));
});

test('المصاريف الإدارية + الربح + الضريبة', () => {
  const r = computeEstimate({
    spaces: [bedroom],
    selections: { b1: { floor_finish: { groups: { floor_type: 'hdf', skirting: 'none' } } } },
    settings: { overheadPct: 10, profitPct: 20, vatPct: 14, wasteOverrides: { hdf_floor: 0 } },
  }, [P('h', 'hdf_floor', 500), P('l', 'labor_hdf', 100)]);
  assert.equal(r.totals.direct, 12 * 600);
  assert.equal(r.totals.overhead, 720);
  assert.equal(r.totals.profit, round2((7200 + 720) * 0.2));
  assert.equal(r.totals.vat, round2(r.totals.beforeVat * 0.14));
  assert.equal(r.totals.grand, round2(r.totals.beforeVat + r.totals.vat));
  assert.equal(r.totals.perM2, round2(r.totals.grand / 12));
});

test('بارامتر غير صحيح (ارتفاع تجليد أعلى من السقف) بيطلع خطأ', () => {
  const r = computeEstimate({
    spaces: [{ ...bath, type: 'kitchen' }],
    selections: { w1: { wall_finish: { groups: { wall_type: 'tiles_partial' }, params: { tile_height: 3.5 } } } },
  }, SAMPLE_PRODUCTS);
  assert.equal(r.complete, false);
  assert.ok(r.issues.some(i => i.message.includes('ارتفاع التجليد')));
});

test('سلامة البيانات: كل تصنيف في شجرة الاختيارات موجود، وله منتج تجريبي افتراضي', () => {
  for (const t of TEMPLATES) {
    for (const g of t.groups) {
      assert.ok(g.options.some(o => o.code === g.default) || g.default === undefined, `${t.code}.${g.code}: الافتراضي مش موجود`);
      for (const o of g.options) {
        for (const c of o.components) {
          assert.ok(CATEGORY_BY_CODE[c.category], `${t.code}: تصنيف ${c.category} مش معرّف`);
          assert.ok(SAMPLE_PRODUCTS.some(p => p.category_code === c.category && p.is_default), `مفيش منتج افتراضي لـ ${c.category}`);
        }
      }
    }
  }
  for (const p of SAMPLE_PRODUCTS) assert.ok(CATEGORY_BY_CODE[p.category_code], p.category_code);
  // الافتراضي لكل تصنيف واحد بس
  const defaults = SAMPLE_PRODUCTS.filter(p => p.is_default).map(p => p.category_code);
  assert.equal(new Set(defaults).size, defaults.length);
});

test('كل أنواع الفراغات بالاختيارات الافتراضية بتطلع مقايسة كاملة', () => {
  const types = ['reception', 'bedroom', 'bathroom', 'kitchen', 'corridor', 'balcony', 'other'];
  const spaces = types.map((type, i) => ({ id: `s${i}`, name: type, type, length: 3, width: 2.5, height: 3, openings: [{ type: 'door', width: 0.9, height: 2.2 }] }));
  const selections = Object.fromEntries(spaces.map(s => [s.id, defaultSpaceSelections(s.type)]));
  const r = computeEstimate({ spaces, selections }, SAMPLE_PRODUCTS);
  assert.ok(r.complete, JSON.stringify(r.issues.filter(i => i.level === 'error')));
  assert.ok(r.totals.grand > 0);
  assert.ok(defaultSelection(TEMPLATE_BY_CODE.wall_finish, 'bathroom').groups.wall_type === 'tiles_full');
});
