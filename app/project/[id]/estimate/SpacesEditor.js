'use client';
import { SPACE_TYPES } from '../../../../lib/estimation/templates';
import { OPENING_DEFAULTS, MEASURE_LABELS } from '../../../../lib/estimation/geometry';
import { NumInput, Card, Field, Select, Badge, qty } from './ui';

const OPENING_TYPES = { door: 'باب', window: 'شباك', opening: 'فتحة' };
const SHOWN_MEASURES = ['floor_area', 'perimeter', 'wall_area_net', 'skirting_length'];

export default function SpacesEditor({ spaces, computedSpaces, defaultHeight, onDefaultHeight, onAdd, onUpdate, onRemove, onDuplicate }) {
  const bySpace = Object.fromEntries(computedSpaces.map(c => [c.space.id, c]));
  const totalArea = computedSpaces.reduce((s, c) => s + (c.measures?.floor_area || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="الارتفاع الافتراضي للدور (م)" className="w-44">
            <NumInput value={defaultHeight} onChange={onDefaultHeight} placeholder="مثلاً 3.00" />
          </Field>
          <div className="text-xs pb-2" style={{ color: 'var(--ink-soft)' }}>
            أي فراغ جديد بياخد الارتفاع ده، وتقدر تعدّله لكل فراغ لوحده.
          </div>
          <div className="mr-auto text-left">
            <div className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>إجمالي مسطح الأرضيات</div>
            <div className="font-head font-extrabold text-xl">{qty(totalArea)} <span className="text-xs opacity-60">م²</span></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(SPACE_TYPES).map(([type, title]) => (
            <button key={type} type="button" onClick={() => onAdd(type)}
              className="text-xs font-bold px-3 py-2 rounded-full border" style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}>
              + {title}
            </button>
          ))}
        </div>
      </Card>

      {spaces.length === 0 && (
        <p className="text-sm text-center py-10" style={{ color: 'var(--ink-soft)' }}>
          ابدأ بإضافة فراغات الوحدة (غرف، حمامات، مطبخ ...) من الأزرار اللي فوق.
        </p>
      )}

      {spaces.map((s, idx) => {
        const c = bySpace[s.id];
        const set = patch => onUpdate(s.id, patch);
        const setOpening = (i, patch) => set({ openings: s.openings.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
        return (
          <Card key={s.id}>
            <div className="flex flex-wrap items-end gap-3">
              <span className="font-head font-extrabold text-sm w-6 pb-2" style={{ color: 'var(--ink-soft)' }}>{idx + 1}</span>
              <Field label="اسم الفراغ" className="flex-1 min-w-[140px]">
                <input value={s.name} onChange={e => set({ name: e.target.value })}
                  className="border rounded-lg px-2.5 py-2 text-sm outline-none" style={{ borderColor: 'var(--line)', backgroundColor: '#fff' }} />
              </Field>
              <Field label="النوع" className="w-40">
                <Select value={s.type} onChange={type => set({ type })}>
                  {Object.entries(SPACE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="الطول (م)" className="w-24"><NumInput value={s.length} onChange={length => set({ length })} /></Field>
              <Field label="العرض (م)" className="w-24"><NumInput value={s.width} onChange={width => set({ width })} /></Field>
              <Field label="الارتفاع (م)" className="w-24"><NumInput value={s.height} onChange={height => set({ height })} /></Field>
              <div className="flex gap-1 pb-1">
                <button type="button" onClick={() => onDuplicate(s.id)} className="text-xs px-2 py-1.5 rounded-lg" style={{ color: 'var(--teal)' }}>تكرار</button>
                <button type="button" onClick={() => onRemove(s.id)} className="text-xs px-2 py-1.5 rounded-lg" style={{ color: 'var(--danger)' }}>حذف</button>
              </div>
            </div>

            {s.shape === 'polygon' && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--ink-soft)' }}>
                فراغ غير منتظم (مضلّع من {s.points?.length} نقطة) — المساحة والمحيط محسوبين من النقاط.
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2">
              {s.openings.map((o, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 text-sm">
                  <Field label="فتحة" className="w-24">
                    <Select value={o.type} onChange={type => setOpening(i, { type, ...OPENING_DEFAULTS[type] })}>
                      {Object.entries(OPENING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                  </Field>
                  <Field label="العرض" className="w-20"><NumInput value={o.width} onChange={width => setOpening(i, { width })} /></Field>
                  <Field label="الارتفاع" className="w-20"><NumInput value={o.height} onChange={height => setOpening(i, { height })} /></Field>
                  <Field label="الجلسة" className="w-20"><NumInput value={o.sill} onChange={sill => setOpening(i, { sill: sill ?? 0 })} /></Field>
                  <Field label="العدد" className="w-16"><NumInput value={o.count} step="1" onChange={count => setOpening(i, { count: count == null ? 1 : Math.max(1, Math.round(count)) })} /></Field>
                  <button type="button" onClick={() => set({ openings: s.openings.filter((_, j) => j !== i) })}
                    className="text-xs pb-2.5" style={{ color: 'var(--danger)' }}>✕</button>
                </div>
              ))}
              <div className="flex gap-3">
                {Object.entries(OPENING_TYPES).map(([type, title]) => (
                  <button key={type} type="button" className="text-xs font-bold" style={{ color: 'var(--teal)' }}
                    onClick={() => set({ openings: [...s.openings, { type, ...OPENING_DEFAULTS[type], count: 1 }] })}>
                    + {title}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ borderTop: '1px solid var(--line)' }}>
              {c?.errors?.length ? (
                c.errors.map(e => <Badge key={e} tone="danger">{e}</Badge>)
              ) : c?.measures ? (
                SHOWN_MEASURES.map(k => (
                  <span key={k} style={{ color: 'var(--ink-soft)' }}>
                    {MEASURE_LABELS[k].title}: <b className="font-head" style={{ color: 'var(--ink)' }}>{qty(c.measures[k])}</b> {MEASURE_LABELS[k].unit}
                  </span>
                ))
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
