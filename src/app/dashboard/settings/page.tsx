'use client';
import { useState } from 'react';

type Modal = 'email' | 'phone' | 'password' | null;

function Field({ label, type = 'text', value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="mb-4">
      <label className="text-sm text-text-secondary mb-1.5 block">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ChangeEmailModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    setLoading(true); setMsg('');
    try {
      const res = await fetch('/api/dashboard/account/change-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_email: newEmail }),
      });
      const json = await res.json();
      if (json.success) { setMsg('Email mis à jour. Vérifie ta nouvelle adresse.'); }
      else setMsg(json.error?.message ?? 'Erreur');
    } catch { setMsg('Erreur réseau'); }
    finally { setLoading(false); }
  }

  return (
    <ModalWrapper title="Changer l'email" onClose={onClose}>
      <Field label="Mot de passe actuel" type="password" value={currentPassword} onChange={setCurrentPassword} />
      <Field label="Nouvel email" type="email" value={newEmail} onChange={setNewEmail} placeholder="nouveau@email.com" />
      {msg && <p className="text-sm mb-4 text-accent">{msg}</p>}
      <ModalActions onClose={onClose} onSubmit={submit} loading={loading} label="Mettre à jour" />
    </ModalWrapper>
  );
}

function ChangePhoneModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    setLoading(true); setMsg('');
    try {
      const res = await fetch('/api/dashboard/account/change-phone', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, phone }),
      });
      const json = await res.json();
      if (json.success) { setMsg('Téléphone mis à jour !'); setTimeout(onClose, 1500); }
      else setMsg(json.error?.message ?? 'Erreur');
    } catch { setMsg('Erreur réseau'); }
    finally { setLoading(false); }
  }

  return (
    <ModalWrapper title="Changer le téléphone" onClose={onClose}>
      <Field label="Mot de passe actuel" type="password" value={currentPassword} onChange={setCurrentPassword} />
      <Field label="Nouveau téléphone" value={phone} onChange={setPhone} placeholder="0555123456" />
      {msg && <p className="text-sm mb-4 text-accent">{msg}</p>}
      <ModalActions onClose={onClose} onSubmit={submit} loading={loading} label="Mettre à jour" />
    </ModalWrapper>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    setLoading(true); setMsg('');
    try {
      const res = await fetch('/api/dashboard/account/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const json = await res.json();
      if (json.success) { setMsg('Mot de passe mis à jour !'); setTimeout(onClose, 1500); }
      else setMsg(json.error?.message ?? 'Erreur');
    } catch { setMsg('Erreur réseau'); }
    finally { setLoading(false); }
  }

  return (
    <ModalWrapper title="Changer le mot de passe" onClose={onClose}>
      <Field label="Mot de passe actuel" type="password" value={currentPassword} onChange={setCurrentPassword} />
      <Field label="Nouveau mot de passe" type="password" value={newPassword} onChange={setNewPassword} placeholder="Min. 12 caractères" />
      {msg && <p className="text-sm mb-4 text-accent">{msg}</p>}
      <ModalActions onClose={onClose} onSubmit={submit} loading={loading} label="Mettre à jour" />
    </ModalWrapper>
  );
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSubmit, loading, label }: { onClose: () => void; onSubmit: () => void; loading: boolean; label: string }) {
  return (
    <div className="flex gap-3 mt-2">
      <button onClick={onSubmit} disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60">
        {loading ? '...' : label}
      </button>
      <button onClick={onClose} className="btn-secondary">Annuler</button>
    </div>
  );
}

export default function SettingsPage() {
  const [modal, setModal] = useState<Modal>(null);

  const items: { key: Modal; title: string; sub: string }[] = [
    { key: 'email', title: "Changer l'email", sub: 'Nécessite le mot de passe + nouvelle vérification' },
    { key: 'phone', title: 'Changer le téléphone', sub: 'Nécessite le mot de passe actuel' },
    { key: 'password', title: 'Changer le mot de passe', sub: 'Min. 12 caractères, majuscule, chiffre' },
  ];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold mb-8">Paramètres</h1>
      {items.map((s) => (
        <div key={s.key} className="card mb-4 flex justify-between items-center">
          <div><div className="font-semibold mb-1">{s.title}</div><div className="text-text-secondary text-sm">{s.sub}</div></div>
          <button onClick={() => setModal(s.key)} className="btn-secondary !px-4 !py-2 !text-sm">Modifier</button>
        </div>
      ))}
      <div className="card border-red-500/30 bg-red-500/5">
        <div className="font-semibold text-red-400 mb-1">Désactiver mon compte</div>
        <div className="text-text-secondary text-sm mb-4">Ton QR sera désactivé. Les données ne sont jamais supprimées.</div>
        <button className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold">Désactiver</button>
      </div>

      {modal === 'email' && <ChangeEmailModal onClose={() => setModal(null)} />}
      {modal === 'phone' && <ChangePhoneModal onClose={() => setModal(null)} />}
      {modal === 'password' && <ChangePasswordModal onClose={() => setModal(null)} />}
    </div>
  );
}
