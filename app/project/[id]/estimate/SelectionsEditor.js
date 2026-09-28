'use client';
import { useMemo } from 'react';
import { SPACE_TYPES, PHASES, templatesForSpace } from '../../../../lib/estimation/templates';
import { resolveSelection, defaultSelection } from '../../../../lib/estimation/engine';
import { productLabel } from '../../../../lib/estimation/catalog';
import { Card, Chip, Badge, NumInput, Field, money, qty } from './ui';

export default function SelectionsEditor({ spaces, selections, catalog, lines, activeSpaceId, onActiveSpace, onChange, onCopyToSimilar }) {
  const space = spaces.find(s => s.id === activeSpaceId) || spaces[0];
  const byCategory = useMemo(() => {
    const m = {};
    for (const p of catalog) (m[p.category_code] ||= []).push(p);
    for (const k in m) m[k].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return m;
  }, [catalog]);

  if (!space) {
    return <p className="text-sm text-center py-10" style={{ color: 'var(--ink-soft)' }}>أضف فراغات الوحدة الأول من تبويب «الفراغات».</p>;
  }

  const spaceSel = selections[space.id] || {};
  const setTemplateSel = (code, sel) => onChange(space.id, { ...spaceSel, [code]: sel });
  const similarCount = spaces.filter(s => s.type === space.type && s.id !== space.id).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {spaces.map(s => (
          <Chip key={s.id} active={s.id === space.id} onClick={() => onActiveSpace(s.id)}>{s.name}</Chip>
        ))}
      </div>

      {templatesForSpace(space.type).map(t => {
        const raw = spaceSel[t.code];
        if (!raw) {
          return (
            <Card key={t.code} className="flex items-center justify-between">
              <span className="font-head font-bold text-sm" style={{ color: 'var(--ink-soft)' }}>{t.title} — غير مضاف</span>
              <button type="button" className="text-xs font-bold" style={{ color: 'var(--teal)' }}
                onClick={() => setTemplateSel(t.code, defaultSelection(t, space.type))}>+ إضافة البند</button>
            </Card>
          );
        }
        const sel = resolveSelection(t, raw, space);
        const tLines = lines.filter(l => l.spaceId === space.id && l.templateCode === t.code);
        const tTotal = tLines.reduce((s, l) => s + (l.cost || 0), 0);
        const update = patch => setTemplateSel(t.code, { ...raw, ...patch });

        return (
          <Card key={t.code}>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h3 className="font-head font-bold text-base">{t.title}</h3>
              <span className="font-head font-extrabold text-sm" style={{ color: 'var(--copper)' }}>{money(tTotal)} ج.م</span>
              <div className="mr-auto flex gap-3 text-xs">
                {similarCount > 0 && (
                  <button type="button" style={{ color: 'var(--teal)' }} onClick={() => onCopyToSimilar(space.id, t.code)}>
                    تطبيق على باقي {SPACE_TYPES[space.type]} ({similarCount})
                  </button>
                )}
                <button type="button" style={{ color: 'var(--danger)' }}
                  onClick={() => { const { [t.code]: _, ...rest } = spaceSel; onChange(space.id, rest); }}>
                  إزالة البند
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {sel.visibleGroups.map(({ group, option, available }) => (
                <div key={group.code}>
                  <div className="text-[11px] font-bold mb-1.5" style={{ color: 'var(--ink-soft)' }}>{group.title}</div>
                  <div className="flex flex-wrap gap-2">
                    {available.map(o => (
                      <Chip key={o.code} active={o.code === option.code}
                        onClick={() => update({ groups: { ...sel.groups, [group.code]: o.code } })}>
                        {o.title}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}

              {sel.visibleParams.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {sel.visibleParams.map(p => (
                    <Field key={p.code} label={`${p.title} (${p.unit})`} className="w-44">
                      <NumInput value={raw.params?.[p.code] ?? sel.params[p.code]}
                        onChange={v => update({ params: { ...(raw.params || {}), [p.code]: v } })} />
                    </Field>
                  ))}
                </div>
              )}
              {sel.errors.map(e => <Badge key={e} tone="danger">{e}</Badge>)}
            </div>

            {tLines.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {tLines.map(l => {
                  const options = byCategory[l.categoryCode] || [];
                  const chosen = raw.products?.[l.componentKey] ?? '';
                  const setProduct = id => {
                    const products = { ...(raw.products || {}) };
                    if (id) products[l.componentKey] = id; else delete products[l.componentKey];
                    update({ products });
                  };
                  return (
                    <div key={l.componentKey} className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_auto] gap-2 items-center rounded-xl p-2.5"
                      style={{ backgroundColor: '#17302D06' }}>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge tone={l.phase}>{PHASES[l.phase]}</Badge>
                        <span className="font-bold">{l.categoryTitle}</span>
                      </div>
                      <select value={chosen} onChange={e => setProduct(e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-xs outline-none w-full"
                        style={{ borderColor: l.product ? 'var(--line)' : 'var(--danger)', backgroundColor: '#fff' }}>
                        <option value="">
                          {l.product && !chosen ? `افتراضي: ${productLabel(l.product)}` : options.length ? 'اختر المنتج (شركة / موديل)' : 'لا توجد منتجات في الكتالوج'}
                        </option>
                        {options.map(p => (
                          <option key={p.id} value={p.id}>
                            {productLabel(p)} — {p.price == null ? 'بدون سعر' : `${money(p.price)} ج.م/${p.unit}`}{p.is_sample ? ' (تقديري)' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="text-xs text-left whitespace-nowrap font-head" style={{ color: 'var(--ink-soft)' }}>
                        {qty(l.neededQty)} {l.measureUnit}
                        {l.coats > 1 ? ` (${l.coats} وش)` : ''}
                        {l.wastePct ? ` +${l.wastePct}% هالك` : ''}
                        {' · '}
                        <b style={{ color: l.cost == null ? 'var(--danger)' : 'var(--ink)' }}>{l.cost == null ? 'غير مسعّر' : `${money(l.cost)} ج.م`}</b>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
      {Object.keys(spaceSel).length === 0 && (
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          لا توجد بنود مضافة لهذا الفراغ.
        </p>
      )}
    </div>
  );
}
