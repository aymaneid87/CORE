// ==========================================================
// متوسطات أسعار مواد البناء — تحديث يونيو 2026
// منقولة يدوياً من ملف PDF ممسوح (صور) — كل سطر عليه رقم الصفحة للمراجعة.
// الأسعار "بدون إضافات" (غير شاملة ضريبة القيمة المضافة).
//
// تنبيه عن المصدر: الملف عليه شعار جهة تدريب/تجميع وعنوانه "متوسطات أسعار"،
// ومش على ورق المركز القومي لبحوث الإسكان الرسمي — راجع المصدر قبل الاعتماد النهائي.
//
// use:
//   'product'   = بيتضاف كمنتج عام في الكتالوج بسعره (مقارنة مباشرة بنفس وحدة الحصر)
// printed/section: الاسم والقسم زي ما هما مطبوعين بالظبط (لو مختلفين عن name) — بيُستخدموا لمطابقة النشرات الجاية
//   'benchmark' = سعر مرجعي لبند مركّب (زي توريد وعمل دهانات) بيتقارن بتكلفة المقايسة
// ==========================================================

import { stripRegion, itemKey } from '../../bulletin-import/normalize.js';

export const BULLETIN = {
  id: 'bulletin-2026-06',
  title: 'متوسطات أسعار مواد البناء — تحديث يونيو 2026',
  effective_date: '2026-06-01',
  vat_included: false,
  source_note: 'ملف PDF ممسوح مرفوع من المستخدم — عليه شعار جهة تجميع، ولم يتم التأكد أنه النشرة الرسمية للمركز القومي لبحوث الإسكان والبناء',
};

export const REGIONS = {
  cairo: 'القاهرة الكبرى',
  upper: 'الصعيد والبحر الأحمر وجنوب سيناء',
};

const B = 'نشرة يونيو 2026';

// نفس مفتاح المنتج اللي بيستخدمه استيراد النشرات (lib/bulletin-import) — عشان مقارنة الأسعار بين النشرات
const compact = s => s.replace(/\s+/g, '');
function bulletinKey(i) {
  const printed = i.printed || i.name;
  const n = stripRegion(printed);
  return /\d/.test(n) || n.split(' ').length >= 4 ? compact(n) : compact(itemKey(i.section || '', printed));
}

