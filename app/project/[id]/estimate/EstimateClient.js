'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import { computeEstimate, defaultSpaceSelections } from '../../../../lib/estimation/engine';
import { SPACE_TYPES, UNIT_TYPES } from '../../../../lib/estimation/templates';
import { REGIONS } from '../../../../lib/estimation/bulletins/2026-06';
import SpacesEditor from './SpacesEditor';
import SelectionsEditor from './SelectionsEditor';
import BoqView from './BoqView';
import { Chip, Select, money } from './ui';

const TABS = { spaces: '١. الفراغات والأبعاد', finishes: '٢. اختيارات التشطيب', boq: '٣. المقايسة والتسعير' };
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// نسخة مختصرة من السطر للحفظ في النسخة المعتمدة (السعر والمنتج بيتجمّدوا)
const snapshotProduct = p => p && { id: p.id, brand: p.brand, model: p.model, name: p.name, unit: p.unit, price: p.price, price_date: p.price_date, is_sample: !!p.is_sample };

export default function EstimateClient({ project, initialEstimate, catalog, benchmarks = [], initialVersions }) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState(initialEstimate.spaces?.length ? 'boq' : 'spaces');
  const [title, setTitle] = useState(initialEstimate.title);
  const [unitType, setUnitType] = useState(initialEstimate.unit_type);
  const [spaces, setSpaces] = useState(initialEstimate.spaces || []);
  const [selections, setSelections] = useState(initialEstimate.selections || {});
  const [settings, setSettings] = useState({ overheadPct: 0, profitPct: 15, vatPct: 0, defaultHeight: 3, region: 'cairo', ...(initialEstimate.settings || {}) });
  const [activeSpaceId, setActiveSpaceId] = useState(null);
  const [versions, setVersions] = useState(initialVersions);
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | saving | error
  const [saveError, setSaveError] = useState('');
  const firstRender = useRef(true);

  const result = useMemo(() => {
    try {
      return computeEstimate({ spaces, selections, settings }, catalog, { benchmarks });
    } catch (e) {
      return { spaces: [], lines: [], purchase: [], totals: {}, benchmarks: [], issues: [{ level: 'error', message: e.message }], complete: false };
    }
  }, [spaces, selections, settings, catalog, benchmarks]);

  // حفظ تلقائي بعد ثانية ونص من آخر تعديل
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setSaveState('dirty');
    const t = setTimeout(save, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, unitType, spaces, selections, settings]);

  useEffect(() => {
    const warn = e => { if (saveState !== 'saved') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  async function save() {
    setSaveState('saving');
    const { error } = await supabase.from('estimates').update({
      title, unit_type: unitType, spaces, selections, settings,
      totals: { grand: result.totals.grand ?? null, direct: result.totals.direct ?? null, floorArea: result.totals.floorArea ?? null, complete: result.complete },
    }).eq('id', initialEstimate.id);
    if (error) { setSaveState('error'); setSaveError(error.message); return false; }
    setSaveState('saved');
    setSaveError('');
    return true;
  }

  async function approveVersion() {
    if (!result.complete) {
      alert('مينفعش تعتمد نسخة والمقايسة فيها أخطاء — راجع التنبيهات في تبويب المقايسة.');
      setTab('boq');
      return;
    }
    if (!(await save())) return;
    const version = (versions[0]?.version || 0) + 1;
    const { data, error } = await supabase.from('estimate_versions').insert({
      estimate_id: initialEstimate.id,
      version,
      lines: result.lines.map(l => ({ ...l, product: snapshotProduct(l.product) })),
      purchase: result.purchase.map(p => ({ ...p, product: snapshotProduct(p.product) })),
      totals: result.totals,
      input: { spaces, selections, settings, unitType, title },
    }).select('id, version, totals, created_at').single();
    if (error) { alert(error.message); return; }
    setVersions([data, ...versions]);
  }

  // ---------- عمليات الفراغات ----------
  function addSpace(type) {
    const n = spaces.filter(s => s.type === type).length + 1;
    const space = { id: newId(), name: `${SPACE_TYPES[type]} ${n}`, type, shape: 'rect', length: null, width: null, height: settings.defaultHeight ?? null, openings: [] };
    setSpaces([...spaces, space]);
    setSelections({ ...selections, [space.id]: defaultSpaceSelections(type) });
  }
  function updateSpace(id, patch) {
    const old = spaces.find(s => s.id === id);
    setSpaces(spaces.map(s => (s.id === id ? { ...s, ...patch } : s)));
    if (patch.type && patch.type !== old.type) {
      setSelections({ ...selections, [id]: defaultSpaceSelections(patch.type) });
    }
  }
  function removeSpace(id) {
    const s = spaces.find(x => x.id === id);
    if (!confirm(`حذف «${s.name}» وكل اختياراته؟`)) return;
    setSpaces(spaces.filter(x => x.id !== id));
    const { [id]: _, ...rest } = selections;
    setSelections(rest);
  }
  function duplicateSpace(id) {
    const s = spaces.find(x => x.id === id);
    const copy = { ...structuredClone(s), id: newId(), name: `${s.name} (نسخة)` };
    const i = spaces.findIndex(x => x.id === id);
    setSpaces([...spaces.slice(0, i + 1), copy, ...spaces.slice(i + 1)]);
    setSelections({ ...selections, [copy.id]: structuredClone(selections[id] || {}) });
  }
  function copyToSimilar(spaceId, templateCode) {
    const src = spaces.find(s => s.id === spaceId);
    const sel = selections[spaceId]?.[templateCode];
    const next = { ...selections };
    for (const s of spaces) {
      if (s.type === src.type && s.id !== spaceId) next[s.id] = { ...(next[s.id] || {}), [templateCode]: structuredClone(sel) };
    }
    setSelections(next);
  }

  const saveLabel = { saved: 'محفوظ ✓', dirty: 'تعديلات غير محفوظة', saving: 'جاري الحفظ...', error: 'فشل الحفظ' }[saveState];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-5 pb-16">
      <div className="pt-6 pb-4 print:hidden">
        <a href={`/project/${project.id}`} className="text-xs" style={{ color: 'var(--ink-soft)' }}>← {project.name}</a>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="font-head font-bold text-lg bg-transparent outline-none border-b border-transparent focus:border-current flex-1 min-w-[200px]" />
          <div className="w-36">
            <Select value={unitType} onChange={setUnitType}>
              {Object.entries(UNIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div className="w-52">
            <Select value={settings.region} onChange={region => setSettings({ ...settings, region })}>
              {Object.entries(REGIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <span className="text-xs" style={{ color: saveState === 'error' ? 'var(--danger)' : 'var(--ink-soft)' }} title={saveError}>{saveLabel}</span>
        </div>
      </div>

      <div className="sticky top-0 z-10 py-3 mb-4 flex flex-wrap items-center gap-2 print:hidden" style={{ backgroundColor: 'var(--bg)' }}>
        {Object.entries(TABS).map(([k, v]) => <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{v}</Chip>)}
        <div className="mr-auto flex items-center gap-3">
          <span className="font-head font-extrabold text-lg">{money(result.totals.grand)} <span className="text-xs opacity-60">ج.م</span></span>
          <button type="button" onClick={() => window.print()} className="text-xs font-bold px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--line)' }}>طباعة</button>
          <button type="button" onClick={approveVersion} className="text-xs font-bold px-3 py-2 rounded-xl text-white" style={{ backgroundColor: 'var(--teal)' }}>
            اعتماد نسخة
          </button>
        </div>
      </div>

      {tab === 'spaces' && (
        <SpacesEditor
          spaces={spaces} computedSpaces={result.spaces}
          defaultHeight={settings.defaultHeight}
          onDefaultHeight={h => setSettings({ ...settings, defaultHeight: h })}
          onAdd={addSpace} onUpdate={updateSpace} onRemove={removeSpace} onDuplicate={duplicateSpace}
        />
      )}
      {tab === 'finishes' && (
        <SelectionsEditor
          spaces={spaces} selections={selections} catalog={catalog} lines={result.lines}
          activeSpaceId={activeSpaceId} onActiveSpace={setActiveSpaceId}
          onChange={(id, sel) => setSelections({ ...selections, [id]: sel })}
          onCopyToSimilar={copyToSimilar}
        />
      )}
      {(tab === 'boq') && (
        <BoqView project={project} title={title} unitType={unitType} result={result} settings={settings}
          onSettings={patch => setSettings({ ...settings, ...patch })} />
      )}

      {versions.length > 0 && (
        <div className="mt-6 print:hidden">
          <h3 className="font-head font-bold text-sm mb-2">النسخ المعتمدة</h3>
          <div className="flex flex-wrap gap-2">
            {versions.map(v => (
              <span key={v.id} className="text-xs border rounded-xl px-3 py-2" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--card)' }}>
                نسخة {v.version} · {money(v.totals?.grand)} ج.م · {new Date(v.created_at).toLocaleDateString('ar-EG')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
