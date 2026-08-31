import { describe, it, expect, afterAll } from 'vitest';
import { apiPost, adminClient, testEmail } from './helpers';

const createdEmails: string[] = [];
afterAll(async () => {
  if (createdEmails.length > 0) {
    await adminClient().from('checkout_email_verifications').delete().in('email', createdEmails);
  }
});

describe('POST /api/orders — validation', () => {
  it('rejects a body with no items', async () => {
    const { status, body } = await apiPost('/api/orders', {
      customer_name: 'QA Test', customer_phone: '0555123456', customer_email: testEmail('orders-noitems'),
      wilaya_code: '16 - Alger', commune: 'Hydra', address: 'Test address',
      items: [],
    });
    expect(status).toBe(422);
    expect(body.success).toBe(false);
  });

  it('rejects an invalid phone number', async () => {
    const { status, body } = await apiPost('/api/orders', {
      customer_name: 'QA Test', customer_phone: '123', customer_email: testEmail('orders-badphone'),
      wilaya_code: '16 - Alger', commune: 'Hydra', address: 'Test address',
      items: [{ product_id: '00000000-0000-0000-0000-000000000000', size: 'M', quantity: 1, qr_style: { preset: 'NEON' }, logo: { choice: 'badge', position: 'center' } }],
    });
    expect(status).toBe(422);
    expect(body.success).toBe(false);
  });

  it('rejects an order for a product that does not exist', async () => {
    const email = testEmail('orders-badproduct');
    createdEmails.push(email);
    await apiPost('/api/checkout/send-code', { email });
    const { data } = await adminClient()
      .from('checkout_email_verifications').select('code').eq('email', email)
      .order('created_at', { ascending: false }).limit(1).single();
    await apiPost('/api/checkout/verify-code', { email, code: data!.code });

    const { status, body } = await apiPost('/api/orders', {
      customer_name: 'QA Test', customer_phone: '0555123456', customer_email: email,
      wilaya_code: '16 - Alger', commune: 'Hydra', address: 'Test address',
      items: [{
        product_id: '00000000-0000-0000-0000-000000000000', size: 'M', quantity: 1,
        qr_style: { preset: 'NEON' }, logo: { choice: 'badge', position: 'center' },
      }],
    });
    expect(status).toBe(404);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
