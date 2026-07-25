import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Conditions générales de vente — Dropix' };

export default async function CgvPage() {
  const t = await getTranslations('legal.cgv');
  return (
    <LegalPage
      title={t('title')} highlight={t('highlight')} disclaimer={t('disclaimer')}
      sections={t.raw('sections')}
    />
  );
}
