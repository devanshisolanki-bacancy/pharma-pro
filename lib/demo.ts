import type {
  ClaimStatus,
  InventoryStatus,
  PrescriptionStatus,
  UserRole,
} from '@/lib/supabase/types'

export function isDemoMode() {
  const value = process.env.NEXT_PUBLIC_DEMO_MODE
  if (value === undefined) return false
  return value === 'true' || value === '1'
}

export const demoUser = {
  pharmacyName: 'PharmaTech Pro - Main Street',
  pharmacyId: '11111111-1111-1111-1111-111111111111',
  firstName: 'Demo',
  lastName: 'Admin',
  role: 'pharmacy_admin' as UserRole,
}

export const demoDashboard = {
  prescriptionsToday: 24,
  revenueToday: 1842.75,
  activePatients: 312,
  pendingClaims: 7,
  pendingClaimsAmount: 524.2,
  lowStockCount: 5,
  unreadAlerts: 3,
  recentPrescriptions: [
    { id: 'rx-1', rx_number: 'RX-100234', status: 'ready' as PrescriptionStatus, patient: 'Smith, Emily', medication: 'Atorvastatin 20mg' },
    { id: 'rx-2', rx_number: 'RX-100233', status: 'filling' as PrescriptionStatus, patient: 'Patel, Rohan', medication: 'Metformin 500mg' },
    { id: 'rx-3', rx_number: 'RX-100232', status: 'verified' as PrescriptionStatus, patient: 'Davis, John', medication: 'Lisinopril 10mg' },
    { id: 'rx-4', rx_number: 'RX-100231', status: 'received' as PrescriptionStatus, patient: 'Miller, Sarah', medication: 'Sertraline 50mg' },
    { id: 'rx-5', rx_number: 'RX-100230', status: 'dispensed' as PrescriptionStatus, patient: 'Brown, Olivia', medication: 'Omeprazole 20mg' },
  ],
  alerts: [
    { id: 'a-1', type: 'low_stock', title: 'Low stock: Warfarin 5mg', message: 'Only 5 units on hand' },
    { id: 'a-2', type: 'claim_rejected', title: 'Claim rejected: RX-100220', message: 'Prior authorization required' },
    { id: 'a-3', type: 'system', title: 'Daily backup completed', message: null },
  ],
}

export const demoPatients = [
  {
    id: 'p-1',
    first_name: 'Emily',
    last_name: 'Smith',
    date_of_birth: '1987-06-12',
    phone: '(217) 555-1201',
    email: 'emily.smith@example.com',
    allergies: ['Penicillin'],
    hipaa_signed_at: '2025-01-01T10:00:00Z',
    is_active: true,
  },
  {
    id: 'p-2',
    first_name: 'Rohan',
    last_name: 'Patel',
    date_of_birth: '1979-03-22',
    phone: '(217) 555-1202',
    email: 'rohan.patel@example.com',
    allergies: [],
    hipaa_signed_at: '2025-01-03T10:00:00Z',
    is_active: true,
  },
  {
    id: 'p-3',
    first_name: 'Olivia',
    last_name: 'Brown',
    date_of_birth: '1994-11-03',
    phone: '(217) 555-1203',
    email: 'olivia.brown@example.com',
    allergies: ['Sulfa'],
    hipaa_signed_at: null,
    is_active: true,
  },
]

export const demoPrescriptions = [
  {
    id: 'rx-1',
    rx_number: 'RX-100234',
    status: 'ready' as PrescriptionStatus,
    patient: 'Smith, Emily',
    medication: 'Atorvastatin',
    strength: '20mg',
    prescriber: 'Dr. Johnson',
    written_date: '2026-03-10',
    quantity: 30,
    days_supply: 30,
    refills_used: 1,
    refills_allowed: 5,
    is_controlled: false,
  },
  {
    id: 'rx-2',
    rx_number: 'RX-100233',
    status: 'filling' as PrescriptionStatus,
    patient: 'Patel, Rohan',
    medication: 'Metformin',
    strength: '500mg',
    prescriber: 'Dr. Williams',
    written_date: '2026-03-12',
    quantity: 60,
    days_supply: 30,
    refills_used: 0,
    refills_allowed: 2,
    is_controlled: false,
  },
  {
    id: 'rx-3',
    rx_number: 'RX-100232',
    status: 'verified' as PrescriptionStatus,
    patient: 'Brown, Olivia',
    medication: 'Hydrocodone/APAP',
    strength: '5mg/325mg',
    prescriber: 'Dr. Chen',
    written_date: '2026-03-12',
    quantity: 20,
    days_supply: 7,
    refills_used: 0,
    refills_allowed: 0,
    is_controlled: true,
  },
]

export const demoInventory = [
  {
    id: 'inv-1',
    medication_name: 'Atorvastatin',
    ndc: '00071-0155-23',
    lot_number: 'LOT001',
    expiration_date: '2027-06-30',
    quantity_on_hand: 150,
    reorder_point: 25,
    unit_cost: 1.25,
    selling_price: 5.99,
    status: 'active' as InventoryStatus,
  },
  {
    id: 'inv-2',
    medication_name: 'Warfarin',
    ndc: '00088-1090-47',
    lot_number: 'LOT009',
    expiration_date: '2026-03-31',
    quantity_on_hand: 5,
    reorder_point: 15,
    unit_cost: 1.1,
    selling_price: 7.49,
    status: 'low_stock' as InventoryStatus,
  },
  {
    id: 'inv-3',
    medication_name: 'Alprazolam',
    ndc: '63304-0882-01',
    lot_number: 'LOT006',
    expiration_date: '2026-05-31',
    quantity_on_hand: 0,
    reorder_point: 15,
    unit_cost: 1.75,
    selling_price: 9.99,
    status: 'out_of_stock' as InventoryStatus,
  },
]

export const demoClaims = [
  {
    id: 'c-1',
    claim_number: 'CLM-30012',
    rx_number: 'RX-100234',
    patient: 'Smith, Emily',
    payer_name: 'Aetna',
    billed_amount: 92.14,
    paid_amount: 81.21,
    created_at: '2026-03-12T09:12:00Z',
    status: 'paid' as ClaimStatus,
  },
  {
    id: 'c-2',
    claim_number: 'CLM-30013',
    rx_number: 'RX-100233',
    patient: 'Patel, Rohan',
    payer_name: 'Cigna',
    billed_amount: 67.4,
    paid_amount: 0,
    created_at: '2026-03-13T10:42:00Z',
    status: 'pending' as ClaimStatus,
  },
]

export const demoNotifications = [
  {
    id: 'n-1',
    patient: 'Smith, Emily',
    channel: 'sms',
    template: 'prescription_ready',
    status: 'sent',
    sent_at: '2026-03-13T11:00:00Z',
  },
  {
    id: 'n-2',
    patient: 'Brown, Olivia',
    channel: 'email',
    template: 'refill_reminder',
    status: 'pending',
    sent_at: null,
  },
]
