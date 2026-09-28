import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCatalog } from '../lib/estimation/catalog.js';

test('دمج الكتالوج: السعر الحالي + أولوية الافتراضي الخاص على التجريبي + تنبيه السعر القديم', () => {
  const products = [
    { id: 'pub', owner_id: null, category_code: 'toilet_floor', is_default: true, coverage: '1' },
    { id: 'own', owner_id: 'u1', category_code: 'toilet_floor', is_default: true, coverage: '1' },
    { id: 'pub2', owner_id: null, category_code: 'basin_mixer', is_default: true, coverage: '1' },
    { id: 'off', owner_id: 'u1', category_code: 'basin_mixer', is_default: false, active: false },
  ];
  const prices = [
    { product_id: 'own', price: '6500.00', effective_date: '2026-09-20' },
    { product_id: 'pub2', price: 1200, effective_date: '2026-01-01' },
  ];
  const c = mergeCatalog(products, prices, new Date('2026-09-28'));
  const by = Object.fromEntries(c.map(p => [p.id, p]));
  assert.equal(by.off, undefined, 'غير النشط مستبعد');
  assert.equal(by.pub.is_default, false, 'التجريبي اتلغى افتراضيه');
  assert.equal(by.own.is_default, true);
  assert.equal(by.pub2.is_default, true, 'مفيش خاص في التصنيف ده');
  assert.equal(by.own.price, 6500);
  assert.equal(by.pub.price, null, 'مفيش سعر');
  assert.equal(by.own.price_stale, false);
  assert.equal(by.pub2.price_stale, true, 'سعر من يناير قديم');
});
