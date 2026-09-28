'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRAND } from '../../lib/brand';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fn = mode === 'login' ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn.call(supabase.auth, { email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (mode === 'signup') { setError('اتبعت رسالة تأكيد على إيميلك — افتحها ثم سجّل دخول.'); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="font-head font-extrabold text-2xl text-center mb-1">{BRAND.name}</h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--ink-soft)' }}>
          {mode === 'login' ? 'سجّل دخولك لإدارة مشاريعك' : 'أنشئ حسابك الجديد'}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email" required placeholder="البريد الإلكتروني" value={email}
            onChange={e => setEmail(e.target.value)}
            className="border rounded-xl px-4 py-3 text-sm outline-none"
            style={{ borderColor: 'var(--line)' }}
          />
          <input
            type="password" required placeholder="كلمة المرور" value={password}
            onChange={e => setPassword(e.target.value)}
            className="border rounded-xl px-4 py-3 text-sm outline-none"
            style={{ borderColor: 'var(--line)' }}
          />
          {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button
            disabled={loading}
            className="font-head font-bold text-white py-3 rounded-xl mt-2"
            style={{ backgroundColor: 'var(--teal)' }}
          >
            {loading ? '...جاري' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-xs mt-5 w-full text-center"
          style={{ color: 'var(--teal)' }}
        >
          {mode === 'login' ? 'لسه معملتش حساب؟ سجّل دلوقتي' : 'عندك حساب بالفعل؟ سجّل دخول'}
        </button>
      </div>
    </div>
  );
}
