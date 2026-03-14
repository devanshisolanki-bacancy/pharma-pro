-- ============================================================
-- SEED DATA FOR LOCAL DEVELOPMENT
-- ============================================================

-- Seed Pharmacy
INSERT INTO pharmacies (id, name, npi, dea_number, address, phone, fax, email, license) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'PharmaTech Pro - Main Street',
  '1234567890',
  'BP1234563',
  '{"street": "123 Main St", "city": "Springfield", "state": "IL", "zip": "62701", "country": "US"}',
  '(217) 555-0100',
  '(217) 555-0101',
  'pharmacy@pharmatechpro.com',
  'IL-PH-12345'
),
(
  '22222222-2222-2222-2222-222222222222',
  'PharmaTech Pro - Oak Avenue',
  '9876543210',
  'BP9876541',
  '{"street": "456 Oak Ave", "city": "Springfield", "state": "IL", "zip": "62702", "country": "US"}',
  '(217) 555-0200',
  '(217) 555-0201',
  'oakave@pharmatechpro.com',
  'IL-PH-12346'
);

-- Seed Medications
INSERT INTO medications (id, ndc, name, brand_name, generic_name, manufacturer, dosage_form, strength, unit, drug_class, schedule, requires_rx) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00071-0155-23', 'Atorvastatin', 'Lipitor', 'Atorvastatin Calcium', 'Pfizer', 'Tablet', '20mg', 'mg', 'Statins', 'OTC', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00006-0952-54', 'Lisinopril', 'Zestril', 'Lisinopril', 'AstraZeneca', 'Tablet', '10mg', 'mg', 'ACE Inhibitors', 'OTC', true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '00173-0682-02', 'Metformin', 'Glucophage', 'Metformin HCl', 'Bristol-Myers Squibb', 'Tablet', '500mg', 'mg', 'Biguanides', 'OTC', true),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00093-0074-01', 'Amoxicillin', 'Amoxil', 'Amoxicillin', 'Teva Pharmaceuticals', 'Capsule', '500mg', 'mg', 'Penicillin Antibiotics', 'OTC', true),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00781-1506-10', 'Hydrocodone/APAP', 'Vicodin', 'Hydrocodone Bitartrate/Acetaminophen', 'AbbVie', 'Tablet', '5mg/325mg', 'mg', 'Opioid Analgesics', 'III', true),
('ffffffff-ffff-ffff-ffff-ffffffffffff', '63304-0882-01', 'Alprazolam', 'Xanax', 'Alprazolam', 'Pfizer', 'Tablet', '0.5mg', 'mg', 'Benzodiazepines', 'IV', true),
('0a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a', '00006-0735-31', 'Omeprazole', 'Prilosec', 'Omeprazole', 'AstraZeneca', 'Capsule', '20mg', 'mg', 'Proton Pump Inhibitors', 'OTC', false),
('0b0b0b0b-0b0b-0b0b-0b0b-0b0b0b0b0b0b', '00093-0148-01', 'Levothyroxine', 'Synthroid', 'Levothyroxine Sodium', 'AbbVie', 'Tablet', '50mcg', 'mcg', 'Thyroid Agents', 'OTC', true),
('0c0c0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c', '00088-1090-47', 'Warfarin', 'Coumadin', 'Warfarin Sodium', 'Bristol-Myers Squibb', 'Tablet', '5mg', 'mg', 'Anticoagulants', 'OTC', true),
('0d0d0d0d-0d0d-0d0d-0d0d-0d0d0d0d0d0d', '00003-0894-21', 'Sertraline', 'Zoloft', 'Sertraline HCl', 'Pfizer', 'Tablet', '50mg', 'mg', 'SSRIs', 'OTC', true);

-- Seed Drug Interactions
INSERT INTO drug_interactions (drug_a_ndc, drug_b_ndc, severity, description, clinical_effects, management, source) VALUES
('00071-0155-23', '00006-0735-31', 'minor', 'Atorvastatin and Omeprazole interaction', 'May slightly increase atorvastatin levels', 'Monitor for muscle pain or weakness', 'Clinical Pharmacology Database'),
('00088-1090-47', '00093-0074-01', 'moderate', 'Warfarin and Amoxicillin interaction', 'Amoxicillin may increase anticoagulant effect of warfarin', 'Monitor INR closely when starting or stopping amoxicillin', 'FDA Drug Interaction Database'),
('00088-1090-47', '63304-0882-01', 'major', 'Warfarin and Alprazolam interaction', 'May increase risk of bleeding', 'Avoid combination if possible; if necessary, monitor closely', 'Clinical Pharmacology Database'),
('00006-0952-54', '00006-0735-31', 'minor', 'Lisinopril and Omeprazole interaction', 'Minimal clinical significance reported', 'No specific action required', 'Drug Interaction Facts'),
('00781-1506-10', '63304-0882-01', 'major', 'Hydrocodone and Alprazolam - CNS depression', 'Combined use may cause profound CNS depression, respiratory depression', 'Avoid concomitant use; if necessary use lowest effective doses', 'FDA Black Box Warning');

