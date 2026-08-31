import { describe, it, expect } from 'vitest';
import { apiGet } from './helpers';

describe('GET /api/products', () => {
  it('returns a paginated list of products', async () => {
    const { status, body } = await apiGet('/api/products');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(Array.isArray(body.data.items)).toBe(true);
    expect(body.data.pagination).toMatchObject({ page: 1, limit: 20 });
  });

  it('respects the page/limit query params', async () => {
    const { status, body } = await apiGet('/api/products?page=1&limit=2');
    expect(status).toBe(200);
    if (!body.success) return;
    expect(body.data.items.length).toBeLessThanOrEqual(2);
    expect(body.data.pagination.limit).toBe(2);
  });
});

describe('GET /api/products/[slug]', () => {
  it('returns a product for a real slug', async () => {
    // Pull a real slug from the list endpoint instead of hardcoding one,
    // so this test doesn't break when the catalog changes.
    const list = await apiGet('/api/products?limit=1');
    if (!list.body.success || list.body.data.items.length === 0) {
      throw new Error('No products in catalog to test against');
    }
    const slug = list.body.data.items[0].slug;

    const { status, body } = await apiGet(`/api/products/${slug}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.slug).toBe(slug);
    expect(body.data).toHaveProperty('price_dzd');
    expect(body.data).toHaveProperty('product_variants');
  });

  it('returns 404 for a slug that does not exist', async () => {
    const { status, body } = await apiGet('/api/products/this-slug-does-not-exist-xyz');
    expect(status).toBe(404);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
