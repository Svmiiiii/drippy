import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { PartnerQueue } from './PartnerQueue';

export default async function AdminProductionPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, wilaya_code, commune, address, confirmed_at, updated_at, status, sent_to_partner_at, total_dzd, order_items(id, product_name, size, quantity, garment_color, qr_preset, text_content)')
    .in('status', ['confirmed', 'in_production'])
    .order('confirmed_at', { ascending: true });
  const t = await getTranslations('admin.partner');

  const toSend = (orders ?? []).filter((o) => o.status === 'confirmed');
  const atPartner = (orders ?? []).filter((o) => o.status === 'in_production');

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t('title')}</h1>
      <p className="text-text-secondary mb-8">{t('subtitle')}</p>
      <PartnerQueue toSend={toSend} atPartner={atPartner} />
    </div>
  );
}
