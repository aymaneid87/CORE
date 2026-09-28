// ==========================================================
// تصنيفات الخامات والمصنعيات
// المصدر الوحيد للتصنيفات — ملف الـ seed بيتولّد منه تلقائي (scripts/generate-seed.mjs)
//
// kind:
//   material = خامة بتتحسب بالمسطح/الطول وليها هالك
//   fixture  = جهاز/قطعة (قاعدة، خلاط، بانيو ...) بالعدد
//   labor    = مصنعية
//   rough    = بند تأسيس (خامة + مصنعية) بالنقطة
// unit: وحدة التسعير في قائمة الأسعار
// measure_unit: وحدة الحصر اللي بتطلع من الرسومات
// default_waste_pct: نسبة الهالك الافتراضية (بتتطبق على الخامات بس)
// ==========================================================

export const CATEGORY_GROUPS = {
  plumbing_rough: 'سباكة — تأسيس',
  sanitary: 'أدوات صحية',
  mixers: 'خلاطات وإكسسوارات',
  heaters: 'سخانات',
  floors: 'أرضيات',
  walls: 'حوائط وتجليد',
  paints: 'دهانات',
  ceilings: 'أسقف',
  insulation: 'عزل',
  labor: 'مصنعيات',
};

export const CATEGORIES = [
  // ---------- سباكة تأسيس ----------
  { code: 'plumb_water_point', group: 'plumbing_rough', title: 'نقطة تغذية مياه (بارد/ساخن)', kind: 'rough', unit: 'نقطة', measure_unit: 'نقطة', default_waste_pct: 0 },
  { code: 'plumb_drain_point', group: 'plumbing_rough', title: 'نقطة صرف', kind: 'rough', unit: 'نقطة', measure_unit: 'نقطة', default_waste_pct: 0 },
  { code: 'plumb_floor_drain', group: 'plumbing_rough', title: 'سيفون أرضية (بيبة)', kind: 'rough', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'plumb_heater_point', group: 'plumbing_rough', title: 'نقطة سخان (دخول/خروج)', kind: 'rough', unit: 'نقطة', measure_unit: 'نقطة', default_waste_pct: 0 },
  { code: 'concealed_cistern', group: 'plumbing_rough', title: 'صندوق طرد دفن + شاسيه (للقاعدة المعلقة)', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'concealed_mixer_body', group: 'plumbing_rough', title: 'جسم خلاط دفن (يتركب في التأسيس)', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },

  // ---------- أدوات صحية ----------
  { code: 'toilet_floor', group: 'sanitary', title: 'قاعدة أرضية (عادية)', kind: 'fixture', unit: 'طقم', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'toilet_wall_hung', group: 'sanitary', title: 'قاعدة معلقة', kind: 'fixture', unit: 'طقم', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'flush_plate', group: 'sanitary', title: 'زرار (لوحة) صندوق الدفن', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'bathtub_freestanding', group: 'sanitary', title: 'بانيو فري ستاند', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'bathtub_builtin', group: 'sanitary', title: 'بانيو عادي (مبني)', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'shower_tray', group: 'sanitary', title: 'قاعدة شاور', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'shower_enclosure', group: 'sanitary', title: 'كابينة شاور زجاج', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'basin_pedestal', group: 'sanitary', title: 'حوض بعمود', kind: 'fixture', unit: 'طقم', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'basin_wall_hung', group: 'sanitary', title: 'حوض معلق', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'basin_vanity', group: 'sanitary', title: 'حوض + وحدة (فانيتي)', kind: 'fixture', unit: 'طقم', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'bidet_shattaf', group: 'sanitary', title: 'شطاف', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'kitchen_sink', group: 'sanitary', title: 'حوض مطبخ', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },

  // ---------- خلاطات ----------
  { code: 'concealed_mixer_trim', group: 'mixers', title: 'وش خلاط دفن + طقم دش', kind: 'fixture', unit: 'طقم', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'exposed_shower_mixer', group: 'mixers', title: 'خلاط شاور/بانيو عادي (خارجي)', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'floor_tub_mixer', group: 'mixers', title: 'خلاط بانيو أرضي (للفري ستاند)', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'basin_mixer', group: 'mixers', title: 'خلاط حوض عادي', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'basin_mixer_concealed', group: 'mixers', title: 'خلاط حوض حائط دفن (وش)', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'kitchen_mixer', group: 'mixers', title: 'خلاط مطبخ', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },

  // ---------- سخانات ----------
  { code: 'water_heater_electric', group: 'heaters', title: 'سخان كهرباء', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'water_heater_gas', group: 'heaters', title: 'سخان غاز', kind: 'fixture', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },

  // ---------- أرضيات ----------
  { code: 'tile_ceramic_floor', group: 'floors', title: 'سيراميك أرضيات', kind: 'material', unit: 'كرتونة', measure_unit: 'م²', default_waste_pct: 7 },
  { code: 'tile_porcelain_floor', group: 'floors', title: 'بورسلين أرضيات', kind: 'material', unit: 'كرتونة', measure_unit: 'م²', default_waste_pct: 7 },
  { code: 'marble_floor', group: 'floors', title: 'رخام أرضيات', kind: 'material', unit: 'م²', measure_unit: 'م²', default_waste_pct: 10 },
  { code: 'hdf_floor', group: 'floors', title: 'باركيه HDF', kind: 'material', unit: 'م²', measure_unit: 'م²', default_waste_pct: 5 },
  { code: 'skirting_tile', group: 'floors', title: 'وزرة سيراميك/بورسلين', kind: 'material', unit: 'م.ط', measure_unit: 'م.ط', default_waste_pct: 5 },
  { code: 'skirting_marble', group: 'floors', title: 'وزرة رخام', kind: 'material', unit: 'م.ط', measure_unit: 'م.ط', default_waste_pct: 5 },
  { code: 'skirting_hdf', group: 'floors', title: 'وزرة HDF', kind: 'material', unit: 'م.ط', measure_unit: 'م.ط', default_waste_pct: 5 },

  // ---------- حوائط ----------
  { code: 'tile_ceramic_wall', group: 'walls', title: 'سيراميك حوائط', kind: 'material', unit: 'كرتونة', measure_unit: 'م²', default_waste_pct: 8 },

  // ---------- دهانات ----------
  { code: 'paint_putty', group: 'paints', title: 'معجون', kind: 'material', unit: 'بستلة', measure_unit: 'م²', default_waste_pct: 5 },
  { code: 'paint_sealer', group: 'paints', title: 'سيلر (أساس)', kind: 'material', unit: 'بستلة', measure_unit: 'م²', default_waste_pct: 5 },
  { code: 'paint_topcoat', group: 'paints', title: 'دهان بلاستيك (وش نهائي)', kind: 'material', unit: 'بستلة', measure_unit: 'م²', default_waste_pct: 5 },

  // ---------- أسقف ----------
  { code: 'gypsum_board_ceiling', group: 'ceilings', title: 'سقف جبس بورد (توريد وتركيب)', kind: 'material', unit: 'م²', measure_unit: 'م²', default_waste_pct: 0 },
  { code: 'gypsum_cornice', group: 'ceilings', title: 'كرانيش جبس', kind: 'material', unit: 'م.ط', measure_unit: 'م.ط', default_waste_pct: 5 },

  // ---------- عزل ----------
  { code: 'waterproofing', group: 'insulation', title: 'عزل مائي (أرضية + رفرف)', kind: 'material', unit: 'م²', measure_unit: 'م²', default_waste_pct: 5 },

  // ---------- مصنعيات ----------
  { code: 'labor_floor_tiling', group: 'labor', title: 'مصنعية تركيب أرضيات سيراميك/بورسلين', kind: 'labor', unit: 'م²', measure_unit: 'م²', default_waste_pct: 0 },
  { code: 'labor_wall_tiling', group: 'labor', title: 'مصنعية تجليد حوائط', kind: 'labor', unit: 'م²', measure_unit: 'م²', default_waste_pct: 0 },
  { code: 'labor_marble', group: 'labor', title: 'مصنعية تركيب رخام', kind: 'labor', unit: 'م²', measure_unit: 'م²', default_waste_pct: 0 },
  { code: 'labor_hdf', group: 'labor', title: 'مصنعية تركيب باركيه', kind: 'labor', unit: 'م²', measure_unit: 'م²', default_waste_pct: 0 },
  { code: 'labor_skirting', group: 'labor', title: 'مصنعية تركيب وزرة', kind: 'labor', unit: 'م.ط', measure_unit: 'م.ط', default_waste_pct: 0 },
  { code: 'labor_paint', group: 'labor', title: 'مصنعية دهانات (معجون + سيلر + أوجه)', kind: 'labor', unit: 'م²', measure_unit: 'م²', default_waste_pct: 0 },
  { code: 'labor_fixture_install', group: 'labor', title: 'مصنعية تركيب قطعة صحية', kind: 'labor', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
  { code: 'labor_bathtub_masonry', group: 'labor', title: 'مباني وتجليد جوانب البانيو', kind: 'labor', unit: 'عدد', measure_unit: 'عدد', default_waste_pct: 0 },
];

export const CATEGORY_BY_CODE = Object.fromEntries(CATEGORIES.map(c => [c.code, c]));
