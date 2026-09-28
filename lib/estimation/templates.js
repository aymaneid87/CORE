// ==========================================================
// شجرة اختيارات التشطيب (البنود)
//
// كل بند (template) = مجموعة أسئلة (groups)، وكل سؤال له اختيارات (options).
// كل اختيار بيولّد مكوّنات (components) — كل مكوّن مربوط بتصنيف (category)
// والمستخدم بيختار له منتج محدد (شركة + موديل + سعر) من قاعدة البيانات.
//
// phase: rough = تأسيس ، finish = تشطيب
// qty:   { fixed: n }  أو  { measure: '<مفتاح من spaceMeasures>', factor? }
// coats: عدد الأوجه (رقم ثابت أو { param: 'code' })
// when:  شرط ظهور سؤال/اختيار حسب إجابة سؤال تاني في نفس البند
// ==========================================================

export const SPACE_TYPES = {
  reception: 'ريسبشن / صالة',
  bedroom: 'غرفة نوم',
  bathroom: 'حمام',
  kitchen: 'مطبخ',
  corridor: 'طرقة / ممر',
  balcony: 'بلكونة / تراس',
  other: 'أخرى',
};

export const UNIT_TYPES = {
  apartment: 'شقة',
  duplex: 'دوبلكس',
  villa: 'فيلا',
  townhouse: 'تاون هاوس',
  chalet: 'شاليه',
  office: 'مكتب إداري',
};

export const PHASES = { rough: 'تأسيس', finish: 'تشطيب' };

const install = (code = 'install') => ({ code, phase: 'finish', category: 'labor_fixture_install', qty: { fixed: 1 } });
const waterPoints = (n, code = 'water_points') => ({ code, phase: 'rough', category: 'plumb_water_point', qty: { fixed: n } });
const drainPoint = (code = 'drain_point') => ({ code, phase: 'rough', category: 'plumb_drain_point', qty: { fixed: 1 } });

// منظومة دهان بلاستيك: معجون وشين + سيلر + أوجه نهائية + مصنعية
const paintSystem = measure => [
  { code: 'putty', phase: 'finish', category: 'paint_putty', qty: { measure }, coats: 2 },
  { code: 'sealer', phase: 'finish', category: 'paint_sealer', qty: { measure }, coats: 1 },
  { code: 'topcoat', phase: 'finish', category: 'paint_topcoat', qty: { measure }, coats: { param: 'topcoats' } },
  { code: 'paint_labor', phase: 'finish', category: 'labor_paint', qty: { measure } },
];

const topcoatsParam = { code: 'topcoats', title: 'عدد أوجه الدهان النهائي', unit: 'وش', default: 2, min: 1, max: 4, integer: true };

