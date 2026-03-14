-- ============================================================
-- PHASE 10-12: Multi-location, AI, and PWA support tables
-- ============================================================

CREATE TABLE user_pharmacy_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pharmacy_id)
);

CREATE TABLE inventory_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_pharmacy_id  UUID REFERENCES pharmacies(id) NOT NULL,
  to_pharmacy_id    UUID REFERENCES pharmacies(id) NOT NULL,
  medication_id     UUID REFERENCES medications(id) NOT NULL,
  quantity          DECIMAL(10,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  requested_by      UUID REFERENCES profiles(id),
  approved_by       UUID REFERENCES profiles(id),
  notes             TEXT,
  requested_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  CHECK (from_pharmacy_id <> to_pharmacy_id)
);

CREATE TABLE prescription_transfers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code           TEXT UNIQUE NOT NULL,
  from_pharmacy_id        UUID REFERENCES pharmacies(id) NOT NULL,
  to_pharmacy_id          UUID REFERENCES pharmacies(id),
  original_prescription_id UUID REFERENCES prescriptions(id) NOT NULL,
  new_prescription_id     UUID REFERENCES prescriptions(id),
  patient_snapshot        JSONB NOT NULL DEFAULT '{}',
  prescription_snapshot   JSONB NOT NULL DEFAULT '{}',
  remaining_refills       INTEGER NOT NULL DEFAULT 0,
  reason                  TEXT,
  authorization_user_id   UUID REFERENCES profiles(id),
  status                  TEXT NOT NULL DEFAULT 'initiated',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  received_at             TIMESTAMPTZ
);

CREATE TABLE forecasts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id       UUID REFERENCES pharmacies(id) NOT NULL,
  medication_id     UUID REFERENCES medications(id) NOT NULL,
  forecast_days     INTEGER NOT NULL,
  predicted_demand  DECIMAL(10,2) NOT NULL,
  confidence        DECIMAL(5,4) NOT NULL,
  recommendation    TEXT,
  model             TEXT DEFAULT 'gpt-4o-mini',
  input_data        JSONB DEFAULT '{}',
  generated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prior_auth_letters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id          UUID REFERENCES claims(id),
  prescription_id   UUID REFERENCES prescriptions(id) NOT NULL,
  insurance_plan_id UUID REFERENCES insurance_plans(id),
  denial_code       TEXT,
  letter_text       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  generated_by      UUID REFERENCES profiles(id),
  file_path         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE adherence_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  prescription_id   UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  score             DECIMAL(5,2) NOT NULL,
  risk_level        TEXT NOT NULL,
  recommendations   JSONB NOT NULL DEFAULT '[]',
  model_version     TEXT DEFAULT 'gpt-4o-mini',
  calculated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID REFERENCES patients(id) ON DELETE CASCADE,
  pharmacy_id      UUID REFERENCES pharmacies(id) NOT NULL,
  conversation_title TEXT,
  last_message_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE push_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id       UUID REFERENCES patients(id) ON DELETE CASCADE,
  endpoint         TEXT UNIQUE NOT NULL,
  p256dh           TEXT NOT NULL,
  auth             TEXT NOT NULL,
  user_agent       TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Helper: pharmacy access list
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_pharmacy_ids()
RETURNS UUID[] AS $$
DECLARE
  role_value user_role;
  result UUID[];
BEGIN
  SELECT get_my_role() INTO role_value;

  IF role_value = 'super_admin' THEN
    SELECT COALESCE(array_agg(id), '{}') INTO result
    FROM pharmacies
    WHERE is_active = TRUE;
    RETURN result;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT pid), '{}') INTO result
  FROM (
    SELECT p.pharmacy_id AS pid
    FROM profiles p
    WHERE p.id = auth.uid()
    UNION ALL
    SELECT upa.pharmacy_id AS pid
    FROM user_pharmacy_access upa
    WHERE upa.user_id = auth.uid() AND upa.is_active = TRUE
  ) ids
  WHERE pid IS NOT NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_user_pharmacy_access_user ON user_pharmacy_access(user_id);
CREATE INDEX idx_user_pharmacy_access_pharmacy ON user_pharmacy_access(pharmacy_id);
CREATE INDEX idx_inventory_transfers_from_to ON inventory_transfers(from_pharmacy_id, to_pharmacy_id, status);
CREATE INDEX idx_prescription_transfers_code ON prescription_transfers(transfer_code);
CREATE INDEX idx_forecasts_pharmacy_medication ON forecasts(pharmacy_id, medication_id, generated_at DESC);
CREATE INDEX idx_prior_auth_prescription ON prior_auth_letters(prescription_id, created_at DESC);
CREATE INDEX idx_adherence_scores_patient ON adherence_scores(patient_id, calculated_at DESC);
CREATE INDEX idx_chat_sessions_pharmacy ON chat_sessions(pharmacy_id, updated_at DESC);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE TRIGGER trg_prior_auth_letters_updated BEFORE UPDATE ON prior_auth_letters
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chat_sessions_updated BEFORE UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE user_pharmacy_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_auth_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE adherence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_pharmacy_access_select ON user_pharmacy_access FOR SELECT
USING (
  get_my_role() = 'super_admin'
  OR pharmacy_id = ANY(get_user_pharmacy_ids())
  OR user_id = auth.uid()
);

