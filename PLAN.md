# PharmaTech Pro — Full Implementation Plan
### Next.js 15 + Supabase · AI-Assisted via Codex CLI

> **Blueprint Source:** BestRx Pharmacy Management Platform Analysis (March 2026)
> **Stack:** Next.js 15 (App Router) · TypeScript · Supabase (PostgreSQL + Auth + Storage + Realtime) · Tailwind CSS · shadcn/ui · Zod · React Query (TanStack) · Resend · Twilio
> **Target:** Independent → Chain Pharmacies | HIPAA-compliant | AI-enhanced

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Supabase Database Schema](#2-supabase-database-schema)
3. [Phase 0 — Foundation & Auth](#phase-0--foundation--auth)
4. [Phase 1 — Patient Management](#phase-1--patient-management)
5. [Phase 2 — Prescription Processing & Dispensing](#phase-2--prescription-processing--dispensing)
6. [Phase 3 — Drug Interaction & Clinical Safety](#phase-3--drug-interaction--clinical-safety)
7. [Phase 4 — Inventory Management](#phase-4--inventory-management)
8. [Phase 5 — Insurance & Claims Processing](#phase-5--insurance--claims-processing)
9. [Phase 6 — Point of Sale (POS) & Payments](#phase-6--point-of-sale-pos--payments)
10. [Phase 7 — Workflow Queue Management](#phase-7--workflow-queue-management)
11. [Phase 8 — Reporting & Analytics Dashboard](#phase-8--reporting--analytics-dashboard)
12. [Phase 9 — Customer Communication Portal](#phase-9--customer-communication-portal)
13. [Phase 10 — Multi-Location Management](#phase-10--multi-location-management)
14. [Phase 11 — AI & Advanced Features](#phase-11--ai--advanced-features)
15. [Phase 12 — Mobile PWA & Accessibility](#phase-12--mobile-pwa--accessibility)
16. [Codex CLI Usage Guide](#codex-cli-usage-guide)
17. [Environment Variables Reference](#environment-variables-reference)

---

## 1. Project Structure

```
pharma-pro/
├── app/                              # Next.js 15 App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Shell with sidebar + topbar
│   │   ├── page.tsx                  # Overview dashboard
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── prescriptions/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── queue/page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   ├── suppliers/page.tsx
│   │   │   └── alerts/page.tsx
│   │   ├── insurance/
│   │   │   ├── page.tsx
│   │   │   ├── claims/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── pos/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   ├── financial/page.tsx
│   │   │   ├── compliance/page.tsx
│   │   │   └── analytics/page.tsx
│   │   ├── workflow/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   ├── users/page.tsx
│   │   │   ├── locations/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── communications/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/[...supabase]/route.ts
│   │   ├── patients/route.ts
│   │   ├── prescriptions/route.ts
│   │   ├── inventory/route.ts
│   │   ├── insurance/route.ts
│   │   ├── payments/route.ts
│   │   ├── reports/route.ts
│   │   ├── notifications/route.ts
│   │   ├── workflow/route.ts
│   │   ├── clinical/route.ts
│   │   ├── ai/
│   │   │   ├── demand-forecast/route.ts
│   │   │   ├── drug-interactions/route.ts
│   │   │   └── prior-auth/route.ts
│   │   └── webhooks/
│   │       ├── stripe/route.ts
│   │       └── twilio/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── MobileNav.tsx
│   ├── patients/
│   ├── prescriptions/
│   ├── inventory/
│   ├── insurance/
│   ├── pos/
│   ├── reports/
│   ├── workflow/
│   └── shared/
│       ├── DataTable.tsx
│       ├── SearchBar.tsx
│       ├── StatusBadge.tsx
│       ├── ConfirmDialog.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client
│   │   ├── middleware.ts
│   │   └── types.ts                  # Generated DB types
│   ├── validations/
│   │   ├── patient.ts
│   │   ├── prescription.ts
│   │   ├── inventory.ts
│   │   └── insurance.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── date-utils.ts
│   │   ├── drug-ndc.ts
│   │   └── hipaa-audit.ts
│   └── constants/
│       ├── roles.ts
│       └── drug-schedules.ts
├── hooks/
│   ├── usePatients.ts
│   ├── usePrescriptions.ts
│   ├── useInventory.ts
│   ├── useRealtime.ts
│   └── usePermissions.ts
├── actions/                          # Next.js Server Actions
│   ├── patients.ts
│   ├── prescriptions.ts
│   ├── inventory.ts
│   ├── insurance.ts
│   └── notifications.ts
├── types/
│   ├── database.ts
│   ├── api.ts
│   └── enums.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_functions.sql
│   │   └── 004_seed_data.sql
│   └── config.toml
├── public/
│   ├── icons/
│   └── label-templates/
├── .env.local
├── .env.example
├── middleware.ts                     # Auth middleware
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Supabase Database Schema

### Core Tables SQL (run in Supabase SQL Editor)

```sql
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('super_admin','pharmacy_admin','pharmacist','technician','cashier','viewer');
CREATE TYPE prescription_status AS ENUM ('received','verified','on_hold','filling','quality_check','ready','dispensed','cancelled','transferred');
CREATE TYPE claim_status AS ENUM ('pending','submitted','adjudicated','paid','rejected','appealed');
CREATE TYPE inventory_status AS ENUM ('active','low_stock','out_of_stock','expired','discontinued');
CREATE TYPE drug_schedule AS ENUM ('OTC','II','III','IV','V');
CREATE TYPE transaction_type AS ENUM ('sale','refund','void','adjustment');
CREATE TYPE alert_type AS ENUM ('low_stock','expiration','drug_interaction','refill_due','claim_rejected','system');

-- ============================================================
-- PHARMACIES (multi-location)
-- ============================================================
CREATE TABLE pharmacies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  npi         TEXT UNIQUE NOT NULL,        -- National Provider Identifier
  dea_number  TEXT UNIQUE,                 -- DEA registration
  address     JSONB NOT NULL,              -- {street, city, state, zip, country}
  phone       TEXT,
  fax         TEXT,
  email       TEXT,
  license     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  settings    JSONB DEFAULT '{}',          -- pharmacy-level config
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id     UUID REFERENCES pharmacies(id),
  role            user_role NOT NULL DEFAULT 'viewer',
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  license_number  TEXT,
  phone           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  preferences     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE patients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id       UUID REFERENCES pharmacies(id) NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  date_of_birth     DATE NOT NULL,
  gender            TEXT,
  phone             TEXT,
  email             TEXT,
  address           JSONB,
  emergency_contact JSONB,
  allergies         TEXT[] DEFAULT '{}',
  medical_conditions TEXT[] DEFAULT '{}',
  preferred_language TEXT DEFAULT 'en',
  notes             TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  hipaa_signed_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INSURANCE PLANS
-- ============================================================
CREATE TABLE insurance_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE,
  payer_name      TEXT NOT NULL,
  bin             TEXT NOT NULL,           -- Bank Identification Number
  pcn             TEXT,                    -- Processor Control Number
  group_number    TEXT,
  member_id       TEXT NOT NULL,
  relationship    TEXT DEFAULT 'self',     -- self/spouse/child/other
  is_primary      BOOLEAN DEFAULT TRUE,
  effective_date  DATE,
  termination_date DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROVIDERS (prescribers)
-- ============================================================
CREATE TABLE providers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacies(id),
  npi         TEXT UNIQUE NOT NULL,
  dea_number  TEXT,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  specialty   TEXT,
  phone       TEXT,
  fax         TEXT,
  address     JSONB,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEDICATIONS (master drug database)
-- ============================================================
CREATE TABLE medications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ndc             TEXT UNIQUE NOT NULL,    -- National Drug Code
  name            TEXT NOT NULL,
  brand_name      TEXT,
  generic_name    TEXT,
  manufacturer    TEXT,
  dosage_form     TEXT,                   -- tablet/capsule/liquid/etc
  strength        TEXT,
  unit            TEXT,
  drug_class      TEXT,
  schedule        drug_schedule DEFAULT 'OTC',
  requires_rx     BOOLEAN DEFAULT TRUE,
  is_refrigerated BOOLEAN DEFAULT FALSE,
  storage_temp_range JSONB,               -- {min, max, unit}
  interactions    TEXT[] DEFAULT '{}',    -- NDC list of interacting drugs
  contraindications TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID REFERENCES pharmacies(id) NOT NULL,
  medication_id   UUID REFERENCES medications(id) NOT NULL,
  lot_number      TEXT,
  expiration_date DATE NOT NULL,
  quantity_on_hand DECIMAL(10,2) NOT NULL DEFAULT 0,
  reorder_point   DECIMAL(10,2) DEFAULT 10,
  reorder_quantity DECIMAL(10,2) DEFAULT 100,
  unit_cost       DECIMAL(10,4),
  selling_price   DECIMAL(10,4),
  status          inventory_status DEFAULT 'active',
  supplier_id     UUID,
  location_bin    TEXT,                   -- physical storage location
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pharmacy_id, medication_id, lot_number)
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacies(id),
  name        TEXT NOT NULL,
  dea_number  TEXT,
  contact     JSONB,                     -- {name, phone, email}
  address     JSONB,
  payment_terms TEXT,
  is_preferred BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE TABLE prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID REFERENCES pharmacies(id) NOT NULL,
  patient_id      UUID REFERENCES patients(id) NOT NULL,
  provider_id     UUID REFERENCES providers(id),
  medication_id   UUID REFERENCES medications(id) NOT NULL,
  rx_number       TEXT UNIQUE NOT NULL,  -- auto-generated
  status          prescription_status DEFAULT 'received',
  written_date    DATE NOT NULL,
  expiration_date DATE,
  days_supply     INTEGER,
  quantity        DECIMAL(10,2) NOT NULL,
  refills_allowed INTEGER DEFAULT 0,
  refills_used    INTEGER DEFAULT 0,
  sig             TEXT NOT NULL,         -- directions for use
  daw_code        INTEGER DEFAULT 0,     -- Dispense As Written
  is_controlled   BOOLEAN DEFAULT FALSE,
  is_electronic   BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  dispenser_id    UUID REFERENCES profiles(id),
  verified_by     UUID REFERENCES profiles(id),
  dispensed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REFILLS
-- ============================================================
CREATE TABLE refills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id) NOT NULL,
  refill_number   INTEGER NOT NULL,
  status          prescription_status DEFAULT 'received',
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  dispensed_at    TIMESTAMPTZ,
  quantity        DECIMAL(10,2),
  days_supply     INTEGER,
  dispenser_id    UUID REFERENCES profiles(id)
);

-- ============================================================
-- TRANSACTIONS (POS)
-- ============================================================
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID REFERENCES pharmacies(id) NOT NULL,
  patient_id      UUID REFERENCES patients(id),
  prescription_id UUID REFERENCES prescriptions(id),
  cashier_id      UUID REFERENCES profiles(id),
  type            transaction_type DEFAULT 'sale',
  subtotal        DECIMAL(10,2) NOT NULL,
  tax             DECIMAL(10,2) DEFAULT 0,
  insurance_paid  DECIMAL(10,2) DEFAULT 0,
  copay           DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL,
  payment_method  TEXT,                  -- cash/card/insurance/mixed
  stripe_payment_id TEXT,
  receipt_number  TEXT UNIQUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INSURANCE CLAIMS
-- ============================================================
CREATE TABLE claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID REFERENCES pharmacies(id) NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id) NOT NULL,
  insurance_plan_id UUID REFERENCES insurance_plans(id),
  claim_number    TEXT UNIQUE,
  status          claim_status DEFAULT 'pending',
  submitted_at    TIMESTAMPTZ,
  adjudicated_at  TIMESTAMPTZ,
  billed_amount   DECIMAL(10,2),
  allowed_amount  DECIMAL(10,2),
  paid_amount     DECIMAL(10,2),
  copay_amount    DECIMAL(10,2),
  rejection_code  TEXT,
  rejection_reason TEXT,
  ncpdp_response  JSONB,                -- raw NCPDP response
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRUG INTERACTIONS
-- ============================================================
CREATE TABLE drug_interactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a_ndc      TEXT NOT NULL,
  drug_b_ndc      TEXT NOT NULL,
  severity        TEXT NOT NULL,         -- minor/moderate/major/contraindicated
  description     TEXT,
  clinical_effects TEXT,
  management      TEXT,
  source          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drug_a_ndc, drug_b_ndc)
);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID REFERENCES pharmacies(id) NOT NULL,
  type            alert_type NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT,
  reference_id    UUID,                  -- links to relevant record
  reference_type  TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  is_dismissed    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (HIPAA compliance)
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacies(id),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,             -- CREATE/READ/UPDATE/DELETE
  resource    TEXT NOT NULL,             -- table/entity name
  resource_id UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKFLOW QUEUE
-- ============================================================
CREATE TABLE workflow_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID REFERENCES pharmacies(id) NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id),
  assigned_to     UUID REFERENCES profiles(id),
  task_type       TEXT NOT NULL,         -- verify/fill/check/dispense
  priority        INTEGER DEFAULT 5,     -- 1=highest, 10=lowest
  status          TEXT DEFAULT 'pending',
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS (outbound comms)
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id     UUID REFERENCES pharmacies(id) NOT NULL,
  patient_id      UUID REFERENCES patients(id),
  channel         TEXT NOT NULL,         -- email/sms/push
  template        TEXT NOT NULL,         -- ready/refill_due/reminder/etc
  status          TEXT DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_patients_pharmacy ON patients(pharmacy_id);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_pharmacy ON prescriptions(pharmacy_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_rx_number ON prescriptions(rx_number);
CREATE INDEX idx_inventory_pharmacy ON inventory(pharmacy_id);
CREATE INDEX idx_inventory_medication ON inventory(medication_id);
CREATE INDEX idx_inventory_expiry ON inventory(expiration_date);
CREATE INDEX idx_claims_prescription ON claims(prescription_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_alerts_pharmacy ON alerts(pharmacy_id, is_read);
CREATE INDEX idx_workflow_tasks_pharmacy ON workflow_tasks(pharmacy_id, status);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pharmacies_updated BEFORE UPDATE ON pharmacies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_prescriptions_updated BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RX NUMBER AUTO-GENERATOR
-- ============================================================
CREATE SEQUENCE rx_number_seq START 1000000;
CREATE OR REPLACE FUNCTION generate_rx_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rx_number IS NULL OR NEW.rx_number = '' THEN
    NEW.rx_number := 'RX' || LPAD(nextval('rx_number_seq')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_rx_number BEFORE INSERT ON prescriptions FOR EACH ROW EXECUTE FUNCTION generate_rx_number();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own pharmacy's data
CREATE POLICY pharmacy_isolation ON patients
  USING (pharmacy_id = (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY pharmacy_isolation ON prescriptions
  USING (pharmacy_id = (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY pharmacy_isolation ON inventory
  USING (pharmacy_id = (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));

-- Audit log: pharmacy staff can read; only system can write
CREATE POLICY audit_read ON audit_logs FOR SELECT
  USING (pharmacy_id = (SELECT pharmacy_id FROM profiles WHERE id = auth.uid()));
```

---

## Phase 0 — Foundation & Auth

**Goal:** Working Next.js + Supabase skeleton with auth, RBAC, and layout shell.

### Deliverables
- [ ] Supabase project created, schema migrated
- [ ] Next.js 15 app with App Router + TypeScript
- [ ] Tailwind CSS + shadcn/ui initialized
- [ ] Supabase Auth (email/password + magic link)
- [ ] Middleware for protected routes
- [ ] Role-based access control (RBAC) utility
- [ ] Dashboard shell with Sidebar, Topbar
- [ ] HIPAA-compliant audit logging foundation

### Key Files
| File | Purpose |
|------|---------|
| `middleware.ts` | Protect `/dashboard/*` routes, redirect unauthenticated |
| `lib/supabase/server.ts` | SSR Supabase client using `createServerClient` |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/utils/hipaa-audit.ts` | Wrapper to log every data access to `audit_logs` |
| `hooks/usePermissions.ts` | Check user role against required permissions |
| `components/layout/Sidebar.tsx` | Navigation filtered by role |

### Codex CLI Skill

```bash
# Initialize Next.js project with all dependencies
codex "Initialize a Next.js 15 app with TypeScript in the current directory called pharma-pro.
Install: @supabase/supabase-js @supabase/ssr tailwindcss shadcn/ui @tanstack/react-query zod react-hook-form @hookform/resolvers lucide-react date-fns clsx tailwind-merge.
Configure tailwind.config.ts, tsconfig.json with strict mode, and next.config.ts with proper image domains."

# Supabase client setup
codex "Create lib/supabase/server.ts using @supabase/ssr createServerClient with cookie handling for Next.js 15 App Router.
Create lib/supabase/client.ts using @supabase/ssr createBrowserClient.
Create middleware.ts that:
- Refreshes the Supabase session on every request
- Redirects unauthenticated users from /dashboard/* to /login
- Redirects authenticated users from /login to /dashboard"

# Auth pages
codex "Create the following auth pages using shadcn/ui Card, Input, Button components:
1. app/(auth)/login/page.tsx — Email/password login form with Supabase signInWithPassword, error handling, loading state
2. app/(auth)/register/page.tsx — Registration form collecting email, password, first_name, last_name; creates profile record after signup
3. app/(auth)/reset-password/page.tsx — Email reset form using Supabase resetPasswordForEmail
All pages must be fully server-action driven using Next.js 15 Server Actions, no client-side fetch calls."

# RBAC utility
codex "Create hooks/usePermissions.ts that:
- Reads the current user's role from the profiles table
- Exports a usePermissions() hook returning { role, can(action, resource) }
- Define permissions matrix in lib/constants/roles.ts mapping each user_role enum to allowed actions
- Actions: create/read/update/delete on resources: patients/prescriptions/inventory/claims/transactions/reports/admin
- Pharmacist can create/read/update prescriptions and patients; Technician can fill but not verify; Cashier can only access POS; Viewer read-only"

# Dashboard layout
codex "Create app/(dashboard)/layout.tsx with:
- A collapsible sidebar (components/layout/Sidebar.tsx) with nav items filtered by user role
- Nav items: Dashboard, Patients, Prescriptions, Workflow Queue, Inventory, Insurance, POS, Reports, Communications, Admin
- Each nav item has an icon from lucide-react and active state styling
- A topbar (components/layout/Topbar.tsx) with pharmacy name, notification bell with unread alert count from Supabase realtime, and user avatar dropdown
- Responsive: sidebar collapses to icon-only on md, hidden on mobile with hamburger"

# Audit logging
codex "Create lib/utils/hipaa-audit.ts with an auditLog(action, resource, resourceId, oldData?, newData?) async function.
It must:
- Insert a record into audit_logs table with the current user id, IP address from headers(), user agent, action, resource, resource_id, old_data, new_data
- Be called in every Server Action that reads or modifies PHI (patients, prescriptions, claims)
- Export a withAudit() higher-order Server Action wrapper"
```

---

## Phase 1 — Patient Management

**Goal:** Full CRUD for patients including demographics, allergies, insurance, and medication history.

### Deliverables
- [ ] Patient list with search, filter, pagination
- [ ] Patient profile page with tabs: Overview, Medications, Allergies, Insurance, History
- [ ] Add/Edit patient form with validation
- [ ] Allergy and medical condition management
- [ ] Insurance plan management (primary + secondary)
- [ ] Patient medication history timeline
- [ ] HIPAA consent tracking

### Codex CLI Skill

```bash
# Patient Zod schema + Server Actions
codex "Create lib/validations/patient.ts with a Zod schema for patient creation and update.
Fields: first_name, last_name (required), date_of_birth (Date, must be in past), gender (optional enum), phone (optional, E.164 format), email (optional, valid email), address object (street/city/state/zip/country), allergies string array, medical_conditions string array, preferred_language (default 'en'), hipaa_signed_at (optional Date).

Then create actions/patients.ts with Server Actions:
- createPatient(formData) — inserts to patients table, calls auditLog
- updatePatient(id, formData) — updates patient, calls auditLog with old/new data
- deletePatient(id) — soft delete (set is_active=false), auditLog
- searchPatients(query, pharmacyId) — FTS search on first_name, last_name, phone, DOB
All actions must: validate with Zod, check permissions with usePermissions, handle errors, revalidatePath."

# Patient list page
codex "Create app/(dashboard)/patients/page.tsx as a server component.
It must:
- Fetch patients from Supabase for the current pharmacy with pagination (default 25/page)
- Render a DataTable (components/shared/DataTable.tsx) with columns: Name, DOB, Phone, Allergies count, Insurance, Active Prescriptions count, Last Visit, Actions
- Include a search bar that filters by name/phone/DOB using URL search params
- Include a filter panel for: active/inactive, has allergies, has insurance
- Show a 'New Patient' button that routes to /patients/new
- Each row links to /patients/[id]"

# Patient profile page with tabs
codex "Create app/(dashboard)/patients/[id]/page.tsx with these shadcn/ui Tabs:
1. Overview: Demographics card, emergency contact, preferred language, HIPAA status badge
2. Medications: Timeline of all prescriptions (past and current) sorted by date, with status badges and refill counts
3. Allergies & Conditions: Editable tag lists for allergies and medical conditions with severity indicators, add/remove actions
4. Insurance: Cards for primary and secondary insurance plans; BIN/PCN/Member ID display; eligibility check button
5. History: Audit trail of all actions on this patient record (from audit_logs)
All tabs must load data server-side. Edit actions use Server Actions with optimistic UI updates."

# Insurance plan management
codex "Create components/patients/InsurancePlanForm.tsx:
- Form to add/edit insurance plan (payer_name, BIN required 6-digit, PCN optional, group_number, member_id, relationship enum, effective_date, termination_date)
- Validates with Zod
- Primary/secondary toggle (only one plan can be primary)
- Submit calls addInsurancePlan / updateInsurancePlan Server Actions
- Display inline eligibility verification status (mocked initially, real API later)"
```

---

## Phase 2 — Prescription Processing & Dispensing

**Goal:** Full prescription lifecycle from intake to dispensing including e-Rx, verification, label generation.

### Deliverables
- [ ] New prescription intake form (manual entry)
- [ ] E-prescription integration stub (Surescripts)
- [ ] Prescription status workflow state machine
- [ ] Pharmacist verification step
- [ ] Prescription label generation (PDF)
- [ ] Controlled substance tracking with DEA fields
- [ ] Refill management
- [ ] Prescription transfer in/out

### Codex CLI Skill

```bash
# Prescription state machine
codex "Create lib/utils/prescription-state-machine.ts implementing a state machine for prescription_status:
States: received → verified → filling → quality_check → ready → dispensed
Also: on_hold (from any state), cancelled (from any state except dispensed), transferred (from received/verified)
Export:
- canTransition(from, to, userRole) — validates allowed transitions by role
- getNextStates(current, role) — returns array of allowed next states
- TRANSITION_LABELS map for UI display
- getStatusColor(status) — returns Tailwind color class for badges"

# New prescription form
codex "Create app/(dashboard)/prescriptions/new/page.tsx as a multi-step form:
Step 1 — Patient: Search/select patient with autocomplete (Combobox component searching Supabase patients)
Step 2 — Prescriber: Search/select provider by name or NPI with 'Add New Provider' inline option
Step 3 — Medication: Search medications by name, NDC, or brand. Show strength/form options. Display drug schedule and controls warning. Validate NDC format (5-4-2 segments).
Step 4 — Rx Details: quantity (decimal), days_supply (integer), refills_allowed (0-11), sig (directions), DAW code (0-9 dropdown), written_date, is_electronic toggle, notes
Step 5 — Review: Summary card with all entered data, drug interaction check result, patient allergy check result
Submit calls createPrescription Server Action, redirects to prescriptions/[id]
Form uses react-hook-form + Zod. Show progress indicator between steps."

# Drug interaction check at prescription creation
codex "Create lib/utils/drug-checker.ts:
- checkDrugInteractions(newNdc, patientId) async function
- Fetches patient's active prescriptions from Supabase
- Queries drug_interactions table for any interaction between newNdc and patient's current NDCs
- Returns { hasInteractions: boolean, interactions: Array<{severity, description, drug_a, drug_b}> }
- checkAllergyConflict(medicationId, patientAllergies) — checks if medication drug_class or name matches any allergy
Integrate this into Step 5 of the prescription form and show a dismissible warning dialog for interactions."

# Prescription list and detail pages
codex "Create app/(dashboard)/prescriptions/page.tsx:
- Server component fetching prescriptions for pharmacy with joins on patient, medication, provider
- DataTable columns: Rx#, Patient, Medication, Prescriber, Date, Days Supply, Refills, Status, Actions
- Filter tabs: All / Active / Ready / On Hold / Controlled
- Quick action buttons: Verify (pharmacist only), Mark Ready, Dispense, Print Label
- Status column shows colored badge using StatusBadge component

Create app/(dashboard)/prescriptions/[id]/page.tsx:
- Full prescription detail with all fields
- Status history timeline (pulled from audit_logs where resource='prescriptions')
- Action buttons based on current status and user role using canTransition()
- Insurance claim status card
- Related refills list
- Print Label button"

# PDF Label generation
codex "Create app/api/prescriptions/[id]/label/route.ts:
- GET endpoint that generates a PDF prescription label using @react-pdf/renderer
- Label must include: Patient name/DOB/address, Rx number + barcode (code128), Medication name/strength/form, Directions (sig), Quantity/Days Supply, Refills remaining, Prescriber name/phone, Pharmacy name/address/phone/DEA, Fill date, Discard after date (fill date + days_supply)
- Add a warning section for drug interactions if any exist
- Support A4 and standard 2x6 label sizes via query param ?size=label|a4
- Require pharmacist or technician role"

# Controlled substance extra tracking
codex "Create components/prescriptions/ControlledSubstanceForm.tsx:
- Additional fields shown only when medication.schedule is II/III/IV/V
- Fields: DEA number verification, photo ID verified checkbox, quantity dispensed vs prescribed reconciliation, biometric/signature capture placeholder, DEA 222 form reference (schedule II)
- Integrate into prescription dispense action
- Log all controlled substance transactions to audit_logs with extra detail"
```

---

## Phase 3 — Drug Interaction & Clinical Safety

**Goal:** Real-time clinical decision support for interactions, allergies, and dosing.

### Deliverables
- [ ] Drug interaction database seeded from OpenFDA
- [ ] Real-time interaction checking on prescription entry
- [ ] Allergy conflict detection
- [ ] Duplicate therapy detection
- [ ] Clinical alerts with severity levels
- [ ] Drug shortage alerts

### Codex CLI Skill

```bash
# Seed drug interaction database
codex "Create supabase/migrations/004_seed_drug_interactions.sql that seeds the drug_interactions table with common major/contraindicated interactions.
Also create a Node.js script scripts/seed-interactions.ts that:
- Calls the OpenFDA drug interaction API (https://api.fda.gov/drug/label.json)
- Parses drug-drug interactions from the drug_interactions field
- Upserts into drug_interactions table via Supabase
- Handles rate limiting with exponential backoff
- Logs progress and errors"

# Clinical decision support API
codex "Create app/api/clinical/check/route.ts POST endpoint:
Request body: { patientId, newNdc, prescriptionId? }
Response: {
  interactions: Array<{severity, description, drug_a_name, drug_b_name, management}>,
  allergyConflicts: Array<{allergy, medication, severity}>,
  duplicateTherapy: Array<{existingRx, newMedication, drug_class}>,
  overallRisk: 'safe'|'caution'|'danger'|'contraindicated'
}
Queries: drug_interactions table, patient allergies, active prescriptions for patient.
Cache results in Supabase edge function or Redis-like approach using Next.js unstable_cache."

# Interaction alert UI component
codex "Create components/clinical/DrugInteractionAlert.tsx:
- Receives interactions array from clinical check API
- Groups by severity: contraindicated (red/X), major (orange/warning), moderate (yellow), minor (blue/info)
- Each severity section is an expandable accordion
- Each interaction shows: drug names, clinical effects, management recommendation
- Bottom actions: 'Override with Reason' (opens textarea to document clinical justification) or 'Change Medication'
- Override reason must be saved to audit_logs
- Component is used in prescription new form Step 5 and prescription detail page"
```

---

## Phase 4 — Inventory Management

**Goal:** Real-time stock tracking, expiration monitoring, supplier management, and reorder automation.

### Deliverables
- [ ] Inventory list with search and filters
- [ ] Stock receive/adjust workflow
- [ ] Expiration date monitoring with alerts
- [ ] Automated reorder point alerts
- [ ] Supplier management
- [ ] Purchase order generation
- [ ] Inventory reports (turnover, value, expiring soon)
- [ ] Barcode scanning integration

### Codex CLI Skill

```bash
# Inventory Server Actions
codex "Create actions/inventory.ts with Server Actions:
- receiveStock(inventoryData) — adds new lot to inventory table, creates audit entry
- adjustStock(inventoryId, quantity, reason) — adjusts quantity, logs reason in audit
- transferStock(fromPharmacyId, toPharmacyId, inventoryId, quantity) — for multi-location
- updateReorderPoint(inventoryId, reorderPoint, reorderQuantity)
- markExpired(inventoryId) — sets status to 'expired', triggers alert
- generatePurchaseOrder(supplierId, items[]) — creates PO draft

Create a Supabase database function check_low_stock() that:
- Runs on a schedule (via Supabase cron or pg_cron)
- Finds all inventory where quantity_on_hand <= reorder_point
- Inserts alerts of type 'low_stock' for each pharmacy
- Also finds items expiring within 30 days and creates 'expiration' alerts"

# Inventory list page
codex "Create app/(dashboard)/inventory/page.tsx:
- Server component with DataTable showing: Medication Name, NDC, Brand, Lot#, Expiry, Quantity on Hand, Reorder Point, Status badge, Unit Cost, Selling Price, Supplier, Actions
- Color-coded status: green (active), yellow (low_stock), red (out_of_stock/expired)
- Filter tabs: All / Low Stock / Expiring Soon (30 days) / Out of Stock / Expired
- Search by medication name, NDC, or lot number
- Quick actions: Receive Stock, Adjust, Print Label
- Summary cards at top: Total SKUs, Total Value, Low Stock Count, Expiring This Month"

# Inventory alerts page
codex "Create app/(dashboard)/inventory/alerts/page.tsx:
- Shows all active inventory alerts grouped by type: Low Stock, Expiring Soon, Out of Stock
- Each alert has: medication name, current qty, reorder point, last order date, quick 'Create PO' button
- Expiring items show: days until expiry, lot number, quantity, pharmacy location
- Mark as resolved button that dismisses alert and logs action"

# Supplier management
codex "Create app/(dashboard)/inventory/suppliers/page.tsx:
- List of all suppliers with: name, DEA#, contact info, preferred flag, active status
- Add/Edit supplier form in a Sheet/Dialog using shadcn/ui
- Each supplier has expandable history of purchase orders

Create components/inventory/PurchaseOrderForm.tsx:
- Select supplier, then dynamically load their catalog
- Add line items: medication, quantity requested, unit cost (editable), total
- Auto-populate items flagged for reorder
- Generate PDF purchase order for printing/emailing"

# Barcode scanner integration
codex "Create components/inventory/BarcodeScanner.tsx:
- Uses the browser's MediaDevices API (getUserMedia) for camera-based scanning
- Integrates @zxing/library for barcode decoding (Code128, QR, DataMatrix, Code39)
- On successful scan: parses NDC from barcode, looks up medication in Supabase
- Emits onScan(medication) event to parent
- Shows viewfinder overlay with guide frame
- Fallback: manual NDC text input
- Used in: receive stock form, prescription dispense verification"
```

---

## Phase 5 — Insurance & Claims Processing

**Goal:** Automated insurance verification, NCPDP claims submission, adjudication tracking.

### Deliverables
- [ ] Insurance plan management (per patient)
- [ ] Real-time eligibility verification
- [ ] NCPDP D.0 claim submission workflow
- [ ] Adjudication response parsing
- [ ] Claim status tracking
- [ ] Rejection management and resubmission
- [ ] ERA/EOB processing
- [ ] Prior authorization workflow

### Codex CLI Skill

```bash
# Insurance claims Server Actions
codex "Create actions/insurance.ts with Server Actions:
- verifyEligibility(patientId, insurancePlanId, medicationId) — calls mock eligibility API (later real NCPDP), returns coverage status
- submitClaim(prescriptionId, insurancePlanId) — creates claim record, formats NCPDP D.0 transaction, submits to payer (mock initially)
- processAdjudication(claimId, ncpdpResponse) — parses response, updates claim status/amounts
- resubmitClaim(claimId, overrides) — for rejected claims with corrections
- requestPriorAuth(prescriptionId, insurancePlanId) — initiates PA process

Create lib/utils/ncpdp-formatter.ts:
- formatClaimTransaction(prescription, patient, insurance, pharmacy) — builds NCPDP D.0 B1 request
- parseAdjudicationResponse(response) — parses NCPDP response into structured object
- NCPDP field maps and segment builders (Transaction Header, Patient, Insurance, Claim, Pricing)"

# Claims list page
codex "Create app/(dashboard)/insurance/claims/page.tsx:
- DataTable: Claim#, Rx#, Patient, Payer, Date Submitted, Billed, Allowed, Paid, Copay, Status, Actions
- Filter by status: All / Pending / Submitted / Paid / Rejected / Appealed
- Date range filter
- Batch submit button for pending claims
- Summary bar: Total Billed, Total Paid, Pending Amount, Rejection Rate %

Create app/(dashboard)/insurance/claims/[id]/page.tsx:
- Full claim detail with NCPDP request/response viewer (formatted JSON)
- Payment breakdown: billed vs allowed vs paid vs copay
- If rejected: rejection code, reason, suggested corrections, resubmit button
- Timeline of claim events"

# Prior authorization workflow
codex "Create components/insurance/PriorAuthForm.tsx:
- Triggered when insurance rejects with PA required code
- Collects: clinical indication, diagnosis codes (ICD-10 selector), supporting documentation upload (to Supabase Storage)
- Auto-generates PA letter using prescription and patient data
- Submits to insurer and tracks PA number + approval status
- PA status displayed on prescription detail page"
```

---

## Phase 6 — Point of Sale (POS) & Payments

**Goal:** Integrated checkout with Stripe payments, receipt generation, and transaction history.

### Deliverables
- [ ] POS interface for prescription checkout
- [ ] OTC (over-the-counter) item sales
- [ ] Insurance copay calculation display
- [ ] Stripe payment processing (card, cash)
- [ ] Receipt generation (print/email)
- [ ] Refund/void management
- [ ] Daily transaction report
- [ ] Cash drawer reconciliation

### Codex CLI Skill

```bash
# POS page
codex "Create app/(dashboard)/pos/page.tsx as a client component (real-time POS):
Layout:
- Left panel: prescription queue of 'ready' prescriptions for current day, searchable by patient name/Rx#
- Center panel: cart showing selected items with: medication name, quantity, retail price, insurance adjustment, copay amount, subtotal
- Right panel: payment section

Features:
- Click prescription to add to cart; shows insurance breakdown (insurance_paid + copay)
- Add OTC items by name/barcode scan
- Apply discount codes or loyalty points
- Payment method buttons: Cash (enter amount, show change), Card (Stripe Terminal or manual entry), Split Payment
- Quick-print receipt button
- End of day report button"

# Stripe payment integration
codex "Create app/api/payments/route.ts:
- POST /api/payments — creates Stripe PaymentIntent for the cart total
- POST /api/payments/confirm — confirms payment, creates transaction record in Supabase
- POST /api/payments/refund — processes refund via Stripe and updates transaction

Create app/api/webhooks/stripe/route.ts:
- Handles payment_intent.succeeded — marks transaction as complete, updates prescription to dispensed
- Handles payment_intent.payment_failed — creates alert, logs failure
- Verifies webhook signature using STRIPE_WEBHOOK_SECRET

Create components/pos/PaymentModal.tsx:
- Stripe Elements card form for manual card entry
- Cash payment with change calculator
- Shows payment confirmation with receipt options"

# Receipt generation
codex "Create app/api/transactions/[id]/receipt/route.ts:
- Generates PDF receipt using @react-pdf/renderer
- Receipt includes: Pharmacy name/address/phone, Transaction ID + barcode, Date/time, Cashier name, Patient name, Line items (medication, qty, price, insurance, copay), Subtotal/Tax/Total, Payment method, Change given, HIPAA notice footer, Return policy
- Email receipt option: uses Resend to email PDF to patient.email
- Print receipt: returns PDF with Content-Disposition: inline for browser print dialog"
```

---

## Phase 7 — Workflow Queue Management

**Goal:** Task prioritization, real-time prescription status board, staff workload distribution.

### Deliverables
- [ ] Kanban-style prescription workflow board
- [ ] Real-time updates via Supabase Realtime
- [ ] Task assignment to staff
- [ ] Priority queue management
- [ ] Performance metrics per staff member
- [ ] Shift handoff notes

### Codex CLI Skill

```bash
# Workflow queue with Supabase Realtime
codex "Create app/(dashboard)/workflow/page.tsx as a client component:
- Kanban board with columns for each prescription_status: Received, Verified, Filling, Quality Check, Ready, Dispensed
- Each card shows: Rx#, Patient name, Medication, Priority indicator (colored border), Assigned staff avatar, Time in current status, Insurance status icon
- Drag and drop between columns using @dnd-kit/core (validate with canTransition before allowing drop)
- Supabase Realtime subscription to prescriptions table — cards update in real-time without refresh
- Top bar with: Active prescriptions count, Avg wait time today, Staff online count

Create hooks/useRealtime.ts:
- useRealtimePrescriptions(pharmacyId) — subscribes to INSERT/UPDATE on prescriptions filtered by pharmacy_id
- useRealtimeAlerts(pharmacyId) — subscribes to alerts table for live notification badge
- Properly unsubscribes on component unmount"

# Task assignment
codex "Create components/workflow/AssignTaskDialog.tsx:
- Shows list of online/on-shift staff members with their current task count
- Allows reassigning a prescription to another staff member
- Staff availability pulled from profiles table (could integrate with shift scheduling later)
- Creates/updates workflow_tasks record
- Sends in-app notification to assigned staff member via Supabase Realtime"
```

---

## Phase 8 — Reporting & Analytics Dashboard

**Goal:** Financial reporting, compliance reports, and operational analytics dashboards.

### Deliverables
- [ ] Overview dashboard with KPI cards
- [ ] Financial reports (revenue, insurance reimbursements, margin)
- [ ] Prescription volume analytics
- [ ] Inventory turnover reports
- [ ] DEA/controlled substance reports
- [ ] HIPAA audit report
- [ ] Export to CSV/PDF

### Codex CLI Skill

```bash
# Analytics dashboard
codex "Create app/(dashboard)/reports/analytics/page.tsx using Recharts library:
KPI Cards (top row): Prescriptions Today, Revenue Today, Pending Claims $, Inventory Value, Active Patients, Avg Processing Time
Charts:
- Line chart: Daily prescription volume (last 30 days) with moving average
- Bar chart: Revenue by payer (insurance vs cash vs copay, by week)
- Pie chart: Prescription status distribution
- Area chart: Inventory value trend (last 90 days)
- Heatmap table: Staff productivity by hour of day and day of week

All chart data fetched from Supabase via Server Actions with proper date filtering.
Date range picker using shadcn/ui DateRangePicker.
Export button that downloads charts as PNG and data as CSV."

# Financial reports
codex "Create app/(dashboard)/reports/financial/page.tsx:
- Revenue Summary: gross revenue, insurance payments, copays, OTC sales, refunds — with period-over-period comparison
- Insurance Performance: claim acceptance rate by payer, average days to payment, top payers by volume
- Prescription Profitability: revenue per prescription, margin by medication category, top 20 medications by profit
- Accounts Receivable: outstanding claims by age bucket (0-30, 31-60, 61-90, 90+ days)
All tables support sorting and CSV export via a server action that streams CSV data."

# Compliance reports
codex "Create app/(dashboard)/reports/compliance/page.tsx:
- DEA Report: controlled substance dispensing log by schedule, date range selector, formatted for DEA 41/222 submission
- HIPAA Audit Trail: searchable/filterable audit_logs with user, action, resource, timestamp, IP
- State Pharmacy Board Report: prescription counts by DEA schedule and drug class
- Expiry Report: inventory items expiring within configurable window
All reports have: Print button (browser print), PDF export, CSV export, and Date Range filter."
```

---

## Phase 9 — Customer Communication Portal

**Goal:** Automated SMS/email notifications for prescription readiness, refill reminders, and health alerts.

### Deliverables
- [ ] Prescription ready SMS/email notification
- [ ] Refill reminder automation
- [ ] Medication adherence reminders
- [ ] Patient-facing refill request portal
- [ ] Two-way SMS replies (Twilio)
- [ ] Notification preferences management

### Codex CLI Skill

```bash
# Notification system
codex "Create actions/notifications.ts with Server Actions:
- sendPrescriptionReady(prescriptionId) — sends SMS (Twilio) and/or email (Resend) based on patient preferences
- scheduleRefillReminders(prescriptionId) — calculates reminder dates based on days_supply and refills_remaining, creates cron entries
- sendRefillReminder(patientId, prescriptionId) — sends refill reminder via preferred channel
- processRefillRequest(patientId, rxNumber) — creates new refill record from incoming patient request

Create a Supabase Edge Function (supabase/functions/send-notification/index.ts):
- Called by pg_cron for scheduled reminders
- Uses Twilio API for SMS
- Uses Resend API for email
- Templates: prescription_ready, refill_reminder, refill_scheduled, claim_issue, general"

# SMS two-way with Twilio
codex "Create app/api/webhooks/twilio/route.ts:
- POST endpoint that handles inbound SMS from patients
- Parse TwiML response from Twilio
- Keyword commands: 'REFILL' → trigger refill request for last prescription, 'STATUS' → reply with prescription status, 'STOP' → opt out of notifications, 'HELP' → reply with available commands
- Log all inbound/outbound SMS to notifications table
- Reply with TwiML XML response

Create components/communications/NotificationPreferences.tsx:
- Patient-level notification settings: SMS on/off, email on/off, preferred contact time window
- Notification type toggles: ready, refill reminder, health alert, promotional
- Phone number verification step for SMS opt-in (TCPA compliance)"
```

---

## Phase 10 — Multi-Location Management

**Goal:** Chain pharmacy support with centralized reporting, inventory sharing, and consolidated admin.

### Deliverables
- [x] Super admin pharmacy management portal
- [x] Cross-location patient record access
- [x] Inventory transfer between locations
- [x] Consolidated reporting across all locations
- [x] Per-location settings and staff management
- [x] Prescription transfer between locations

### Codex CLI Skill

```bash
# Multi-location admin
codex "Create app/(dashboard)/admin/locations/page.tsx (super_admin only):
- List of all pharmacies with: name, NPI, address, active staff count, today's prescription count, status
- Add new pharmacy location form
- Per-location settings: operating hours, notification templates, label templates, tax rate, accepted insurance payers

Update RLS policies in Supabase:
- super_admin role can read all records regardless of pharmacy_id
- pharmacy_admin can only see their own pharmacy's data
- Add a helper function get_user_pharmacy_ids() that returns all pharmacy IDs the current user has access to (for future multi-pharmacy pharmacist accounts)

Create app/(dashboard)/admin/locations/[id]/page.tsx:
- Location detail with tabs: Overview, Staff, Settings, Reports
- Staff management: invite new staff by email, set role, deactivate
- Inventory transfer: select medication, quantity, destination pharmacy"

# Cross-location prescription transfer
codex "Create components/prescriptions/TransferForm.tsx:
- Initiate outbound transfer: select destination pharmacy (dropdown of chain locations or external), reason for transfer
- Generate transfer record with: all prescription details, patient demographics snapshot (HIPAA-safe transfer), remaining refills, transfer authorization from pharmacist
- Inbound transfer: receive transfer by entering transfer code or scanning QR
- Create new prescription record at receiving pharmacy linked to original
- Notify patient of transfer via SMS/email"
```

---

## Phase 11 — AI & Advanced Features

**Goal:** AI-powered demand forecasting, automated prior auth, clinical decision support, and AI pharmacist chatbot.

### Deliverables
- [x] AI demand forecasting for inventory
- [x] Automated prior authorization generation
- [x] AI medication therapy management suggestions
- [x] Patient medication adherence AI scoring
- [x] AI pharmacist chatbot (24/7 patient Q&A)
- [x] Drug shortage alert integration (OpenFDA)

### Codex CLI Skill

```bash
# AI demand forecasting
codex "Create app/api/ai/demand-forecast/route.ts:
- POST endpoint accepting { pharmacyId, medicationIds[], forecastDays: 30|60|90 }
- Queries historical dispensing data from prescriptions table (last 12 months)
- Sends to OpenAI GPT-4o with: daily dispense counts, seasonal patterns, current inventory levels, reorder points
- Prompt: 'You are a pharmacy inventory analyst. Based on this dispensing history, predict demand for the next {days} days, accounting for seasonal trends and growth patterns. Return JSON: { medication_id, predicted_demand, confidence: 0-1, recommendation: string }'
- Stores forecast in a new forecasts table
- Returns forecast with current stock vs predicted demand comparison"

# AI prior authorization generator
codex "Create app/api/ai/prior-auth/route.ts:
- POST accepting { prescriptionId, denialCode, insurancePlanId }
- Fetches: prescription details, patient demographics, medical conditions, past medication history
- Uses OpenAI GPT-4o to generate a prior authorization appeal letter
- Prompt: 'You are a clinical pharmacist writing a prior authorization appeal. Generate a professional, medically accurate PA letter for the following case. Include clinical necessity, medical history support, and references to clinical guidelines.'
- Returns formatted letter as text
- User can edit before submitting
- Store letter in Supabase Storage, link to claim record"

# AI chatbot for patients
codex "Create app/api/ai/chatbot/route.ts as a streaming POST endpoint:
- Accepts { message, patientId, conversationId }
- Uses OpenAI Assistants API with a pharmacy-trained assistant
- System prompt: 'You are PharmaCare AI, a helpful pharmacy assistant. You can answer questions about medications (dosing, side effects, interactions), explain prescription instructions, provide general health information, and help patients schedule refills. You CANNOT provide specific medical diagnoses or replace pharmacist consultation. Always recommend speaking to the pharmacist for medical decisions.'
- Fetches patient's current medications from Supabase to provide personalized context (medications only, no full PHI)
- Streams response using Next.js streaming
- Logs conversation to a chat_sessions table
- Export useChat hook integration for frontend

Create components/shared/AIChat.tsx:
- Floating chat bubble in bottom-right corner (patient-facing portal only)
- Opens as slide-over panel
- Message bubbles with markdown rendering
- Shows 'Ask your pharmacist' escalation button when AI recommends professional consultation"

# Drug shortage alerts
codex "Create a Supabase Edge Function supabase/functions/check-drug-shortages/index.ts:
- Runs daily via pg_cron schedule
- Calls FDA Drug Shortage Database API: https://api.fda.gov/drug/shortages.json
- Compares shortages against pharmacy's active inventory medication NDCs
- Creates alerts of type 'low_stock' with message referencing the shortage
- For each shortage: suggests alternative medications using medication.drug_class cross-reference
- Sends email digest to pharmacy_admin with shortage summary via Resend"
```

---

## Phase 12 — Mobile PWA & Accessibility

**Goal:** Progressive Web App for mobile use, WCAG 2.1 AA compliance, offline support for critical workflows.

### Deliverables
- [x] PWA manifest and service worker
- [x] Offline prescription queue view
- [x] Mobile-optimized POS
- [x] Push notifications
- [x] WCAG 2.1 AA audit and fixes
- [x] Keyboard navigation throughout

### Codex CLI Skill

```bash
# PWA configuration
codex "Configure the Next.js app as a Progressive Web App:
1. Create public/manifest.json with: name='PharmaTech Pro', short_name='PharmaPro', theme_color='#0f172a', background_color='#ffffff', display='standalone', icons (192x192 and 512x512 in /public/icons/)
2. Add <link rel='manifest'> and meta theme-color to app/layout.tsx
3. Install next-pwa and configure in next.config.ts with: dest='public', register=true, skipWaiting=true, disable in development
4. Create service worker cache strategy: cache-first for static assets, network-first for API routes, stale-while-revalidate for dashboard pages
5. Offline fallback page at app/offline/page.tsx showing cached prescription queue"

# Accessibility audit and fixes
codex "Perform a comprehensive WCAG 2.1 AA accessibility review and fix the following across all components:
1. All interactive elements must have visible focus rings (add focus-visible:ring-2 ring-offset-2 Tailwind classes)
2. All images need descriptive alt text; decorative images have alt=''
3. All form inputs have associated <label> elements or aria-label
4. Color contrast must meet 4.5:1 ratio for normal text — audit all text/background combinations
5. DataTable must be a proper <table> with <th scope='col'> headers and <caption>
6. Status badges use aria-label describing the full status, not just color
7. All modals/dialogs use proper role='dialog', aria-modal='true', aria-labelledby pointing to title, focus trap
8. Keyboard navigation: Escape closes modals, Tab order is logical, arrow keys work in dropdowns/selects
9. Add skip-to-main-content link at top of layout
10. All icons used as buttons (no text) have aria-label"
```

---

## Codex CLI Usage Guide

### Installation & Setup

```bash
# Install Codex CLI globally
npm install -g @openai/codex

# Set your API key
export OPENAI_API_KEY=sk-...

# Run Codex in your project directory
cd /home/bacancy/Projects/pharma-pro
codex
```

### Recommended Codex Workflow per Phase

```bash
# 1. Start each phase with a context-setting prompt
codex "I am building PharmaTech Pro, a Next.js 15 + Supabase pharmacy management platform.
The tech stack is: Next.js 15 App Router, TypeScript strict, Supabase (PostgreSQL + Auth + Realtime + Storage),
Tailwind CSS, shadcn/ui, react-hook-form, Zod, TanStack Query, lucide-react.
All Server Actions handle validation, permissions check, audit logging.
RLS is enabled — always use the server-side Supabase client in Server Actions.
I am currently working on: [PHASE NAME]"

# 2. Use --approval-mode for safe auto-execution
codex --approval-mode auto "..."   # auto-approves safe file writes
codex --approval-mode suggest "..." # suggests changes, you approve
codex --approval-mode full-auto "..." # fully autonomous (use carefully)

# 3. Reference specific files for context
codex "Looking at lib/validations/patient.ts and actions/patients.ts, add a mergePatients(primaryId, secondaryId) Server Action that..."

# 4. Run tests after each phase
codex "Write Vitest unit tests for lib/utils/prescription-state-machine.ts covering all valid and invalid state transitions"
codex "Write Playwright E2E tests for the prescription creation flow: login as pharmacist, navigate to /prescriptions/new, complete all 5 steps, verify redirect to prescription detail"
```

### Phase Execution Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
    ↓
Phase 5 → Phase 6 → Phase 7 → Phase 8
    ↓
Phase 9 → Phase 10 → Phase 11 → Phase 12
```

### Codex Context Files to Always Keep

Create `.codex-context.md` in project root:

```markdown
## Project: PharmaTech Pro
- Framework: Next.js 15 App Router
- DB: Supabase PostgreSQL with RLS enabled
- Auth: Supabase Auth with profiles table extension
- UI: shadcn/ui + Tailwind CSS
- Forms: react-hook-form + Zod validation
- State: TanStack Query for server state, Zustand for local UI state
- All data mutations go through Next.js Server Actions (not API routes unless webhook/streaming)
- Every PHI access must call auditLog() from lib/utils/hipaa-audit.ts
- User role is in profiles.role — use hooks/usePermissions.ts to check access
- Pharmacy isolation via RLS: pharmacy_id = profiles.pharmacy_id for current user
- Supabase types are in lib/supabase/types.ts (run: supabase gen types typescript --local > lib/supabase/types.ts)
```

---

## Environment Variables Reference

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Only in server-side code

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Resend (Email)
RESEND_API_KEY=re_...
FROM_EMAIL=pharmacy@yourdomain.com

# OpenAI (AI features)
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...            # AI Chatbot assistant

# OpenFDA
FDA_API_KEY=...                          # Optional, higher rate limits

# App
NEXT_PUBLIC_APP_URL=https://pharmapro.yourdomain.com
NEXTAUTH_SECRET=...                      # Used for HIPAA audit signatures
```

---

## MVP Checklist (Ship First)

Focus on these for a working MVP before advanced features:

- [x] Phase 0: Auth + RBAC + Layout
- [x] Phase 1: Patient Management
- [x] Phase 2: Prescription Processing (basic flow only)
- [x] Phase 3: Drug Interaction Check (database query, no AI)
- [x] Phase 4: Inventory (stock tracking + alerts)
- [x] Phase 5: Insurance (claim creation + status tracking, no live NCPDP)
- [x] Phase 6: POS (Stripe payments + receipt)
- [x] Phase 7: Workflow Queue (Kanban + Realtime)
- [x] Phase 8: Basic Reports (prescription volume + financial summary)

**Post-MVP:** Phases 9, 10, 11, 12

---

## Key Metrics to Track (Build Analytics For)

| Metric | Source Table | Query |
|--------|-------------|-------|
| Prescriptions/day | `prescriptions` | COUNT grouped by DATE |
| Avg processing time | `prescriptions` | AVG(dispensed_at - created_at) |
| Inventory turnover | `inventory` + `prescriptions` | Units dispensed / avg inventory |
| Claim acceptance rate | `claims` | COUNT(status='paid') / COUNT(*) |
| Patient satisfaction | Future survey table | AVG(rating) |
| Error reduction | `audit_logs` + `drug_interactions` | Overrides logged |
| Revenue per Rx | `transactions` | SUM(total) / COUNT(prescriptions) |
| Staff productivity | `workflow_tasks` | Tasks completed per user per shift |

---

*Generated: March 2026 · PharmaTech Pro Implementation Plan · Next.js 15 + Supabase*
*Blueprint Source: BestRx Pharmacy Management Analysis*