export const TEMPLATES = [
  // ------------------------------------------------------------------
  {
    code: 'floor_finish',
    title: 'الأرضيات',
    appliesTo: Object.keys(SPACE_TYPES),
    groups: [
      {
        code: 'floor_type', title: 'نوع الأرضية', default: 'porcelain',
        options: [
          { code: 'ceramic', title: 'سيراميك', components: [
            { code: 'tiles', phase: 'finish', category: 'tile_ceramic_floor', qty: { measure: 'floor_area' } },
            { code: 'labor', phase: 'finish', category: 'labor_floor_tiling', qty: { measure: 'floor_area' } },
          ] },
          { code: 'porcelain', title: 'بورسلين', components: [
            { code: 'tiles', phase: 'finish', category: 'tile_porcelain_floor', qty: { measure: 'floor_area' } },
            { code: 'labor', phase: 'finish', category: 'labor_floor_tiling', qty: { measure: 'floor_area' } },
          ] },
          { code: 'marble', title: 'رخام', components: [
            { code: 'marble', phase: 'finish', category: 'marble_floor', qty: { measure: 'floor_area' } },
            { code: 'labor', phase: 'finish', category: 'labor_marble', qty: { measure: 'floor_area' } },
          ] },
          { code: 'hdf', title: 'باركيه HDF', components: [
            { code: 'hdf', phase: 'finish', category: 'hdf_floor', qty: { measure: 'floor_area' } },
            { code: 'labor', phase: 'finish', category: 'labor_hdf', qty: { measure: 'floor_area' } },
          ] },
          { code: 'none', title: 'بدون (خارج نطاق العمل)', components: [] },
        ],
      },
      {
        code: 'skirting', title: 'الوزرة', default: 'tile',
        when: { group: 'floor_type', in: ['ceramic', 'porcelain', 'marble', 'hdf'] },
        options: [
          { code: 'tile', title: 'وزرة سيراميك/بورسلين', when: { group: 'floor_type', in: ['ceramic', 'porcelain'] }, components: [
            { code: 'skirting', phase: 'finish', category: 'skirting_tile', qty: { measure: 'skirting_length' } },
            { code: 'labor', phase: 'finish', category: 'labor_skirting', qty: { measure: 'skirting_length' } },
          ] },
          { code: 'marble', title: 'وزرة رخام', when: { group: 'floor_type', in: ['marble', 'porcelain'] }, components: [
            { code: 'skirting', phase: 'finish', category: 'skirting_marble', qty: { measure: 'skirting_length' } },
            { code: 'labor', phase: 'finish', category: 'labor_skirting', qty: { measure: 'skirting_length' } },
          ] },
          { code: 'hdf', title: 'وزرة HDF', when: { group: 'floor_type', in: ['hdf'] }, components: [
            { code: 'skirting', phase: 'finish', category: 'skirting_hdf', qty: { measure: 'skirting_length' } },
          ] },
          { code: 'none', title: 'بدون وزرة', components: [] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    code: 'wall_finish',
    title: 'الحوائط',
    appliesTo: Object.keys(SPACE_TYPES),
    params: [
      { code: 'tile_height', title: 'ارتفاع التجليد', unit: 'م', default: 1.6, min: 0.1, max: 12, when: { group: 'wall_type', in: ['tiles_partial'] } },
      { ...topcoatsParam, when: { group: 'wall_type', in: ['paint', 'tiles_partial'] } },
    ],
    // ارتفاع التجليد اللي هيتحسب بيه الحصر حسب الاختيار
    measureOptions: (sel, space) => ({
      tileHeight: sel.groups.wall_type === 'tiles_full' ? space.height
        : sel.groups.wall_type === 'tiles_partial' ? sel.params.tile_height
        : 0,
    }),
    groups: [
      {
        code: 'wall_type', title: 'تشطيب الحوائط', default: 'paint',
        options: [
          { code: 'paint', title: 'دهان بلاستيك', components: paintSystem('wall_area_net') },
          { code: 'tiles_full', title: 'تجليد سيراميك لحد السقف', components: [
            { code: 'tiles', phase: 'finish', category: 'tile_ceramic_wall', qty: { measure: 'tiled_wall_area' } },
            { code: 'labor', phase: 'finish', category: 'labor_wall_tiling', qty: { measure: 'tiled_wall_area' } },
          ] },
          { code: 'tiles_partial', title: 'تجليد لارتفاع معيّن + دهان فوقه', components: [
            { code: 'tiles', phase: 'finish', category: 'tile_ceramic_wall', qty: { measure: 'tiled_wall_area' } },
            { code: 'labor', phase: 'finish', category: 'labor_wall_tiling', qty: { measure: 'tiled_wall_area' } },
            ...paintSystem('wall_area_above_tiles'),
          ] },
          { code: 'none', title: 'بدون (خارج نطاق العمل)', components: [] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    code: 'ceiling_finish',
    title: 'الأسقف',
    appliesTo: Object.keys(SPACE_TYPES),
    params: [{ ...topcoatsParam, when: { group: 'ceiling_type', in: ['paint', 'gypsum'] } }],
    groups: [
      {
        code: 'ceiling_type', title: 'تشطيب السقف', default: 'paint',
        options: [
          { code: 'paint', title: 'دهان بلاستيك مباشر', components: paintSystem('ceiling_area') },
          { code: 'gypsum', title: 'سقف جبس بورد + دهان', components: [
            { code: 'board', phase: 'finish', category: 'gypsum_board_ceiling', qty: { measure: 'ceiling_area' } },
            ...paintSystem('ceiling_area'),
          ] },
          { code: 'none', title: 'بدون (خارج نطاق العمل)', components: [] },
        ],
      },
      {
        code: 'cornice', title: 'كرانيش', default: 'none',
        when: { group: 'ceiling_type', in: ['paint', 'gypsum'] },
        options: [
          { code: 'none', title: 'بدون', components: [] },
          { code: 'gypsum', title: 'كرانيش جبس', components: [
            { code: 'cornice', phase: 'finish', category: 'gypsum_cornice', qty: { measure: 'cornice_length' } },
          ] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    code: 'wet_waterproofing',
    title: 'العزل المائي',
    appliesTo: ['bathroom', 'kitchen', 'balcony'],
    groups: [
      {
        code: 'waterproofing', title: 'عزل الأرضية', default: 'yes',
        options: [
          { code: 'yes', title: 'عزل أرضية + رفرف 30 سم', components: [
            { code: 'membrane', phase: 'rough', category: 'waterproofing', qty: { measure: 'waterproof_area' } },
          ] },
          { code: 'no', title: 'بدون عزل', components: [] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    code: 'bathroom_plumbing',
    title: 'سباكة الحمام',
    appliesTo: ['bathroom'],
    groups: [
      {
        code: 'toilet', title: 'القاعدة', default: 'floor',
        options: [
          { code: 'floor', title: 'قاعدة عادية (أرضية)', components: [
            drainPoint(), waterPoints(1),
            { code: 'toilet', phase: 'finish', category: 'toilet_floor', qty: { fixed: 1 } },
            install(),
          ] },
          { code: 'wall_hung', title: 'قاعدة معلقة (صندوق دفن في التأسيس)', components: [
            { code: 'cistern', phase: 'rough', category: 'concealed_cistern', qty: { fixed: 1 } },
            drainPoint(), waterPoints(1),
            { code: 'toilet', phase: 'finish', category: 'toilet_wall_hung', qty: { fixed: 1 } },
            { code: 'flush_plate', phase: 'finish', category: 'flush_plate', qty: { fixed: 1 } },
            install(),
          ] },
        ],
      },
      {
        code: 'bidet', title: 'الشطاف', default: 'shattaf',
        options: [
          { code: 'shattaf', title: 'شطاف (على تغذية القاعدة)', components: [
            { code: 'shattaf', phase: 'finish', category: 'bidet_shattaf', qty: { fixed: 1 } },
          ] },
          { code: 'none', title: 'بدون', components: [] },
        ],
      },
      {
        code: 'basin', title: 'الحوض', default: 'pedestal',
        options: [
          { code: 'pedestal', title: 'حوض بعمود', components: [
            waterPoints(2), drainPoint(),
            { code: 'basin', phase: 'finish', category: 'basin_pedestal', qty: { fixed: 1 } }, install(),
          ] },
          { code: 'wall_hung', title: 'حوض معلق', components: [
            waterPoints(2), drainPoint(),
            { code: 'basin', phase: 'finish', category: 'basin_wall_hung', qty: { fixed: 1 } }, install(),
          ] },
          { code: 'vanity', title: 'حوض + وحدة (فانيتي)', components: [
            waterPoints(2), drainPoint(),
            { code: 'basin', phase: 'finish', category: 'basin_vanity', qty: { fixed: 1 } }, install(),
          ] },
          { code: 'none', title: 'بدون حوض', components: [] },
        ],
      },
      {
        code: 'basin_mixer', title: 'خلاط الحوض', default: 'deck',
        when: { group: 'basin', in: ['pedestal', 'wall_hung', 'vanity'] },
        options: [
          { code: 'deck', title: 'خلاط عادي', components: [
            { code: 'mixer', phase: 'finish', category: 'basin_mixer', qty: { fixed: 1 } },
          ] },
          { code: 'concealed', title: 'خلاط حائط دفن', components: [
            { code: 'body', phase: 'rough', category: 'concealed_mixer_body', qty: { fixed: 1 } },
            { code: 'trim', phase: 'finish', category: 'basin_mixer_concealed', qty: { fixed: 1 } },
          ] },
        ],
      },
      {
        code: 'shower', title: 'الاستحمام', default: 'shower',
        options: [
          { code: 'none', title: 'بدون', components: [] },
          { code: 'shower', title: 'شاور', components: [waterPoints(2), drainPoint()] },
          { code: 'bathtub', title: 'بانيو', components: [waterPoints(2), drainPoint()] },
        ],
      },
      {
        code: 'bathtub_type', title: 'نوع البانيو', default: 'builtin',
        when: { group: 'shower', in: ['bathtub'] },
        options: [
          { code: 'freestanding', title: 'فري ستاند', components: [
            { code: 'tub', phase: 'finish', category: 'bathtub_freestanding', qty: { fixed: 1 } }, install(),
          ] },
          { code: 'builtin', title: 'بانيو عادي (مبني)', components: [
            { code: 'tub', phase: 'finish', category: 'bathtub_builtin', qty: { fixed: 1 } },
            { code: 'masonry', phase: 'finish', category: 'labor_bathtub_masonry', qty: { fixed: 1 } },
            install(),
          ] },
        ],
      },
      {
        code: 'shower_base', title: 'أرضية الشاور', default: 'tiled',
        when: { group: 'shower', in: ['shower'] },
        options: [
          { code: 'tiled', title: 'على مستوى الأرضية (سيراميك + سيفون)', components: [] },
          { code: 'tray', title: 'قاعدة شاور', components: [
            { code: 'tray', phase: 'finish', category: 'shower_tray', qty: { fixed: 1 } }, install(),
          ] },
        ],
      },
      {
        code: 'shower_mixer', title: 'خلاط الشاور / البانيو', default: 'exposed',
        when: { group: 'shower', in: ['shower', 'bathtub'] },
        options: [
          { code: 'concealed', title: 'خلاط دفن', components: [
            { code: 'body', phase: 'rough', category: 'concealed_mixer_body', qty: { fixed: 1 } },
            { code: 'trim', phase: 'finish', category: 'concealed_mixer_trim', qty: { fixed: 1 } },
          ] },
          { code: 'exposed', title: 'خلاط عادي', components: [
            { code: 'mixer', phase: 'finish', category: 'exposed_shower_mixer', qty: { fixed: 1 } },
          ] },
          { code: 'floor', title: 'خلاط أرضي (للفري ستاند)', when: { group: 'bathtub_type', in: ['freestanding'] }, components: [
            { code: 'mixer', phase: 'finish', category: 'floor_tub_mixer', qty: { fixed: 1 } },
          ] },
        ],
      },
      {
        code: 'shower_enclosure', title: 'كابينة زجاج', default: 'none',
        when: { group: 'shower', in: ['shower', 'bathtub'] },
        options: [
          { code: 'none', title: 'بدون', components: [] },
          { code: 'glass', title: 'كابينة زجاج سيكوريت', components: [
            { code: 'enclosure', phase: 'finish', category: 'shower_enclosure', qty: { fixed: 1 } },
          ] },
        ],
      },
      {
        code: 'floor_drain', title: 'سيفون أرضية', default: 'yes',
        options: [
          { code: 'yes', title: 'يوجد', components: [
            { code: 'drain', phase: 'rough', category: 'plumb_floor_drain', qty: { fixed: 1 } },
          ] },
          { code: 'no', title: 'لا يوجد', components: [] },
        ],
      },
      {
        code: 'water_heater', title: 'السخان', default: 'none',
        options: [
          { code: 'none', title: 'بدون / مركزي', components: [] },
          { code: 'electric', title: 'سخان كهرباء', components: [
            { code: 'heater_point', phase: 'rough', category: 'plumb_heater_point', qty: { fixed: 1 } },
            { code: 'heater', phase: 'finish', category: 'water_heater_electric', qty: { fixed: 1 } }, install(),
          ] },
          { code: 'gas', title: 'سخان غاز', components: [
            { code: 'heater_point', phase: 'rough', category: 'plumb_heater_point', qty: { fixed: 1 } },
            { code: 'heater', phase: 'finish', category: 'water_heater_gas', qty: { fixed: 1 } }, install(),
          ] },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    code: 'kitchen_plumbing',
    title: 'سباكة المطبخ',
    appliesTo: ['kitchen'],
    groups: [
      {
        code: 'sink', title: 'حوض المطبخ', default: 'yes',
        options: [
          { code: 'yes', title: 'حوض + خلاط', components: [
            waterPoints(2), drainPoint(),
            { code: 'sink', phase: 'finish', category: 'kitchen_sink', qty: { fixed: 1 } },
            { code: 'mixer', phase: 'finish', category: 'kitchen_mixer', qty: { fixed: 1 } },
            install(),
          ] },
          { code: 'none', title: 'بدون', components: [] },
        ],
      },
      {
        code: 'washing_machine', title: 'نقطة غسالة ملابس', default: 'no',
        options: [
          { code: 'yes', title: 'يوجد', components: [waterPoints(1), drainPoint()] },
          { code: 'no', title: 'لا يوجد', components: [] },
        ],
      },
      {
        code: 'dishwasher', title: 'نقطة غسالة أطباق', default: 'no',
        options: [
          { code: 'yes', title: 'يوجد', components: [waterPoints(1), drainPoint()] },
          { code: 'no', title: 'لا يوجد', components: [] },
        ],
      },
      {
        code: 'floor_drain', title: 'سيفون أرضية', default: 'no',
        options: [
          { code: 'yes', title: 'يوجد', components: [
            { code: 'drain', phase: 'rough', category: 'plumb_floor_drain', qty: { fixed: 1 } },
          ] },
          { code: 'no', title: 'لا يوجد', components: [] },
        ],
      },
    ],
  },
];

export const TEMPLATE_BY_CODE = Object.fromEntries(TEMPLATES.map(t => [t.code, t]));

// البنود الافتراضية حسب نوع الفراغ
export function templatesForSpace(spaceType) {
  return TEMPLATES.filter(t => t.appliesTo.includes(spaceType));
}

// إعدادات افتراضية ذكية حسب نوع الفراغ (الحمام والمطبخ تجليد، إلخ)
export const SPACE_TYPE_DEFAULTS = {
  bathroom: {
    floor_finish: { floor_type: 'ceramic', skirting: 'none' },
    wall_finish: { wall_type: 'tiles_full' },
    ceiling_finish: { ceiling_type: 'gypsum' },
  },
  kitchen: {
    floor_finish: { floor_type: 'ceramic', skirting: 'none' },
    wall_finish: { wall_type: 'tiles_partial' },
  },
  balcony: {
    floor_finish: { floor_type: 'porcelain', skirting: 'tile' },
  },
};
