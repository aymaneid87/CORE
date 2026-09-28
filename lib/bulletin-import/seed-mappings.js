// مطابقات مبدئية من نشرة يونيو 2026: أي نشرة جديدة فيها نفس البنود بتتصنّف تلقائي
import { BULLETIN_ITEMS } from '../estimation/bulletins/2026-06.js';
import { normalizeUnit } from './normalize.js';
import { nameKey, fullKey, safeNameKey } from './decide.js';

export function seedMappings() {
  const out = new Map();
  for (const i of BULLETIN_ITEMS) {
    const printed = i.printed || i.name;
    const k = `${i.section || ''}|${nameKey(printed)}`;
    if (out.has(k)) continue; // سطر القاهرة والصعيد ليهم نفس المطابقة
    out.set(k, {
      item_key: i.section ? fullKey(i.section, printed) : null,
      name_key: safeNameKey(printed),
      unit: normalizeUnit(i.unit),
      use: i.use,
      category_code: i.category || null,
      benchmark_code: i.benchmark || null,
      label: i.label || null,
      is_default: !!i.is_default,
    });
  }
  return [...out.values()];
}
