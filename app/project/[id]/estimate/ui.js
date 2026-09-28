'use client';
import { useEffect, useState } from 'react';

export const money = n => (n == null ? '—' : Math.round(n).toLocaleString('ar-EG'));
export const qty = (n, d = 2) => (n == null ? '—' : Number(n).toLocaleString('ar-EG', { maximumFractionDigits: d }));

// إدخال رقمي: بيحتفظ بالنص أثناء الكتابة (عشان "3." أو "0,5") وبيبعت رقم لما يبقى صالح
export function NumInput({ value, onChange, placeholder, className = '', min = 0, step = 'any', ...rest }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    if (value == null) { if (text !== '') setText(''); return; }
    if (Number(normalize(text)) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={e => {
        const t = e.target.value;
        setText(t);
        const n = normalize(t);
        if (n === '') onChange(null);
        else if (Number.isFinite(Number(n)) && Number(n) >= min) onChange(Number(n));
      }}
      className={`border rounded-lg px-2.5 py-2 text-sm outline-none w-full font-head ${className}`}
      style={{ borderColor: 'var(--line)', backgroundColor: '#fff' }}
      {...rest}
    />
  );
}

// يحوّل الأرقام العربية (٠-٩) والفاصلة العربية لأرقام عادية
function normalize(t) {
  return String(t)
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٫,]/g, '.')
    .trim();
}

export function Chip({ active, onClick, children, disabled }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className="text-xs font-bold px-3 py-2 rounded-full transition-colors"
      style={{
        backgroundColor: active ? 'var(--teal)' : '#17302D0A',
        color: active ? '#fff' : 'var(--ink-soft)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: ['#17302D0F', 'var(--ink-soft)'],
    rough: ['#B8763E1F', 'var(--copper)'],
    finish: ['#0F3D481A', 'var(--teal)'],
    warn: ['#E0A1001F', '#8A6200'],
    danger: ['#B5533C1A', 'var(--danger)'],
    ok: ['#4C7A5E1A', 'var(--success)'],
  };
  const [bg, fg] = tones[tone] || tones.neutral;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: bg, color: fg }}>{children}</span>;
}

export function Card({ children, className = '' }) {
  return (
    <div className={`border rounded-2xl p-4 ${className}`} style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}>
      {children}
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-bold" style={{ color: 'var(--ink-soft)' }}>{label}</span>
      {children}
    </label>
  );
}

export function Select({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value ?? ''} onChange={e => onChange(e.target.value)}
      className={`border rounded-lg px-2.5 py-2 text-sm outline-none w-full ${className}`}
      style={{ borderColor: 'var(--line)', backgroundColor: '#fff' }}
    >
      {children}
    </select>
  );
}
