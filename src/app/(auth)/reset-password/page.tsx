'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const t = useTranslations('auth');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sp.get('code') ?? '', password }),
      });
      const json = await res.json();
      if (json.success) { setMsg(t('passwordReset')); setTimeout(() => router.push('/login'), 1500); }
      else setMsg(json.error?.message ?? t('expiredLink'));
    } catch {
      setMsg(t('networkErrorRetry'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mt-8">
      <label className="text-sm text-text-secondary mb-1.5 block text-start">{t('newPassword')}</label>
      <input className="input mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('minChars')} />
      {msg && <p className="text-sm mb-4 text-accent">{msg}</p>}
      <button onClick={handle} disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">{loading ? t('resetting') : t('reset')}</button>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-heading text-5xl gradient-text">DROPIX</Link>
        <Suspense fallback={<div className="mt-8 text-text-secondary">{t('loading')}</div>}><Inner /></Suspense>
      </div>
    </div>
  );
}
