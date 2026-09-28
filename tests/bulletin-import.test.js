import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUnit, detectRegion, parsePriceText, normalizeArabic } from '../lib/bulletin-import/normalize.js';
import { normalizeRow, mergePasses, decideRows, blockingErrors, recheckRow, safeNameKey } from '../lib/bulletin-import/decide.js';
import { seedMappings } from '../lib/bulletin-import/seed-mappings.js';

const raw = (name, unit, price_text, extra = {}) => ({ section: '', name, unit, price: Number(price_text), price_text, suggested_category: 'none', suggested_benchmark: 'none', unreadable: false, ...extra });

test('تطبيع: الوحدات والأرقام العربية والمنطقة', () => {
  for (const u of ['م2', '2م', 'م²', ' م 2 ', 'م٢']) assert.equal(normalizeUnit(u), 'م²', u);
  for (const u of ['م.ط', 'م ط', 'مط']) assert.equal(normalizeUnit(u), 'م.ط', u);
  assert.equal(normalizeUnit('3م'), 'م³');
  assert.equal(parsePriceText('١٬٢٥٠'), 1250);
  assert.equal(parsePriceText('7.5'), 7.5);
  assert.equal(parsePriceText('13,300'), 13300);
  assert.equal(parsePriceText('—'), null);
  assert.equal(detectRegion('مصنعيات سيراميك بدون وزر بالقاهرة'), 'cairo');
  assert.equal(detectRegion('توريد وعمل دهانات بلاستيك داخلية بالصعيد والبحر الأحمر وجنوب سيناء'), 'upper');
  assert.equal(detectRegion('حوائط 25*50سم'), null);
  assert.equal(normalizeArabic('أرضيات  40x40 سم'), normalizeArabic('ارضيات 40×40 سم'));
});

test('دمج قراءتين: اختلاف السعر أو سطر ناقص بيتعلّم عليه', () => {
  const A = [raw('ارضيات 40×40 سم', 'م2', '150'), raw('ارضيات 50×50 سم', 'م2', '140'), raw('ارضيات 60×60 سم', 'م2', '136')].map(r => normalizeRow(r, 5));
  const B = [raw('ارضيات 40x40 سم', 'م²', '150'), raw('ارضيات 50×50 سم', 'م2', '148')].map(r => normalizeRow(r, 5));
  const m = mergePasses(A, B);
  assert.equal(m.length, 3);
  assert.deepEqual(m[0].flags, [], 'نفس البند بكتابة مختلفة شوية = متطابق');
  assert.ok(m[1].flags.includes('pass_mismatch'));
  assert.equal(m[1].alt_price, 148);
  assert.ok(m[2].flags.includes('missing_in_pass'));
});

test('سعر مش مقروء أو رقم مش مطابق للنص', () => {
  assert.ok(normalizeRow(raw('x', 'م2', '??'), 1).flags.includes('unreadable'));
  assert.ok(normalizeRow({ ...raw('x', 'م2', '150'), price: 15 }, 1).flags.includes('price_text_mismatch'));
});

test('المطابقات المحفوظة من نشرة يونيو بتتطبّق على نشرة جديدة، والمنطقة بتتستنتج', () => {
  const rows = [
    raw('مصنعيات تركيب رخام 2سم ارضيات شاملة التشطيب والوزر', 'م2', '380'),
    raw('مصنعيات تركيب رخام 2سم ارضيات شاملة التشطيب والوزر بالصعيد', 'م2', '410'),
    raw('حوائط 25*50سم', 'م2', '125', { section: 'سيراميك حوائط' }),
    raw('توريد وعمل دهانات بلاستيك داخلية', 'م2', '190'),
    raw('توريد وعمل دهانات بلاستيك داخلية بالصعيد والبحر الأحمر وجنوب سيناء', 'م2', '210'),
    raw('حديد عز', 'طن', '39500'),
  ].map(r => normalizeRow(r, 3));
  const d = decideRows(rows, { mappings: seedMappings() });
  assert.equal(d[0].region, 'cairo', 'مستنتجة');
  assert.ok(d[0].flags.includes('region_inferred'));
  assert.equal(d[0].decision.category, 'labor_marble');
  assert.equal(d[0].decision.is_default, false, 'الشاملة للوزرة مش افتراضية');
  assert.equal(d[1].region, 'upper');
  assert.equal(d[2].decision.category, 'tile_ceramic_wall');
  assert.equal(d[2].decision.source, 'saved');
  assert.equal(d[3].decision.use, 'benchmark');
  assert.equal(d[3].region, 'cairo');
  assert.equal(d[5].decision.use, 'ignore');
  assert.deepEqual(blockingErrors(d), []);
});

