import { z } from 'zod';

// ─── Section 16: global validation rules ────────────────────────────────────

// Algerian phone — normalized format 0[5-7]XXXXXXXX
export const phoneSchema = z
  .string()
  .regex(/^0[5-7]\d{8}$/, 'INVALID_PHONE');

export const emailSchema = z.string().email('INVALID_EMAIL');

// Password: min 12, uppercase, lowercase, number (reset-password rule)
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/\d/, 'Password must contain a number');

// ─── AUTH ───────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({ token: z.string().min(1) });

// ─── ORDERS ─────────────────────────────────────────────────────────────────
export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(50),
  qr_style: z.object({
    preset: z.string(),
    color: z.string().optional(),
  }),
  text: z
    .object({
      enabled: z.boolean(),
      content: z.string().max(80, 'Text must be 80 characters or fewer').optional(), // DRP-BUS-030
      position: z.enum(['above', 'below', 'none']).default('none'),
      font: z.string().optional(),
      color: z.string().optional(),
      size: z.number().int().optional(),
    })
    .optional(),
});

export const createOrderSchema = z.object({
  customer_name: z.string().min(1),
  customer_phone: phoneSchema,
  customer_email: emailSchema,
  wilaya_code: z.string().min(1),
  commune: z.string().min(1),
  address: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
});

// ─── QR ─────────────────────────────────────────────────────────────────────
export const qrUpdateSchema = z
  .object({
    target_type: z.enum(['link', 'message']),
    target_value: z.string().min(1),
  })
  .superRefine((val, ctx) => {
    if (val.target_type === 'link') {
      try { new URL(val.target_value); } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_value'], message: 'INVALID_URL' });
      }
    } else if (val.target_value.length > 5000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_value'], message: 'Message must be 5000 characters or fewer' });
    }
  });

// ─── ACCOUNT ────────────────────────────────────────────────────────────────
export const changeEmailSchema = z.object({
  current_password: z.string().min(1),
  new_email: emailSchema,
});

export const changePhoneSchema = z.object({
  current_password: z.string().min(1),
  phone: phoneSchema,
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: passwordSchema,
});

// ─── ADMIN ──────────────────────────────────────────────────────────────────
export const cancelOrderSchema = z.object({ reason: z.string().min(1) });
export const callLogSchema = z.object({
  result: z.enum(['answered', 'not_answered']),
  notes: z.string().optional(),
});
export const upsertProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price_dzd: z.number().int().min(0),
  status: z.enum(['available', 'out_of_stock', 'archived']).default('available'),
});

// ─── PAGINATION ─────────────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
