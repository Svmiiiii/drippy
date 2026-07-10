import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Retours & remboursements — Drippy' };

export default async function RetoursPage() {
  const t = await getTranslations('legal.retours');
  return (
    <LegalPage
      title={t('title')} highlight={t('highlight')} disclaimer={t('disclaimer')}
      sections={t.raw('sections')}
    />
  );
}
