# PharmaTech Pro — Setup Guide

## Prerequisites
- Node.js 18+
- Docker Desktop (for Supabase local)
- Supabase CLI: `npm install -g supabase`

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start Supabase locally (requires Docker)
```bash
npm run db:start
# or: npx supabase start
```

This starts:
- **API**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **DB**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Email (Inbucket)**: http://127.0.0.1:54324

### 3. Run migrations + seed
```bash
npm run db:reset
# This runs all migrations in supabase/migrations/ in order, then seeds data
```

Or run migrations only (no seed reset):
```bash
npm run db:migrate
```

### 4. Configure environment
Copy `.env.example` to `.env.local` — the local Supabase keys are already filled in.
```bash
cp .env.example .env.local
# Update SUPABASE_SERVICE_ROLE_KEY from `npm run db:status`
```

After `npm run db:start`, get your actual local keys:
```bash
npm run db:status
# Copy anon key and service_role key to .env.local
```

### 5. Generate TypeScript types (optional, types already committed)
```bash
npm run db:types
```

### 6. Start the development server
```bash
npm run dev
# Open http://localhost:3000
```

---

## Database Migrations

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | All tables, ENUMs, indexes, triggers |
| `002_rls_policies.sql` | Row Level Security policies |
| `003_functions.sql` | DB functions (check_low_stock, get_dashboard_stats, can_refill) |
| `004_seed_data.sql` | Dev seed data (pharmacies, medications, suppliers, inventory) |
| `005_patient_notification_preferences.sql` | Patient notification preference fields (Phase 9) |
| `006_multi_location_ai_pwa.sql` | Multi-location transfer + AI + push schema (Phases 10-12) |
| `007_multi_access_policies.sql` | Supplemental multi-location read policies |

---

## Creating Your First Admin User

1. Go to http://localhost:3000/register
2. Create an account
3. In Supabase Studio (http://127.0.0.1:54323), open the `profiles` table
4. Set your user's `role` to `pharmacy_admin` and `pharmacy_id` to `11111111-1111-1111-1111-111111111111`

---

## Production Deployment

1. Create a Supabase project at https://supabase.com
2. Run migrations: `npx supabase db push --db-url postgresql://...`
3. Update `.env.local` with production Supabase keys
4. Deploy to Vercel: `vercel deploy`

---

## Phase Implementation Status

- [x] Phase 0 — Foundation & Auth (middleware, RBAC, layout shell)
- [x] Phase 1 — Patient Management (CRUD, insurance, allergies)
- [x] Phase 2 — Prescription Processing (new form, detail, status workflow)
- [x] Phase 3 — Drug Interaction Check (DB query, allergy conflict)
- [x] Phase 4 — Inventory Management (stock tracking, alerts)
- [x] Phase 5 — Insurance & Claims (claim submission, tracking)
- [x] Phase 6 — Point of Sale (checkout, transaction recording)
- [x] Phase 7 — Workflow Queue (Kanban board, Supabase Realtime)
- [x] Phase 8 — Reports & Analytics (analytics, compliance, financial)
- [~] Phase 9 — Customer Communications (Twilio/Resend delivery + refill portal + webhook)
- [x] Phase 10 — Multi-Location Management (locations admin, transfers, cross-location views)
- [x] Phase 11 — AI Features (forecast/prior-auth/MTM/adherence/chat APIs + UI)
- [x] Phase 12 — Mobile PWA & Accessibility (manifest, SW, offline queue, push enrollment, a11y baseline)
