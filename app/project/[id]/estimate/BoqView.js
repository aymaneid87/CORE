'use client';
import { useState } from 'react';
import { PHASES, UNIT_TYPES } from '../../../../lib/estimation/templates';
import { CATEGORY_BY_CODE } from '../../../../lib/estimation/categories';
import { productLabel } from '../../../../lib/estimation/catalog';
import { Card, Field, NumInput, Badge, money, qty } from './ui';

const th = 'text-[11px] font-bold py-2 px-2 text-right whitespace-nowrap';
const td = 'py-2 px-2 text-xs align-top';

export default function BoqView({ project, title, unitType, result, settings, onSettings }) {
  const [showAllIssues, setShowAllIssues] = useState(false);
  const { lines, purchase, totals, issues, complete } = result;
  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');
  const shownIssues = showAllIssues ? issues : [...errors, ...warnings].slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      {/* رأس الطباعة */}
      <div className="hidden print:block mb-2">
        <h1 className="font-head font-extrabold text-xl">{title}</h1>
        <p className="text-sm">{project.name} · {UNIT_TYPES[unitType]} · {new Date().toLocaleDateString('ar-EG')}</p>
      </div>

      {issues.length > 0 && (
        <Card className="print:hidden">
          <div className="flex items-center gap-2 mb-2">
            <Badge tone={complete ? 'warn' : 'danger'}>{complete ? 'المقايسة مكتملة مع تنبيهات' : `المقايسة غير مكتملة — ${errors.length} خطأ`}</Badge>
            {warnings.length > 0 && <Badge tone="warn">{warnings.length} تنبيه</Badge>}
          </div>
          <ul className="flex flex-col gap-1 text-xs">
            {shownIssues.map(i => (
              <li key={i.level + i.message} style={{ color: i.level === 'error' ? 'var(--danger)' : '#8A6200' }}>• {i.message}</li>
            ))}
          </ul>
          {issues.length > shownIssues.length && (
            <button type="button" className="text-xs font-bold mt-2" style={{ color: 'var(--teal)' }} onClick={() => setShowAllIssues(true)}>
              عرض الكل ({issues.length})
            </button>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['تأسيس', totals.rough, 'var(--copper)'],
              ['تشطيب', totals.finish, 'var(--teal)'],
              ['خامات وأجهزة', totals.materials, 'var(--ink)'],
              ['مصنعيات', totals.labor, 'var(--ink)'],
            ].map(([l, v, c]) => (
              <div key={l} className="border rounded-xl py-3 text-center" style={{ borderColor: 'var(--line)' }}>
                <div className="font-head font-extrabold text-lg" style={{ color: c }}>{money(v)}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>{l}</div>
              </div>
            ))}
          </div>
          <table className="w-full mt-4 text-sm">
            <tbody>
              <Row label="إجمالي البنود" value={totals.linesTotal} />
              <Row label="فرق تقريب العبوات (كراتين/بستلات كاملة)" value={totals.packRounding} muted />
              <Row label="التكلفة المباشرة" value={totals.direct} bold />
              <Row label={`مصاريف إدارية وتشغيل (${settings.overheadPct || 0}%)`} value={totals.overhead} muted />
              <Row label={`ربح الشركة (${settings.profitPct || 0}%)`} value={totals.profit} muted />
              {Number(settings.vatPct) > 0 && <Row label={`ضريبة القيمة المضافة (${settings.vatPct}%)`} value={totals.vat} muted />}
              <tr style={{ borderTop: '2px solid var(--ink)' }}>
                <td className="py-3 font-head font-extrabold">الإجمالي النهائي</td>
                <td className="py-3 font-head font-extrabold text-2xl text-left">{money(totals.grand)} <span className="text-xs opacity-60">ج.م</span></td>
              </tr>
              {totals.perM2 != null && (
                <tr><td className="text-xs" style={{ color: 'var(--ink-soft)' }}>سعر المتر المسطح ({qty(totals.floorArea)} م²)</td>
                  <td className="text-left font-head font-bold">{money(totals.perM2)} ج.م/م²</td></tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card className="print:hidden">
          <h3 className="font-head font-bold text-sm mb-3">إعدادات التسعير</h3>
          <div className="flex flex-col gap-3">
            <Field label="مصاريف إدارية وتشغيل %"><NumInput value={settings.overheadPct} onChange={v => onSettings({ overheadPct: v ?? 0 })} /></Field>
            <Field label="نسبة ربح الشركة %"><NumInput value={settings.profitPct} onChange={v => onSettings({ profitPct: v ?? 0 })} /></Field>
            <Field label="ضريبة القيمة المضافة % (0 = بدون)"><NumInput value={settings.vatPct} onChange={v => onSettings({ vatPct: v ?? 0 })} /></Field>
          </div>
        </Card>
      </div>

      {result.benchmarks?.length > 0 && (
        <Card>
          <h3 className="font-head font-bold text-sm mb-1">مقارنة بأسعار النشرة</h3>
          <p className="text-[11px] mb-2" style={{ color: 'var(--ink-soft)' }}>
            متوسط تكلفة المتر في المقايسة مقابل السعر المرجعي (غير شامل الضريبة). فرق أكتر من ±25% محتاج مراجعة.
          </p>
          {result.benchmarks.map(b => (
            <div key={b.code} className="flex flex-wrap items-center gap-3 py-2 text-sm" style={{ borderTop: '1px solid var(--line)' }}>
              <span className="font-bold">{b.title}</span>
              <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{qty(b.qty)} {b.unit}</span>
              <span className="mr-auto font-head">مقايستك: <b>{money(b.actual)}</b> · المرجع: <b>{money(b.price)}</b> ج.م/{b.unit}</span>
              <Badge tone={b.withinTolerance ? 'ok' : 'warn'}>{b.deviationPct > 0 ? '+' : ''}{Math.round(b.deviationPct)}%</Badge>
            </div>
          ))}
        </Card>
      )}

      {['rough', 'finish'].map(phase => {
        const pl = lines.filter(l => l.phase === phase);
        if (!pl.length) return null;
        const phaseTotal = pl.reduce((s, l) => s + (l.cost || 0), 0);
        return (
          <Card key={phase} className="overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-head font-bold text-base">أعمال ال{PHASES[phase]}</h3>
              <span className="font-head font-extrabold">{money(phaseTotal)} ج.م</span>
            </div>
            <table className="w-full min-w-[760px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
                  <th className={th}>م</th><th className={th}>الفراغ</th><th className={th}>البند</th><th className={th}>الخامة / المنتج</th>
                  <th className={th}>الكمية</th><th className={th}>الهالك</th><th className={th}>الكمية المطلوبة</th>
                  <th className={th}>الوحدات</th><th className={th}>سعر الوحدة</th><th className={th}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {pl.map((l, i) => (
                  <tr key={l.spaceId + l.templateCode + l.componentKey} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className={td}>{i + 1}</td>
                    <td className={td}>{l.spaceName}</td>
                    <td className={td}><b>{l.categoryTitle}</b><div style={{ color: 'var(--ink-soft)' }}>{l.groupTitle}: {l.optionTitle}</div></td>
                    <td className={td}>{l.product ? productLabel(l.product) : <span style={{ color: 'var(--danger)' }}>غير محدد</span>}
                      {l.product?.is_sample && <> <Badge tone="warn">تجريبي</Badge></>}</td>
                    <td className={td + ' font-head'}>{qty(l.measureQty)} {l.measureUnit}{l.coats > 1 ? ` × ${l.coats} وش` : ''}</td>
                    <td className={td + ' font-head'}>{l.wastePct ? `${l.wastePct}%` : '—'}</td>
                    <td className={td + ' font-head'}>{qty(l.neededQty)} {l.measureUnit}</td>
                    <td className={td + ' font-head'}>{qty(l.unitsRaw)} {l.unit}</td>
                    <td className={td + ' font-head'}>{money(l.unitPrice)}</td>
                    <td className={td + ' font-head font-bold'}>{money(l.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}

      {purchase.length > 0 && (
        <Card className="overflow-x-auto">
          <h3 className="font-head font-bold text-base mb-1">قائمة المشتريات المجمّعة</h3>
          <p className="text-[11px] mb-2" style={{ color: 'var(--ink-soft)' }}>الكميات مجمّعة على مستوى الوحدة كلها ومقرّبة لعبوات كاملة — دي اللي تتطلب من المورد.</p>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
                <th className={th}>التصنيف</th><th className={th}>المنتج</th><th className={th}>الكمية المطلوبة</th>
                <th className={th}>الكمية للشراء</th><th className={th}>سعر الوحدة</th><th className={th}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {purchase.map(p => (
                <tr key={p.product.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className={td}>{CATEGORY_BY_CODE[p.categoryCode]?.title}</td>
                  <td className={td}>{productLabel(p.product)}</td>
                  <td className={td + ' font-head'}>{qty(p.unitsRaw)}</td>
                  <td className={td + ' font-head font-bold'}>{qty(p.units)} {p.product.unit}</td>
                  <td className={td + ' font-head'}>{money(p.unitPrice)}</td>
                  <td className={td + ' font-head font-bold'}>{money(p.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted }) {
  return (
    <tr>
      <td className={`py-1.5 ${bold ? 'font-bold' : ''}`} style={{ color: muted ? 'var(--ink-soft)' : undefined }}>{label}</td>
      <td className={`py-1.5 text-left font-head ${bold ? 'font-extrabold' : ''}`}>{money(value)}</td>
    </tr>
  );
}
