'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function handle() {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sp.get('token') ?? '', password }),
    });
    const json = await res.json();
    if (json.success) { setMsg('Mot de passe réinitialisé !'); setTimeout(() => router.push('/login'), 1500); }
    else setMsg(json.error?.message ?? 'Lien expiré');
  }

  return (
    <div className="card mt-8">
      <label className="text-sm text-text-secondary mb-1.5 block text-left">Nouveau mot de passe</label>
      <input className="input mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 12 caractères" />
      {msg && <p className="text-sm mb-4 text-accent">{msg}</p>}
      <button onClick={handle} className="btn-primary w-full justify-center">Réinitialiser</button>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-heading text-5xl gradient-text">DRIPPY</Link>
        <Suspense fallback={<div className="mt-8 text-text-secondary">Chargement...</div>}><Inner /></Suspense>
      </div>
    </div>
  );
}
