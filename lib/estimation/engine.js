// ==========================================================
// محرك المقايسة: من (فراغات + اختيارات + كتالوج أسعار) → بنود وكميات وتكلفة
// دوال نقية بالكامل (بدون UI أو قاعدة بيانات) عشان تتختبر بدقة.
// ==========================================================

import { spaceMeasures, validateSpace, MEASURE_LABELS } from './geometry.js';
import { CATEGORY_BY_CODE } from './categories.js';
import { TEMPLATE_BY_CODE, templatesForSpace, SPACE_TYPE_DEFAULTS } from './templates.js';

const EPS = 1e-9;

export function round2(n) {
  return Math.round((n + Math.sign(n) * EPS) * 100) / 100;
}

// تقريب لأعلى لعدد عبوات صحيح مع تجاهل أخطاء الفاصلة العشرية (2.0000000001 → 2)
export function ceilUnits(n) {
  return Math.ceil(Math.round(n * 1e6) / 1e6);
}

export function isVisible(when, groups) {
  if (!when) return true;
  return when.in.includes(groups[when.group]);
}

function paramDefault(p, space) {
  return typeof p.default === 'function' ? p.default(space) : p.default;
}

// اختيارات البند الافتراضية لفراغ جديد
export function defaultSelection(template, spaceType) {
  const overrides = SPACE_TYPE_DEFAULTS[spaceType]?.[template.code] || {};
  const groups = {};
  for (const g of template.groups) groups[g.code] = overrides[g.code] ?? g.default ?? g.options[0].code;
  const params = {};
  for (const p of template.params || []) params[p.code] = paramDefault(p, null);
  return { enabled: true, groups, params, products: {} };
}

export function defaultSpaceSelections(spaceType) {
  return Object.fromEntries(templatesForSpace(spaceType).map(t => [t.code, defaultSelection(t, spaceType)]));
}

/**
 * يطبّع الاختيارات: يستبعد الأسئلة المخفية، ويصحّح الاختيارات اللي بقت غير متاحة،
 * ويكمّل القيم الناقصة بالافتراضي. الترتيب مهم لأن شرط سؤال ممكن يعتمد على سؤال قبله.
 */
export function resolveSelection(template, sel = {}, space = null) {
  const groups = {};
  const visibleGroups = [];
  for (const g of template.groups) {
    if (!isVisible(g.when, groups)) continue;
    const available = g.options.filter(o => isVisible(o.when, groups));
    if (!available.length) continue;
    const wanted = sel.groups?.[g.code];
    const chosen = available.find(o => o.code === wanted)
      || available.find(o => o.code === g.default)
      || available[0];
    groups[g.code] = chosen.code;
    visibleGroups.push({ group: g, option: chosen, available });
  }

  const params = {};
  const visibleParams = [];
  const errors = [];
  for (const p of template.params || []) {
    if (!isVisible(p.when, groups)) continue;
    let v = sel.params?.[p.code];
    if (v === undefined || v === null || v === '') v = paramDefault(p, space);
    v = Number(v);
    if (!Number.isFinite(v)) errors.push(`${p.title}: قيمة غير صحيحة`);
    else if (p.integer && !Number.isInteger(v)) errors.push(`${p.title}: لازم رقم صحيح`);
    else if ((p.min != null && v < p.min) || (p.max != null && v > p.max)) errors.push(`${p.title}: لازم يكون بين ${p.min} و ${p.max}`);
    if (p.code === 'tile_height' && space && v > space.height + EPS) errors.push(`${p.title} أعلى من ارتفاع الفراغ`);
    params[p.code] = v;
    visibleParams.push(p);
  }

  return { enabled: sel.enabled !== false, groups, params, products: sel.products || {}, visibleGroups, visibleParams, errors };
}

export function componentKey(groupCode, optionCode, componentCode) {
  return `${groupCode}.${optionCode}.${componentCode}`;
}

