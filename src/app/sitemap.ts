import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://drippy.dz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();
  const { data: products } = await admin.from('products').select('slug, updated_at').eq('status', 'available');

  const staticRoutes = ['', '/shop', '/cgv', '/retours', '/confidentialite', '/mentions-legales'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const productRoutes = (products ?? []).map((p) => ({
    url: `${SITE_URL}/product/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
  }));

  return [...staticRoutes, ...productRoutes];
}
