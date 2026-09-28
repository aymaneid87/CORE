// مقارنة ناتج القراءة الآلية بالبنود المنقولة يدوياً من نشرة يونيو 2026 (مرجع الدقة)
import { BULLETIN_ITEMS } from '../estimation/bulletins/2026-06.js';
import { normalizeUnit, normalizeArabic } from './normalize.js';

const squash = s => normalizeArabic(s).replace(/\s+/g, '');

export function compareWithManual(decidedRows, pages) {
  const expected = BULLETIN_ITEMS.filter(i => pages.includes(i.page));
  const mismatches = [];
  let exact = 0;

  for (const e of expected) {
    const printed = squash(e.printed || e.name);
    const unit = normalizeUnit(e.unit);
    // نفس الصفحة + الاسم + المنطقة؛ لو الاسم متكرر (جلالة عادة) لازم القسم كمان
    let candidates = decidedRows.filter(r => r.page === e.page && squash(r.name) === printed && r.unit === unit
      && (r.region || null) === (e.region || null));
    if (candidates.length > 1 && e.section) candidates = candidates.filter(r => squash(r.section) === squash(e.section));
    const r = candidates[0];
    const problems = [];
    if (!r) problems.push('البند مش موجود في القراءة');
    else {
      if (r.price !== e.price) problems.push(`السعر ${r.price} بدل ${e.price}`);
      if (e.use === 'product' && (r.decision.use !== 'product' || r.decision.category !== e.category)) problems.push(`التصنيف ${r.decision.use}/${r.decision.category || '-'} بدل ${e.category}`);
      if (e.use === 'benchmark' && r.decision.use !== 'benchmark') problems.push(`القرار ${r.decision.use} بدل سعر مرجعي`);
    }
    if (problems.length) mismatches.push({ page: e.page, name: e.printed || e.name, region: e.region || null, problem: problems.join('، ') });
    else exact++;
  }

  const flagCounts = {};
  for (const r of decidedRows) for (const f of r.flags) flagCounts[f] = (flagCounts[f] || 0) + 1;
  return { expected: expected.length, exact, mismatches, flagCounts };
}