// فهرسة الكتالوج: المنتجات النشطة حسب التصنيف + المنتج الافتراضي لكل تصنيف
export function indexCatalog(products) {
  const byId = new Map();
  const byCategory = new Map();
  for (const p of products || []) {
    if (p.active === false) continue;
    byId.set(p.id, p);
    if (!byCategory.has(p.category_code)) byCategory.set(p.category_code, []);
    byCategory.get(p.category_code).push(p);
  }
  return { byId, byCategory };
}

/**
 * المنتج الافتراضي للتصنيف. لو فيه أكتر من افتراضي، الأولوية:
 * منتج الشركة الخاص ← منتج بسعر مؤكد (نشرة/مورد) ← سعر تقديري، ومنتج منطقة تانية بيتستبعد عملياً.
 */
export function defaultProductFor(catalog, categoryCode, region = null) {
  const list = catalog.byCategory.get(categoryCode) || [];
  const score = p => {
    const r = p.specs?.region || null;
    return (p.owner_id ? 100 : 0) + (p.is_sample ? 0 : 10) + (!r || !region ? 0 : r === region ? 5 : -50);
  };
  const defaults = list.filter(p => p.is_default);
  if (defaults.length) return defaults.reduce((best, p) => (score(p) > score(best) ? p : best));
  return list.length === 1 ? list[0] : null;
}

function coatsOf(component, params) {
  if (component.coats == null) return 1;
  if (typeof component.coats === 'number') return component.coats;
  return params[component.coats.param] ?? 1;
}

/**
 * يولّد بنود فراغ واحد لبند واحد.
 * كل سطر فيه: الكمية المحصورة، الأوجه، الهالك، الكمية المطلوبة، عدد الوحدات (قبل التقريب) والتكلفة.
 */
export function computeTemplateLines(space, template, rawSel, catalog, settings = {}) {
  const sel = resolveSelection(template, rawSel, space);
  const issues = sel.errors.map(message => ({ level: 'error', message: `${space.name} — ${template.title}: ${message}` }));
  if (!sel.enabled) return { lines: [], issues: [], selection: sel };
  if (sel.errors.length) return { lines: [], issues, selection: sel };

  const measureOpts = template.measureOptions ? template.measureOptions(sel, space) : {};
  const measures = spaceMeasures(space, measureOpts);
  const lines = [];

  for (const { group, option } of sel.visibleGroups) {
    for (const c of option.components) {
      const category = CATEGORY_BY_CODE[c.category];
      if (!category) throw new Error(`تصنيف غير معروف: ${c.category}`);
      const measureQty = c.qty.fixed != null ? c.qty.fixed : measures[c.qty.measure] * (c.qty.factor ?? 1);
      if (!(measureQty > EPS)) continue; // مفيش كمية (مثلاً التجليد لحد السقف → مفيش دهان فوقه)

      const key = componentKey(group.code, option.code, c.code);
      const chosenId = sel.products[key];
      const product = (chosenId && catalog.byId.get(chosenId)) || (!chosenId ? defaultProductFor(catalog, c.category, settings.region) : null);

      const coats = coatsOf(c, sel.params);
      const workQty = measureQty * coats;
      const override = settings.wasteOverrides?.[c.category];
      const wastePct = category.kind === 'labor' ? 0 : (c.waste ?? override ?? category.default_waste_pct ?? 0);
      const neededQty = workQty * (1 + wastePct / 100);

      const line = {
        spaceId: space.id,
        spaceName: space.name,
        templateCode: template.code,
        templateTitle: template.title,
        groupCode: group.code,
        groupTitle: group.title,
        optionCode: option.code,
        optionTitle: option.title,
        componentKey: key,
        phase: c.phase,
        categoryCode: c.category,
        categoryTitle: category.title,
        kind: category.kind,
        measureKey: c.qty.measure || 'count',
        measureUnit: c.qty.measure ? MEASURE_LABELS[c.qty.measure].unit : category.measure_unit,
        measureQty,
        coats,
        wastePct,
        neededQty,
        product: product || null,
        unit: product?.unit || category.unit,
        unitsRaw: null,
        unitPrice: null,
        cost: null,
      };

      if (chosenId && !product) {
        issues.push({ level: 'error', message: `${space.name} — ${category.title}: المنتج المختار لم يعد متاحاً في الكتالوج` });
      } else if (!product) {
        issues.push({ level: 'error', message: `${space.name} — ${category.title}: لم يتم اختيار منتج` });
      } else {
        const coverage = Number(product.coverage) > 0 ? Number(product.coverage) : 1;
        line.unitsRaw = neededQty / coverage;
        if (product.price == null || !Number.isFinite(Number(product.price))) {
          issues.push({ level: 'error', message: `${space.name} — ${product.brand || ''} ${product.name}: لا يوجد سعر معتمد` });
        } else {
          line.unitPrice = Number(product.price);
          line.cost = line.unitsRaw * line.unitPrice;
        }
        if (product.price_stale) {
          issues.push({ level: 'warning', message: `${product.brand || ''} ${product.name}: آخر سعر بتاريخ ${product.price_date} — محتاج تحديث` });
        }
      }
      lines.push(line);
    }
  }
  return { lines, issues, selection: sel, measures };
}

