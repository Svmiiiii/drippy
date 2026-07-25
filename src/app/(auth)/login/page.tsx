'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success) {
        const role = json.data.user?.role;
        router.refresh();
        router.push(role === 'customer' ? '/dashboard' : '/admin');
      } else {
        setError(json.error?.message ?? t('invalidCredentials'));
      }
    } catch {
      setError(t('networkErrorRetry'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/" className="font-heading text-5xl gradient-text">DROPIX</Link>
          <p className="text-text-secondary text-sm mt-2">{t('loginSubtitle')}</p>
        </div>
        <div className="card">
          <label className="text-sm text-text-secondary mb-1.5 block">{t('email')}</label>
          <input className="input mb-5" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handle()} placeholder="ton@email.com" />
          <label className="text-sm text-text-secondary mb-1.5 block">{t('password')}</label>
          <input className="input mb-5" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handle()} placeholder="••••••••••••" />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button onClick={handle} disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">
            {loading ? t('loggingIn') : t('login')}</button>
          <div className="text-center mt-4">
            <Link href="/forgot-password" className="text-text-secondary text-sm hover:text-white">{t('forgotPassword')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
