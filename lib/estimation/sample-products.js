// ==========================================================
// منتجات تجريبية لكل تصنيف — للتجربة فقط!
// الأسعار هنا تقديرية ومعلّمة is_sample = true، والنظام بيطلّع تحذير على أي مقايسة بتستخدمها.
// الأسعار الحقيقية لازم تيجي من قوائم أسعار الموردين المعتمدة.
//
// coverage = كمية الحصر اللي بتغطيها وحدة تسعير واحدة (لكل وش)
//   مثال: كرتونة بورسلين 60×60 فيها 4 بلاطات = 1.44 م²
//   مثال: بستلة بلاستيك 9 لتر × ~9 م²/لتر = ~80 م² للوش
// sold_by_pack = بيتباع بعبوات كاملة (الإجمالي بيتقرّب لأعلى)
// ==========================================================

import { CATEGORY_BY_CODE } from './categories.js';

const T = { eco: 'عينة — اقتصادي', mid: 'عينة — متوسط', lux: 'عينة — فاخر' };

const tiers = (category_code, name, prices, extra = {}) =>
  Object.entries(prices).map(([tier, price], i) => ({
    category_code, brand: T[tier], model: tier.toUpperCase(), name, price, is_default: i === 0 && extra.defaultFirst !== false, ...extra,
  }));

