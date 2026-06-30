'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function Inner() {
  const sp = useSearchParams();
  const [status, setStatus] = useState<'pending' | 'ok' | 'fail'>('pending');

  useEffect(() => {
    fetch('/api/auth/verify-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sp.get('token') ?? '' }),
    })
      .then((r) => r.json())
      .then((j) => setStatus(j.success ? 'ok' : 'fail'))
      .catch(() => setStatus('fail'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card mt-8">
      {status === 'pending' && <p className="text-text-secondary">Vérification en cours...</p>}
      {status === 'ok' && <><div className="text-5xl mb-4">✅</div><p>Email vérifié ! <Link href="/login" className="text-primary">Se connecter</Link></p></>}
      {status === 'fail' && <><div className="text-5xl mb-4">⚠️</div><p className="text-text-secondary">Lien invalide ou expiré.</p></>}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-heading text-5xl gradient-text">DRIPPY</Link>
        <Suspense fallback={<div className="mt-8 text-text-secondary">...</div>}><Inner /></Suspense>
      </div>
    </div>
  );
}
