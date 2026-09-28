// ==========================================================
// حصر الكميات الهندسي لكل فراغ (غرفة / حمام / مطبخ ...)
// كل الأطوال بالمتر، والمساحات بالمتر المربع.
// ==========================================================

export const OPENING_DEFAULTS = {
  door: { width: 0.9, height: 2.2, sill: 0 },
  window: { width: 1.2, height: 1.2, sill: 1.0 },
  opening: { width: 1.0, height: 2.2, sill: 0 }, // فتحة بدون ضلفة (زي مدخل مطبخ مفتوح)
};

function isPos(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

// مساحة ومحيط مضلّع (نقاط بالترتيب) — قانون Shoelace
export function polygonMetrics(points) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('المضلّع لازم يكون فيه 3 نقاط على الأقل');
  }
  let twiceArea = 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    twiceArea += x1 * y2 - x2 * y1;
    perimeter += Math.hypot(x2 - x1, y2 - y1);
  }
  return { area: Math.abs(twiceArea) / 2, perimeter };
}

// يتحقق من صحة بيانات الفراغ ويرجّع قائمة أخطاء بالعربي (فاضية = سليم)
export function validateSpace(space) {
  const errors = [];
  if (!space || typeof space !== 'object') return ['بيانات الفراغ غير صحيحة'];
  if (!space.name || !String(space.name).trim()) errors.push('اسم الفراغ مطلوب');
  if (!isPos(space.height)) errors.push('الارتفاع مطلوب ولازم يكون أكبر من صفر');
  else if (space.height > 12) errors.push('الارتفاع أكبر من 12 م — راجع القيمة');

  if (space.shape === 'polygon') {
    const pts = space.points;
    if (!Array.isArray(pts) || pts.length < 3) errors.push('المضلّع لازم يكون فيه 3 نقاط على الأقل');
    else if (pts.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) errors.push('إحداثيات المضلّع غير صحيحة');
    else if (polygonMetrics(pts).area <= 0) errors.push('مساحة المضلّع = صفر');
  } else {
    if (!isPos(space.length)) errors.push('الطول لازم يكون أكبر من صفر');
    if (!isPos(space.width)) errors.push('العرض لازم يكون أكبر من صفر');
  }

  (space.openings || []).forEach((o, i) => {
    const label = `فتحة ${i + 1}`;
    if (!OPENING_DEFAULTS[o.type]) errors.push(`${label}: نوع غير معروف`);
    if (!isPos(o.width)) errors.push(`${label}: العرض لازم يكون أكبر من صفر`);
    if (!isPos(o.height)) errors.push(`${label}: الارتفاع لازم يكون أكبر من صفر`);
    if (o.sill != null && (!Number.isFinite(o.sill) || o.sill < 0)) errors.push(`${label}: جلسة الشباك غير صحيحة`);
    if (o.count != null && (!Number.isInteger(o.count) || o.count < 1)) errors.push(`${label}: العدد لازم يكون رقم صحيح ≥ 1`);
    if (isPos(space.height) && isPos(o.height) && (o.sill || 0) + o.height > space.height + 1e-9) {
      errors.push(`${label}: أعلى الفتحة أعلى من ارتفاع الفراغ`);
    }
  });
  return errors;
}

// الجزء من الفتحة الواقع بين منسوبين (من bottom لـ top) — لخصم الفتحات من التجليد والدهان بدقة
function openingAreaBetween(o, bottom, top) {
  const sill = o.sill || 0;
  const lo = Math.max(sill, bottom);
  const hi = Math.min(sill + o.height, top);
  return hi > lo ? o.width * (hi - lo) : 0;
}

/**
 * يحسب كل الكميات الأساسية للفراغ.
 * tileHeight: ارتفاع تجليد الحوائط (سيراميك) — لو مش محدد = صفر (مفيش تجليد)
 * waterproofUpturn: ارتفاع رفرف العزل على الحوائط (م) — افتراضي 30 سم
 */
export function spaceMeasures(space, { tileHeight = 0, waterproofUpturn = 0.3 } = {}) {
  const errors = validateSpace(space);
  if (errors.length) throw new Error(`${space?.name || 'فراغ'}: ${errors.join('، ')}`);

  const { area, perimeter } = space.shape === 'polygon'
    ? polygonMetrics(space.points)
    : { area: space.length * space.width, perimeter: 2 * (space.length + space.width) };

  const H = space.height;
  const tH = Math.min(Math.max(tileHeight || 0, 0), H);
  const openings = (space.openings || []).map(o => ({ ...o, count: o.count || 1 }));

  const sum = fn => openings.reduce((s, o) => s + fn(o) * o.count, 0);
  const openingsArea = sum(o => openingAreaBetween(o, 0, H));
  const openingsInTiled = sum(o => openingAreaBetween(o, 0, tH));
  const doorWidths = sum(o => (o.type === 'window' ? 0 : o.width));

  const grossWall = perimeter * H;
  const wallNet = Math.max(grossWall - openingsArea, 0);
  const tiledWall = Math.max(perimeter * tH - openingsInTiled, 0);

  return {
    floor_area: area,
    ceiling_area: area,
    perimeter,
    wall_area_gross: grossWall,
    openings_area: openingsArea,
    wall_area_net: wallNet,
    tiled_wall_area: tiledWall,
    wall_area_above_tiles: Math.max(wallNet - tiledWall, 0),
    skirting_length: Math.max(perimeter - doorWidths, 0),
    waterproof_area: area + Math.max(perimeter - doorWidths, 0) * Math.min(Math.max(waterproofUpturn, 0), H),
    // طول الكرانيش/الكورنيش في الأسقف = محيط الفراغ
    cornice_length: perimeter,
    count: 1,
  };
}

export const MEASURE_LABELS = {
  floor_area: { title: 'مساحة الأرضية', unit: 'م²' },
  ceiling_area: { title: 'مساحة السقف', unit: 'م²' },
  perimeter: { title: 'المحيط', unit: 'م.ط' },
  wall_area_gross: { title: 'مسطح الحوائط الإجمالي', unit: 'م²' },
  openings_area: { title: 'مسطح الفتحات', unit: 'م²' },
  wall_area_net: { title: 'مسطح الحوائط الصافي', unit: 'م²' },
  tiled_wall_area: { title: 'مسطح التجليد', unit: 'م²' },
  wall_area_above_tiles: { title: 'مسطح الدهان فوق التجليد', unit: 'م²' },
  skirting_length: { title: 'طول الوزرة', unit: 'م.ط' },
  waterproof_area: { title: 'مسطح العزل', unit: 'م²' },
  cornice_length: { title: 'طول الكرانيش', unit: 'م.ط' },
  count: { title: 'عدد', unit: 'عدد' },
};
