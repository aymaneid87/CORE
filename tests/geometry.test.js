import test from 'node:test';
import assert from 'node:assert/strict';
import { spaceMeasures, polygonMetrics, validateSpace } from '../lib/estimation/geometry.js';

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} ≠ ${b}`);

test('غرفة مستطيلة بباب وشباك — كل الكميات محسوبة يدوياً', () => {
  const m = spaceMeasures({
    name: 'نوم 1', length: 4, width: 3, height: 3,
    openings: [
      { type: 'door', width: 0.9, height: 2.2, sill: 0 },
      { type: 'window', width: 1.2, height: 1.2, sill: 1.0 },
    ],
  });
  close(m.floor_area, 12, 'الأرضية');
  close(m.perimeter, 14, 'المحيط');
  close(m.wall_area_gross, 42, 'الحوائط الإجمالي');
  close(m.openings_area, 1.98 + 1.44, 'الفتحات');
  close(m.wall_area_net, 42 - 3.42, 'الحوائط الصافي');
  close(m.skirting_length, 14 - 0.9, 'الوزرة (بخصم الباب بس)');
  close(m.tiled_wall_area, 0, 'مفيش تجليد');
});

test('حمام بتجليد 1.6 م — الشباك فوق التجليد مش بيتخصم منه', () => {
  const m = spaceMeasures({
    name: 'حمام', length: 2.5, width: 2, height: 3,
    openings: [
      { type: 'door', width: 0.8, height: 2.2 },
      { type: 'window', width: 0.6, height: 0.6, sill: 1.8 },
    ],
  }, { tileHeight: 1.6 });
  close(m.tiled_wall_area, 9 * 1.6 - 0.8 * 1.6, 'التجليد');
  close(m.wall_area_net, 27 - 1.76 - 0.36, 'الصافي');
  close(m.wall_area_above_tiles, 27 - 2.12 - 13.12, 'الدهان فوق التجليد');
  close(m.waterproof_area, 5 + (9 - 0.8) * 0.3, 'العزل');
});

test('شباك بيقطع خط التجليد — الخصم بيتقسم صح بين التجليد والدهان', () => {
  const m = spaceMeasures({
    name: 'مطبخ', length: 3, width: 3, height: 3,
    openings: [{ type: 'window', width: 1, height: 1, sill: 1.2 }],
  }, { tileHeight: 1.6 });
  // 0.4 م من الشباك تحت خط التجليد، 0.6 م فوقه
  close(m.tiled_wall_area, 12 * 1.6 - 0.4, 'التجليد');
  close(m.wall_area_above_tiles, 12 * 1.4 - 0.6, 'الدهان');
});

test('فتحات متكررة (count)', () => {
  const m = spaceMeasures({
    name: 'ريسبشن', length: 6, width: 5, height: 3,
    openings: [{ type: 'window', width: 1.5, height: 1.5, sill: 1, count: 3 }],
  });
  close(m.openings_area, 3 * 2.25, 'الفتحات');
});

test('مضلّع على شكل L', () => {
  const pts = [[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]];
  const { area, perimeter } = polygonMetrics(pts);
  close(area, 12, 'المساحة');
  close(perimeter, 16, 'المحيط');
  const m = spaceMeasures({ name: 'L', shape: 'polygon', points: pts, height: 2.8 });
  close(m.wall_area_gross, 16 * 2.8, 'الحوائط');
  // ترتيب النقاط عكس عقارب الساعة لازم يدي نفس النتيجة
  close(polygonMetrics([...pts].reverse()).area, 12, 'المساحة بالعكس');
});

test('التحقق من المدخلات — الارتفاع إلزامي والفتحة ما تعديش السقف', () => {
  assert.ok(validateSpace({ name: 'x', length: 3, width: 3 }).some(e => e.includes('الارتفاع')));
  assert.ok(validateSpace({ name: 'x', length: 3, width: -1, height: 3 }).some(e => e.includes('العرض')));
  assert.ok(validateSpace({ name: 'x', length: 3, width: 3, height: 2.5, openings: [{ type: 'window', width: 1, height: 1.2, sill: 1.5 }] })
    .some(e => e.includes('أعلى الفتحة')));
  assert.deepEqual(validateSpace({ name: 'x', length: 3, width: 3, height: 3 }), []);
  assert.throws(() => spaceMeasures({ name: 'x', length: 3, width: 3 }));
});
