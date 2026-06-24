# DRIPPY — Your QR. Your Story.

Streetwear premium where **every customer gets one permanent, unique QR code** embedded in their clothing. The QR belongs to the person, not the product — `1 client = 1 QR à vie`. Built for Algeria V1 (payment on delivery, FR/EN/AR).

This is the full-stack implementation built from the Drippy V2 specification documents (Developer Bible, Technical Architecture, Database Architecture, API Specification, Design System).

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | TailwindCSS (design tokens from Design System V2) |
| Backend | Supabase — PostgreSQL, Auth, Storage, RLS |
| Validation | Zod |
| Data fetching | TanStack Query |
| Charts | Recharts |
| QR rendering | qr-code-styling |
| i18n | next-intl (fr / en / ar) |
| Email | Resend + React Email |
| Deploy | Vercel + Supabase Cloud |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                 Landing (DRP-WF-VIS-002)
│   ├── shop/                    Catalogue
│   ├── product/[slug]/          Product + Customizer (WYSIWYP — the key screen)
│   ├── checkout/                Visitor order → pending_confirmation
│   ├── (auth)/                  login, forgot/reset password, verify-email
│   ├── dashboard/               Client: Mon QR, commandes, stats, settings
│   ├── admin/                   Admin: commandes, clients, produits, production, analytics
│   ├── qr/[uid]/                Public scan page ("Powered by Drippy")
│   └── api/                     All routes from API SPECIFICATION V2
├── lib/
│   ├── supabase/                client / server / admin
│   ├── api.ts                   API-003 envelope + error codes
│   ├── validation.ts            Zod schemas (section 16 rules)
│   ├── auth.ts                  requireUser / requireAdmin guards
│   └── design.ts                presets, fonts, wilayas, suggested messages
├── components/                  QrCode, Navbar, Footer, Providers
├── messages/                    fr.json / en.json / ar.json
└── types/                       shared TypeScript types

supabase/
├── migrations/
│   ├── 0001_init.sql            Full schema + RLS + triggers + confirm_order()
│   └── 0002_scan_rpc.sql        increment_scan()
└── seed.sql                     Products + variants
```

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

Create one at [supabase.com](https://supabase.com), then copy the project URL and keys.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server only — never exposed
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=...                   # optional for emails
```

### 4. Run the database migrations

Using the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push          # applies migrations/0001 + 0002
psql "$DATABASE_URL" -f supabase/seed.sql   # or run seed.sql in the SQL editor
```

Or paste `0001_init.sql`, `0002_scan_rpc.sql`, then `seed.sql` into the Supabase SQL editor in that order.

### 5. Create demo accounts

The schema soft-creates customer accounts only when an admin confirms an order. To get started, create an **admin** manually:

```sql
-- 1. In Supabase Auth, create a user: admin@drippy.dz / Admin123!
-- 2. Then link it to an admin profile (replace the auth uuid):
insert into profiles (auth_user_id, drippy_id, first_name, email, role, account_status, email_verified)
values ('<auth-user-uuid>', 'DRP-ADMIN1', 'Admin', 'admin@drippy.dz', 'super_admin', 'active', true);
```

A **client** account is created automatically the first time you confirm an order from the admin panel (this runs `confirm_order()` → CREATE_ACCOUNT + CREATE_QR + CREATE_PRODUCTION + CREATE_WELCOME_PACK).

### 6. Run

```bash
npm run dev
# http://localhost:3000
```

---

## How the core flow works

```
Visitor → Shop → Customizer → Checkout
   → POST /api/orders  (status: pending_confirmation, NO account/QR yet)
Admin → /admin → opens order → "Valider"
   → POST /api/admin/orders/[id]/confirm
       → creates Supabase auth user
       → confirm_order() runs atomically:
           CREATE_ACCOUNT  → profiles
           CREATE_QR       → qr_codes (1 per profile) + qr_profiles
           CREATE_PRODUCTION → productions (frozen snapshot)
           CREATE_WELCOME_PACK → welcome_packs
Client → activates account → /dashboard
   → edits QR destination (auto-creates qr_revision)
   → views scans (daily_qr_stats)
   → reorders (reuses the SAME QR — never a new one)
```

---

## Business rules enforced

| Rule | Where |
|------|-------|
| DB-001 `1 client = 1 QR` | `qr_codes.profile_id UNIQUE` |
| DB-002 QR linked to profile, not orders | FK `qr_codes → profiles` |
| DB-003 Production frozen | `block_production_update()` trigger |
| DB-004 No physical deletes | soft delete via `status` / `is_active` |
| DRP-BUS-005 Reorder reuses QR | `POST /api/dashboard/orders/reorder` attaches existing profile |
| DRP-BUS-007 Account only after phone validation | account created only inside `confirm_order()` |
| DRP-BUS-030 QR text ≤ 80 chars | `order_items.chk_text_len` + Zod |
| DRP-BUS-036 Unique scan = QR + device + day | unique index on `qr_scan_logs` |
| DRP-WF-CLI-004 Every QR change → revision | `log_qr_revision()` trigger |
| DRP-FORB-009/010 No cross-client access / no RLS off | Row Level Security on all user tables |

---

## API surface (API SPECIFICATION V2)

All responses follow API-003:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Auth · Products · Orders · Customer QR/Stats/Account · Admin Orders/Products/Customers/Production · Public QR scan — see `src/app/api/`.

---

## Notes

- The **Customizer** (`product/[slug]/Customizer.tsx`) is the most important screen — it renders a live "What You See Is What You Print" QR preview.
- Welcome Pack PDF generation, production asset (PNG/SVG/PDF/ZIP) generation, and transactional emails are wired as stubs/TODOs where they belong (Supabase Edge Functions + Resend) — the data model and trigger points are all in place.
- A single-file interactive prototype (`drippy.jsx`) is also provided for quickly visualizing the full UX without running the backend.

© 2026 Drippy DZ
