import { NextResponse } from 'next/server';

// ─── API-003: standard response envelope ────────────────────────────────────
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function okEmpty() {
  return NextResponse.json({ success: true });
}

export function fail(code: ApiErrorCode, message?: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message: message ?? DEFAULT_MESSAGES[code] ?? code } },
    { status },
  );
}

// ─── Section 15: standard error codes ───────────────────────────────────────
export type ApiErrorCode =
  // validation
  | 'VALIDATION_ERROR' | 'INVALID_EMAIL' | 'INVALID_PHONE' | 'INVALID_URL'
  // auth
  | 'INVALID_CREDENTIALS' | 'INVALID_PASSWORD' | 'TOKEN_EXPIRED'
  | 'EMAIL_NOT_VERIFIED' | 'ACCOUNT_DISABLED' | 'EMAIL_NOT_FOUND' | 'EMAIL_ALREADY_USED'
  // orders
  | 'ORDER_NOT_FOUND' | 'ORDER_ALREADY_CONFIRMED' | 'ORDER_ALREADY_CANCELLED'
  | 'PRODUCT_OUT_OF_STOCK' | 'PRODUCT_NOT_FOUND'
  // qr
  | 'QR_NOT_FOUND' | 'QR_DISABLED' | 'INVALID_QR_TARGET' | 'ACCOUNT_NOT_ACTIVATED'
  // production
  | 'PRODUCTION_FAILED' | 'PDF_GENERATION_FAILED' | 'ZIP_GENERATION_FAILED'
  // permissions
  | 'FORBIDDEN' | 'UNAUTHORIZED'
  // generic
  | 'SERVICE_UNAVAILABLE';

const DEFAULT_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  VALIDATION_ERROR: 'The submitted data is invalid',
  INVALID_EMAIL: 'Email address is invalid',
  INVALID_PHONE: 'Phone number is invalid',
  INVALID_URL: 'The provided URL is invalid',
  INVALID_CREDENTIALS: 'Email or password is incorrect',
  INVALID_PASSWORD: 'The current password is incorrect',
  EMAIL_NOT_VERIFIED: 'Please verify your email before signing in',
  ACCOUNT_DISABLED: 'This account has been disabled',
  EMAIL_NOT_FOUND: 'No account is associated with this email',
  EMAIL_ALREADY_USED: 'This email is already in use',
  ORDER_NOT_FOUND: 'Order not found',
  ORDER_ALREADY_CONFIRMED: 'This order has already been confirmed',
  PRODUCT_OUT_OF_STOCK: 'This product is out of stock',
  PRODUCT_NOT_FOUND: 'Product not found',
  QR_NOT_FOUND: 'This QR code does not exist',
  QR_DISABLED: 'This QR code is currently disabled',
  ACCOUNT_NOT_ACTIVATED: 'Your account is not yet activated',
  FORBIDDEN: 'You do not have permission to perform this action',
  UNAUTHORIZED: 'Authentication required',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
};

// ─── Zod error → VALIDATION_ERROR ───────────────────────────────────────────
import type { ZodError } from 'zod';
export function failValidation(err: ZodError) {
  const first = err.issues[0];
  return fail('VALIDATION_ERROR', first ? `${first.path.join('.')}: ${first.message}` : undefined, 422);
}