export const SAMPLE_PRODUCTS = [
  // سباكة تأسيس (خامة + مصنعية)
  { category_code: 'plumb_water_point', brand: 'عينة', model: 'PPR', name: 'نقطة مياه مواسير PPR', price: 650, is_default: true },
  { category_code: 'plumb_drain_point', brand: 'عينة', model: 'PVC', name: 'نقطة صرف PVC', price: 550, is_default: true },
  { category_code: 'plumb_floor_drain', brand: 'عينة', model: 'STD', name: 'سيفون أرضية ستانلس', price: 450, is_default: true },
  { category_code: 'plumb_heater_point', brand: 'عينة', model: 'STD', name: 'نقطة سخان', price: 700, is_default: true },
  ...tiers('concealed_cistern', 'صندوق دفن + شاسيه', { mid: 9500, lux: 16000 }),
  ...tiers('concealed_mixer_body', 'جسم خلاط دفن', { mid: 2800, lux: 6500 }),

  // أدوات صحية
  ...tiers('toilet_floor', 'قاعدة أرضية بالصندوق', { eco: 3200, mid: 6500, lux: 14000 }),
  ...tiers('toilet_wall_hung', 'قاعدة معلقة + غطاء', { mid: 7500, lux: 18000 }),
  ...tiers('flush_plate', 'زرار صندوق دفن', { mid: 1500, lux: 4500 }),
  ...tiers('bathtub_freestanding', 'بانيو فري ستاند 170 سم', { mid: 38000, lux: 85000 }),
  ...tiers('bathtub_builtin', 'بانيو أكريليك 170 سم', { eco: 5500, mid: 9000 }),
  ...tiers('shower_tray', 'قاعدة شاور 90×90', { eco: 2500, mid: 5500 }),
  ...tiers('shower_enclosure', 'كابينة سيكوريت 8 مم', { mid: 12000, lux: 25000 }),
  ...tiers('basin_pedestal', 'حوض بعمود', { eco: 1800, mid: 3500 }),
  ...tiers('basin_wall_hung', 'حوض معلق', { mid: 4000, lux: 9000 }),
  ...tiers('basin_vanity', 'وحدة حوض 80 سم', { mid: 11000, lux: 26000 }),
  ...tiers('bidet_shattaf', 'شطاف', { eco: 350, mid: 900, lux: 2500 }),
  ...tiers('kitchen_sink', 'حوض مطبخ ستانلس', { eco: 2200, mid: 4500 }),

  // خلاطات
  ...tiers('concealed_mixer_trim', 'وش خلاط دفن + دش مطري', { mid: 6500, lux: 18000 }),
  ...tiers('exposed_shower_mixer', 'خلاط شاور خارجي', { eco: 1800, mid: 3800, lux: 9000 }),
  ...tiers('floor_tub_mixer', 'خلاط بانيو أرضي', { mid: 14000, lux: 32000 }),
  ...tiers('basin_mixer', 'خلاط حوض', { eco: 1200, mid: 2800, lux: 7500 }),
  ...tiers('basin_mixer_concealed', 'وش خلاط حوض حائط', { mid: 3500, lux: 9000 }),
  ...tiers('kitchen_mixer', 'خلاط مطبخ', { eco: 1500, mid: 3500 }),

  // سخانات
  ...tiers('water_heater_electric', 'سخان كهرباء 50 لتر', { eco: 4500, mid: 7000 }),
  ...tiers('water_heater_gas', 'سخان غاز 10 لتر', { eco: 5500, mid: 8500 }),

  // أرضيات (كراتين)
  ...tiers('tile_ceramic_floor', 'سيراميك 40×40 (كرتونة 1.6 م²)', { eco: 280, mid: 420 }, { unit: 'كرتونة', coverage: 1.6, sold_by_pack: true }),
  ...tiers('tile_porcelain_floor', 'بورسلين 60×60 (كرتونة 1.44 م²)', { eco: 430, mid: 650, lux: 1150 }, { unit: 'كرتونة', coverage: 1.44, sold_by_pack: true }),
  ...tiers('marble_floor', 'رخام محلي', { eco: 900, mid: 1600 }, { unit: 'م²', coverage: 1 }),
  ...tiers('hdf_floor', 'باركيه HDF 8 مم', { eco: 420, mid: 650 }, { unit: 'م²', coverage: 1 }),
  ...tiers('skirting_tile', 'وزرة بورسلين', { eco: 60, mid: 95 }, { unit: 'م.ط', coverage: 1 }),
  ...tiers('skirting_marble', 'وزرة رخام', { eco: 150, mid: 260 }, { unit: 'م.ط', coverage: 1 }),
  ...tiers('skirting_hdf', 'وزرة HDF', { eco: 70 }, { unit: 'م.ط', coverage: 1 }),

  // حوائط
  ...tiers('tile_ceramic_wall', 'سيراميك حوائط 30×60 (كرتونة 1.44 م²)', { eco: 300, mid: 480 }, { unit: 'كرتونة', coverage: 1.44, sold_by_pack: true }),

  // دهانات (بستلة — coverage للوش الواحد)
  ...tiers('paint_putty', 'معجون أكريلك 15 كجم', { eco: 420, mid: 650 }, { unit: 'بستلة', coverage: 30, sold_by_pack: true }),
  ...tiers('paint_sealer', 'سيلر مائي 9 لتر', { eco: 520, mid: 800 }, { unit: 'بستلة', coverage: 90, sold_by_pack: true }),
  ...tiers('paint_topcoat', 'بلاستيك مطفي 9 لتر', { eco: 750, mid: 1350, lux: 2600 }, { unit: 'بستلة', coverage: 80, sold_by_pack: true }),

  // أسقف
  ...tiers('gypsum_board_ceiling', 'جبس بورد عادي (توريد وتركيب)', { eco: 380, mid: 480 }, { unit: 'م²', coverage: 1 }),
  ...tiers('gypsum_cornice', 'كرانيش جبس', { eco: 90, mid: 160 }, { unit: 'م.ط', coverage: 1 }),

  // عزل
  ...tiers('waterproofing', 'عزل أسمنتي 2 وش', { eco: 180, mid: 320 }, { unit: 'م²', coverage: 1 }),

  // مصنعيات
  { category_code: 'labor_floor_tiling', brand: 'عينة', model: 'STD', name: 'تركيب أرضيات (شامل المونة)', price: 180, unit: 'م²', is_default: true },
  { category_code: 'labor_wall_tiling', brand: 'عينة', model: 'STD', name: 'تجليد حوائط', price: 200, unit: 'م²', is_default: true },
  { category_code: 'labor_marble', brand: 'عينة', model: 'STD', name: 'تركيب رخام', price: 260, unit: 'م²', is_default: true },
  { category_code: 'labor_hdf', brand: 'عينة', model: 'STD', name: 'تركيب باركيه', price: 90, unit: 'م²', is_default: true },
  { category_code: 'labor_skirting', brand: 'عينة', model: 'STD', name: 'تركيب وزرة', price: 45, unit: 'م.ط', is_default: true },
  { category_code: 'labor_paint', brand: 'عينة', model: 'STD', name: 'مصنعية دهان كاملة', price: 85, unit: 'م²', is_default: true },
  { category_code: 'labor_fixture_install', brand: 'عينة', model: 'STD', name: 'تركيب قطعة صحية', price: 350, unit: 'عدد', is_default: true },
  { category_code: 'labor_bathtub_masonry', brand: 'عينة', model: 'STD', name: 'مباني + تجليد جوانب بانيو', price: 2500, unit: 'عدد', is_default: true },

  // ⚠️ أضف أي منتج جديد في الآخر بس — الـ id بيتولّد من الترتيب، وتغيير الترتيب بيبوّظ المقايسات المحفوظة
  { category_code: 'labor_porcelain_tiling', brand: 'عينة', model: 'STD', name: 'تركيب بورسلين (شامل المونة)', price: 200, unit: 'م²', is_default: true },
].map((p, i) => ({
  id: `sample-${String(i + 1).padStart(3, '0')}`,
  unit: CATEGORY_BY_CODE[p.category_code].unit,
  coverage: 1,
  sold_by_pack: false,
  ...p,
  is_sample: true,
  active: true,
}));