export const BULLETIN_ITEMS = [
  // ---------- مصنعيات (ص 3) ----------
  { page: 3, name: 'مصنعيات سيراميك بدون وزر بالقاهرة', unit: 'م2', price: 130, region: 'cairo', use: 'product', category: 'labor_floor_tiling', is_default: true, label: 'مصنعية سيراميك أرضيات (بدون وزرة)' },
  { page: 3, name: 'مصنعيات سيراميك بدون وزر بالصعيد', unit: 'م2', price: 150, region: 'upper', use: 'product', category: 'labor_floor_tiling', is_default: true, label: 'مصنعية سيراميك أرضيات (بدون وزرة)' },
  { page: 3, name: 'مصنعيات ارضيات بورسلين بدون وزر بالقاهرة', unit: 'م2', price: 150, region: 'cairo', use: 'product', category: 'labor_porcelain_tiling', is_default: true, label: 'مصنعية بورسلين أرضيات (بدون وزرة)' },
  { page: 3, name: 'مصنعيات ارضيات بورسلين بدون وزر بالصعيد', unit: 'م2', price: 170, region: 'upper', use: 'product', category: 'labor_porcelain_tiling', is_default: true, label: 'مصنعية بورسلين أرضيات (بدون وزرة)' },
  { page: 3, name: 'مصنعية وزر بالقاهرة', unit: 'م.ط', price: 36, region: 'cairo', use: 'product', category: 'labor_skirting', is_default: true, label: 'مصنعية وزرة' },
  { page: 3, name: 'مصنعيات وزر بالصعيد', unit: 'م.ط', price: 30, region: 'upper', use: 'product', category: 'labor_skirting', is_default: true, label: 'مصنعية وزرة' },
  // شاملة الوزرة → مش افتراضي عشان مصنعية الوزرة ما تتحسبش مرتين
  { page: 3, name: 'مصنعيات تركيب رخام 2سم ارضيات شاملة التشطيب والوزر', unit: 'م2', price: 360, region: 'cairo', use: 'product', category: 'labor_marble', is_default: false, label: 'تركيب رخام 2سم أرضيات (شامل التشطيب والوزرة — لا تضف مصنعية وزرة)' },
  { page: 3, name: 'مصنعيات تركيب رخام 2سم ارضيات شاملة التشطيب والوزر بالصعيد', unit: 'م2', price: 390, region: 'upper', use: 'product', category: 'labor_marble', is_default: false, label: 'تركيب رخام 2سم أرضيات (شامل التشطيب والوزرة — لا تضف مصنعية وزرة)' },
  { page: 3, name: 'توريد وتركيب أسقف كناوف ابيض افقي بدون ابواب كشف بالقاهرة', unit: 'م2', price: 740, region: 'cairo', use: 'product', category: 'gypsum_board_ceiling', is_default: true, label: 'سقف كناوف أبيض أفقي (توريد وتركيب، بدون أبواب كشف)' },
  { page: 3, name: 'توريد وتركيب اسقف كناوف ابيض افقي بدون ابواب كشف بالصعيد', unit: 'م2', price: 840, region: 'upper', use: 'product', category: 'gypsum_board_ceiling', is_default: true, label: 'سقف كناوف أبيض أفقي (توريد وتركيب، بدون أبواب كشف)' },
  { page: 3, name: 'توريد وتركيب كرانيش فيوتيك بالقاهرة', unit: 'م.ط', price: 120, region: 'cairo', use: 'product', category: 'gypsum_cornice', is_default: false, label: 'كرانيش فيوتيك (توريد وتركيب)' },
  { page: 3, name: 'توريد وتركيب كرانيش فيوتيك بالصعيد', unit: 'م.ط', price: 140, region: 'upper', use: 'product', category: 'gypsum_cornice', is_default: false, label: 'كرانيش فيوتيك (توريد وتركيب)' },
  { page: 3, name: 'توريد وعمل دهانات بلاستيك داخلية', unit: 'م2', price: 180, region: 'cairo', use: 'benchmark', benchmark: 'interior_plastic_paint' },
  { page: 3, name: 'توريد وعمل دهانات بلاستيك داخلية بالصعيد والبحر الأحمر وجنوب سيناء', unit: 'م2', price: 200, region: 'upper', use: 'benchmark', benchmark: 'interior_plastic_paint' },

  // ---------- سيراميك ورخام (ص 5) — بالمتر المربع ----------
  { page: 5, name: 'سيراميك حوائط 25*50سم', section: 'سيراميك حوائط', printed: 'حوائط 25*50سم', unit: 'م2', price: 118, use: 'product', category: 'tile_ceramic_wall', is_default: true, label: 'سيراميك حوائط 25×50 سم' },
  { page: 5, name: 'سيراميك حوائط 31*63سم', section: 'سيراميك حوائط', printed: 'حوائط31*63سم', unit: 'م2', price: 140, use: 'product', category: 'tile_ceramic_wall', label: 'سيراميك حوائط 31×63 سم' },
  { page: 5, name: 'سيراميك حوائط 20*63سم', section: 'سيراميك حوائط', printed: 'حوائط20*63سم', unit: 'م2', price: 140, use: 'product', category: 'tile_ceramic_wall', label: 'سيراميك حوائط 20×63 سم' },
  { page: 5, name: 'سيراميك ارضيات 40×40 سم', section: 'سيراميك ارضيات', printed: 'ارضيات 40×40 سم', unit: 'م2', price: 150, use: 'product', category: 'tile_ceramic_floor', is_default: true, label: 'سيراميك أرضيات 40×40 سم' },
  { page: 5, name: 'سيراميك ارضيات 50×50 سم', section: 'سيراميك ارضيات', printed: 'ارضيات 50×50 سم', unit: 'م2', price: 140, use: 'product', category: 'tile_ceramic_floor', label: 'سيراميك أرضيات 50×50 سم' },
  { page: 5, name: 'سيراميك ارضيات 60×60 سم', section: 'سيراميك ارضيات', printed: 'ارضيات 60×60 سم', unit: 'م2', price: 136, use: 'product', category: 'tile_ceramic_floor', label: 'سيراميك أرضيات 60×60 سم' },
  { page: 5, name: 'رخام ترابيع 40×40×2 سم — جلالة لايت', section: 'الرخام (ترابيع) ترابيع الرخام 40×40 × 2 سم', printed: 'جلالة لايت', unit: 'م2', price: 517, use: 'product', category: 'marble_floor', label: 'رخام جلالة لايت ترابيع 40×40×2' },
  { page: 5, name: 'رخام ترابيع 40×40×2 سم — جلالة عادة', section: 'الرخام (ترابيع) ترابيع الرخام 40×40 × 2 سم', printed: 'جلالة عادة', unit: 'م2', price: 440, use: 'product', category: 'marble_floor', is_default: true, label: 'رخام جلالة عادة ترابيع 40×40×2' },
  { page: 5, name: 'رخام ترابيع 40×40×2 سم — تريستا', section: 'الرخام (ترابيع) ترابيع الرخام 40×40 × 2 سم', printed: 'تريستا', unit: 'م2', price: 630, use: 'product', category: 'marble_floor', label: 'رخام تريستا ترابيع 40×40×2' },
  { page: 5, name: 'رخام ترابيع 40×40×2 سم — جلالة بفص', section: 'الرخام (ترابيع) ترابيع الرخام 40×40 × 2 سم', printed: 'جلالة بفص', unit: 'م2', price: 560, use: 'product', category: 'marble_floor', label: 'رخام جلالة بفص ترابيع 40×40×2' },

  // ---------- HDF (ص 9) ----------
  { page: 9, name: 'ألواح قشرة قرو أزان سمك 8مم تركي (كلاس 21)', unit: 'م2', price: 510, use: 'product', category: 'hdf_floor', label: 'HDF 8مم تركي كلاس 21' },
  { page: 9, name: 'ألواح قشرة قرو أزان سمك 8مم تركي (كلاس 31)', unit: 'م2', price: 550, use: 'product', category: 'hdf_floor', is_default: true, label: 'HDF 8مم تركي كلاس 31' },
  { page: 9, name: 'ألواح قشرة قرو أزان سمك 8مم تركي (كلاس 32)', unit: 'م2', price: 565, use: 'product', category: 'hdf_floor', label: 'HDF 8مم تركي كلاس 32' },
  { page: 9, name: 'ألواح قشرة قرو أزان سمك 8مم ألماني', printed: 'ألواح قشرة قرو أزان سمك 8مم ألماني (معامل الاحتكاك C2)', unit: 'م2', price: 740, use: 'product', category: 'hdf_floor', label: 'HDF 8مم ألماني' },
  { page: 9, name: 'وزرة 8سم سمك 10مم', section: 'الأرضيات الخشبية HDF', unit: 'م.ط', price: 110, use: 'product', category: 'skirting_hdf', is_default: true, label: 'وزرة HDF 8 سم' },

  // ---------- عزل (ص 9) — خامة فقط ----------
  { page: 9, name: 'عازل للرطوبة ذو أساس بيتوميني ومسلح بالبوليستر سمك 3مم', unit: 'م2', price: 140, use: 'product', category: 'waterproofing', label: 'لفائف بيتومين مسلح بوليستر 3مم (خامة فقط)' },
  { page: 9, name: 'عازل للرطوبة ذو أساس بيتوميني ومسلح بالألياف الزجاجية (الفايبر جلاس) سمك 3مم', printed: 'عازل للرطوبة ذو أساس بيتوميني ومسلح بالألياف الزجاجية(الفايبر جلاس) سمك 3مم', unit: 'م2', price: 124, use: 'product', category: 'waterproofing', label: 'لفائف بيتومين مسلح فايبر جلاس 3مم (خامة فقط)' },
];

