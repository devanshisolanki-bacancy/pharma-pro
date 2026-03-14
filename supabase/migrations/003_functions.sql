-- ============================================================
-- INVENTORY STOCK CHECK FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS void AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Check for low stock items
  FOR inv_record IN
    SELECT i.id, i.pharmacy_id, i.quantity_on_hand, i.reorder_point,
           m.name as medication_name
    FROM inventory i
    JOIN medications m ON m.id = i.medication_id
    WHERE i.quantity_on_hand <= i.reorder_point
      AND i.status = 'active'
  LOOP
    -- Upsert alert (avoid duplicates)
    INSERT INTO alerts (pharmacy_id, type, title, message, reference_id, reference_type)
    VALUES (
      inv_record.pharmacy_id,
      'low_stock',
      'Low Stock Alert: ' || inv_record.medication_name,
      'Current quantity: ' || inv_record.quantity_on_hand || ' (reorder point: ' || inv_record.reorder_point || ')',
      inv_record.id,
      'inventory'
    )
    ON CONFLICT DO NOTHING;

    -- Update inventory status
    UPDATE inventory SET status = CASE
      WHEN quantity_on_hand = 0 THEN 'out_of_stock'::inventory_status
      ELSE 'low_stock'::inventory_status
    END
    WHERE id = inv_record.id;
  END LOOP;

  -- Check for expiring items (within 30 days)
  FOR inv_record IN
    SELECT i.id, i.pharmacy_id, i.expiration_date,
           m.name as medication_name, i.lot_number
    FROM inventory i
    JOIN medications m ON m.id = i.medication_id
    WHERE i.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
      AND i.expiration_date > CURRENT_DATE
      AND i.status IN ('active', 'low_stock')
  LOOP
    INSERT INTO alerts (pharmacy_id, type, title, message, reference_id, reference_type)
    VALUES (
      inv_record.pharmacy_id,
      'expiration',
      'Expiring Soon: ' || inv_record.medication_name,
      'Lot ' || COALESCE(inv_record.lot_number, 'N/A') || ' expires on ' || inv_record.expiration_date::TEXT,
      inv_record.id,
      'inventory'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Mark expired items
  UPDATE inventory
  SET status = 'expired'
  WHERE expiration_date < CURRENT_DATE
    AND status != 'expired';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GENERATE CLAIM NUMBER
-- ============================================================
CREATE SEQUENCE claim_number_seq START 100000;

CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    NEW.claim_number := 'CLM' || LPAD(nextval('claim_number_seq')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_claim_number BEFORE INSERT ON claims FOR EACH ROW EXECUTE FUNCTION generate_claim_number();

-- ============================================================
-- GENERATE RECEIPT NUMBER
-- ============================================================
CREATE SEQUENCE receipt_number_seq START 100000;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'RCP' || LPAD(nextval('receipt_number_seq')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_receipt_number BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- ============================================================
-- REFILL ELIGIBILITY CHECK
-- ============================================================
CREATE OR REPLACE FUNCTION can_refill(prescription_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  rx RECORD;
  days_until_eligible INTEGER;
  last_dispensed DATE;
BEGIN
  SELECT p.*, m.name as medication_name
  INTO rx
  FROM prescriptions p
  JOIN medications m ON m.id = p.medication_id
  WHERE p.id = prescription_uuid;

  IF NOT FOUND THEN
    RETURN '{"eligible": false, "reason": "Prescription not found"}'::JSONB;
  END IF;

  IF rx.status = 'cancelled' OR rx.status = 'transferred' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Prescription is ' || rx.status);
  END IF;

  IF rx.refills_used >= rx.refills_allowed THEN
    RETURN '{"eligible": false, "reason": "No refills remaining"}'::JSONB;
  END IF;

  IF rx.expiration_date IS NOT NULL AND rx.expiration_date < CURRENT_DATE THEN
    RETURN '{"eligible": false, "reason": "Prescription has expired"}'::JSONB;
  END IF;

  -- Check if too early to refill (must use at least 75% of days supply)
  SELECT MAX(dispensed_at::DATE) INTO last_dispensed
  FROM refills
  WHERE prescription_id = prescription_uuid AND status = 'dispensed';

  IF last_dispensed IS NULL THEN
    last_dispensed := rx.dispensed_at::DATE;
  END IF;

  IF last_dispensed IS NOT NULL AND rx.days_supply IS NOT NULL THEN
    days_until_eligible := (last_dispensed + INTERVAL '1 day' * rx.days_supply * 0.75)::DATE - CURRENT_DATE;
    IF days_until_eligible > 0 THEN
      RETURN jsonb_build_object(
        'eligible', false,
        'reason', 'Too early to refill. Eligible in ' || days_until_eligible || ' days',
        'days_until_eligible', days_until_eligible
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'refills_remaining', rx.refills_allowed - rx.refills_used,
    'medication_name', rx.medication_name
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- DASHBOARD STATS FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_pharmacy_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'prescriptions_today', (
      SELECT COUNT(*) FROM prescriptions
      WHERE pharmacy_id = p_pharmacy_id
        AND DATE(created_at) = CURRENT_DATE
    ),
    'revenue_today', (
      SELECT COALESCE(SUM(total), 0) FROM transactions
      WHERE pharmacy_id = p_pharmacy_id
        AND DATE(created_at) = CURRENT_DATE
        AND type = 'sale'
    ),
    'pending_claims', (
      SELECT COUNT(*) FROM claims
      WHERE pharmacy_id = p_pharmacy_id
        AND status IN ('pending', 'submitted')
    ),
    'pending_claims_amount', (
      SELECT COALESCE(SUM(billed_amount), 0) FROM claims
      WHERE pharmacy_id = p_pharmacy_id
        AND status IN ('pending', 'submitted')
    ),
    'active_patients', (
      SELECT COUNT(*) FROM patients
      WHERE pharmacy_id = p_pharmacy_id AND is_active = true
    ),
    'low_stock_count', (
      SELECT COUNT(*) FROM inventory
      WHERE pharmacy_id = p_pharmacy_id
        AND status IN ('low_stock', 'out_of_stock')
    ),
    'unread_alerts', (
      SELECT COUNT(*) FROM alerts
      WHERE pharmacy_id = p_pharmacy_id
        AND is_read = false AND is_dismissed = false
    ),
    'prescriptions_by_status', (
      SELECT jsonb_object_agg(status, cnt)
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM prescriptions
        WHERE pharmacy_id = p_pharmacy_id
          AND DATE(created_at) = CURRENT_DATE
        GROUP BY status
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
