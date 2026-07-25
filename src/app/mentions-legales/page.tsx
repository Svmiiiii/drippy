import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Mentions légales — Dropix' };

export default async function MentionsLegalesPage() {
  const t = await getTranslations('legal.mentions');
  return (
    <LegalPage
      title={t('title')} highlight={t('highlight')} disclaimer={t('disclaimer')}
      sections={t.raw('sections')}
    />
  );
}
