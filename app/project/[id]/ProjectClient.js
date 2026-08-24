'use client';
import { useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

const CATS = ['سيراميك', 'دهانات', 'سباكة', 'كهرباء', 'عمالة', 'نجارة'];
function num(n) { return Math.round(n).toLocaleString('ar-EG'); }

export default function ProjectClient({ project }) {
  const [tx, setTx] = useState(project.transactions || []);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState(CATS[0]);
  const [vendor, setVendor] = useState('');
  const supabase = createClient();

  const received = tx.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const spent = tx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const fees = Math.round(received * (project.fees_pct / 100));
  const balance = received - spent - fees;

  async function saveExpense(e) {
    e.preventDefault();
    if (!amount) return;
    const { data, error } = await supabase
      .from('transactions')
      .insert({ project_id: project.id, item: vendor || cat, amount: -Number(amount), category: cat })
      .select()
      .single();
    if (!error) {
      setTx([...tx, data]);
      setAmount(''); setVendor(''); setShowModal(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 pb-10">
      <div className="pt-6 pb-5">
        <a href="/dashboard" className="text-xs" style={{ color: 'var(--ink-soft)' }}>← رجوع للمشاريع</a>
        <h1 className="font-head font-bold text-lg mt-2">{project.name}</h1>
      </div>

      <div className="rounded-3xl p-6 mb-4 text-center text-white" style={{ backgroundColor: 'var(--teal)' }}>
        <span className="text-xs opacity-70">رصيد المشروع</span>
        <div className="font-head font-extrabold text-4xl mt-1">{num(balance)} <span className="text-sm font-medium opacity-60">ج.م</span></div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[['المستلم', received, 'var(--success)'], ['المصروف', spent, 'var(--danger)'], ['أتعابي', fees, 'var(--copper)']].map(([l, v, c]) => (
          <div key={l} className="border rounded-2xl py-4 text-center" style={{ borderColor: 'var(--line)' }}>
            <div className="font-head font-extrabold text-lg" style={{ color: c }}>{num(v)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{l}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setShowModal(true)}
        className="w-full font-head font-bold text-white py-3.5 rounded-xl mb-6"
        style={{ backgroundColor: 'var(--teal)' }}>
        + تسجيل مصروف
      </button>

      <h3 className="font-head font-bold text-sm mb-3">المعاملات</h3>
      <div className="flex flex-col gap-2">
        {tx.slice().reverse().map(t => (
          <div key={t.id} className="border rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)' }}>
            <span className="text-sm font-bold">{t.item}</span>
            <span className="font-head font-extrabold text-sm" style={{ color: t.amount > 0 ? 'var(--success)' : 'var(--danger)' }}>
              {t.amount > 0 ? '+' : ''}{num(t.amount)}
            </span>
          </div>
        ))}
        {tx.length === 0 && <p className="text-sm text-center py-10" style={{ color: 'var(--ink-soft)' }}>مفيش معاملات لسه</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ backgroundColor: '#00000055' }}>
          <div className="w-full sm:w-96 rounded-t-3xl sm:rounded-3xl p-6" style={{ backgroundColor: 'var(--card)' }}>
            <h3 className="font-head font-bold text-lg mb-5">مصروف جديد</h3>
            <form onSubmit={saveExpense}>
              <input
                value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="المبلغ" className="border rounded-xl px-4 py-3 mb-3 w-full text-lg font-head font-bold outline-none"
                style={{ borderColor: 'var(--line)' }}
              />
              <div className="flex flex-wrap gap-2 mb-3">
                {CATS.map(c => (
                  <button type="button" key={c} onClick={() => setCat(c)}
                    className="text-xs font-bold px-3.5 py-2 rounded-full"
                    style={{ backgroundColor: cat === c ? 'var(--teal)' : '#17302D08', color: cat === c ? '#fff' : 'var(--ink-soft)' }}>
                    {c}
                  </button>
                ))}
              </div>
              <input
                value={vendor} onChange={e => setVendor(e.target.value)}
                placeholder="اسم المورد" className="border rounded-xl px-4 py-3 mb-5 w-full text-sm outline-none"
                style={{ borderColor: 'var(--line)' }}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-bold border" style={{ borderColor: 'var(--line)' }}>إلغاء</button>
                <button className="flex-1 font-head font-bold text-white py-3 rounded-xl" style={{ backgroundColor: 'var(--teal)' }}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
