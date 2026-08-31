import { describe, it, expect } from 'vitest';
import { BASE_URL } from './helpers';

// This endpoint predates the {success, data|error} envelope used elsewhere
// (see src/app/api/qr/[uid]/route.ts) — it returns its own raw shape, so it
// doesn't go through the typed apiGet() helper.
describe('GET /api/qr/[uid]', () => {
  it('returns 404 for a QR code that does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/qr/THIS-UID-DOES-NOT-EXIST`);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error.code).toBe('QR_NOT_FOUND');
  });
});
