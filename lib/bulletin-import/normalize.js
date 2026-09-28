// ==========================================================
// تطبيع نصوص النشرات: أرقام عربية، همزات، وحدات، مناطق
// الهدف: نفس البند في نشرتين مختلفتين يطلع له نفس المفتاح حتى لو الكتابة اختلفت شوية.
// ==========================================================

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toLatinDigits(s) {
  return String(s ?? '')
    .replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d))
    .replace(/[۰-۹]/g, d => FA_DIGITS.indexOf(d));
}

export function normalizeArabic(s) {
  return toLatinDigits(s)
    .replace(/[ً-ٰٟـ]/g, '') // تشكيل وتطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[×xX*]/g, '×')
    .replace(/[“”"'`()\[\]{}]/g, ' ')
    .replace(/\s*×\s*/g, '×')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// الوحدات بتتكتب بأشكال كتير في النشرات (م2، 2م، م²، م ٢ ...)
export function normalizeUnit(u) {
  const s = toLatinDigits(u).replace(/\s+/g, '').replace(/[²]/g, '2').replace(/[³]/g, '3');
  if (/^(م2|2م|متر2|مترمربع|م\.م)$/.test(s)) return 'م²';
  if (/^(م3|3م|متر3|مترمكعب)$/.test(s)) return 'م³';
  if (/^(م\.?ط|مط|مترطولي|م\/ط)$/.test(s)) return 'م.ط';
  if (/^(عدد|قطعة|قطعه|وحدة|وحده)$/.test(s)) return 'عدد';
  return String(u ?? '').trim();
}

// المنطقة بتتحدد من نص البند نفسه ("... بالقاهرة" / "... بالصعيد")
export function detectRegion(name) {
  const n = normalizeArabic(name);
  if (/(بالصعيد|الصعيد|البحر الاحمر|جنوب سيناء)/.test(n)) return 'upper';
  if (/(بالقاهره|القاهره)/.test(n)) return 'cairo';
  return null;
}

export function stripRegion(name) {
  return normalizeArabic(name)
    .replace(/(ب?الصعيد|و?البحر الاحمر|و?جنوب سيناء|ب?القاهره الكبري|ب?القاهره)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// مفتاح البند = القسم + الاسم بدون المنطقة
export function itemKey(section, name) {
  return `${normalizeArabic(section || '')}|${stripRegion(name)}`;
}

// السعر كما هو مطبوع ← رقم (بيقبل 1,250 و ١٢٥٠ و 7.5)
export function parsePriceText(t) {
  const s = toLatinDigits(t).replace(/[٬,\s]/g, '').replace(/٫/g, '.');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}
