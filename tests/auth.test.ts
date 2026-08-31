import { describe, it, expect, afterAll } from 'vitest';
import { apiPost, adminClient, testEmail } from './helpers';

describe('POST /api/auth/login', () => {
  it('rejects a malformed body with a validation error', async () => {
    const { status, body } = await apiPost('/api/auth/login', { email: 'not-an-email', password: '' });
    expect(status).toBe(422);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects valid-looking but wrong credentials', async () => {
    const { status, body } = await apiPost('/api/auth/login', {
      email: testEmail('login-wrongpass'),
      password: 'definitely-wrong-password',
    });
    expect(status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('rejects an invalid email', async () => {
    const { status, body } = await apiPost('/api/auth/forgot-password', { email: 'not-an-email' });
    expect(status).toBe(422);
    expect(body.success).toBe(false);
  });

  it('always returns success, even for an email with no account (no enumeration)', async () => {
    const { status, body } = await apiPost('/api/auth/forgot-password', { email: testEmail('forgot-noaccount') });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});

// Rate limiting is IP-based and shared with real traffic on this dev server,
// so this suite cleans up every row it creates instead of leaving the
// tester's own IP rate-limited afterwards.
describe('Rate limiting', () => {
  const cutoff = new Date().toISOString();

  afterAll(async () => {
    await adminClient().from('auth_rate_limits').delete().in('kind', ['login', 'forgot_password']).gte('created_at', cutoff);
  });

  it('blocks login after too many attempts from the same IP', async () => {
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const { status } = await apiPost('/api/auth/login', { email: testEmail(`ratelimit-${i}`), password: 'wrong' });
      lastStatus = status;
    }
    expect(lastStatus).toBe(429);
  });
});
