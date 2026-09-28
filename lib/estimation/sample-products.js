// ==========================================================
// أسعار تقديرية من السوق المصري — سبتمبر 2026
// متوسطات مبنية على أسعار معارض وتجار منشورة (المشرقي، سباكة شوب، مواقع تكاليف التشطيب)
// + نشرة متوسطات أسعار يونيو 2026 للمصنعيات والسيراميك والرخام. غير شاملة الضريبة.
// كل سعر هنا قابل للتعديل من صفحة الكتالوج (تعديل سعر منتج أو نسبة لمجموعة كاملة)،
// والنظام بيعلّم المقايسة إنها مبنية على أسعار تقديرية لحد ما تتأكد من الموردين.
//
// التعبير في الكود: is_sample = true معناها "سعر تقديري" (مش سعر مورد معتمد)
//
// coverage = كمية الحصر اللي بتغطيها وحدة تسعير واحدة (لكل وش)
//   مثال: كرتونة بورسلين 60×60 فيها 4 بلاطات = 1.44 م²
//   مثال: بستلة بلاستيك 9 لتر × ~9 م²/لتر = ~80 م² للوش
// sold_by_pack = بيتباع بعبوات كاملة (الإجمالي بيتقرّب لأعلى)
// ==========================================================

import { CATEGORY_BY_CODE } from './categories.js';

const T = { eco: 'تقديري — اقتصادي', mid: 'تقديري — متوسط', lux: 'تقديري — فاخر' };

const tiers = (category_code, name, prices, extra = {}) =>
  Object.entries(prices).map(([tier, price], i) => ({
    category_code, brand: T[tier], model: tier.toUpperCase(), name, price, is_default: i === 0 && extra.defaultFirst !== false, ...extra,
  }));

