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
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <h1 className="font-heading gradient-text mb-16 sm:mb-20" style={{ fontSize: 'clamp(48px,7vw,88px)' }}>{t('title')}</h1>
        <ShopClient products={(products as Product[]) ?? []} />
      </div>
      <Footer />
    </>
  );
}
