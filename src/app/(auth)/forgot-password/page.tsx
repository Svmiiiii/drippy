'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch { /* network error — show confirmation anyway to avoid email enumeration */ }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-heading text-5xl gradient-text">DRIPPY</Link>
        <div className="card mt-8">
          {sent ? (
            <p className="text-text-secondary">Si un compte existe pour <strong className="text-white">{email}</strong>, un lien de réinitialisation a été envoyé.</p>
          ) : (
            <>
              <label className="text-sm text-text-secondary mb-1.5 block text-left">Email</label>
              <input className="input mb-5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" />
              <button onClick={handle} disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">{loading ? 'Envoi...' : 'Envoyer le lien'}</button>
            </>
          )}
          <div className="mt-4"><Link href="/login" className="text-text-secondary text-sm hover:text-white">← Retour</Link></div>
        </div>
      </div>
    </div>
  );
}
