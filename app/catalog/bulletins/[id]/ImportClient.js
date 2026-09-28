'use client';
import { useMemo, useRef, useState } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import { CATEGORIES, CATEGORY_BY_CODE } from '../../../../lib/estimation/categories';
import { BENCHMARK_DEFS, REGIONS } from '../../../../lib/estimation/bulletins/2026-06';
import { decideRows, recheckRow, blockingErrors, approvalRows, previousPricesFrom, FLAG_LABELS } from '../../../../lib/bulletin-import/decide';
import { seedMappings } from '../../../../lib/bulletin-import/seed-mappings';
import { Card, Chip, Badge, NumInput, money } from '../../../project/[id]/estimate/ui';

const CONCURRENCY = 2;
const USE_LABELS = { product: 'يدخل الكتالوج', benchmark: 'سعر مرجعي', ignore: 'تجاهل' };
const FILTERS = { review: 'محتاج مراجعة', used: 'هيدخل الكتالوج', all: 'كل السطور' };
const REVIEW_FLAGS = ['pass_mismatch', 'missing_in_pass', 'unreadable', 'price_text_mismatch', 'unit_mismatch', 'price_change', 'ai_suggestion', 'region_inferred'];

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export default function ImportClient({ initialImport, catalog, userMappings }) {
  const supabase = useMemo(() => createClient(), []);
  const [imp, setImp] = useState(initialImport);
  const [rows, setRows] = useState(initialImport.rows || []);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [viewPage, setViewPage] = useState(null);
  const [pages, setPages] = useState([]); // [{ n, status: pending|running|done|error, error }]
  const [filter, setFilter] = useState('review');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const docRef = useRef(null);

  const approved = imp.status === 'approved';
  const locked = approved || busy;
  const mappings = useMemo(() => [...seedMappings(), ...userMappings], [userMappings]);
  const previousPrices = useMemo(() => previousPricesFrom(catalog), [catalog]);

  async function saveDraft(nextRows, extra = {}) {
    const { error } = await supabase.from('bulletin_imports').update({ rows: approvalRows(nextRows), ...extra }).eq('id', imp.id);
    if (error) setMessage(`فشل حفظ المسودة: ${error.message}`);
  }

  // ---------- القراءة ----------
  async function attachFile(f) {
    if (!f) return;
    if (f.type !== 'application/pdf') { setMessage('الملف لازم يكون PDF'); return; }
    setFile(f);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(URL.createObjectURL(f));
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    docRef.current = doc;
    // الصفحات اللي اتقرت قبل كده في المسودة ما تتقريش تاني (إلا لو طلبت إعادة)
    setPages(doc.getPageIndices().map(i => ({ n: i + 1, status: rows.some(r => r.page === i + 1) ? 'done' : 'pending' })));
    setMessage('');
  }

  async function extractOne(n) {
    const { PDFDocument } = await import('pdf-lib');
    const single = await PDFDocument.create();
    const [copied] = await single.copyPages(docRef.current, [n - 1]);
    single.addPage(copied);
    const pdf = toBase64(await single.save());
    const res = await fetch('/api/bulletins/extract', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdf, page: n }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `خطأ ${res.status}`);
    return body.rows;
  }

  async function runExtraction(only = null) {
    if (!docRef.current) return;
    setBusy(true);
    setMessage('');
    const queue = pages.filter(p => (only ? only.includes(p.n) : p.status !== 'done')).map(p => p.n);
    let current = rows.filter(r => !queue.includes(r.page));
    const setStatus = (n, patch) => setPages(ps => ps.map(p => (p.n === n ? { ...p, ...patch } : p)));

    const worker = async () => {
      while (queue.length) {
        const n = queue.shift();
        setStatus(n, { status: 'running', error: null });
        try {
          const extracted = await extractOne(n);
          current = [...current.filter(r => r.page !== n), ...decideRows(extracted, { mappings, previousPrices })]
            .sort((a, b) => a.page - b.page);
          setRows(current);
          setStatus(n, { status: 'done' });
          await saveDraft(current, { file_name: file?.name, page_count: pages.length });
        } catch (e) {
          setStatus(n, { status: 'error', error: e.message });
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setBusy(false);
  }

  // ---------- المراجعة ----------
  function updateRow(idx, patch) {
    setRows(prev => {
      const next = prev.map((r, i) => {
        if (i !== idx) return r;
        const merged = { ...r, ...patch, decision: { ...r.decision, ...(patch.decision || {}) } };
        return recheckRow(merged);
      });
      return next;
    });
  }

  const shown = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => filter === 'all'
      || (filter === 'used' && r.decision.use !== 'ignore')
      || (filter === 'review' && (r.decision.use !== 'ignore' || r.decision.source === 'ai') && r.flags.some(f => REVIEW_FLAGS.includes(f)) && !r.reviewed));

  const errors = blockingErrors(rows);
  const counts = rows.reduce((c, r) => ({ ...c, [r.decision.use]: (c[r.decision.use] || 0) + 1 }), {});

  async function approve() {
    if (errors.length) { setMessage('في أخطاء لازم تتحل الأول (تحت)'); return; }
    if (!confirm(`اعتماد ${(counts.product || 0) + (counts.benchmark || 0)} سعر بتاريخ ${imp.effective_date}؟ مينفعش تتعدّل بعد الاعتماد.`)) return;
    setBusy(true);
    await saveDraft(rows);
    const { data, error } = await supabase.rpc('approve_bulletin_import', { import_id: imp.id });
    setBusy(false);
    if (error) { setMessage(`الاعتماد اترفض: ${error.message}`); return; }
    setImp({ ...imp, status: 'approved', approved_count: data });
    setMessage(`تم اعتماد ${data} سعر ✓ — الأسعار دخلت الكتالوج`);
  }

  const doneCount = pages.filter(p => p.status === 'done').length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-5 pb-16">
      <div className="pt-6 pb-4 flex flex-wrap items-center gap-3">
        <div>
          <a href="/catalog/bulletins" className="text-xs" style={{ color: 'var(--ink-soft)' }}>← النشرات</a>
          <h1 className="font-head font-bold text-lg mt-1">{imp.title}</h1>
          <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>سارية من {imp.effective_date} · الأسعار بتتسجّل غير شاملة الضريبة زي النشرة</p>
        </div>
        {approved ? <Badge tone="ok">معتمدة · {imp.approved_count} سعر</Badge> : <Badge tone="warn">مسودة</Badge>}
        <label className="mr-auto text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}>
          {file ? `الملف: ${file.name}` : rows.length ? 'أرفق الـ PDF لعرضه جنب الجدول' : 'اختار ملف النشرة (PDF)'}
          <input type="file" accept="application/pdf" className="hidden" onChange={e => attachFile(e.target.files?.[0])} />
        </label>
      </div>

      {message && <Card className="mb-3"><p className="text-sm font-bold">{message}</p></Card>}

      {!approved && pages.length > 0 && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="font-head font-bold text-sm">قراءة الصفحات: {doneCount} / {pages.length}</span>
            <span className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>كل صفحة بتتقري مرتين مستقلتين — أي اختلاف بيتعلّم للمراجعة</span>
            <button type="button" disabled={busy || doneCount === pages.length} onClick={() => runExtraction()}
              className="mr-auto font-head font-bold text-white text-sm px-4 py-2 rounded-xl" style={{ backgroundColor: 'var(--teal)', opacity: busy ? 0.5 : 1 }}>
              {busy ? 'جاري القراءة...' : doneCount ? 'كمّل الصفحات الباقية' : 'ابدأ القراءة'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pages.map(p => (
              <button key={p.n} type="button" title={p.error || ''}
                onClick={() => (p.status === 'error' ? runExtraction([p.n]) : setViewPage(p.n))}
                className="text-[11px] font-bold w-9 h-9 rounded-lg"
                style={{
                  backgroundColor: { done: 'var(--success)', running: 'var(--copper)', error: 'var(--danger)', pending: '#17302D14' }[p.status],
                  color: p.status === 'pending' ? 'var(--ink-soft)' : '#fff',
                }}>
                {p.status === 'error' ? '↻' : p.n}
              </button>
            ))}
          </div>
          {pages.some(p => p.status === 'error') && (
            <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>
              صفحات فشلت (اضغط عليها لإعادة المحاولة): {pages.filter(p => p.status === 'error').map(p => `ص ${p.n}: ${p.error}`).join(' · ')}
            </p>
          )}
        </Card>
      )}

      {rows.length > 0 && (
        <div className={`grid gap-4 ${fileUrl && viewPage ? 'lg:grid-cols-[1fr_520px]' : ''}`}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {Object.entries(FILTERS).map(([k, v]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{v}</Chip>)}
              <span className="text-xs mr-2" style={{ color: 'var(--ink-soft)' }}>
                {rows.length} سطر · {counts.product || 0} للكتالوج · {counts.benchmark || 0} مرجعي · {counts.ignore || 0} متجاهل
              </span>
            </div>

            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[1100px] text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
                    {['ص', 'البند كما في النشرة', 'الوحدة', 'السعر', 'المنطقة', 'القرار', 'التصنيف / المرجع', 'الاسم في الكتالوج', 'افتراضي', 'ملاحظات'].map(h => (
                      <th key={h} className="text-right font-bold py-2 px-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ r, i }) => {
                    const d = r.decision;
                    const needsConfirm = (r.flags.includes('pass_mismatch') || r.flags.includes('unreadable')) && d.use !== 'ignore';
                    const catOptions = CATEGORIES.filter(c => c.measure_unit === r.unit);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--line)', backgroundColor: d.use === 'ignore' ? 'transparent' : '#0F3D4806' }}>
                        <td className="py-2 px-2">
                          <button type="button" className="font-bold underline" style={{ color: 'var(--teal)' }} onClick={() => setViewPage(r.page)}>{r.page}</button>
                        </td>
                        <td className="py-2 px-2 max-w-[280px]">
                          <div className="font-bold">{r.name}</div>
                          {r.section && <div style={{ color: 'var(--ink-soft)' }}>{r.section}</div>}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.unit_raw || r.unit}</td>
                        <td className="py-2 px-2 w-28">
                          {locked ? <b className="font-head">{money(r.price)}</b> : (
                            <NumInput value={r.price} onChange={price => updateRow(i, { price, reviewed: true })} />
                          )}
                          {r.alt_price != null && <div className="mt-1" style={{ color: 'var(--danger)' }}>القراءة التانية: {r.alt_price}</div>}
                          {r.previous_price != null && <div className="mt-1" style={{ color: 'var(--ink-soft)' }}>السابق: {r.previous_price}</div>}
                        </td>
                        <td className="py-2 px-2">
                          <select disabled={locked} value={r.region || ''} onChange={e => updateRow(i, { region: e.target.value || null })}
                            className="border rounded px-1 py-1" style={{ borderColor: 'var(--line)' }}>
                            <option value="">كل المناطق</option>
                            {Object.entries(REGIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <select disabled={locked} value={d.use} onChange={e => updateRow(i, { decision: { use: e.target.value, source: 'user' } })}
                            className="border rounded px-1 py-1" style={{ borderColor: 'var(--line)' }}>
                            {Object.entries(USE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          {d.use === 'product' && (
                            <select disabled={locked} value={d.category || ''} onChange={e => updateRow(i, { decision: { category: e.target.value, source: 'user' } })}
                              className="border rounded px-1 py-1 max-w-[220px]" style={{ borderColor: r.flags.includes('unit_mismatch') ? 'var(--danger)' : 'var(--line)' }}>
                              <option value="">— اختر —</option>
                              {d.category && !catOptions.some(c => c.code === d.category) && (
                                <option value={d.category}>⚠ {CATEGORY_BY_CODE[d.category]?.title} ({CATEGORY_BY_CODE[d.category]?.measure_unit})</option>
                              )}
                              {catOptions.map(c => <option key={c.code} value={c.code}>{c.title}</option>)}
                            </select>
                          )}
                          {d.use === 'benchmark' && (
                            <select disabled={locked} value={d.benchmark || ''} onChange={e => updateRow(i, { decision: { benchmark: e.target.value, source: 'user' } })}
                              className="border rounded px-1 py-1" style={{ borderColor: 'var(--line)' }}>
                              <option value="">— اختر —</option>
                              {Object.entries(BENCHMARK_DEFS).map(([k, b]) => <option key={k} value={k}>{b.title}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {d.use === 'product' && (
                            <input disabled={locked} value={d.label || ''} placeholder={r.name} onChange={e => updateRow(i, { decision: { label: e.target.value } })}
                              className="border rounded px-1.5 py-1 w-44" style={{ borderColor: 'var(--line)' }} />
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {d.use === 'product' && (
                            <input type="checkbox" disabled={locked} checked={!!d.is_default} onChange={e => updateRow(i, { decision: { is_default: e.target.checked } })} />
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex flex-wrap gap-1">
                            {r.flags.map(f => <Badge key={f} tone={['unit_mismatch', 'pass_mismatch', 'unreadable'].includes(f) ? 'danger' : 'warn'}>{FLAG_LABELS[f] || f}</Badge>)}
                          </div>
                          {needsConfirm && !approved && (
                            <label className="flex items-center gap-1 mt-1 font-bold">
                              <input type="checkbox" checked={!!r.reviewed} onChange={e => updateRow(i, { reviewed: e.target.checked })} />
                              راجعت السعر على الملف
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!shown.length && (
                    <tr><td colSpan={10} className="text-center py-8" style={{ color: 'var(--ink-soft)' }}>مفيش سطور في الفلتر ده ✓</td></tr>
                  )}
                </tbody>
              </table>
            </Card>

            {!approved && (
              <Card className="mt-4">
                {errors.length > 0 ? (
                  <>
                    <p className="text-sm font-bold mb-2" style={{ color: 'var(--danger)' }}>لازم تتحل قبل الاعتماد ({errors.length}):</p>
                    <ul className="text-xs flex flex-col gap-1 mb-3" style={{ color: 'var(--danger)' }}>
                      {errors.slice(0, 12).map(e => <li key={e}>• {e}</li>)}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm mb-3" style={{ color: 'var(--success)' }}>مفيش أخطاء — جاهزة للاعتماد.</p>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveDraft(rows).then(() => setMessage('المسودة اتحفظت ✓'))}
                    className="text-sm font-bold px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--line)' }}>حفظ المسودة</button>
                  <button type="button" disabled={busy || errors.length > 0} onClick={approve}
                    className="font-head font-bold text-white text-sm px-5 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--teal)', opacity: errors.length ? 0.4 : 1 }}>
                    اعتماد الأسعار
                  </button>
                </div>
              </Card>
            )}
          </div>

          {fileUrl && viewPage && (
            <div className="lg:sticky lg:top-4 h-[80vh] border rounded-2xl overflow-hidden" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between px-3 py-2 text-xs" style={{ backgroundColor: 'var(--card)' }}>
                <b>الملف الأصلي — صفحة {viewPage}</b>
                <button type="button" onClick={() => setViewPage(null)}>✕</button>
              </div>
              <iframe key={viewPage} src={`${fileUrl}#page=${viewPage}`} title="PDF" className="w-full h-full" />
            </div>
          )}
        </div>
      )}

      {!rows.length && !pages.length && (
        <p className="text-sm text-center py-16" style={{ color: 'var(--ink-soft)' }}>اختار ملف النشرة (PDF) من الزرار اللي فوق عشان نبدأ.</p>
      )}
    </div>
  );
}
