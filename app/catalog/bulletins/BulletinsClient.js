'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Card, Badge, Field } from '../../project/[id]/estimate/ui';

export default function BulletinsClient({ imports }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e) {
    e.preventDefault();
    if (!title.trim() || !month) { setError('اكتب اسم النشرة والشهر'); return; }
    setBusy(true);
    const { data, error: err } = await supabase.from('bulletin_imports')
      .insert({ title: title.trim(), effective_date: `${month}-01` }).select('id').single();
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.push(`/catalog/bulletins/${data.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-5 pb-16">
      <div className="pt-6 pb-4">
        <a href="/catalog" className="text-xs" style={{ color: 'var(--ink-soft)' }}>← كتالوج الخامات</a>
        <h1 className="font-head font-bold text-lg mt-2">نشرات الأسعار</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
          ارفع ملف PDF للنشرة ← الذكاء الاصطناعي بيقرا كل صفحة مرتين ← تراجع وتعتمد ← الأسعار تدخل الكتالوج بتاريخها.
        </p>
      </div>

      <Card className="mb-5">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <Field label="اسم النشرة" className="flex-1 min-w-[200px]">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً: نشرة أسعار أكتوبر 2026"
              className="border rounded-lg px-2.5 py-2 text-sm outline-none" style={{ borderColor: 'var(--line)', backgroundColor: '#fff' }} />
          </Field>
          <Field label="سارية من شهر" className="w-40">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="border rounded-lg px-2.5 py-2 text-sm outline-none" style={{ borderColor: 'var(--line)', backgroundColor: '#fff' }} />
          </Field>
          <button disabled={busy} className="font-head font-bold text-white px-5 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--teal)' }}>
            + نشرة جديدة
          </button>
        </form>
        {error && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
      </Card>

      <div className="flex flex-col gap-2">
        {imports.map(i => (
          <a key={i.id} href={`/catalog/bulletins/${i.id}`} className="border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}>
            <span className="font-bold text-sm">{i.title}</span>
            <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{i.effective_date?.slice(0, 7)}</span>
            {i.status === 'approved'
              ? <Badge tone="ok">معتمدة · {i.approved_count} بند</Badge>
              : <Badge tone="warn">مسودة</Badge>}
            <span className="mr-auto text-[11px]" style={{ color: 'var(--ink-soft)' }}>{new Date(i.created_at).toLocaleDateString('ar-EG')}</span>
          </a>
        ))}
        {!imports.length && <p className="text-sm text-center py-10" style={{ color: 'var(--ink-soft)' }}>لسه مفيش نشرات مستوردة.</p>}
      </div>
    </div>
  );
}
