import test from 'node:test';
import assert from 'node:assert/strict';
import { BULLETIN_ITEMS } from '../lib/estimation/bulletins/2026-06.js';
import { normalizeRow, decideRows } from '../lib/bulletin-import/decide.js';
import { seedMappings } from '../lib/bulletin-import/seed-mappings.js';
import { compareWithManual } from '../lib/bulletin-import/verify.js';

// قراءة "مثالية": نفس المطبوع بالظبط (قسم صفحة 3 = عنوان الصفحة زي ما الموديل هيشوفه)
function perfectRead(mutate = r => r) {
  return BULLETIN_ITEMS.map(i => mutate({
    section: i.section || 'الخامات الأساسية',
    name: i.printed || i.name, unit: i.unit, price: i.price, price_text: String(i.price),
    unreadable: false, suggested_category: 'none', suggested_benchmark: 'none', page: i.page,
  })).map(r => normalizeRow(r, r.page));
}
const pages = [3, 5, 9];

test('قراءة مطابقة للنقل اليدوي ← كل البنود مطابقة (السعر + التصنيف + المنطقة)', () => {
  const d = decideRows(perfectRead(), { mappings: seedMappings() });
  const r = compareWithManual(d, pages);
  assert.deepEqual(r.mismatches, []);
  assert.equal(r.exact, BULLETIN_ITEMS.length);
});

test('غلطة في رقم واحد أو بند ناقص ← بتظهر في التقرير', () => {
  const d = decideRows(perfectRead(r => (r.name === 'حوائط 25*50سم' ? { ...r, price: 188, price_text: '188' } : r))
    .filter(r => r.name !== 'تريستا'), { mappings: seedMappings() });
  const r = compareWithManual(d, pages);
  assert.equal(r.mismatches.length, 2);
  assert.ok(r.mismatches.some(m => m.problem.includes('188 بدل 118')));
  assert.ok(r.mismatches.some(m => m.name === 'تريستا' && m.problem.includes('مش موجود')));
});
