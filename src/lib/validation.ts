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
  size: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  garment_color: z.string().min(1).optional(),
  qr_style: z.object({
    preset: z.string(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
  text: z
    .object({
      enabled: z.boolean(),
      content: z.string().max(80, 'Text must be 80 characters or fewer').optional(), // DRP-BUS-030
      position: z.enum(['above', 'below', 'none']).default('none'),
      font: z.string().optional(),
      color: z.string().optional(),
      size: z.number().int().min(60).max(130).optional(),
    })
    .optional(),
  // Dropix brand logo flocked on the garment face, recolored to match
  // qr_style. Position is required except for accessories, where the
  // partner places it — enforced in /api/orders since category lives on
  // the product, not the item.
  logo: z.object({
    choice: z.enum(['badge', 'wordmark']),
    position: z.enum(['center', 'top_left']).optional(),
  }),
});

export const sendCheckoutCodeSchema = z.object({ email: emailSchema });
export const verifyCheckoutCodeSchema = z.object({ email: emailSchema, code: z.string().length(6) });

export const createOrderSchema = z.object({
  customer_name: z.string().min(1),
  customer_phone: phoneSchema,
  customer_email: emailSchema,
  wilaya_code: z.string().min(1),
  commune: z.string().min(1),
  address: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  promo_code: z.string().min(1).optional(),
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
export const printAreaSchema = z.object({
  top: z.number().min(0).max(100),
  left: z.number().min(0).max(100),
  width: z.number().min(5).max(80),
});

export const PRODUCT_CATEGORIES = ['tshirts', 'polos', 'hoodies_sweats', 'vestes', 'sacs_accessoires'] as const;
export const PRODUCT_COLLECTIONS = ['ete', 'automne', 'hiver', 'printemps'] as const;

export const upsertProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price_dzd: z.number().int().min(0),
  status: z.enum(['available', 'out_of_stock', 'archived']).default('available'),
  images: z.array(z.string().url()).max(8).optional(),
  sizes: z.array(z.string().min(1)).min(1).optional(),
  print_area: printAreaSchema.optional(),
  category: z.enum(PRODUCT_CATEGORIES).nullable().optional(),
  collection: z.enum(PRODUCT_COLLECTIONS).nullable().optional(),
  colors: z.array(z.object({
    name: z.string().min(1),
    hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    image: z.string().url(),
    available: z.boolean().default(true),
  })).max(20).optional(),
  dimensions_image: z.string().url().nullable().optional(),
  characteristics_fr: z.string().max(2000).nullable().optional(),
  // Per-size color availability — e.g. "Noir" sold out in size M but fine
  // in L. Parallel to `sizes`; a size with no entry here has every color
  // available.
  size_color_availability: z.array(z.object({
    size: z.string().min(1),
    unavailable_colors: z.array(z.string()),
  })).optional(),
});

// ─── SITE SETTINGS ──────────────────────────────────────────────────────────
export const siteSettingsSchema = z.object({
  hero_scan_text_fr: z.string().min(1).max(80),
});

// ─── PAGINATION ─────────────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
