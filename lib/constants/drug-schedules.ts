import type { DrugSchedule } from '@/lib/supabase/types'

export const DRUG_SCHEDULE_LABELS: Record<DrugSchedule, string> = {
  OTC: 'Over-the-Counter (OTC)',
  II: 'Schedule II (CII)',
  III: 'Schedule III (CIII)',
  IV: 'Schedule IV (CIV)',
  V: 'Schedule V (CV)',
}

export const DRUG_SCHEDULE_COLORS: Record<DrugSchedule, string> = {
  OTC: 'bg-green-100 text-green-800',
  II: 'bg-red-100 text-red-800',
  III: 'bg-orange-100 text-orange-800',
  IV: 'bg-yellow-100 text-yellow-800',
  V: 'bg-blue-100 text-blue-800',
}

export const CONTROLLED_SCHEDULES: DrugSchedule[] = ['II', 'III', 'IV', 'V']

export const DAW_CODES: Record<number, string> = {
  0: '0 - No Product Selection Indicated',
  1: '1 - Substitution Not Allowed by Prescriber',
  2: '2 - Substitution Allowed - Patient Requested Brand',
  3: '3 - Substitution Allowed - Pharmacist Selected Brand',
  4: '4 - Substitution Allowed - Generic Not in Stock',
  5: '5 - Substitution Allowed - Brand Dispensed as Generic',
  6: '6 - Override',
  7: '7 - Substitution Not Allowed - Brand Drug Mandated by Law',
  8: '8 - Substitution Allowed - Generic Not Available in Marketplace',
  9: '9 - Other',
}