// مرجع البنود المركّبة: بيتقارن بمتوسط تكلفة المتر في المقايسة
export const BENCHMARK_DEFS = {
  interior_plastic_paint: {
    title: 'توريد وعمل دهانات بلاستيك داخلية',
    unit: 'م²',
    // كل سطور منظومة الدهان (معجون + سيلر + أوجه + مصنعية) في اختيار الدهان للحوائط والأسقف
    selectors: [
      { templateCode: 'wall_finish', groupCode: 'wall_type', optionCode: 'paint', measureKey: 'wall_area_net' },
      { templateCode: 'ceiling_finish', groupCode: 'ceiling_type', optionCode: 'paint', measureKey: 'ceiling_area' },
    ],
  },
};

// المنتجات العامة اللي بتتولّد من النشرة
export function bulletinProducts() {
  return BULLETIN_ITEMS
    .filter(i => i.use === 'product')
    .map((i, n) => ({
      id: `bulletin-2026-06-${String(n + 1).padStart(3, '0')}`,
      category_code: i.category,
      brand: B,
      model: i.region ? REGIONS[i.region] : null,
      name: i.label,
      unit: i.unit === 'م2' ? 'م²' : i.unit,
      coverage: 1,
      sold_by_pack: false,
      is_default: !!i.is_default,
      is_sample: false,
      active: true,
      price: i.price,
      price_date: BULLETIN.effective_date,
      specs: { region: i.region || null, source: BULLETIN.id, page: i.page, source_name: i.printed || i.name, bulletin_key: bulletinKey(i) },
    }));
}

export function bulletinBenchmarks() {
  return BULLETIN_ITEMS
    .filter(i => i.use === 'benchmark')
    .map(i => ({ code: i.benchmark, region: i.region || null, price: i.price, source: BULLETIN.id, page: i.page, ...BENCHMARK_DEFS[i.benchmark] }));
}
