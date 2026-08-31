import { describe, it, expect, afterAll } from 'vitest';
import { apiPost, apiGet, adminClient, testEmail } from './helpers';

const createdEmails: string[] = [];
const createdOrderIds: string[] = [];

afterAll(async () => {
  const admin = adminClient();
  for (const orderId of createdOrderIds) {
    await admin.from('order_items').delete().eq('order_id', orderId);
    await admin.from('orders').delete().eq('id', orderId);
  }
  if (createdEmails.length > 0) {
    await admin.from('checkout_email_verifications').delete().in('email', createdEmails);
  }
});

async function getRealProductForOrder() {
  const list = await apiGet('/api/products?limit=10');
  if (!list.body.success) throw new Error('products endpoint failed');
  const withVariant = list.body.data.items.find((p: any) => p.product_variants?.length > 0);
  if (!withVariant) throw new Error('No product with variants found to test against');
  return {
    product_id: withVariant.id,
    size: withVariant.product_variants[0].size,
    garment_color: withVariant.colors?.[0]?.name,
    isAccessory: withVariant.category === 'sacs_accessoires',
  };
}

describe('POST /api/checkout/send-code', () => {
  it('rejects an invalid email', async () => {
    const { status, body } = await apiPost('/api/checkout/send-code', { email: 'not-an-email' });
    expect(status).toBe(422);
    expect(body.success).toBe(false);
  });

  it('sends a code for a valid email', async () => {
    const email = testEmail('sendcode');
    createdEmails.push(email);
    const { status, body } = await apiPost('/api/checkout/send-code', { email });
    expect(status).toBe(200);
    expect(body.success).toBe(true);

    const { data } = await adminClient()
      .from('checkout_email_verifications').select('code').eq('email', email)
      .order('created_at', { ascending: false }).limit(1).single();
    expect(data?.code).toMatch(/^\d{6}$/);
  });
});

describe('POST /api/checkout/verify-code', () => {
  it('rejects an incorrect code', async () => {
    const email = testEmail('verifycode-wrong');
    createdEmails.push(email);
    await apiPost('/api/checkout/send-code', { email });

    const { status, body } = await apiPost('/api/checkout/verify-code', { email, code: '000000' });
    expect(status).toBe(422);
    expect(body.success).toBe(false);
  });

  it('accepts the correct code', async () => {
    const email = testEmail('verifycode-right');
    createdEmails.push(email);
    await apiPost('/api/checkout/send-code', { email });
    const { data } = await adminClient()
      .from('checkout_email_verifications').select('code').eq('email', email)
      .order('created_at', { ascending: false }).limit(1).single();

    const { status, body } = await apiPost('/api/checkout/verify-code', { email, code: data!.code });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

describe('POST /api/orders — email verification gate', () => {
  it('rejects an order whose email was never verified', async () => {
    const { product_id, size, garment_color, isAccessory } = await getRealProductForOrder();
    const email = testEmail('orders-noverify');
    createdEmails.push(email);

    const { status, body } = await apiPost('/api/orders', {
      customer_name: 'QA Test', customer_phone: '0555123456', customer_email: email,
      wilaya_code: '16 - Alger', commune: 'Hydra', address: 'Test address',
      items: [{
        product_id, size, garment_color, quantity: 1,
        qr_style: { preset: 'NEON' },
        logo: { choice: 'badge', position: isAccessory ? undefined : 'center' },
      }],
    });
    expect(status).toBe(422);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('creates an order once the email is verified (full checkout flow)', async () => {
    const { product_id, size, garment_color, isAccessory } = await getRealProductForOrder();
    const email = testEmail('orders-full-flow');
    createdEmails.push(email);

    await apiPost('/api/checkout/send-code', { email });
    const { data } = await adminClient()
      .from('checkout_email_verifications').select('code').eq('email', email)
      .order('created_at', { ascending: false }).limit(1).single();
    const verify = await apiPost('/api/checkout/verify-code', { email, code: data!.code });
    expect(verify.body.success).toBe(true);

    const { status, body } = await apiPost('/api/orders', {
      customer_name: 'QA Test', customer_phone: '0555123456', customer_email: email,
      wilaya_code: '16 - Alger', commune: 'Hydra', address: 'Test address',
      items: [{
        product_id, size, garment_color, quantity: 1,
        qr_style: { preset: 'NEON' },
        logo: { choice: 'badge', position: isAccessory ? undefined : 'center' },
      }],
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.order_number).toMatch(/^ORD-/);
    expect(body.data.status).toBe('pending_confirmation');
    createdOrderIds.push(body.data.order_id);
  });
});
