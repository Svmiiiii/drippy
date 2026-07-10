import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { createClient } from '@/lib/supabase/server';
import { getUserLocale } from '@/lib/i18n';
import { Customizer } from './Customizer';
import type { Product } from '@/types';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products').select('*, product_variants(*)').eq('slug', slug).single();
  if (!product) notFound();

  const locale = await getUserLocale();
  const t = await getTranslations('product');
  const characteristics = (product as any)[`characteristics_${locale}`] || (product as any).characteristics_fr;

  return (
    <>
      <Navbar />
      <Customizer product={product as Product} />
      {(characteristics || product.dimensions_image) && (
        <div className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-2 gap-8">
          {characteristics && (
            <div className="card">
              <h2 className="font-bold text-lg mb-3">{t('characteristics')}</h2>
              <p className="text-text-secondary text-sm whitespace-pre-line leading-relaxed">{characteristics}</p>
            </div>
          )}
          {product.dimensions_image && (
            <div className="card">
              <h2 className="font-bold text-lg mb-3">{t('dimensions')}</h2>
              <img src={product.dimensions_image} alt={t('dimensions')} className="w-full rounded-xl" />
            </div>
          )}
        </div>
      )}
      <Footer />
    </>
  );
}
