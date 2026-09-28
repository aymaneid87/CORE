// ==========================================================
// من سطور مستخرجة ← قرارات (منتج / سعر مرجعي / تجاهل) + علامات مراجعة
// كل الدوال نقية عشان تتختبر.
// ==========================================================

import { normalizeUnit, detectRegion, stripRegion, itemKey, parsePriceText } from './normalize.js';
import { CATEGORY_BY_CODE } from '../estimation/categories.js';
import { BENCHMARK_DEFS } from '../estimation/bulletins/2026-06.js';

export const PRICE_CHANGE_FLAG_PCT = 30;

export const FLAG_LABELS = {
  pass_mismatch: 'القراءتين اختلفوا في السعر',
  missing_in_pass: 'البند ظهر في قراءة واحدة بس',
  unreadable: 'السعر مش مقروء',
  price_text_mismatch: 'السعر المكتوب مش مطابق للرقم',
  unit_mismatch: 'وحدة البند مش مطابقة لوحدة التصنيف',
  price_change: `السعر اتغير أكتر من ${PRICE_CHANGE_FLAG_PCT}% عن آخر سعر`,
  region_inferred: 'المنطقة (القاهرة) مستنتجة من وجود سطر للصعيد',
  ai_suggestion: 'التصنيف مقترح من الذكاء الاصطناعي — راجعه',
};

const compact = s => s.replace(/\s+/g, '');
export const nameKey = name => compact(stripRegion(name));
export const fullKey = (section, name) => compact(itemKey(section, name));

// مطابقة بالاسم لوحده مسموحة بس لو الاسم مميز (فيه مقاسات أو 4 كلمات+)
// «جلالة عادة» مثلاً موجودة تحت الترابيع وتحت الدرج بسعرين مختلفين — لازم القسم كمان
export function safeNameKey(name) {
  const n = stripRegion(name);
  return /\d/.test(n) || n.split(' ').length >= 4 ? compact(n) : null;
}

// سطر خام من الموديل ← سطر موحّد
export function normalizeRow(raw, page) {
  const price = parsePriceText(raw.price_text);
  const flags = [];
  if (raw.unreadable || price == null) flags.push('unreadable');
  else if (Number.isFinite(raw.price) && Math.abs(raw.price - price) > 1e-9) flags.push('price_text_mismatch');
  return {
    page,
    section: (raw.section || '').trim(),
    name: (raw.name || '').trim(),
    unit_raw: (raw.unit || '').trim(),
    unit: normalizeUnit(raw.unit),
    price: price ?? null,
    price_text: raw.price_text,
    region: detectRegion(raw.name),
    suggested_category: raw.suggested_category && raw.suggested_category !== 'none' ? raw.suggested_category : null,
    suggested_benchmark: raw.suggested_benchmark && raw.suggested_benchmark !== 'none' ? raw.suggested_benchmark : null,
    key: fullKey(raw.section, raw.name),
    name_key: nameKey(raw.name),
    // هوية المنتج عبر النشرات: الاسم لو مميز، وإلا القسم + الاسم
    product_key: safeNameKey(raw.name) || fullKey(raw.section, raw.name),
    flags,
  };
}

/**
 * دمج قراءتين مستقلتين لنفس الصفحة. أي اختلاف في السعر أو بند ظهر في قراءة واحدة ← علامة مراجعة.
 * المطابقة بالمفتاح + ترتيب التكرار (لو نفس البند متكرر في الصفحة).
 */
export function mergePasses(passA, passB) {
  const index = rows => {
    const seen = new Map();
    return rows.map(r => {
      const k = `${r.name_key}|${r.unit}`;
      const n = seen.get(k) || 0;
      seen.set(k, n + 1);
      return { r, id: `${k}#${n}` };
    });
  };
  const a = index(passA);
  const bMap = new Map(index(passB).map(x => [x.id, x.r]));
  const used = new Set();
  const out = [];
  for (const { r, id } of a) {
    const other = bMap.get(id);
    if (!other) {
      out.push({ ...r, flags: [...new Set([...r.flags, 'missing_in_pass'])] });
      continue;
    }
    used.add(id);
    const flags = new Set([...r.flags, ...other.flags]);
    if (r.price !== other.price) flags.add('pass_mismatch');
    out.push({ ...r, alt_price: r.price !== other.price ? other.price : undefined, flags: [...flags] });
  }
  for (const [id, r] of bMap) {
    if (!used.has(id)) out.push({ ...r, flags: [...new Set([...r.flags, 'missing_in_pass'])] });
  }
  return out;
}

// لو فيه نسخة "بالصعيد" من البند ونسخة من غير منطقة ← اللي من غير منطقة تبقى القاهرة
export function inferRegions(rows) {
  const upperKeys = new Set(rows.filter(r => r.region === 'upper').map(r => `${r.page}|${r.name_key}|${r.unit}`));
  return rows.map(r => (r.region == null && upperKeys.has(`${r.page}|${r.name_key}|${r.unit}`)
    ? { ...r, region: 'cairo', flags: [...r.flags, 'region_inferred'] }
    : r));
}

/**
 * mappings: [{ item_key, name_key, unit, use, category_code, benchmark_code, label, is_default }]
 * previousPrices: Map(`${product_key}|${region||''}` → price) — آخر سعر معتمد لنفس البند من نشرة سابقة
 */