CREATE POLICY user_pharmacy_access_insert ON user_pharmacy_access FOR INSERT
WITH CHECK (
  get_my_role() IN ('super_admin', 'pharmacy_admin')
  AND pharmacy_id = ANY(get_user_pharmacy_ids())
);

CREATE POLICY user_pharmacy_access_update ON user_pharmacy_access FOR UPDATE
USING (
  get_my_role() IN ('super_admin', 'pharmacy_admin')
  AND pharmacy_id = ANY(get_user_pharmacy_ids())
);

CREATE POLICY inventory_transfers_select ON inventory_transfers FOR SELECT
USING (
  get_my_role() = 'super_admin'
  OR from_pharmacy_id = ANY(get_user_pharmacy_ids())
  OR to_pharmacy_id = ANY(get_user_pharmacy_ids())
);

CREATE POLICY inventory_transfers_insert ON inventory_transfers FOR INSERT
WITH CHECK (
  from_pharmacy_id = ANY(get_user_pharmacy_ids())
  AND get_my_role() NOT IN ('viewer', 'cashier')
);

CREATE POLICY inventory_transfers_update ON inventory_transfers FOR UPDATE
USING (
  get_my_role() = 'super_admin'
  OR from_pharmacy_id = ANY(get_user_pharmacy_ids())
  OR to_pharmacy_id = ANY(get_user_pharmacy_ids())
);

CREATE POLICY prescription_transfers_select ON prescription_transfers FOR SELECT
USING (
  get_my_role() = 'super_admin'
  OR from_pharmacy_id = ANY(get_user_pharmacy_ids())
  OR COALESCE(to_pharmacy_id, '00000000-0000-0000-0000-000000000000'::uuid) = ANY(get_user_pharmacy_ids())
);

CREATE POLICY prescription_transfers_insert ON prescription_transfers FOR INSERT
WITH CHECK (
  from_pharmacy_id = ANY(get_user_pharmacy_ids())
  AND get_my_role() NOT IN ('viewer', 'cashier')
);

CREATE POLICY prescription_transfers_update ON prescription_transfers FOR UPDATE
USING (
  get_my_role() = 'super_admin'
  OR from_pharmacy_id = ANY(get_user_pharmacy_ids())
  OR COALESCE(to_pharmacy_id, '00000000-0000-0000-0000-000000000000'::uuid) = ANY(get_user_pharmacy_ids())
);

CREATE POLICY forecasts_select ON forecasts FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY forecasts_insert ON forecasts FOR INSERT
WITH CHECK (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY prior_auth_letters_select ON prior_auth_letters FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM prescriptions rx
    WHERE rx.id = prior_auth_letters.prescription_id
      AND (rx.pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin')
  )
);

CREATE POLICY prior_auth_letters_insert ON prior_auth_letters FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM prescriptions rx
    WHERE rx.id = prior_auth_letters.prescription_id
      AND (rx.pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin')
  )
);

CREATE POLICY adherence_scores_select ON adherence_scores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = adherence_scores.patient_id
      AND (p.pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin')
  )
);

CREATE POLICY adherence_scores_insert ON adherence_scores FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = adherence_scores.patient_id
      AND (p.pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin')
  )
);

CREATE POLICY chat_sessions_select ON chat_sessions FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY chat_sessions_insert ON chat_sessions FOR INSERT
WITH CHECK (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY chat_sessions_update ON chat_sessions FOR UPDATE
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY chat_messages_select ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions cs
    WHERE cs.id = chat_messages.session_id
      AND (cs.pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin')
  )
);

CREATE POLICY chat_messages_insert ON chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_sessions cs
    WHERE cs.id = chat_messages.session_id
      AND (cs.pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin')
  )
);

CREATE POLICY push_subscriptions_select ON push_subscriptions FOR SELECT
USING (
  profile_id = auth.uid()
  OR get_my_role() IN ('super_admin', 'pharmacy_admin', 'pharmacist')
);

CREATE POLICY push_subscriptions_insert ON push_subscriptions FOR INSERT
WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL);

CREATE POLICY push_subscriptions_update ON push_subscriptions FOR UPDATE
USING (profile_id = auth.uid() OR get_my_role() IN ('super_admin', 'pharmacy_admin'));
