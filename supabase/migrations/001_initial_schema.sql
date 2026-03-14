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
  npi         TEXT UNIQUE NOT NULL,
  dea_number  TEXT UNIQUE,
  address     JSONB NOT NULL DEFAULT '{}',
  phone       TEXT,
  fax         TEXT,
  email       TEXT,
  license     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  settings    JSONB DEFAULT '{}',
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
  bin             TEXT NOT NULL,
  pcn             TEXT,
  group_number    TEXT,
  member_id       TEXT NOT NULL,
  relationship    TEXT DEFAULT 'self',
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
  ndc             TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  brand_name      TEXT,
  generic_name    TEXT,
  manufacturer    TEXT,
  dosage_form     TEXT,
  strength        TEXT,
  unit            TEXT,
  drug_class      TEXT,
  schedule        drug_schedule DEFAULT 'OTC',
  requires_rx     BOOLEAN DEFAULT TRUE,
  is_refrigerated BOOLEAN DEFAULT FALSE,
  storage_temp_range JSONB,
  interactions    TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES pharmacies(id),
  name        TEXT NOT NULL,
  dea_number  TEXT,
  contact     JSONB,
  address     JSONB,
  payment_terms TEXT,
  is_preferred BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
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
  supplier_id     UUID REFERENCES suppliers(id),
  location_bin    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pharmacy_id, medication_id, lot_number)
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
  rx_number       TEXT UNIQUE NOT NULL DEFAULT '',
  status          prescription_status DEFAULT 'received',
  written_date    DATE NOT NULL,
  expiration_date DATE,
  days_supply     INTEGER,
  quantity        DECIMAL(10,2) NOT NULL,
  refills_allowed INTEGER DEFAULT 0,
  refills_used    INTEGER DEFAULT 0,
  sig             TEXT NOT NULL,
  daw_code        INTEGER DEFAULT 0,
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
  payment_method  TEXT,
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
  ncpdp_response  JSONB,
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
  severity        TEXT NOT NULL,
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
  reference_id    UUID,
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
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
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
  task_type       TEXT NOT NULL,
  priority        INTEGER DEFAULT 5,
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
  channel         TEXT NOT NULL,
  template        TEXT NOT NULL,
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
-- AUDIT LOG FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action, resource, resource_id, old_data)
    VALUES (TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (action, resource, resource_id, old_data, new_data)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSE
    INSERT INTO audit_logs (action, resource, resource_id, new_data)
    VALUES (TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
