import { notFound } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { createClient } from '@/lib/supabase/server';
import { Customizer } from './Customizer';
import type { Product } from '@/types';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products').select('*, product_variants(*)').eq('slug', slug).single();
  if (!product) notFound();

  return (
    <>
      <Navbar />
      <Customizer product={product as Product} />
      <Footer />
    </>
  );
}