/**
 * الحساب الكامل للمقايسة.
 * estimate = { spaces: [...], selections: { [spaceId]: { [templateCode]: sel } }, settings }
 * settings = { overheadPct, profitPct, vatPct, wasteOverrides }
 */
/**
 * مقارنة تكلفة بنود مركّبة بأسعار مرجعية (زي "توريد وعمل دهانات بلاستيك" من نشرة الأسعار).
 * التكلفة الفعلية للمتر = مجموع تكلفة سطور الاختيار ÷ مجموع كمية الحصر لكل فراغ.
 */
export const BENCHMARK_TOLERANCE_PCT = 25;

export function computeBenchmarks(lines, benchmarks = [], region = null) {
  const out = [];
  const byCode = new Map();
  for (const b of benchmarks) {
    if (b.region && region && b.region !== region) continue;
    const prev = byCode.get(b.code);
    // لو فيه أكتر من مرجع لنفس البند: اللي بنفس المنطقة أولى
    if (!prev || (b.region === region && prev.region !== region)) byCode.set(b.code, b);
  }
  for (const b of byCode.values()) {
    let cost = 0;
    const measures = new Map();
    for (const l of lines) {
      const sel = b.selectors.find(s => s.templateCode === l.templateCode && s.groupCode === l.groupCode && s.optionCode === l.optionCode);
      if (!sel) continue;
      cost += l.cost || 0;
      if (l.measureKey === sel.measureKey) measures.set(`${l.spaceId}|${l.templateCode}`, l.measureQty);
    }
    const qtyTotal = [...measures.values()].reduce((s, q) => s + q, 0);
    if (!(qtyTotal > EPS)) continue;
    const actual = cost / qtyTotal;
    const deviationPct = (actual / b.price - 1) * 100;
    out.push({ ...b, qty: qtyTotal, cost, actual, deviationPct, withinTolerance: Math.abs(deviationPct) <= BENCHMARK_TOLERANCE_PCT });
  }
  return out;
}