export const SAMPLE_PRODUCTS = [
  // سباكة تأسيس (خامة + مصنعية)
  { category_code: 'plumb_water_point', brand: 'تقديري', model: 'PPR', name: 'نقطة مياه مواسير PPR (خامة + مصنعية)', price: 900, is_default: true },
  { category_code: 'plumb_drain_point', brand: 'تقديري', model: 'PVC', name: 'نقطة صرف PVC (خامة + مصنعية)', price: 750, is_default: true },
  { category_code: 'plumb_floor_drain', brand: 'تقديري', model: 'STD', name: 'سيفون أرضية ستانلس', price: 600, is_default: true },
  { category_code: 'plumb_heater_point', brand: 'تقديري', model: 'STD', name: 'نقطة سخان', price: 900, is_default: true },
  ...tiers('concealed_cistern', 'صندوق دفن + شاسيه', { mid: 11000, lux: 19000 }),
  ...tiers('concealed_mixer_body', 'جسم خلاط دفن', { mid: 4000, lux: 7500 }),

  // أدوات صحية
  ...tiers('toilet_floor', 'قاعدة أرضية بالصندوق', { eco: 4000, mid: 7500, lux: 16000 }),
  ...tiers('toilet_wall_hung', 'قاعدة معلقة + غطاء', { mid: 8500, lux: 18000 }),
  ...tiers('flush_plate', 'زرار صندوق دفن', { mid: 2000, lux: 5500 }),
  ...tiers('bathtub_freestanding', 'بانيو فري ستاند 170 سم', { mid: 35000, lux: 80000 }),
  ...tiers('bathtub_builtin', 'بانيو أكريليك 170 سم', { eco: 5500, mid: 9000 }),
  ...tiers('shower_tray', 'قاعدة شاور 90×90', { eco: 3000, mid: 6000 }),
  ...tiers('shower_enclosure', 'كابينة سيكوريت 8 مم (90×90)', { mid: 14000, lux: 28000 }),
  ...tiers('basin_pedestal', 'حوض بعمود', { eco: 2200, mid: 4000 }),
  ...tiers('basin_wall_hung', 'حوض معلق', { mid: 4500, lux: 10000 }),
  ...tiers('basin_vanity', 'وحدة حوض 80 سم', { mid: 12000, lux: 28000 }),
  ...tiers('bidet_shattaf', 'شطاف', { eco: 400, mid: 1000, lux: 2800 }),
  ...tiers('kitchen_sink', 'حوض مطبخ ستانلس', { eco: 2500, mid: 5000 }),

  // خلاطات
  ...tiers('concealed_mixer_trim', 'وش خلاط دفن + دش مطري', { mid: 8000, lux: 18000 }),
  ...tiers('exposed_shower_mixer', 'خلاط شاور خارجي', { eco: 2000, mid: 4500, lux: 10000 }),
  ...tiers('floor_tub_mixer', 'خلاط بانيو أرضي', { mid: 16000, lux: 35000 }),
  ...tiers('basin_mixer', 'خلاط حوض', { eco: 1400, mid: 3200, lux: 8000 }),
  ...tiers('basin_mixer_concealed', 'وش خلاط حوض حائط', { mid: 4000, lux: 10000 }),
  ...tiers('kitchen_mixer', 'خلاط مطبخ', { eco: 1700, mid: 4000 }),

  // سخانات
  ...tiers('water_heater_electric', 'سخان كهرباء 50 لتر', { eco: 3400, mid: 4500 }),
  ...tiers('water_heater_gas', 'سخان غاز 10 لتر', { eco: 5500, mid: 8000 }),

  // أرضيات (كراتين)
  ...tiers('tile_ceramic_floor', 'سيراميك 40×40 (كرتونة 1.6 م²)', { eco: 240, mid: 370 }, { unit: 'كرتونة', coverage: 1.6, sold_by_pack: true }),
  ...tiers('tile_porcelain_floor', 'بورسلين 60×60 (كرتونة 1.44 م²)', { eco: 290, mid: 575, lux: 1150 }, { unit: 'كرتونة', coverage: 1.44, sold_by_pack: true }),
  ...tiers('marble_floor', 'رخام محلي', { eco: 450, mid: 650 }, { unit: 'م²', coverage: 1 }),
  ...tiers('hdf_floor', 'باركيه HDF 8 مم', { eco: 520, mid: 750 }, { unit: 'م²', coverage: 1 }),
  ...tiers('skirting_tile', 'وزرة بورسلين', { eco: 60, mid: 100 }, { unit: 'م.ط', coverage: 1 }),
  ...tiers('skirting_marble', 'وزرة رخام', { eco: 150, mid: 260 }, { unit: 'م.ط', coverage: 1 }),
  ...tiers('skirting_hdf', 'وزرة HDF', { eco: 110 }, { unit: 'م.ط', coverage: 1 }),

  // حوائط
  ...tiers('tile_ceramic_wall', 'سيراميك حوائط 30×60 (كرتونة 1.44 م²)', { eco: 180, mid: 320 }, { unit: 'كرتونة', coverage: 1.44, sold_by_pack: true }),

  // دهانات (بستلة — coverage للوش الواحد)
  ...tiers('paint_putty', 'معجون أكريلك 15 كجم', { eco: 450, mid: 700 }, { unit: 'بستلة', coverage: 30, sold_by_pack: true }),
  ...tiers('paint_sealer', 'سيلر مائي 9 لتر', { eco: 550, mid: 850 }, { unit: 'بستلة', coverage: 90, sold_by_pack: true }),
  ...tiers('paint_topcoat', 'بلاستيك مطفي 9 لتر', { eco: 850, mid: 1450, lux: 2600 }, { unit: 'بستلة', coverage: 80, sold_by_pack: true }),

  // أسقف
  ...tiers('gypsum_board_ceiling', 'جبس بورد عادي (توريد وتركيب)', { eco: 450, mid: 650 }, { unit: 'م²', coverage: 1 }),
  ...tiers('gypsum_cornice', 'كرانيش جبس', { eco: 110, mid: 180 }, { unit: 'م.ط', coverage: 1 }),

  // عزل
  ...tiers('waterproofing', 'عزل أسمنتي 2 وش (توريد وعمل)', { eco: 200, mid: 320 }, { unit: 'م²', coverage: 1 }),

  // مصنعيات
  { category_code: 'labor_floor_tiling', brand: 'تقديري', model: 'STD', name: 'تركيب سيراميك أرضيات (شامل المونة)', price: 140, unit: 'م²', is_default: true },
  { category_code: 'labor_wall_tiling', brand: 'تقديري', model: 'STD', name: 'تجليد حوائط', price: 160, unit: 'م²', is_default: true },
  { category_code: 'labor_marble', brand: 'تقديري', model: 'STD', name: 'تركيب رخام (بدون وزرة)', price: 330, unit: 'م²', is_default: true },
  { category_code: 'labor_hdf', brand: 'تقديري', model: 'STD', name: 'تركيب باركيه', price: 100, unit: 'م²', is_default: true },
  { category_code: 'labor_skirting', brand: 'تقديري', model: 'STD', name: 'تركيب وزرة', price: 40, unit: 'م.ط', is_default: true },
  { category_code: 'labor_paint', brand: 'تقديري', model: 'STD', name: 'مصنعية دهان كاملة (معجون + سيلر + أوجه)', price: 110, unit: 'م²', is_default: true },
  { category_code: 'labor_fixture_install', brand: 'تقديري', model: 'STD', name: 'تركيب قطعة صحية', price: 400, unit: 'عدد', is_default: true },
  { category_code: 'labor_bathtub_masonry', brand: 'تقديري', model: 'STD', name: 'مباني + تجليد جوانب بانيو', price: 3500, unit: 'عدد', is_default: true },

  // ⚠️ أضف أي منتج جديد في الآخر بس — الـ id بيتولّد من الترتيب، وتغيير الترتيب بيبوّظ المقايسات المحفوظة
  { category_code: 'labor_porcelain_tiling', brand: 'تقديري', model: 'STD', name: 'تركيب بورسلين (شامل المونة)', price: 170, unit: 'م²', is_default: true },
].map((p, i) => ({
  id: `sample-${String(i + 1).padStart(3, '0')}`,
  unit: CATEGORY_BY_CODE[p.category_code].unit,
  coverage: 1,
  sold_by_pack: false,
  ...p,
  is_sample: true,
  active: true,
}));
