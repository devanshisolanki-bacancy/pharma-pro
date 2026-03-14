/**
 * PharmaTech Pro — Full Seed Script
 * Runs against the REMOTE Supabase project using the service-role key.
 *
 * Usage:  node scripts/seed-all.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://ijiixzdeihkqkklxiixc.supabase.co'
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqaWl4emRlaWhrcWtrbHhpaXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ2ODk1NCwiZXhwIjoyMDg5MDQ0OTU0fQ.yD1VofrzMaDtl_oTVFSED9eSRDOjfCWyHhQfLqNBd64'
const DEFAULT_PW    = 'Pharma@123456'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/* ─── helpers ──────────────────────────────────────────────────────────────── */
function log(msg)  { console.log(`  ✓ ${msg}`) }
function warn(msg) { console.warn(`  ⚠ ${msg}`) }
function step(msg) { console.log(`\n▶ ${msg}`) }

async function rpc(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: { message: 'rpc not available' } }))
  if (error && !error.message.includes('not available')) throw new Error(error.message)
}

/** Create an auth user; skip if already exists (by email). */
async function ensureUser(email, password, meta) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find(u => u.email === email)
  if (existing) { warn(`user already exists: ${email}`); return existing.id }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  })
  if (error) throw new Error(`createUser(${email}): ${error.message}`)
  log(`created auth user: ${email}`)
  return data.user.id
}

/** Upsert a profile row using the service-role client (bypasses RLS). */
async function upsertProfile(id, pharmacyId, role, firstName, lastName, licenseNumber = null, phone = null) {
  const { error } = await supabase.from('profiles').upsert({
    id, pharmacy_id: pharmacyId, role, first_name: firstName, last_name: lastName,
    license_number: licenseNumber, phone, is_active: true,
  }, { onConflict: 'id' })
  if (error) throw new Error(`upsertProfile(${id}): ${error.message}`)
}

/* ─── IDs (fixed for reproducibility) ─────────────────────────────────────── */
const PH1 = '11111111-1111-1111-1111-111111111111'   // Main Street
const PH2 = '22222222-2222-2222-2222-222222222222'   // Oak Avenue

const MED = {
  atorvastatin : 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  lisinopril   : 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  metformin    : 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  amoxicillin  : 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  hydrocodone  : 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  alprazolam   : 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  omeprazole   : '0a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a',
  levothyroxine: '0b0b0b0b-0b0b-0b0b-0b0b-0b0b0b0b0b0b',
  warfarin     : '0c0c0c0c-0c0c-0c0c-0c0c-0c0c0c0c0c0c',
  sertraline   : '0d0d0d0d-0d0d-0d0d-0d0d-0d0d0d0d0d0d',
}

const PROV = {
  johnson  : '1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a',
  williams : '1b1b1b1b-1b1b-1b1b-1b1b-1b1b1b1b1b1b',
  chen     : '1c1c1c1c-1c1c-1c1c-1c1c-1c1c1c1c1c1c',
}

/* ─── patient IDs ──────────────────────────────────────────────────────────── */
const PT = {
  emily   : 'aaaa0001-0000-0000-0000-000000000001',
  rohan   : 'aaaa0002-0000-0000-0000-000000000002',
  olivia  : 'aaaa0003-0000-0000-0000-000000000003',
  james   : 'aaaa0004-0000-0000-0000-000000000004',
  sarah   : 'aaaa0005-0000-0000-0000-000000000005',
  michael : 'aaaa0006-0000-0000-0000-000000000006',
  jessica : 'aaaa0007-0000-0000-0000-000000000007',
  william : 'aaaa0008-0000-0000-0000-000000000008',
  linda   : 'aaaa0009-0000-0000-0000-000000000009',
  david   : 'aaaa0010-0000-0000-0000-000000000010',
}

