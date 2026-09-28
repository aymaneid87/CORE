-- ==========================================================
-- متوسطات أسعار مواد البناء — تحديث يونيو 2026 — ملف مولّد تلقائياً من lib/estimation/bulletins
-- ملف PDF ممسوح مرفوع من المستخدم — عليه شعار جهة تجميع، ولم يتم التأكد أنه النشرة الرسمية للمركز القومي لبحوث الإسكان والبناء
-- الأسعار غير شاملة ضريبة القيمة المضافة
-- ==========================================================
begin;
-- المنتج التجريبي ما يفضلش افتراضي في التصنيفات اللي ليها سعر من النشرة
update products set is_default = false where owner_id is null and is_sample and category_code in ('labor_floor_tiling', 'labor_porcelain_tiling', 'labor_skirting', 'gypsum_board_ceiling', 'tile_ceramic_wall', 'tile_ceramic_floor', 'marble_floor', 'hdf_floor', 'skirting_hdf');
insert into products (id, owner_id, category_code, brand, model, name, unit, coverage, sold_by_pack, is_default, is_sample, active, specs) values
  ('00000000-0000-4000-9202-000000606001', null, 'labor_floor_tiling', 'نشرة يونيو 2026', 'القاهرة الكبرى', 'مصنعية سيراميك أرضيات (بدون وزرة)', 'م²', 1, false, true, false, true, '{"region":"cairo","source":"bulletin-2026-06","page":3,"source_name":"مصنعيات سيراميك بدون وزر بالقاهرة"}'),
  ('00000000-0000-4000-9202-000000606002', null, 'labor_floor_tiling', 'نشرة يونيو 2026', 'الصعيد والبحر الأحمر وجنوب سيناء', 'مصنعية سيراميك أرضيات (بدون وزرة)', 'م²', 1, false, true, false, true, '{"region":"upper","source":"bulletin-2026-06","page":3,"source_name":"مصنعيات سيراميك بدون وزر بالصعيد"}'),
  ('00000000-0000-4000-9202-000000606003', null, 'labor_porcelain_tiling', 'نشرة يونيو 2026', 'القاهرة الكبرى', 'مصنعية بورسلين أرضيات (بدون وزرة)', 'م²', 1, false, true, false, true, '{"region":"cairo","source":"bulletin-2026-06","page":3,"source_name":"مصنعيات ارضيات بورسلين بدون وزر بالقاهرة"}'),
  ('00000000-0000-4000-9202-000000606004', null, 'labor_porcelain_tiling', 'نشرة يونيو 2026', 'الصعيد والبحر الأحمر وجنوب سيناء', 'مصنعية بورسلين أرضيات (بدون وزرة)', 'م²', 1, false, true, false, true, '{"region":"upper","source":"bulletin-2026-06","page":3,"source_name":"مصنعيات ارضيات بورسلين بدون وزر بالصعيد"}'),
  ('00000000-0000-4000-9202-000000606005', null, 'labor_skirting', 'نشرة يونيو 2026', 'القاهرة الكبرى', 'مصنعية وزرة', 'م.ط', 1, false, true, false, true, '{"region":"cairo","source":"bulletin-2026-06","page":3,"source_name":"مصنعية وزر بالقاهرة"}'),
  ('00000000-0000-4000-9202-000000606006', null, 'labor_skirting', 'نشرة يونيو 2026', 'الصعيد والبحر الأحمر وجنوب سيناء', 'مصنعية وزرة', 'م.ط', 1, false, true, false, true, '{"region":"upper","source":"bulletin-2026-06","page":3,"source_name":"مصنعيات وزر بالصعيد"}'),
  ('00000000-0000-4000-9202-000000606007', null, 'labor_marble', 'نشرة يونيو 2026', 'القاهرة الكبرى', 'تركيب رخام 2سم أرضيات (شامل التشطيب والوزرة — لا تضف مصنعية وزرة)', 'م²', 1, false, false, false, true, '{"region":"cairo","source":"bulletin-2026-06","page":3,"source_name":"مصنعيات تركيب رخام 2سم ارضيات شاملة التشطيب والوزر"}'),
  ('00000000-0000-4000-9202-000000606008', null, 'labor_marble', 'نشرة يونيو 2026', 'الصعيد والبحر الأحمر وجنوب سيناء', 'تركيب رخام 2سم أرضيات (شامل التشطيب والوزرة — لا تضف مصنعية وزرة)', 'م²', 1, false, false, false, true, '{"region":"upper","source":"bulletin-2026-06","page":3,"source_name":"مصنعيات تركيب رخام 2سم ارضيات شاملة التشطيب والوزر بالصعيد"}'),
  ('00000000-0000-4000-9202-000000606009', null, 'gypsum_board_ceiling', 'نشرة يونيو 2026', 'القاهرة الكبرى', 'سقف كناوف أبيض أفقي (توريد وتركيب، بدون أبواب كشف)', 'م²', 1, false, true, false, true, '{"region":"cairo","source":"bulletin-2026-06","page":3,"source_name":"توريد وتركيب أسقف كناوف ابيض افقي بدون ابواب كشف بالقاهرة"}'),
  ('00000000-0000-4000-9202-000000606010', null, 'gypsum_board_ceiling', 'نشرة يونيو 2026', 'الصعيد والبحر الأحمر وجنوب سيناء', 'سقف كناوف أبيض أفقي (توريد وتركيب، بدون أبواب كشف)', 'م²', 1, false, true, false, true, '{"region":"upper","source":"bulletin-2026-06","page":3,"source_name":"توريد وتركيب اسقف كناوف ابيض افقي بدون ابواب كشف بالصعيد"}'),
  ('00000000-0000-4000-9202-000000606011', null, 'gypsum_cornice', 'نشرة يونيو 2026', 'القاهرة الكبرى', 'كرانيش فيوتيك (توريد وتركيب)', 'م.ط', 1, false, false, false, true, '{"region":"cairo","source":"bulletin-2026-06","page":3,"source_name":"توريد وتركيب كرانيش فيوتيك بالقاهرة"}'),
  ('00000000-0000-4000-9202-000000606012', null, 'gypsum_cornice', 'نشرة يونيو 2026', 'الصعيد والبحر الأحمر وجنوب سيناء', 'كرانيش فيوتيك (توريد وتركيب)', 'م.ط', 1, false, false, false, true, '{"region":"upper","source":"bulletin-2026-06","page":3,"source_name":"توريد وتركيب كرانيش فيوتيك بالصعيد"}'),
  ('00000000-0000-4000-9202-000000606013', null, 'tile_ceramic_wall', 'نشرة يونيو 2026', null, 'سيراميك حوائط 25×50 سم', 'م²', 1, false, true, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"سيراميك حوائط 25*50سم"}'),
  ('00000000-0000-4000-9202-000000606014', null, 'tile_ceramic_wall', 'نشرة يونيو 2026', null, 'سيراميك حوائط 31×63 سم', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"سيراميك حوائط 31*63سم"}'),
  ('00000000-0000-4000-9202-000000606015', null, 'tile_ceramic_wall', 'نشرة يونيو 2026', null, 'سيراميك حوائط 20×63 سم', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"سيراميك حوائط 20*63سم"}'),
  ('00000000-0000-4000-9202-000000606016', null, 'tile_ceramic_floor', 'نشرة يونيو 2026', null, 'سيراميك أرضيات 40×40 سم', 'م²', 1, false, true, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"سيراميك ارضيات 40×40 سم"}'),
  ('00000000-0000-4000-9202-000000606017', null, 'tile_ceramic_floor', 'نشرة يونيو 2026', null, 'سيراميك أرضيات 50×50 سم', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"سيراميك ارضيات 50×50 سم"}'),
  ('00000000-0000-4000-9202-000000606018', null, 'tile_ceramic_floor', 'نشرة يونيو 2026', null, 'سيراميك أرضيات 60×60 سم', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"سيراميك ارضيات 60×60 سم"}'),
  ('00000000-0000-4000-9202-000000606019', null, 'marble_floor', 'نشرة يونيو 2026', null, 'رخام جلالة لايت ترابيع 40×40×2', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"رخام ترابيع 40×40×2 سم — جلالة لايت"}'),
  ('00000000-0000-4000-9202-000000606020', null, 'marble_floor', 'نشرة يونيو 2026', null, 'رخام جلالة عادة ترابيع 40×40×2', 'م²', 1, false, true, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"رخام ترابيع 40×40×2 سم — جلالة عادة"}'),
  ('00000000-0000-4000-9202-000000606021', null, 'marble_floor', 'نشرة يونيو 2026', null, 'رخام تريستا ترابيع 40×40×2', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"رخام ترابيع 40×40×2 سم — تريستا"}'),
  ('00000000-0000-4000-9202-000000606022', null, 'marble_floor', 'نشرة يونيو 2026', null, 'رخام جلالة بفص ترابيع 40×40×2', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":5,"source_name":"رخام ترابيع 40×40×2 سم — جلالة بفص"}'),
  ('00000000-0000-4000-9202-000000606023', null, 'hdf_floor', 'نشرة يونيو 2026', null, 'HDF 8مم تركي كلاس 21', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":9,"source_name":"ألواح قشرة قرو أزان سمك 8مم تركي (كلاس 21)"}'),
  ('00000000-0000-4000-9202-000000606024', null, 'hdf_floor', 'نشرة يونيو 2026', null, 'HDF 8مم تركي كلاس 31', 'م²', 1, false, true, false, true, '{"region":null,"source":"bulletin-2026-06","page":9,"source_name":"ألواح قشرة قرو أزان سمك 8مم تركي (كلاس 31)"}'),
  ('00000000-0000-4000-9202-000000606025', null, 'hdf_floor', 'نشرة يونيو 2026', null, 'HDF 8مم تركي كلاس 32', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":9,"source_name":"ألواح قشرة قرو أزان سمك 8مم تركي (كلاس 32)"}'),
  ('00000000-0000-4000-9202-000000606026', null, 'hdf_floor', 'نشرة يونيو 2026', null, 'HDF 8مم ألماني', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":9,"source_name":"ألواح قشرة قرو أزان سمك 8مم ألماني"}'),
  ('00000000-0000-4000-9202-000000606027', null, 'skirting_hdf', 'نشرة يونيو 2026', null, 'وزرة HDF 8 سم', 'م.ط', 1, false, true, false, true, '{"region":null,"source":"bulletin-2026-06","page":9,"source_name":"وزرة 8سم سمك 10مم"}'),
  ('00000000-0000-4000-9202-000000606028', null, 'waterproofing', 'نشرة يونيو 2026', null, 'لفائف بيتومين مسلح بوليستر 3مم (خامة فقط)', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":9,"source_name":"عازل للرطوبة ذو أساس بيتوميني ومسلح بالبوليستر سمك 3مم"}'),
  ('00000000-0000-4000-9202-000000606029', null, 'waterproofing', 'نشرة يونيو 2026', null, 'لفائف بيتومين مسلح فايبر جلاس 3مم (خامة فقط)', 'م²', 1, false, false, false, true, '{"region":null,"source":"bulletin-2026-06","page":9,"source_name":"عازل للرطوبة ذو أساس بيتوميني ومسلح بالألياف الزجاجية (الفايبر جلاس) سمك 3مم"}')
on conflict (id) do update set category_code = excluded.category_code, brand = excluded.brand, model = excluded.model, name = excluded.name,
  unit = excluded.unit, is_default = excluded.is_default, specs = excluded.specs;
delete from product_prices where owner_id is null and source = 'bulletin-2026-06';
insert into product_prices (owner_id, product_id, price, effective_date, approved, source) values
  (null, '00000000-0000-4000-9202-000000606001', 130, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606002', 150, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606003', 150, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606004', 170, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606005', 36, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606006', 30, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606007', 360, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606008', 390, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606009', 740, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606010', 840, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606011', 120, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606012', 140, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606013', 118, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606014', 140, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606015', 140, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606016', 150, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606017', 140, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606018', 136, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606019', 517, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606020', 440, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606021', 630, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606022', 560, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606023', 510, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606024', 550, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606025', 565, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606026', 740, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606027', 110, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606028', 140, '2026-06-01', true, 'bulletin-2026-06'),
  (null, '00000000-0000-4000-9202-000000606029', 124, '2026-06-01', true, 'bulletin-2026-06');
insert into price_benchmarks (code, title, unit, region, price, effective_date, source, page, selectors) values
  ('interior_plastic_paint', 'توريد وعمل دهانات بلاستيك داخلية', 'م²', 'cairo', 180, '2026-06-01', 'bulletin-2026-06', 3, '[{"templateCode":"wall_finish","groupCode":"wall_type","optionCode":"paint","measureKey":"wall_area_net"},{"templateCode":"ceiling_finish","groupCode":"ceiling_type","optionCode":"paint","measureKey":"ceiling_area"}]'),
  ('interior_plastic_paint', 'توريد وعمل دهانات بلاستيك داخلية', 'م²', 'upper', 200, '2026-06-01', 'bulletin-2026-06', 3, '[{"templateCode":"wall_finish","groupCode":"wall_type","optionCode":"paint","measureKey":"wall_area_net"},{"templateCode":"ceiling_finish","groupCode":"ceiling_type","optionCode":"paint","measureKey":"ceiling_area"}]')
on conflict (code, region, source) do update set price = excluded.price, title = excluded.title, selectors = excluded.selectors, page = excluded.page;
commit;
