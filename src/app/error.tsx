'use client';
import { useTranslations } from 'next-intl';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('genericError');
  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="text-7xl mb-6">⚠️</div>
      <h1 className="font-heading text-4xl mb-3 text-white">{t('title')} <span className="gradient-text">{t('highlight')}</span></h1>
      <p className="text-text-secondary mb-8">{t('message')}</p>
      <button onClick={reset} className="btn-primary">{t('retry')}</button>
    </div>
  );
}
