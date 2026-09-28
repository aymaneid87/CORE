'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

function sums(p) {
  const tx = p.transactions || [];
  const received = tx.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const spent = tx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const fees = Math.round(received * (p.fees_pct / 100));
  return { received, spent, fees, balance: received - spent - fees };
}
const fmt = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 });
function num(n) { return fmt.format(Math.round(n)); }

export default function DashboardClient({ initialProjects, userEmail }) {
  const [projects, setProjects] = useState(initialProjects);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  // الحسابات بتتعمل مرة واحدة بس لما المشاريع تتغير، مش مع كل ضغطة زرار أو حرف بيتكتب
  const cards = useMemo(() => projects.map(p => ({ p, ...sums(p) })), [projects]);

  async function addProject(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, owner_id: user.id })
      .select('id, name, fees_pct, created_at')
      .single();
    if (!error) {
      setProjects([{ ...data, transactions: [] }, ...projects]);
      setName('');
      setShowNew(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto px-5 pb-10">
      <div className="flex items-center justify-between pt-6 pb-6">
        <h1 className="font-head font-extrabold text-lg">ميزان</h1>
        <button onClick={signOut} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          {userEmail} · خروج
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-head font-bold text-base">مشاريعك</h2>
        <button onClick={() => setShowNew(!showNew)} className="text-xs font-bold" style={{ color: 'var(--teal)' }}>
          + مشروع جديد
        </button>
      </div>

      {showNew && (
        <form onSubmit={addProject} className="flex gap-2 mb-4">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="اسم المشروع" autoFocus
            className="border rounded-xl px-4 py-2.5 text-sm flex-1 outline-none"
            style={{ borderColor: 'var(--line)' }}
          />
          <button className="font-head font-bold text-white px-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--teal)' }}>
            حفظ
          </button>
        </form>
      )}

      {projects.length === 0 && (
        <p className="text-sm text-center py-16" style={{ color: 'var(--ink-soft)' }}>
          لسه مفيش مشاريع — ابدأ بإضافة أول مشروع ليك.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {cards.map(({ p, received, spent, balance }) => {
          return (
            <Link key={p.id} href={`/project/${p.id}`}
              className="cv-auto block border rounded-2xl p-5"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}>
              <h3 className="font-head font-bold text-base mb-3">{p.name}</h3>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>الرصيد</span>
                <span className="font-head font-extrabold text-xl">{num(balance)} <span className="text-xs font-medium opacity-50">ج.م</span></span>
              </div>
              <div className="flex gap-4 pt-3 text-xs" style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
                <span>مستلم: {num(received)}</span>
                <span>مصروف: {num(spent)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