/* ─── prescription IDs ─────────────────────────────────────────────────────── */
const RX = {
  rx1 : 'bbbb0001-0000-0000-0000-000000000001',
  rx2 : 'bbbb0002-0000-0000-0000-000000000002',
  rx3 : 'bbbb0003-0000-0000-0000-000000000003',
  rx4 : 'bbbb0004-0000-0000-0000-000000000004',
  rx5 : 'bbbb0005-0000-0000-0000-000000000005',
  rx6 : 'bbbb0006-0000-0000-0000-000000000006',
  rx7 : 'bbbb0007-0000-0000-0000-000000000007',
  rx8 : 'bbbb0008-0000-0000-0000-000000000008',
  rx9 : 'bbbb0009-0000-0000-0000-000000000009',
  rx10: 'bbbb0010-0000-0000-0000-000000000010',
  rx11: 'bbbb0011-0000-0000-0000-000000000011',
  rx12: 'bbbb0012-0000-0000-0000-000000000012',
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════════════ */
async function main() {
  console.log('\n╔══════════════════════════════════════╗')
  console.log('║   PharmaTech Pro — Full Seed Script  ║')
  console.log('╚══════════════════════════════════════╝')

  /* ── 1. AUTH USERS ─────────────────────────────────────────────────────── */
  step('Creating auth users')
  const users = [
    { email: 'superadmin@pharmatechpro.com',  meta: { first_name: 'Alex',     last_name: 'Carter'   }, pharmacy: PH1, role: 'super_admin',    fn: 'Alex',     ln: 'Carter',    lic: null,          ph: '(217) 555-9000' },
    { email: 'pharmacyadmin@pharmatechpro.com',meta: { first_name: 'Margaret', last_name: 'Reynolds' }, pharmacy: PH1, role: 'pharmacy_admin', fn: 'Margaret', ln: 'Reynolds',  lic: 'IL-RPH-11001', ph: '(217) 555-9001' },
    { email: 'pharmacist1@pharmatechpro.com',  meta: { first_name: 'David',    last_name: 'Kim'      }, pharmacy: PH1, role: 'pharmacist',     fn: 'David',    ln: 'Kim',       lic: 'IL-RPH-11002', ph: '(217) 555-9002' },
    { email: 'pharmacist2@pharmatechpro.com',  meta: { first_name: 'Priya',    last_name: 'Sharma'   }, pharmacy: PH1, role: 'pharmacist',     fn: 'Priya',    ln: 'Sharma',    lic: 'IL-RPH-11003', ph: '(217) 555-9003' },
    { email: 'tech1@pharmatechpro.com',        meta: { first_name: 'Carlos',   last_name: 'Mendez'   }, pharmacy: PH1, role: 'technician',     fn: 'Carlos',   ln: 'Mendez',    lic: 'IL-TECH-2001', ph: '(217) 555-9004' },
    { email: 'tech2@pharmatechpro.com',        meta: { first_name: 'Hannah',   last_name: 'Brooks'   }, pharmacy: PH1, role: 'technician',     fn: 'Hannah',   ln: 'Brooks',    lic: 'IL-TECH-2002', ph: '(217) 555-9005' },
    { email: 'cashier@pharmatechpro.com',      meta: { first_name: 'Tyler',    last_name: 'Grant'    }, pharmacy: PH1, role: 'cashier',        fn: 'Tyler',    ln: 'Grant',     lic: null,           ph: '(217) 555-9006' },
    { email: 'viewer@pharmatechpro.com',       meta: { first_name: 'Nina',     last_name: 'Foster'   }, pharmacy: PH1, role: 'viewer',         fn: 'Nina',     ln: 'Foster',    lic: null,           ph: '(217) 555-9007' },
    { email: 'oakadmin@pharmatechpro.com',     meta: { first_name: 'Brian',    last_name: 'Walsh'    }, pharmacy: PH2, role: 'pharmacy_admin', fn: 'Brian',    ln: 'Walsh',     lic: 'IL-RPH-22001', ph: '(217) 555-9008' },
    { email: 'oakpharmacist@pharmatechpro.com',meta: { first_name: 'Zoe',      last_name: 'Patel'    }, pharmacy: PH2, role: 'pharmacist',     fn: 'Zoe',      ln: 'Patel',     lic: 'IL-RPH-22002', ph: '(217) 555-9009' },
  ]

  const userIds = {}
  for (const u of users) {
    const id = await ensureUser(u.email, DEFAULT_PW, u.meta)
    userIds[u.email] = id
    await upsertProfile(id, u.pharmacy, u.role, u.fn, u.ln, u.lic, u.ph)
    log(`profile: ${u.role} — ${u.fn} ${u.ln}`)
  }

  // Handy references for FK usage below
  const U = {
    superAdmin    : userIds['superadmin@pharmatechpro.com'],
    pharmacyAdmin : userIds['pharmacyadmin@pharmatechpro.com'],
    pharmacist1   : userIds['pharmacist1@pharmatechpro.com'],
    pharmacist2   : userIds['pharmacist2@pharmatechpro.com'],
    tech1         : userIds['tech1@pharmatechpro.com'],
    tech2         : userIds['tech2@pharmatechpro.com'],
    cashier       : userIds['cashier@pharmatechpro.com'],
    oakAdmin      : userIds['oakadmin@pharmatechpro.com'],
    oakPharmacist : userIds['oakpharmacist@pharmatechpro.com'],
  }

  /* ── 2. MULTI-PHARMACY ACCESS ──────────────────────────────────────────── */
  step('Multi-pharmacy access (super_admin sees both)')
  await supabase.from('user_pharmacy_access').upsert([
    { user_id: U.superAdmin, pharmacy_id: PH1, is_active: true },
    { user_id: U.superAdmin, pharmacy_id: PH2, is_active: true },
  ], { onConflict: 'user_id,pharmacy_id', ignoreDuplicates: true })
  log('user_pharmacy_access seeded')

  /* ── 3. PATIENTS ───────────────────────────────────────────────────────── */
  step('Seeding patients')
  const patients = [
    {
      id: PT.emily, pharmacy_id: PH1, first_name: 'Emily', last_name: 'Smith',
      date_of_birth: '1987-06-12', gender: 'female',
      phone: '(217) 555-1201', email: 'emily.smith@example.com',
      address: { street: '101 Elm St', city: 'Springfield', state: 'IL', zip: '62701', country: 'US' },
      emergency_contact: { name: 'Tom Smith', relationship: 'Spouse', phone: '(217) 555-1210' },
      allergies: ['Penicillin', 'Sulfa drugs'],
      medical_conditions: ['Type 2 Diabetes', 'Hypertension'],
      preferred_language: 'en', sms_opt_in: true, email_opt_in: true,
      preferred_notification_channel: 'sms',
      notification_preferences: { prescription_ready: true, refill_reminder: true, adherence: true, health_alert: true },
      contact_time_window: { start: '09:00', end: '18:00' },
      hipaa_signed_at: '2025-01-15T10:00:00Z', is_active: true,
    },
    {
      id: PT.rohan, pharmacy_id: PH1, first_name: 'Rohan', last_name: 'Patel',
      date_of_birth: '1979-03-22', gender: 'male',
      phone: '(217) 555-1202', email: 'rohan.patel@example.com',
      address: { street: '202 Oak Ave', city: 'Springfield', state: 'IL', zip: '62702', country: 'US' },
      emergency_contact: { name: 'Anita Patel', relationship: 'Spouse', phone: '(217) 555-1220' },
      allergies: [],
      medical_conditions: ['Hyperlipidemia', 'GERD'],
      preferred_language: 'en', sms_opt_in: true, email_opt_in: false,
      preferred_notification_channel: 'sms',
      notification_preferences: { prescription_ready: true, refill_reminder: true, adherence: false, health_alert: true },
      contact_time_window: { start: '08:00', end: '20:00' },
      hipaa_signed_at: '2025-02-01T10:00:00Z', is_active: true,
    },
    {
      id: PT.olivia, pharmacy_id: PH1, first_name: 'Olivia', last_name: 'Brown',
      date_of_birth: '1994-11-03', gender: 'female',
      phone: '(217) 555-1203', email: 'olivia.brown@example.com',
      address: { street: '303 Pine Rd', city: 'Springfield', state: 'IL', zip: '62703', country: 'US' },
      emergency_contact: { name: 'Mark Brown', relationship: 'Parent', phone: '(217) 555-1230' },
      allergies: ['Sulfa drugs'],
      medical_conditions: ['Anxiety Disorder', 'Hypothyroidism'],
      preferred_language: 'en', sms_opt_in: false, email_opt_in: true,
      preferred_notification_channel: 'email',
      notification_preferences: { prescription_ready: true, refill_reminder: true, adherence: true, health_alert: true },
      contact_time_window: { start: '10:00', end: '17:00' },
      hipaa_signed_at: null, is_active: true,
    },
    {
      id: PT.james, pharmacy_id: PH1, first_name: 'James', last_name: 'Wilson',
      date_of_birth: '1955-08-14', gender: 'male',
      phone: '(217) 555-1204', email: 'james.wilson@example.com',
      address: { street: '404 Maple Dr', city: 'Springfield', state: 'IL', zip: '62704', country: 'US' },
      emergency_contact: { name: 'Carol Wilson', relationship: 'Spouse', phone: '(217) 555-1240' },
      allergies: ['Aspirin', 'NSAIDs'],
      medical_conditions: ['Atrial Fibrillation', 'Hypertension', 'Heart Failure'],
      preferred_language: 'en', sms_opt_in: true, email_opt_in: true,
      preferred_notification_channel: 'sms',
      notification_preferences: { prescription_ready: true, refill_reminder: true, adherence: true, health_alert: true },
      contact_time_window: { start: '09:00', end: '16:00' },
      hipaa_signed_at: '2025-01-10T10:00:00Z', is_active: true,
    },
    {
      id: PT.sarah, pharmacy_id: PH1, first_name: 'Sarah', last_name: 'Davis',
      date_of_birth: '1990-04-19', gender: 'female',
      phone: '(217) 555-1205', email: 'sarah.davis@example.com',
      address: { street: '505 Birch Ln', city: 'Springfield', state: 'IL', zip: '62705', country: 'US' },
      emergency_contact: { name: 'Peter Davis', relationship: 'Parent', phone: '(217) 555-1250' },
      allergies: [],
      medical_conditions: ['Depression', 'Insomnia'],
      preferred_language: 'es', sms_opt_in: true, email_opt_in: true,
      preferred_notification_channel: 'email',
      notification_preferences: { prescription_ready: true, refill_reminder: false, adherence: true, health_alert: true },
      contact_time_window: { start: '11:00', end: '19:00' },
      hipaa_signed_at: '2025-03-01T10:00:00Z', is_active: true,
    },
    {
      id: PT.michael, pharmacy_id: PH1, first_name: 'Michael', last_name: 'Johnson',
      date_of_birth: '1972-12-30', gender: 'male',
      phone: '(217) 555-1206', email: 'michael.johnson@example.com',
      address: { street: '606 Cedar St', city: 'Springfield', state: 'IL', zip: '62706', country: 'US' },
      emergency_contact: { name: 'Lisa Johnson', relationship: 'Spouse', phone: '(217) 555-1260' },
      allergies: ['Codeine'],
      medical_conditions: ['Chronic Back Pain', 'COPD'],
      preferred_language: 'en', sms_opt_in: false, email_opt_in: false,
      preferred_notification_channel: 'sms',
      notification_preferences: { prescription_ready: true, refill_reminder: true, adherence: false, health_alert: false },
      contact_time_window: { start: '08:00', end: '17:00' },
      hipaa_signed_at: '2025-02-20T10:00:00Z', is_active: true,
    },
    {
      id: PT.jessica, pharmacy_id: PH1, first_name: 'Jessica', last_name: 'Martinez',
      date_of_birth: '2001-07-25', gender: 'female',
      phone: '(217) 555-1207', email: 'jessica.martinez@example.com',
      address: { street: '707 Willow Way', city: 'Springfield', state: 'IL', zip: '62707', country: 'US' },
      emergency_contact: { name: 'Rosa Martinez', relationship: 'Parent', phone: '(217) 555-1270' },
      allergies: ['Latex'],
      medical_conditions: ['Asthma'],
      preferred_language: 'es', sms_opt_in: true, email_opt_in: false,
      preferred_notification_channel: 'sms',
      notification_preferences: { prescription_ready: true, refill_reminder: true, adherence: true, health_alert: true },
      contact_time_window: { start: '12:00', end: '21:00' },
      hipaa_signed_at: '2025-03-10T10:00:00Z', is_active: true,
    },
    {
      id: PT.william, pharmacy_id: PH1, first_name: 'William', last_name: 'Taylor',
      date_of_birth: '1948-02-09', gender: 'male',
      phone: '(217) 555-1208', email: 'william.taylor@example.com',
      address: { street: '808 Spruce Ave', city: 'Springfield', state: 'IL', zip: '62708', country: 'US' },
      emergency_contact: { name: 'Ruth Taylor', relationship: 'Spouse', phone: '(217) 555-1280' },
      allergies: ['Penicillin', 'Shellfish'],
      medical_conditions: ['Type 2 Diabetes', 'Chronic Kidney Disease', 'Hypertension'],
      preferred_language: 'en', sms_opt_in: true, email_opt_in: true,
      preferred_notification_channel: 'sms',
      notification_preferences: { prescription_ready: true, refill_reminder: true, adherence: true, health_alert: true },
      contact_time_window: { start: '09:00', end: '15:00' },
      hipaa_signed_at: '2025-01-20T10:00:00Z', is_active: true,
    },
    {
      id: PT.linda, pharmacy_id: PH1, first_name: 'Linda', last_name: 'Anderson',
      date_of_birth: '1963-09-17', gender: 'female',
      phone: '(217) 555-1209', email: 'linda.anderson@example.com',
      address: { street: '909 Aspen Ct', city: 'Springfield', state: 'IL', zip: '62709', country: 'US' },
      emergency_contact: { name: 'George Anderson', relationship: 'Spouse', phone: '(217) 555-1290' },
      allergies: [],
      medical_conditions: ['Rheumatoid Arthritis', 'Osteoporosis'],
      preferred_language: 'en', sms_opt_in: false, email_opt_in: true,
      preferred_notification_channel: 'email',
      notification_preferences: { prescription_ready: true, refill_reminder: false, adherence: false, health_alert: false },
      contact_time_window: { start: '10:00', end: '18:00' },
      hipaa_signed_at: '2025-02-10T10:00:00Z', is_active: false,
    },
    {
      id: PT.david, pharmacy_id: PH2, first_name: 'David', last_name: 'Lee',
      date_of_birth: '1985-05-28', gender: 'male',
      phone: '(217) 555-1300', email: 'david.lee@example.com',
      address: { street: '10 Oakwood Blvd', city: 'Springfield', state: 'IL', zip: '62710', country: 'US' },
      emergency_contact: { name: 'Amy Lee', relationship: 'Spouse', phone: '(217) 555-1310' },
      allergies: [],
      medical_conditions: ['Hypercholesterolemia'],
      preferred_language: 'en', sms_opt_in: true, email_opt_in: true,
      preferred_notification_channel: 'sms',
      notification_preferences: { prescription_ready: true, refill_reminder: true, adherence: true, health_alert: true },
      contact_time_window: { start: '08:00', end: '18:00' },
      hipaa_signed_at: '2025-03-05T10:00:00Z', is_active: true,
    },
  ]

  const { error: ptErr } = await supabase.from('patients').upsert(patients, { onConflict: 'id' })
  if (ptErr) throw new Error(`patients: ${ptErr.message}`)
  log(`${patients.length} patients seeded`)

  /* ── 4. INSURANCE PLANS ────────────────────────────────────────────────── */
  step('Seeding insurance plans')
  const insurancePlans = [
    { patient_id: PT.emily,   payer_name: 'Blue Cross Blue Shield', bin: '610014', pcn: 'BCBSIL',  group_number: 'GRP001', member_id: 'BCB123456001', relationship: 'self',   is_primary: true,  effective_date: '2025-01-01', termination_date: null },
    { patient_id: PT.emily,   payer_name: 'Medicare Part D',        bin: '004336', pcn: 'MEDIL',   group_number: null,     member_id: 'MDC987654001', relationship: 'self',   is_primary: false, effective_date: '2025-01-01', termination_date: null },
    { patient_id: PT.rohan,   payer_name: 'Aetna',                  bin: '011111', pcn: 'AETNA1',  group_number: 'GRP002', member_id: 'AET234567001', relationship: 'self',   is_primary: true,  effective_date: '2025-01-01', termination_date: null },
    { patient_id: PT.olivia,  payer_name: 'Cigna',                  bin: '018844', pcn: 'CIGNA1',  group_number: 'GRP003', member_id: 'CGN345678001', relationship: 'self',   is_primary: true,  effective_date: '2024-07-01', termination_date: null },
    { patient_id: PT.james,   payer_name: 'UnitedHealth',           bin: '600428', pcn: 'UHCIL',   group_number: 'GRP004', member_id: 'UHC456789001', relationship: 'self',   is_primary: true,  effective_date: '2025-01-01', termination_date: null },
    { patient_id: PT.sarah,   payer_name: 'Humana',                 bin: '015782', pcn: 'HUM01',   group_number: 'GRP005', member_id: 'HUM567890001', relationship: 'self',   is_primary: true,  effective_date: '2025-01-01', termination_date: null },
    { patient_id: PT.michael, payer_name: 'Medicaid',               bin: '610011', pcn: 'ILMD01',  group_number: null,     member_id: 'MDC678901001', relationship: 'self',   is_primary: true,  effective_date: '2024-01-01', termination_date: null },
    { patient_id: PT.jessica, payer_name: 'Cigna',                  bin: '018844', pcn: 'CIGNA2',  group_number: 'GRP007', member_id: 'CGN789012001', relationship: 'child',  is_primary: true,  effective_date: '2025-01-01', termination_date: null },
    { patient_id: PT.william, payer_name: 'Medicare Part D',        bin: '004336', pcn: 'MEDIL',   group_number: null,     member_id: 'MDC890123001', relationship: 'self',   is_primary: true,  effective_date: '2022-01-01', termination_date: null },
    { patient_id: PT.william, payer_name: 'AARP Supplement',        bin: '017100', pcn: 'AARP01',  group_number: 'SUP001', member_id: 'ARP891234001', relationship: 'self',   is_primary: false, effective_date: '2022-01-01', termination_date: null },
    { patient_id: PT.david,   payer_name: 'Blue Cross Blue Shield', bin: '610014', pcn: 'BCBSIL',  group_number: 'GRP010', member_id: 'BCB012345010', relationship: 'self',   is_primary: true,  effective_date: '2025-01-01', termination_date: null },
  ]
  const { error: insErr } = await supabase.from('insurance_plans').insert(insurancePlans)
  if (insErr && !insErr.message.includes('duplicate')) throw new Error(`insurance_plans: ${insErr.message}`)
  log(`${insurancePlans.length} insurance plans seeded`)

  /* ── 5. PRESCRIPTIONS ──────────────────────────────────────────────────── */
  step('Seeding prescriptions')
  const prescriptions = [
    {
      id: RX.rx1, pharmacy_id: PH1, patient_id: PT.emily,   provider_id: PROV.johnson,
      medication_id: MED.metformin,    rx_number: 'RX10000001', status: 'dispensed',
      written_date: '2026-02-01', expiration_date: '2027-02-01', days_supply: 30, quantity: 60,
      refills_allowed: 5, refills_used: 2, sig: 'Take 1 tablet by mouth twice daily with meals',
      daw_code: 0, is_controlled: false, is_electronic: true,
      dispenser_id: U.pharmacist1, verified_by: U.pharmacist1,
      dispensed_at: '2026-02-02T10:30:00Z', notes: 'Patient counseled on diet and exercise.',
    },
    {
      id: RX.rx2, pharmacy_id: PH1, patient_id: PT.emily,   provider_id: PROV.johnson,
      medication_id: MED.lisinopril,   rx_number: 'RX10000002', status: 'ready',
      written_date: '2026-03-01', expiration_date: '2027-03-01', days_supply: 30, quantity: 30,
      refills_allowed: 11, refills_used: 0, sig: 'Take 1 tablet by mouth once daily',
      daw_code: 0, is_controlled: false, is_electronic: false,
      dispenser_id: U.pharmacist1, verified_by: U.pharmacist1,
      dispensed_at: null, notes: null,
    },
    {
      id: RX.rx3, pharmacy_id: PH1, patient_id: PT.rohan,   provider_id: PROV.williams,
      medication_id: MED.atorvastatin, rx_number: 'RX10000003', status: 'filling',
      written_date: '2026-03-10', expiration_date: '2027-03-10', days_supply: 30, quantity: 30,
      refills_allowed: 5, refills_used: 1, sig: 'Take 1 tablet by mouth at bedtime',
      daw_code: 0, is_controlled: false, is_electronic: true,
      dispenser_id: U.tech1, verified_by: null,
      dispensed_at: null, notes: null,
    },
    {
      id: RX.rx4, pharmacy_id: PH1, patient_id: PT.rohan,   provider_id: PROV.williams,
      medication_id: MED.omeprazole,   rx_number: 'RX10000004', status: 'verified',
      written_date: '2026-03-12', expiration_date: '2027-03-12', days_supply: 30, quantity: 30,
      refills_allowed: 3, refills_used: 0, sig: 'Take 1 capsule by mouth once daily before breakfast',
      daw_code: 0, is_controlled: false, is_electronic: true,
      dispenser_id: null, verified_by: U.pharmacist1,
      dispensed_at: null, notes: null,
    },
    {
      id: RX.rx5, pharmacy_id: PH1, patient_id: PT.olivia,  provider_id: PROV.chen,
      medication_id: MED.sertraline,   rx_number: 'RX10000005', status: 'received',
      written_date: '2026-03-13', expiration_date: '2027-03-13', days_supply: 30, quantity: 30,
      refills_allowed: 5, refills_used: 0, sig: 'Take 1 tablet by mouth once daily in the morning',
      daw_code: 0, is_controlled: false, is_electronic: false,
      dispenser_id: null, verified_by: null,
      dispensed_at: null, notes: 'New prescription, patient education needed.',
    },
    {
      id: RX.rx6, pharmacy_id: PH1, patient_id: PT.olivia,  provider_id: PROV.chen,
      medication_id: MED.levothyroxine,rx_number: 'RX10000006', status: 'dispensed',
      written_date: '2026-01-15', expiration_date: '2027-01-15', days_supply: 30, quantity: 30,
      refills_allowed: 11, refills_used: 3, sig: 'Take 1 tablet by mouth once daily on empty stomach',
      daw_code: 1, is_controlled: false, is_electronic: true,
      dispenser_id: U.pharmacist2, verified_by: U.pharmacist2,
      dispensed_at: '2026-01-16T14:00:00Z', notes: 'DAW - Brand medically necessary.',
    },
    {
      id: RX.rx7, pharmacy_id: PH1, patient_id: PT.james,   provider_id: PROV.chen,
      medication_id: MED.warfarin,     rx_number: 'RX10000007', status: 'on_hold',
      written_date: '2026-03-08', expiration_date: '2027-03-08', days_supply: 30, quantity: 30,
      refills_allowed: 11, refills_used: 0, sig: 'Take 1 tablet by mouth once daily as directed',
      daw_code: 0, is_controlled: false, is_electronic: false,
      dispenser_id: null, verified_by: null,
      dispensed_at: null, notes: 'On hold pending INR lab result. Awaiting call from Dr. Chen.',
    },
    {
      id: RX.rx8, pharmacy_id: PH1, patient_id: PT.sarah,   provider_id: PROV.johnson,
      medication_id: MED.sertraline,   rx_number: 'RX10000008', status: 'dispensed',
      written_date: '2026-02-20', expiration_date: '2027-02-20', days_supply: 30, quantity: 30,
      refills_allowed: 5, refills_used: 1, sig: 'Take 1 tablet by mouth once daily',
      daw_code: 0, is_controlled: false, is_electronic: true,
      dispenser_id: U.pharmacist1, verified_by: U.pharmacist1,
      dispensed_at: '2026-02-21T09:45:00Z', notes: null,
    },
    {
      id: RX.rx9, pharmacy_id: PH1, patient_id: PT.michael, provider_id: PROV.williams,
      medication_id: MED.hydrocodone,  rx_number: 'RX10000009', status: 'quality_check',
      written_date: '2026-03-13', expiration_date: '2026-09-13', days_supply: 7, quantity: 20,
      refills_allowed: 0, refills_used: 0, sig: 'Take 1-2 tablets by mouth every 4-6 hours as needed for pain',
      daw_code: 0, is_controlled: true, is_electronic: false,
      dispenser_id: U.tech1, verified_by: U.pharmacist1,
      dispensed_at: null, notes: 'DEA 222 form verified. ID checked.',
    },
    {
      id: RX.rx10, pharmacy_id: PH1, patient_id: PT.jessica, provider_id: PROV.johnson,
      medication_id: MED.amoxicillin,  rx_number: 'RX10000010', status: 'dispensed',
      written_date: '2026-03-11', expiration_date: '2026-06-11', days_supply: 10, quantity: 30,
      refills_allowed: 0, refills_used: 0, sig: 'Take 1 capsule by mouth 3 times daily for 10 days',
      daw_code: 0, is_controlled: false, is_electronic: true,
      dispenser_id: U.pharmacist2, verified_by: U.pharmacist2,
      dispensed_at: '2026-03-11T16:00:00Z', notes: null,
    },
    {
      id: RX.rx11, pharmacy_id: PH1, patient_id: PT.william, provider_id: PROV.chen,
      medication_id: MED.metformin,    rx_number: 'RX10000011', status: 'dispensed',
      written_date: '2026-03-01', expiration_date: '2027-03-01', days_supply: 30, quantity: 60,
      refills_allowed: 5, refills_used: 0, sig: 'Take 1 tablet by mouth twice daily with meals',
      daw_code: 0, is_controlled: false, is_electronic: false,
      dispenser_id: U.pharmacist1, verified_by: U.pharmacist1,
      dispensed_at: '2026-03-02T11:00:00Z', notes: null,
    },
    {
      id: RX.rx12, pharmacy_id: PH2, patient_id: PT.david,   provider_id: null,
      medication_id: MED.atorvastatin, rx_number: 'RX20000001', status: 'received',
      written_date: '2026-03-14', expiration_date: '2027-03-14', days_supply: 30, quantity: 30,
      refills_allowed: 5, refills_used: 0, sig: 'Take 1 tablet by mouth at bedtime',
      daw_code: 0, is_controlled: false, is_electronic: true,
      dispenser_id: null, verified_by: null,
      dispensed_at: null, notes: null,
    },
  ]

  const { error: rxErr } = await supabase.from('prescriptions').upsert(prescriptions, { onConflict: 'id' })
  if (rxErr) throw new Error(`prescriptions: ${rxErr.message}`)
  log(`${prescriptions.length} prescriptions seeded`)

  /* ── 6. REFILLS ────────────────────────────────────────────────────────── */
  step('Seeding refills')
  const refills = [
    { prescription_id: RX.rx1,  refill_number: 1, status: 'dispensed', quantity: 60, days_supply: 30, dispenser_id: U.pharmacist1, dispensed_at: '2026-01-02T10:00:00Z' },
    { prescription_id: RX.rx1,  refill_number: 2, status: 'dispensed', quantity: 60, days_supply: 30, dispenser_id: U.pharmacist1, dispensed_at: '2026-02-02T10:30:00Z' },
    { prescription_id: RX.rx3,  refill_number: 1, status: 'dispensed', quantity: 30, days_supply: 30, dispenser_id: U.pharmacist2, dispensed_at: '2026-02-15T09:00:00Z' },
    { prescription_id: RX.rx6,  refill_number: 1, status: 'dispensed', quantity: 30, days_supply: 30, dispenser_id: U.pharmacist2, dispensed_at: '2025-11-16T14:00:00Z' },
    { prescription_id: RX.rx6,  refill_number: 2, status: 'dispensed', quantity: 30, days_supply: 30, dispenser_id: U.pharmacist1, dispensed_at: '2025-12-17T11:00:00Z' },
    { prescription_id: RX.rx6,  refill_number: 3, status: 'dispensed', quantity: 30, days_supply: 30, dispenser_id: U.pharmacist2, dispensed_at: '2026-01-16T14:00:00Z' },
    { prescription_id: RX.rx8,  refill_number: 1, status: 'dispensed', quantity: 30, days_supply: 30, dispenser_id: U.pharmacist1, dispensed_at: '2026-02-21T09:45:00Z' },
  ]

  const { error: rfErr } = await supabase.from('refills').insert(refills)
  if (rfErr && !rfErr.message.includes('duplicate')) throw new Error(`refills: ${rfErr.message}`)
  log(`${refills.length} refills seeded`)

  /* ── 7. CLAIMS ─────────────────────────────────────────────────────────── */
  step('Seeding insurance claims')
  // Fetch an insurance plan ID for prescriptions
  const { data: plans } = await supabase.from('insurance_plans')
    .select('id, patient_id').limit(20)
  const planByPatient = {}
  for (const p of (plans ?? [])) planByPatient[p.patient_id] = p.id

  const claims = [
    { pharmacy_id: PH1, prescription_id: RX.rx1,  insurance_plan_id: planByPatient[PT.emily]   ?? null, status: 'paid',      billed_amount: 92.14,  allowed_amount: 82.00, paid_amount: 72.50, copay_amount: 9.50,  submitted_at: '2026-02-02T11:00:00Z', adjudicated_at: '2026-02-03T09:00:00Z' },
    { pharmacy_id: PH1, prescription_id: RX.rx2,  insurance_plan_id: planByPatient[PT.emily]   ?? null, status: 'pending',   billed_amount: 45.60,  allowed_amount: null,  paid_amount: null,  copay_amount: null,  submitted_at: null,                   adjudicated_at: null },
    { pharmacy_id: PH1, prescription_id: RX.rx6,  insurance_plan_id: planByPatient[PT.olivia]  ?? null, status: 'paid',      billed_amount: 68.00,  allowed_amount: 60.00, paid_amount: 52.00, copay_amount: 8.00,  submitted_at: '2026-01-16T15:00:00Z', adjudicated_at: '2026-01-17T10:00:00Z' },
    { pharmacy_id: PH1, prescription_id: RX.rx8,  insurance_plan_id: planByPatient[PT.sarah]   ?? null, status: 'paid',      billed_amount: 55.00,  allowed_amount: 50.00, paid_amount: 42.00, copay_amount: 8.00,  submitted_at: '2026-02-21T10:00:00Z', adjudicated_at: '2026-02-22T09:00:00Z' },
    { pharmacy_id: PH1, prescription_id: RX.rx10, insurance_plan_id: planByPatient[PT.jessica] ?? null, status: 'paid',      billed_amount: 120.50, allowed_amount: 95.00, paid_amount: 80.00, copay_amount: 15.00, submitted_at: '2026-03-11T17:00:00Z', adjudicated_at: '2026-03-12T09:00:00Z' },
    { pharmacy_id: PH1, prescription_id: RX.rx11, insurance_plan_id: planByPatient[PT.william] ?? null, status: 'submitted', billed_amount: 32.00,  allowed_amount: null,  paid_amount: null,  copay_amount: null,  submitted_at: '2026-03-02T12:00:00Z', adjudicated_at: null },
    { pharmacy_id: PH1, prescription_id: RX.rx7,  insurance_plan_id: planByPatient[PT.james]   ?? null, status: 'rejected',  billed_amount: 78.50,  allowed_amount: null,  paid_amount: null,  copay_amount: null,  submitted_at: '2026-03-09T10:00:00Z', adjudicated_at: '2026-03-10T09:00:00Z',
      rejection_code: 'PA_REQUIRED', rejection_reason: 'Prior authorization required for this medication' },
  ]

  const { error: clErr } = await supabase.from('claims').insert(claims)
  if (clErr && !clErr.message.includes('duplicate')) throw new Error(`claims: ${clErr.message}`)
  log(`${claims.length} claims seeded`)

  /* ── 8. TRANSACTIONS (POS) ──────────────────────────────────────────────── */
  step('Seeding transactions')
  const transactions = [
    { pharmacy_id: PH1, patient_id: PT.emily,   prescription_id: RX.rx1,  cashier_id: U.cashier, type: 'sale',   subtotal: 82.50, tax: 0, insurance_paid: 72.50, copay: 9.50,  total: 9.50,  payment_method: 'card',      stripe_payment_id: 'pi_test_emily1' },
    { pharmacy_id: PH1, patient_id: PT.olivia,  prescription_id: RX.rx6,  cashier_id: U.cashier, type: 'sale',   subtotal: 60.00, tax: 0, insurance_paid: 52.00, copay: 8.00,  total: 8.00,  payment_method: 'card',      stripe_payment_id: 'pi_test_olivia1' },
    { pharmacy_id: PH1, patient_id: PT.sarah,   prescription_id: RX.rx8,  cashier_id: U.cashier, type: 'sale',   subtotal: 50.00, tax: 0, insurance_paid: 42.00, copay: 8.00,  total: 8.00,  payment_method: 'cash',      stripe_payment_id: null },
    { pharmacy_id: PH1, patient_id: PT.jessica, prescription_id: RX.rx10, cashier_id: U.cashier, type: 'sale',   subtotal: 95.00, tax: 0, insurance_paid: 80.00, copay: 15.00, total: 15.00, payment_method: 'card',      stripe_payment_id: 'pi_test_jessica1' },
    { pharmacy_id: PH1, patient_id: PT.william, prescription_id: RX.rx11, cashier_id: U.cashier, type: 'sale',   subtotal: 32.00, tax: 0, insurance_paid: 0,     copay: 0,     total: 32.00, payment_method: 'cash',      stripe_payment_id: null },
    { pharmacy_id: PH1, patient_id: PT.rohan,   prescription_id: null,    cashier_id: U.cashier, type: 'sale',   subtotal: 12.99, tax: 1.17, insurance_paid: 0,  copay: 0,     total: 14.16, payment_method: 'card',      stripe_payment_id: 'pi_test_otc1', notes: 'OTC: Ibuprofen 200mg 24ct' },
    { pharmacy_id: PH1, patient_id: PT.emily,   prescription_id: RX.rx1,  cashier_id: U.cashier, type: 'refund', subtotal: -9.50, tax: 0, insurance_paid: 0,     copay: 0,     total: -9.50, payment_method: 'card',      stripe_payment_id: 'pi_test_refund1', notes: 'Customer returned unused medication' },
  ]

  const { error: txErr } = await supabase.from('transactions').insert(transactions)
  if (txErr && !txErr.message.includes('duplicate')) throw new Error(`transactions: ${txErr.message}`)
  log(`${transactions.length} transactions seeded`)

  /* ── 9. WORKFLOW TASKS ──────────────────────────────────────────────────── */
  step('Seeding workflow tasks')
  const wfTasks = [
    { pharmacy_id: PH1, prescription_id: RX.rx2,  assigned_to: U.pharmacist1, task_type: 'verify',  priority: 2, status: 'pending',   notes: 'New Rx from Dr. Johnson — patient waiting', due_at: new Date(Date.now() + 1*3600000).toISOString() },
    { pharmacy_id: PH1, prescription_id: RX.rx3,  assigned_to: U.tech1,       task_type: 'fill',    priority: 3, status: 'in_progress',notes: 'Atorvastatin — count and label', due_at: new Date(Date.now() + 2*3600000).toISOString() },
    { pharmacy_id: PH1, prescription_id: RX.rx4,  assigned_to: U.tech2,       task_type: 'fill',    priority: 3, status: 'pending',   notes: 'Omeprazole — waiting on tech', due_at: new Date(Date.now() + 3*3600000).toISOString() },
    { pharmacy_id: PH1, prescription_id: RX.rx5,  assigned_to: U.pharmacist2, task_type: 'verify',  priority: 4, status: 'pending',   notes: 'New patient — counsel on antidepressant', due_at: new Date(Date.now() + 4*3600000).toISOString() },
    { pharmacy_id: PH1, prescription_id: RX.rx7,  assigned_to: U.pharmacist1, task_type: 'verify',  priority: 1, status: 'pending',   notes: 'Warfarin on hold — call Dr. Chen re: INR', due_at: new Date(Date.now() + 0.5*3600000).toISOString() },
    { pharmacy_id: PH1, prescription_id: RX.rx9,  assigned_to: U.pharmacist2, task_type: 'check',   priority: 1, status: 'in_progress',notes: 'Controlled substance QC — double-count required', due_at: new Date(Date.now() + 0.5*3600000).toISOString() },
    { pharmacy_id: PH1, prescription_id: RX.rx2,  assigned_to: U.cashier,     task_type: 'dispense',priority: 2, status: 'pending',   notes: 'Lisinopril ready for pickup — notify patient', due_at: new Date(Date.now() + 1.5*3600000).toISOString() },
    { pharmacy_id: PH2, prescription_id: RX.rx12, assigned_to: U.oakPharmacist,task_type: 'verify', priority: 3, status: 'pending',   notes: 'New Oak Ave Rx — Atorvastatin', due_at: new Date(Date.now() + 2*3600000).toISOString() },
  ]

  const { error: wfErr } = await supabase.from('workflow_tasks').insert(wfTasks)
  if (wfErr && !wfErr.message.includes('duplicate')) throw new Error(`workflow_tasks: ${wfErr.message}`)
  log(`${wfTasks.length} workflow tasks seeded`)

  /* ── 10. ALERTS ────────────────────────────────────────────────────────── */
  step('Seeding alerts')
  const alerts = [
    { pharmacy_id: PH1, type: 'low_stock',      title: 'Low Stock: Metformin 500mg',       message: 'Current qty: 8 (reorder point: 20). Please reorder.',          reference_id: null, reference_type: 'inventory', is_read: false, is_dismissed: false },
    { pharmacy_id: PH1, type: 'low_stock',      title: 'Low Stock: Warfarin 5mg',          message: 'Current qty: 5 (reorder point: 15). Critically low.',           reference_id: null, reference_type: 'inventory', is_read: false, is_dismissed: false },
    { pharmacy_id: PH1, type: 'expiration',     title: 'Expiring Soon: Alprazolam 0.5mg',  message: 'Lot LOT006 expires 2026-05-31. Qty on hand: 0.',                reference_id: null, reference_type: 'inventory', is_read: false, is_dismissed: false },
    { pharmacy_id: PH1, type: 'expiration',     title: 'Expiring Soon: Warfarin 5mg',      message: 'Lot LOT009 expires 2026-03-31. Qty on hand: 5.',                reference_id: null, reference_type: 'inventory', is_read: true,  is_dismissed: false },
    { pharmacy_id: PH1, type: 'drug_interaction',title: 'Interaction Alert: Hydrocodone + Alprazolam', message: 'Major interaction detected for patient Michael Johnson. Pharmacist override required.', reference_id: PT.michael, reference_type: 'patient', is_read: false, is_dismissed: false },
    { pharmacy_id: PH1, type: 'claim_rejected', title: 'Claim Rejected: RX10000007 (Warfarin)', message: 'Rejection: PA Required. Action needed by pharmacy team.',    reference_id: null, reference_type: 'claims',    is_read: false, is_dismissed: false },
    { pharmacy_id: PH1, type: 'refill_due',     title: 'Refill Due: Emily Smith — Metformin',  message: 'Patient has 3 refills remaining. Last fill 2026-02-02.',    reference_id: PT.emily,  reference_type: 'patient', is_read: false, is_dismissed: false },
    { pharmacy_id: PH1, type: 'system',         title: 'Daily Backup Completed',           message: 'Automated cloud backup completed successfully at 02:00 AM.',     reference_id: null, reference_type: null,        is_read: true,  is_dismissed: false },
    { pharmacy_id: PH2, type: 'low_stock',      title: 'Low Stock: Amoxicillin 500mg (Oak Ave)', message: 'Current qty: 12 (reorder point: 25). Please reorder.',  reference_id: null, reference_type: 'inventory', is_read: false, is_dismissed: false },
    { pharmacy_id: PH1, type: 'system',         title: 'New Provider Added',               message: 'Dr. Robert Johnson (NPI: 1598765432) added to provider directory.', reference_id: null, reference_type: null, is_read: true, is_dismissed: true },
  ]

  const { error: alErr } = await supabase.from('alerts').insert(alerts)
  if (alErr && !alErr.message.includes('duplicate')) throw new Error(`alerts: ${alErr.message}`)
  log(`${alerts.length} alerts seeded`)

  /* ── 11. NOTIFICATIONS ─────────────────────────────────────────────────── */
  step('Seeding notifications')
  const notifications = [
    { pharmacy_id: PH1, patient_id: PT.emily,   channel: 'sms',   template: 'prescription_ready',  status: 'sent',    sent_at: '2026-02-02T11:00:00Z', metadata: { rx_number: 'RX10000001', medication: 'Metformin' } },
    { pharmacy_id: PH1, patient_id: PT.sarah,   channel: 'email', template: 'prescription_ready',  status: 'sent',    sent_at: '2026-02-21T10:00:00Z', metadata: { rx_number: 'RX10000008', medication: 'Sertraline' } },
    { pharmacy_id: PH1, patient_id: PT.jessica, channel: 'sms',   template: 'prescription_ready',  status: 'sent',    sent_at: '2026-03-11T16:30:00Z', metadata: { rx_number: 'RX10000010', medication: 'Amoxicillin' } },
    { pharmacy_id: PH1, patient_id: PT.emily,   channel: 'sms',   template: 'refill_reminder',     status: 'pending', sent_at: null,                    metadata: { rx_number: 'RX10000001', refills_remaining: 3 } },
    { pharmacy_id: PH1, patient_id: PT.rohan,   channel: 'sms',   template: 'refill_reminder',     status: 'sent',    sent_at: '2026-03-10T09:00:00Z', metadata: { rx_number: 'RX10000003', refills_remaining: 4 } },
    { pharmacy_id: PH1, patient_id: PT.william, channel: 'sms',   template: 'prescription_ready',  status: 'sent',    sent_at: '2026-03-02T11:30:00Z', metadata: { rx_number: 'RX10000011', medication: 'Metformin' } },
    { pharmacy_id: PH1, patient_id: PT.olivia,  channel: 'email', template: 'refill_reminder',     status: 'failed',  sent_at: null,                    metadata: { rx_number: 'RX10000006', error: 'Invalid email address' } },
    { pharmacy_id: PH1, patient_id: PT.james,   channel: 'sms',   template: 'general',             status: 'sent',    sent_at: '2026-03-09T10:30:00Z', metadata: { message: 'Your Warfarin prescription is on hold. A pharmacist will contact you.' } },
  ]

  const { error: notErr } = await supabase.from('notifications').insert(notifications)
  if (notErr && !notErr.message.includes('duplicate')) throw new Error(`notifications: ${notErr.message}`)
  log(`${notifications.length} notifications seeded`)

  /* ── 12. AUDIT LOGS ────────────────────────────────────────────────────── */
  step('Seeding audit logs')
  const auditLogs = [
    { pharmacy_id: PH1, user_id: U.pharmacist1, action: 'CREATE', resource: 'prescriptions', resource_id: RX.rx1,  new_data: { rx_number: 'RX10000001', status: 'received' }, ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0' },
    { pharmacy_id: PH1, user_id: U.pharmacist1, action: 'UPDATE', resource: 'prescriptions', resource_id: RX.rx1,  old_data: { status: 'received' }, new_data: { status: 'verified' }, ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0' },
    { pharmacy_id: PH1, user_id: U.pharmacist1, action: 'UPDATE', resource: 'prescriptions', resource_id: RX.rx1,  old_data: { status: 'filling' }, new_data: { status: 'dispensed' }, ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0' },
    { pharmacy_id: PH1, user_id: U.pharmacist1, action: 'READ',   resource: 'patients',       resource_id: PT.emily, new_data: null, ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0' },
    { pharmacy_id: PH1, user_id: U.tech1,       action: 'UPDATE', resource: 'prescriptions', resource_id: RX.rx3,  old_data: { status: 'verified' }, new_data: { status: 'filling' }, ip_address: '192.168.1.105', user_agent: 'Mozilla/5.0' },
    { pharmacy_id: PH1, user_id: U.pharmacyAdmin,action:'CREATE', resource: 'patients',       resource_id: PT.emily, new_data: { first_name: 'Emily', last_name: 'Smith' }, ip_address: '192.168.1.101', user_agent: 'Mozilla/5.0' },
    { pharmacy_id: PH1, user_id: U.pharmacist2, action: 'CREATE', resource: 'prescriptions', resource_id: RX.rx6,  new_data: { rx_number: 'RX10000006', status: 'dispensed' }, ip_address: '192.168.1.102', user_agent: 'Mozilla/5.0' },
    { pharmacy_id: PH1, user_id: U.cashier,     action: 'CREATE', resource: 'transactions',   resource_id: null,    new_data: { type: 'sale', total: 9.50 }, ip_address: '192.168.1.110', user_agent: 'Mozilla/5.0' },
  ]

  const { error: audErr } = await supabase.from('audit_logs').insert(auditLogs)
  if (audErr && !audErr.message.includes('duplicate')) throw new Error(`audit_logs: ${audErr.message}`)
  log(`${auditLogs.length} audit log entries seeded`)

  /* ── 13. ADHERENCE SCORES ──────────────────────────────────────────────── */
  step('Seeding adherence scores')
  const adherenceScores = [
    { patient_id: PT.emily,   prescription_id: RX.rx1,  score: 92.50, risk_level: 'low',    recommendations: [{ text: 'Continue current medication adherence', priority: 'low' }] },
    { patient_id: PT.rohan,   prescription_id: RX.rx3,  score: 78.00, risk_level: 'medium', recommendations: [{ text: 'Set daily medication reminder', priority: 'medium' }, { text: 'Follow up in 30 days', priority: 'low' }] },
    { patient_id: PT.olivia,  prescription_id: RX.rx5,  score: 45.00, risk_level: 'high',   recommendations: [{ text: 'Patient education on importance of SSRIs', priority: 'high' }, { text: 'Weekly pharmacist check-in recommended', priority: 'high' }] },
    { patient_id: PT.james,   prescription_id: RX.rx7,  score: 88.00, risk_level: 'low',    recommendations: [{ text: 'Monitor INR regularly', priority: 'medium' }] },
    { patient_id: PT.william, prescription_id: RX.rx11, score: 55.00, risk_level: 'medium', recommendations: [{ text: 'Pillbox organizer recommended', priority: 'medium' }, { text: 'Caregiver involvement suggested', priority: 'medium' }] },
    { patient_id: PT.michael, prescription_id: RX.rx9,  score: 32.00, risk_level: 'high',   recommendations: [{ text: 'Pain management counseling', priority: 'high' }, { text: 'DEA monitoring active', priority: 'high' }] },
  ]

  const { error: adhErr } = await supabase.from('adherence_scores').insert(adherenceScores)
  if (adhErr && !adhErr.message.includes('duplicate')) throw new Error(`adherence_scores: ${adhErr.message}`)
  log(`${adherenceScores.length} adherence scores seeded`)

  /* ── 14. DEMAND FORECASTS ──────────────────────────────────────────────── */
  step('Seeding demand forecasts')
  const forecasts = [
    { pharmacy_id: PH1, medication_id: MED.metformin,   forecast_days: 30, predicted_demand: 145, confidence: 0.91, recommendation: 'Current stock adequate. Consider ordering 100 additional units proactively.', model: 'gpt-4o-mini' },
    { pharmacy_id: PH1, medication_id: MED.atorvastatin,forecast_days: 30, predicted_demand: 120, confidence: 0.87, recommendation: 'Demand trending up 12% month-over-month. Increase reorder quantity.', model: 'gpt-4o-mini' },
    { pharmacy_id: PH1, medication_id: MED.lisinopril,  forecast_days: 30, predicted_demand: 95,  confidence: 0.89, recommendation: 'Stable demand. Current stock sufficient.', model: 'gpt-4o-mini' },
    { pharmacy_id: PH1, medication_id: MED.sertraline,  forecast_days: 30, predicted_demand: 75,  confidence: 0.83, recommendation: 'Demand increasing. Restock recommended before month end.', model: 'gpt-4o-mini' },
    { pharmacy_id: PH1, medication_id: MED.warfarin,    forecast_days: 30, predicted_demand: 40,  confidence: 0.92, recommendation: 'Current stock critically low. Immediate reorder required.', model: 'gpt-4o-mini' },
    { pharmacy_id: PH2, medication_id: MED.atorvastatin,forecast_days: 30, predicted_demand: 60,  confidence: 0.85, recommendation: 'Oak Ave demand stable. Adequate stock levels.', model: 'gpt-4o-mini' },
  ]

  const { error: fcErr } = await supabase.from('forecasts').insert(forecasts)
  if (fcErr && !fcErr.message.includes('duplicate')) throw new Error(`forecasts: ${fcErr.message}`)
  log(`${forecasts.length} forecasts seeded`)

  /* ── 15. INVENTORY TRANSFERS ────────────────────────────────────────────── */
  step('Seeding inventory transfers')
  const inventoryTransfers = [
    { from_pharmacy_id: PH1, to_pharmacy_id: PH2, medication_id: MED.atorvastatin, quantity: 50, status: 'completed', requested_by: U.pharmacyAdmin, approved_by: U.superAdmin, notes: 'Oak Ave running low on Atorvastatin.', completed_at: new Date(Date.now() - 2*86400000).toISOString() },
    { from_pharmacy_id: PH2, to_pharmacy_id: PH1, medication_id: MED.amoxicillin,  quantity: 30, status: 'pending',   requested_by: U.oakAdmin,     approved_by: null,          notes: 'Main Street shortage of Amoxicillin.' },
  ]

  const { error: itErr } = await supabase.from('inventory_transfers').insert(inventoryTransfers)
  if (itErr && !itErr.message.includes('duplicate')) throw new Error(`inventory_transfers: ${itErr.message}`)
  log(`${inventoryTransfers.length} inventory transfers seeded`)

  /* ── 16. CHAT SESSIONS & MESSAGES ──────────────────────────────────────── */
  step('Seeding AI chat sessions')
  const { data: chatSessions, error: csErr } = await supabase.from('chat_sessions').insert([
    { patient_id: PT.emily,   pharmacy_id: PH1, conversation_title: 'Metformin side effects query', last_message_at: new Date().toISOString() },
    { patient_id: PT.rohan,   pharmacy_id: PH1, conversation_title: 'Refill request assistance',    last_message_at: new Date().toISOString() },
  ]).select('id')

  if (csErr && !csErr.message.includes('duplicate')) throw new Error(`chat_sessions: ${csErr.message}`)
  log(`${chatSessions?.length ?? 0} chat sessions seeded`)

  if (chatSessions?.length) {
    const chatMessages = [
      { session_id: chatSessions[0].id, role: 'user',      content: 'I have been feeling nauseous after taking Metformin. Is this normal?', metadata: {} },
      { session_id: chatSessions[0].id, role: 'assistant', content: 'Nausea is a common side effect of Metformin, especially when starting treatment. Try taking it with food to reduce stomach upset. If symptoms persist, please speak with your pharmacist or physician.', metadata: { model: 'gpt-4o' } },
      { session_id: chatSessions[0].id, role: 'user',      content: 'How long does the nausea usually last?', metadata: {} },
      { session_id: chatSessions[0].id, role: 'assistant', content: 'Most patients find that nausea improves after 2-4 weeks as your body adjusts. Starting with a lower dose that is gradually increased can also help. Please consult your pharmacist for personalized advice.', metadata: { model: 'gpt-4o' } },
      { session_id: chatSessions[1].id, role: 'user',      content: 'Can I request a refill for my Atorvastatin?', metadata: {} },
      { session_id: chatSessions[1].id, role: 'assistant', content: 'Yes! I can help you request a refill. Please text REFILL to our pharmacy number or visit us in person. Your Atorvastatin has 4 refills remaining.', metadata: { model: 'gpt-4o' } },
    ]
    const { error: cmErr } = await supabase.from('chat_messages').insert(chatMessages)
    if (cmErr && !cmErr.message.includes('duplicate')) throw new Error(`chat_messages: ${cmErr.message}`)
    log(`${chatMessages.length} chat messages seeded`)
  }

  /* ── DONE ──────────────────────────────────────────────────────────────── */
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║                   SEED COMPLETE ✓                           ║')
  console.log('╠══════════════════════════════════════════════════════════════╣')
  console.log('║  All users share the same password: Pharma@123456           ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('\n📋 USER ACCOUNTS:\n')
  const table = [
    ['ROLE',           'EMAIL',                          'NAME',              'PHARMACY'],
    ['super_admin',    'superadmin@pharmatechpro.com',   'Alex Carter',       'Both'],
    ['pharmacy_admin', 'pharmacyadmin@pharmatechpro.com','Margaret Reynolds', 'Main Street'],
    ['pharmacist',     'pharmacist1@pharmatechpro.com',  'David Kim',         'Main Street'],
    ['pharmacist',     'pharmacist2@pharmatechpro.com',  'Priya Sharma',      'Main Street'],
    ['technician',     'tech1@pharmatechpro.com',        'Carlos Mendez',     'Main Street'],
    ['technician',     'tech2@pharmatechpro.com',        'Hannah Brooks',     'Main Street'],
    ['cashier',        'cashier@pharmatechpro.com',      'Tyler Grant',       'Main Street'],
    ['viewer',         'viewer@pharmatechpro.com',       'Nina Foster',       'Main Street'],
    ['pharmacy_admin', 'oakadmin@pharmatechpro.com',     'Brian Walsh',       'Oak Avenue'],
    ['pharmacist',     'oakpharmacist@pharmatechpro.com','Zoe Patel',         'Oak Avenue'],
  ]
  const colW = [16, 36, 20, 15]
  const row = (r) => '  ' + r.map((c, i) => c.padEnd(colW[i])).join('  ')
  console.log(row(table[0]))
  console.log('  ' + '─'.repeat(colW.reduce((a,b)=>a+b+2,0)))
  table.slice(1).forEach(r => console.log(row(r)))
  console.log('\n  Password (all accounts): Pharma@123456\n')
}

main().catch(err => { console.error('\n✗ SEED FAILED:', err.message); process.exit(1) })
