'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { QrCode } from '@/components/QrCode';

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings');
  const [heroText, setHeroText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((j) => {
      if (j.success) setHeroText(j.data.hero_scan_text_fr ?? '');
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_scan_text_fr: heroText }),
      });
      const j = await res.json();
      setToast(j.success ? t('saved') : (j.error?.message ?? t('error')));
    } catch {
      setToast(t('error'));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold mb-1">{t('title')}</h1>
        <p className="text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="card max-w-xl">
        <h2 className="font-bold mb-1">{t('heroScanText')}</h2>
        <p className="text-text-secondary text-sm mb-4">{t('heroScanTextHint')}</p>
        {loading ? (
          <p className="text-text-secondary text-sm">{t('loading')}</p>
        ) : (
          <>
            <input className="input" value={heroText} maxLength={80}
              onChange={(e) => setHeroText(e.target.value)} placeholder={t('heroScanTextPlaceholder')} />
            <div className="text-xs text-text-secondary mt-1.5 mb-4">{heroText.length}/80</div>

            <div className="bg-bg rounded-2xl p-6 mb-4 flex justify-center">
              <QrCode preset="NEON" size={140} text={heroText} textPosition="below" />
            </div>

            <button onClick={save} disabled={saving || !heroText.trim()} className="btn-primary disabled:opacity-60">
              {saving ? t('saving') : t('save')}
            </button>
          </>
        )}
      </div>

      {toast && <div className="fixed bottom-6 end-6 bg-surface border border-border px-5 py-3 rounded-2xl text-sm z-50">{toast}</div>}
    </div>
  );
}
