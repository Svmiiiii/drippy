import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/types';
import { ShopClient } from './ShopClient';

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products').select('*').neq('status', 'archived').order('created_at', { ascending: false });
  const t = await getTranslations('shop');

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="font-heading text-5xl mb-2 gradient-text">{t('title')}</h1>
        <p className="text-text-secondary mb-10">{t('subtitle')}</p>
        <ShopClient products={(products as Product[]) ?? []} />
      </div>
      <Footer />
    </>
  );
}