export function decideRows(rows, { mappings = [], previousPrices = new Map() } = {}) {
  const byFull = new Map(mappings.filter(m => m.item_key).map(m => [m.item_key, m]));
  const byName = new Map();
  for (const m of mappings) {
    if (!m.name_key) continue;
    const k = `${m.name_key}|${m.unit}`;
    byName.set(k, byName.has(k) ? null : m); // null = ملتبس (اسم متكرر في أكتر من قسم)
  }

  return inferRegions(rows).map(r => {
    const flags = new Set(r.flags);
    const sk = safeNameKey(r.name);
    const m = byFull.get(r.key) || (sk ? byName.get(`${sk}|${r.unit}`) : null) || null;
    let decision;
    if (m) {
      decision = { use: m.use, category: m.category_code || null, benchmark: m.benchmark_code || null, label: m.label || null, is_default: !!m.is_default, source: 'saved' };
    } else if (r.suggested_benchmark && BENCHMARK_DEFS[r.suggested_benchmark]) {
      decision = { use: 'benchmark', category: null, benchmark: r.suggested_benchmark, label: null, is_default: false, source: 'ai' };
      flags.add('ai_suggestion');
    } else if (r.suggested_category && CATEGORY_BY_CODE[r.suggested_category]) {
      decision = { use: 'product', category: r.suggested_category, benchmark: null, label: null, is_default: false, source: 'ai' };
      flags.add('ai_suggestion');
    } else {
      decision = { use: 'ignore', category: null, benchmark: null, label: null, is_default: false, source: 'none' };
    }

    // الوحدة لازم تطابق وحدة حصر التصنيف — غير كده المقارنة والحساب يبقوا غلط
    if (decision.use === 'product' && CATEGORY_BY_CODE[decision.category]?.measure_unit !== r.unit) flags.add('unit_mismatch');
    if (decision.use === 'benchmark' && BENCHMARK_DEFS[decision.benchmark]?.unit !== r.unit) flags.add('unit_mismatch');

    const prev = previousPrices.get(`${r.product_key}|${r.region || ''}`);
    if (prev != null && r.price != null && Math.abs(r.price / prev - 1) * 100 > PRICE_CHANGE_FLAG_PCT) flags.add('price_change');

    return { ...r, previous_price: prev ?? null, decision, flags: [...flags] };
  });
}

// أخطاء بتمنع الاعتماد (مش مجرد تنبيهات)
export function blockingErrors(rows) {
  const errs = [];
  rows.forEach((r, i) => {
    const d = r.decision;
    if (d.use === 'ignore') return;
    const where = `سطر ${i + 1} (ص ${r.page}) «${r.name}»`;
    if (!(r.price > 0)) errs.push(`${where}: السعر مش صالح`);
    if (d.use === 'product' && !CATEGORY_BY_CODE[d.category]) errs.push(`${where}: اختر التصنيف`);
    if (d.use === 'benchmark' && !BENCHMARK_DEFS[d.benchmark]) errs.push(`${where}: اختر السعر المرجعي`);
    if (r.flags.includes('unit_mismatch')) errs.push(`${where}: الوحدة (${r.unit}) مش مطابقة`);
    if (r.flags.includes('pass_mismatch') && !r.reviewed) errs.push(`${where}: القراءتين اختلفوا — راجع السعر وأكّده`);
    if (r.flags.includes('unreadable') && !r.reviewed) errs.push(`${where}: السعر مش مقروء — أدخله وأكّده`);
  });
  return errs;
}

// نفس الجدول بعد تعديل المستخدم: إعادة فحص الوحدة (مثلاً بعد تغيير التصنيف)
export function recheckRow(r) {
  const flags = new Set(r.flags.filter(f => f !== 'unit_mismatch'));
  const d = r.decision;
  if (d.use === 'product' && CATEGORY_BY_CODE[d.category]?.measure_unit !== r.unit) flags.add('unit_mismatch');
  if (d.use === 'benchmark' && BENCHMARK_DEFS[d.benchmark]?.unit !== r.unit) flags.add('unit_mismatch');
  return { ...r, flags: [...flags] };
}

// الشكل اللي بيتحفظ في bulletin_imports.rows وبتقراه دالة الاعتماد في قاعدة البيانات
export function approvalRows(rows) {
  return rows.map(r => ({
    ...r,
    key: r.key,
    product_key: r.product_key,
    name: r.name,
    section: r.section,
    unit: r.unit,
    price: r.price,
    region: r.region,
    page: r.page,
    reviewed: !!r.reviewed,
    flags: r.flags,
    decision: {
      ...r.decision,
      name_key: safeNameKey(r.name),
      benchmark_def: r.decision.use === 'benchmark' && BENCHMARK_DEFS[r.decision.benchmark]
        ? { title: BENCHMARK_DEFS[r.decision.benchmark].title, unit: BENCHMARK_DEFS[r.decision.benchmark].unit, selectors: BENCHMARK_DEFS[r.decision.benchmark].selectors }
        : null,
    },
  }));
}

// آخر سعر معتمد لكل بند نشرة (من الكتالوج) ← للمقارنة بالنشرة الجديدة
export function previousPricesFrom(catalog) {
  const m = new Map();
  for (const p of catalog) {
    const k = p.specs?.bulletin_key;
    if (!k || p.price == null) continue;
    const key = `${k}|${p.specs.region || ''}`;
    // منتج الشركة الخاص أولى من العام
    if (!m.has(key) || p.owner_id) m.set(key, p.price);
  }
  return m;
}
