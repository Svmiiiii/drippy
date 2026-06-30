'use client';
import { useState } from 'react';
import { QrCode } from '@/components/QrCode';

interface Dest { target_type: string; target_value: string }

export function QrManager({ qrUid, initialDest, history }: { qrUid: string; initialDest: Dest | null; history: any[] }) {
  const [dest, setDest] = useState<Dest>(initialDest ?? { target_type: 'message', target_value: 'Bienvenue 👋' });
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<'link' | 'message'>(dest.target_type as any);
  const [value, setValue] = useState(dest.target_value);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/qr/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: type, target_value: value }),
      });
      const json = await res.json();
      if (json.success) { setDest({ target_type: type, target_value: value }); setEditing(false); setToast('QR mis à jour !'); setTimeout(() => setToast(''), 3000); }
      else setToast(json.error?.message ?? 'Erreur');
    } catch {
      setToast('Erreur réseau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-8">
      <div className="card flex flex-col items-center gap-6 py-10">
        <QrCode preset="NEON" size={200} value={qrUid} text={dest.target_type === 'message' ? dest.target_value : ''} textPosition="below" />
        <div className="text-center">
          <div className="font-heading text-2xl tracking-widest text-primary">{qrUid}</div>
          <div className="text-xs text-text-secondary mt-1">Ton identifiant unique</div>
        </div>
        <button onClick={() => { setType(dest.target_type as any); setValue(dest.target_value); setEditing(true); }} className="btn-primary">Modifier mon QR</button>
      </div>

      <div>
        <div className="card mb-4">
          <div className="text-xs text-text-secondary uppercase tracking-wide mb-3">Destination actuelle</div>
          <span className="badge bg-primary/20 text-purple-300 mb-2">{dest.target_type === 'link' ? 'Lien' : 'Message'}</span>
          <div className="text-sm break-all">{dest.target_value}</div>
        </div>
        <div className="card">
          <div className="text-xs text-text-secondary uppercase tracking-wide mb-4">Historique</div>
          {history.length === 0 && <p className="text-text-secondary text-sm">Aucune modification.</p>}
          {history.map((r) => (
            <div key={r.id} className="border-b border-border last:border-0 pb-3 mb-3 last:mb-0 last:pb-0">
              <div className="text-xs text-text-secondary mb-1">{new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
              <div className="text-sm text-red-400 line-through">{r.old_target_value}</div>
              <div className="text-sm text-green-400">→ {r.new_target_value}</div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setEditing(false)}>
          <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold mb-5">Modifier mon QR</h2>
            <div className="flex gap-3 mb-4">
              {(['link', 'message'] as const).map((t) => (
                <button key={t} onClick={() => setType(t)} className={`px-4 py-2 rounded-[10px] text-sm font-semibold border ${type === t ? 'border-secondary bg-secondary/15' : 'border-border text-text-secondary'}`}>
                  {t === 'link' ? '🔗 Lien' : '💬 Message'}</button>
              ))}
            </div>
            {type === 'link' ? (
              <input className="input" placeholder="https://instagram.com/..." value={value} onChange={(e) => setValue(e.target.value)} />
            ) : (
              <textarea className="input" rows={4} placeholder="Bienvenue 👋" value={value} onChange={(e) => setValue(e.target.value.slice(0, 5000))} />
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">{saving ? '...' : 'Sauvegarder'}</button>
              <button onClick={() => setEditing(false)} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 bg-surface border border-border px-5 py-3 rounded-2xl text-sm z-50">✓ {toast}</div>}
    </div>
  );
}