-- Seed Providers
INSERT INTO providers (id, pharmacy_id, npi, dea_number, first_name, last_name, specialty, phone, fax) VALUES
('1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a', '11111111-1111-1111-1111-111111111111', '1598765432', 'FJ1234567', 'Robert', 'Johnson', 'Family Medicine', '(217) 555-1001', '(217) 555-1002'),
('1b1b1b1b-1b1b-1b1b-1b1b-1b1b1b1b1b1b', '11111111-1111-1111-1111-111111111111', '1234598765', 'FK9876543', 'Sarah', 'Williams', 'Internal Medicine', '(217) 555-1003', '(217) 555-1004'),
('1c1c1c1c-1c1c-1c1c-1c1c-1c1c1c1c1c1c', '11111111-1111-1111-1111-111111111111', '1876543298', NULL, 'Michael', 'Chen', 'Cardiology', '(217) 555-1005', '(217) 555-1006');

-- Seed Suppliers
INSERT INTO suppliers (id, pharmacy_id, name, contact, address, payment_terms, is_preferred) VALUES
('2a2a2a2a-2a2a-2a2a-2a2a-2a2a2a2a2a2a', '11111111-1111-1111-1111-111111111111', 'McKesson Corporation', '{"name": "John Smith", "phone": "(800) 555-2000", "email": "orders@mckesson.com"}', '{"street": "1 Post St", "city": "San Francisco", "state": "CA", "zip": "94104"}', 'Net 30', true),
('2b2b2b2b-2b2b-2b2b-2b2b-2b2b2b2b2b2b', '11111111-1111-1111-1111-111111111111', 'Cardinal Health', '{"name": "Jane Doe", "phone": "(800) 555-3000", "email": "orders@cardinalhealth.com"}', '{"street": "7000 Cardinal Place", "city": "Dublin", "state": "OH", "zip": "43017"}', 'Net 30', false);

-- Note: Patients and prescriptions should be created after auth users are created via the app
-- because they need valid profile references. Use the app to create test users first.

-- Sample inventory for main pharmacy (no auth dependency)
INSERT INTO inventory (pharmacy_id, medication_id, lot_number, expiration_date, quantity_on_hand, reorder_point, reorder_quantity, unit_cost, selling_price) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'LOT001', '2027-06-30', 150, 25, 100, 1.25, 5.99),
('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'LOT002', '2027-03-31', 200, 30, 150, 0.85, 4.49),
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'LOT003', '2026-12-31', 8, 20, 100, 0.50, 2.99),
('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'LOT004', '2026-04-30', 75, 20, 100, 0.95, 8.99),
('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'LOT005', '2027-01-31', 45, 10, 50, 2.50, 15.99),
('11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'LOT006', '2026-05-31', 0, 15, 60, 1.75, 9.99),
('11111111-1111-1111-1111-111111111111', '0a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a', 'LOT007', '2027-09-30', 300, 50, 200, 0.45, 3.49),
('11111111-1111-1111-1111-111111111111', '0b0b0b0b-0b0b-0b0b-0b0b-0b0b0b0b0b0b', 'LOT008', '2027-12-31', 180, 40, 150, 0.65, 4.99),
('11111111-1111-1111-1111-111111111111', '0c0c0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c', 'LOT009', '2026-03-31', 5, 15, 60, 1.10, 7.49),
('11111111-1111-1111-1111-111111111111', '0d0d0d0d-0d0d-0d0d-0d0d-0d0d0d0d0d0d', 'LOT010', '2027-08-31', 120, 25, 100, 1.30, 6.99);

-- Update statuses based on quantities
UPDATE inventory SET status = 'out_of_stock' WHERE quantity_on_hand = 0;
UPDATE inventory SET status = 'low_stock' WHERE quantity_on_hand > 0 AND quantity_on_hand <= reorder_point AND status = 'active';
UPDATE inventory SET status = 'expired' WHERE expiration_date < CURRENT_DATE;