test('اسم قصير ملتبس (جلالة عادة) ما يتطابقش بالاسم لوحده — الدرج غير الترابيع', () => {
  assert.equal(safeNameKey('جلالة عادة'), null);
  assert.ok(safeNameKey('حوائط 25*50سم'));
  const tiles = normalizeRow(raw('جلالة عادة', 'م2', '450', { section: 'الرخام (ترابيع) ترابيع الرخام 40×40 × 2 سم' }), 5);
  const stairs = normalizeRow(raw('جلالة عادة', 'م2', '360', { section: 'الرخام (درج) درج سمك 2/4 سم' }), 5);
  const [t, s] = decideRows([tiles, stairs], { mappings: seedMappings() });
  assert.equal(t.decision.category, 'marble_floor');
  assert.equal(s.decision.use, 'ignore', 'الدرج مش هيتسعّر كأرضية رخام');
  assert.notEqual(t.product_key, s.product_key);
});

test('اقتراح الذكاء الاصطناعي بوحدة غلط ← خطأ بيمنع الاعتماد، وتغيّر السعر الكبير بيتعلّم', () => {
  const r = normalizeRow(raw('بلاستيك مط داخلي عالي الجودة', 'لتر', '110', { suggested_category: 'paint_topcoat' }), 10);
  const [d] = decideRows([r]);
  assert.ok(d.flags.includes('ai_suggestion'));
  assert.ok(d.flags.includes('unit_mismatch'));
  assert.ok(blockingErrors([d]).length > 0);
  const fixed = recheckRow({ ...d, decision: { ...d.decision, use: 'ignore' } });
  assert.deepEqual(blockingErrors([fixed]), []);

  const p = normalizeRow(raw('حوائط 25*50سم', 'م2', '200', { section: 'سيراميك حوائط' }), 5);
  const [x] = decideRows([p], { mappings: seedMappings(), previousPrices: new Map([[`${p.product_key}|`, 118]]) });
  assert.ok(x.flags.includes('price_change'));
  assert.equal(x.previous_price, 118);
});

test('اختلاف القراءتين لازم يتراجع ويتأكد قبل الاعتماد', () => {
  const r = { ...normalizeRow(raw('حوائط 25*50سم', 'م2', '118', { section: 'سيراميك حوائط' }), 5) };
  r.flags.push('pass_mismatch');
  const [d] = decideRows([r], { mappings: seedMappings() });
  assert.equal(blockingErrors([d]).length, 1);
  assert.deepEqual(blockingErrors([{ ...d, reviewed: true }]), []);
});

test('مفتاح منتجات نشرة يونيو = نفس مفتاح الاستيراد (عشان تنبيه تغيّر السعر يشتغل من أول نشرة)', async () => {
  const { bulletinProducts } = await import('../lib/estimation/bulletins/2026-06.js');
  const { previousPricesFrom } = await import('../lib/bulletin-import/decide.js');
  const prev = previousPricesFrom(bulletinProducts());
  const r = normalizeRow(raw('مصنعيات سيراميك بدون وزر بالصعيد', 'م2', '220'), 3);
  assert.equal(prev.get(`${r.product_key}|upper`), 150);
  const [d] = decideRows([r], { mappings: seedMappings(), previousPrices: prev });
  assert.ok(d.flags.includes('price_change'), '150 ← 220');
  const tile = normalizeRow(raw('جلالة عادة', 'م2', '450', { section: 'الرخام (ترابيع) ترابيع الرخام 40×40 × 2 سم' }), 5);
  assert.equal(prev.get(`${tile.product_key}|`), 440);
});
