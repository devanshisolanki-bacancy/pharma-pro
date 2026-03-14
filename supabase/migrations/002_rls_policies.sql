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
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE refills ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's pharmacy_id
CREATE OR REPLACE FUNCTION get_my_pharmacy_id()
RETURNS UUID AS $$
  SELECT pharmacy_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- PHARMACIES
-- ============================================================
-- super_admin can see all; others see only their pharmacy
CREATE POLICY pharmacies_select ON pharmacies FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR id = get_my_pharmacy_id()
  );

CREATE POLICY pharmacies_insert ON pharmacies FOR INSERT
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY pharmacies_update ON pharmacies FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'pharmacy_admin') AND id = get_my_pharmacy_id());

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR get_my_role() IN ('super_admin', 'pharmacy_admin')
    OR pharmacy_id = get_my_pharmacy_id()
  );

CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid() OR get_my_role() IN ('super_admin', 'pharmacy_admin'));

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid() OR get_my_role() IN ('super_admin', 'pharmacy_admin'));

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE POLICY patients_select ON patients FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR pharmacy_id = get_my_pharmacy_id()
  );

CREATE POLICY patients_insert ON patients FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id());

CREATE POLICY patients_update ON patients FOR UPDATE
  USING (pharmacy_id = get_my_pharmacy_id());

CREATE POLICY patients_delete ON patients FOR DELETE
  USING (pharmacy_id = get_my_pharmacy_id() AND get_my_role() IN ('super_admin', 'pharmacy_admin', 'pharmacist'));

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE POLICY prescriptions_select ON prescriptions FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR pharmacy_id = get_my_pharmacy_id()
  );

CREATE POLICY prescriptions_insert ON prescriptions FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id());

CREATE POLICY prescriptions_update ON prescriptions FOR UPDATE
  USING (pharmacy_id = get_my_pharmacy_id());

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE POLICY inventory_select ON inventory FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR pharmacy_id = get_my_pharmacy_id()
  );

CREATE POLICY inventory_insert ON inventory FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id());

CREATE POLICY inventory_update ON inventory FOR UPDATE
  USING (pharmacy_id = get_my_pharmacy_id());

-- ============================================================
-- CLAIMS
-- ============================================================
CREATE POLICY claims_select ON claims FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR pharmacy_id = get_my_pharmacy_id()
  );

CREATE POLICY claims_insert ON claims FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id());

CREATE POLICY claims_update ON claims FOR UPDATE
  USING (pharmacy_id = get_my_pharmacy_id());

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE POLICY transactions_select ON transactions FOR SELECT
  USING (pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin');

CREATE POLICY transactions_insert ON transactions FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id());

-- ============================================================
-- ALERTS
-- ============================================================
CREATE POLICY alerts_select ON alerts FOR SELECT
  USING (pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin');

CREATE POLICY alerts_insert ON alerts FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin');

CREATE POLICY alerts_update ON alerts FOR UPDATE
  USING (pharmacy_id = get_my_pharmacy_id());

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE POLICY audit_read ON audit_logs FOR SELECT
  USING (
    pharmacy_id = get_my_pharmacy_id()
    OR get_my_role() = 'super_admin'
  );

-- Only system/service role can insert audit logs
CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- WORKFLOW TASKS
-- ============================================================
CREATE POLICY workflow_select ON workflow_tasks FOR SELECT
  USING (pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin');

CREATE POLICY workflow_insert ON workflow_tasks FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id());

CREATE POLICY workflow_update ON workflow_tasks FOR UPDATE
  USING (pharmacy_id = get_my_pharmacy_id());

-- ============================================================
-- MEDICATIONS (public read, admin write)
-- ============================================================
CREATE POLICY medications_select ON medications FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY medications_insert ON medications FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'pharmacy_admin', 'pharmacist'));

CREATE POLICY medications_update ON medications FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'pharmacy_admin', 'pharmacist'));

-- ============================================================
-- PROVIDERS
-- ============================================================
CREATE POLICY providers_select ON providers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY providers_insert ON providers FOR INSERT
  WITH CHECK (get_my_role() NOT IN ('cashier', 'viewer'));

-- ============================================================
-- INSURANCE PLANS
-- ============================================================
CREATE POLICY insurance_select ON insurance_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = insurance_plans.patient_id
        AND (p.pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin')
    )
  );

CREATE POLICY insurance_insert ON insurance_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = insurance_plans.patient_id
        AND p.pharmacy_id = get_my_pharmacy_id()
    )
  );

-- ============================================================
-- DRUG INTERACTIONS (public read)
-- ============================================================
CREATE POLICY drug_interactions_select ON drug_interactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE POLICY suppliers_select ON suppliers FOR SELECT
  USING (pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin');

CREATE POLICY suppliers_insert ON suppliers FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin');

CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin');

-- ============================================================
-- REFILLS
-- ============================================================
CREATE POLICY refills_select ON refills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prescriptions rx
      WHERE rx.id = refills.prescription_id
        AND (rx.pharmacy_id = get_my_pharmacy_id() OR get_my_role() = 'super_admin')
    )
  );

CREATE POLICY refills_insert ON refills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prescriptions rx
      WHERE rx.id = refills.prescription_id
        AND rx.pharmacy_id = get_my_pharmacy_id()
    )
  );
