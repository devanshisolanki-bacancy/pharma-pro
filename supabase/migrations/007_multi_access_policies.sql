-- ============================================================
-- Multi-pharmacy access policies (supplemental)
-- ============================================================

CREATE POLICY pharmacies_select_multi ON pharmacies FOR SELECT
USING (id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY profiles_select_multi ON profiles FOR SELECT
USING (
  id = auth.uid()
  OR pharmacy_id = ANY(get_user_pharmacy_ids())
  OR get_my_role() = 'super_admin'
);

CREATE POLICY patients_select_multi ON patients FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY prescriptions_select_multi ON prescriptions FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY inventory_select_multi ON inventory FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY claims_select_multi ON claims FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY transactions_select_multi ON transactions FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY alerts_select_multi ON alerts FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY workflow_select_multi ON workflow_tasks FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');

CREATE POLICY notifications_select_multi ON notifications FOR SELECT
USING (pharmacy_id = ANY(get_user_pharmacy_ids()) OR get_my_role() = 'super_admin');