export function computeEstimate(estimate, products, { benchmarks = [] } = {}) {
  const catalog = indexCatalog(products);
  const settings = estimate.settings || {};
  const issues = [];
  const spaces = [];
  let lines = [];

  for (const space of estimate.spaces || []) {
    const errors = validateSpace(space);
    if (errors.length) {
      issues.push(...errors.map(e => ({ level: 'error', message: `${space.name || 'فراغ بدون اسم'}: ${e}` })));
      spaces.push({ space, errors, measures: null });
      continue;
    }
    spaces.push({ space, errors: [], measures: spaceMeasures(space) });
    const spaceSel = estimate.selections?.[space.id] || {};
    for (const template of templatesForSpace(space.type)) {
      const sel = spaceSel[template.code];
      if (!sel) continue; // البند مش مضاف للفراغ ده
      const r = computeTemplateLines(space, template, sel, catalog, settings);
      lines = lines.concat(r.lines);
      issues.push(...r.issues);
    }
  }

  // تجميع الشراء لكل منتج: التقريب لعبوات كاملة بيتم على الإجمالي (مش لكل غرفة) عشان منزودش الهالك
  const purchaseMap = new Map();
  for (const l of lines) {
    if (!l.product || l.unitsRaw == null) continue;
    const k = l.product.id;
    if (!purchaseMap.has(k)) purchaseMap.set(k, { product: l.product, categoryCode: l.categoryCode, kind: l.kind, unitsRaw: 0, neededQty: 0 });
    const p = purchaseMap.get(k);
    p.unitsRaw += l.unitsRaw;
    p.neededQty += l.neededQty;
  }
  const purchase = [...purchaseMap.values()].map(p => {
    const units = p.product.sold_by_pack ? ceilUnits(p.unitsRaw) : p.unitsRaw;
    const unitPrice = p.product.price == null ? null : Number(p.product.price);
    return { ...p, units, unitPrice, cost: unitPrice == null ? null : round2(units * unitPrice) };
  }).sort((a, b) => a.categoryCode.localeCompare(b.categoryCode));

  const sumBy = (arr, pred) => round2(arr.filter(pred).reduce((s, l) => s + (l.cost || 0), 0));
  const linesTotal = sumBy(lines, () => true);
  const purchaseTotal = sumBy(purchase, () => true);
  const overheadPct = Number(settings.overheadPct) || 0;
  const profitPct = Number(settings.profitPct) || 0;
  const vatPct = Number(settings.vatPct) || 0;
  const overhead = round2(purchaseTotal * overheadPct / 100);
  const profit = round2((purchaseTotal + overhead) * profitPct / 100);
  const beforeVat = round2(purchaseTotal + overhead + profit);
  const vat = round2(beforeVat * vatPct / 100);

  const totals = {
    rough: sumBy(lines, l => l.phase === 'rough'),
    finish: sumBy(lines, l => l.phase === 'finish'),
    materials: sumBy(lines, l => l.kind !== 'labor'),
    labor: sumBy(lines, l => l.kind === 'labor'),
    linesTotal,
    packRounding: round2(purchaseTotal - linesTotal),
    direct: purchaseTotal,
    overhead,
    profit,
    beforeVat,
    vat,
    grand: round2(beforeVat + vat),
    floorArea: round2(spaces.reduce((s, x) => s + (x.measures?.floor_area || 0), 0)),
  };
  totals.perM2 = totals.floorArea > 0 ? round2(totals.grand / totals.floorArea) : null;

  const benchmarkResults = computeBenchmarks(lines, benchmarks, settings.region);
  for (const b of benchmarkResults) {
    if (!b.withinTolerance) {
      const dir = b.deviationPct > 0 ? 'أعلى' : 'أقل';
      issues.push({ level: 'warning', message: `${b.title}: تكلفتك ${round2(b.actual)} ج.م/${b.unit} — ${dir} من المرجع (${b.price}) بـ ${Math.abs(Math.round(b.deviationPct))}%` });
    }
  }

  // تنبيه واحد مجمّع للأسعار التقديرية (بدل تنبيه لكل منتج)
  const estimated = purchase.filter(p => p.product.is_sample && p.cost != null);
  const estimatedCost = round2(estimated.reduce((sum, p) => sum + p.cost, 0));
  totals.estimatedShare = purchaseTotal > 0 ? round2(estimatedCost / purchaseTotal * 100) : 0;
  if (estimated.length) {
    issues.push({ level: 'warning', message: `${estimated.length} منتج بأسعار تقديرية من السوق (${Math.round(totals.estimatedShare)}% من التكلفة) — أكّدها من المورد قبل عرض السعر على العميل` });
  }

  const seen = new Set();
  const uniqueIssues = issues.filter(i => {
    const k = `${i.level}|${i.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const errorCount = uniqueIssues.filter(i => i.level === 'error').length;
  return { spaces, lines, purchase, totals, benchmarks: benchmarkResults, issues: uniqueIssues, complete: errorCount === 0 };
}
