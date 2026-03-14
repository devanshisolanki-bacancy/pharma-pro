import type { PrescriptionStatus, UserRole } from '@/lib/supabase/types'

type TransitionMap = Record<PrescriptionStatus, PrescriptionStatus[]>

const PHARMACIST_TRANSITIONS: TransitionMap = {
  received: ['verified', 'on_hold', 'cancelled', 'transferred'],
  verified: ['filling', 'on_hold', 'cancelled'],
  on_hold: ['verified', 'cancelled'],
  filling: ['quality_check', 'on_hold'],
  quality_check: ['ready', 'filling'],
  ready: ['dispensed'],
  dispensed: [],
  cancelled: [],
  transferred: [],
}

const TECHNICIAN_TRANSITIONS: TransitionMap = {
  received: ['on_hold'],
  verified: ['filling', 'on_hold'],
  on_hold: [],
  filling: ['quality_check', 'on_hold'],
  quality_check: [],
  ready: [],
  dispensed: [],
  cancelled: [],
  transferred: [],
}

const CASHIER_TRANSITIONS: TransitionMap = {
  received: [],
  verified: [],
  on_hold: [],
  filling: [],
  quality_check: [],
  ready: ['dispensed'],
  dispensed: [],
  cancelled: [],
  transferred: [],
}

export function canTransition(
  from: PrescriptionStatus,
  to: PrescriptionStatus,
  userRole: UserRole
): boolean {
  let transitions: TransitionMap

  if (['super_admin', 'pharmacy_admin', 'pharmacist'].includes(userRole)) {
    transitions = PHARMACIST_TRANSITIONS
  } else if (userRole === 'technician') {
    transitions = TECHNICIAN_TRANSITIONS
  } else if (userRole === 'cashier') {
    transitions = CASHIER_TRANSITIONS
  } else {
    return false
  }

  return transitions[from]?.includes(to) ?? false
}

export function getNextStates(
  current: PrescriptionStatus,
  role: UserRole
): PrescriptionStatus[] {
  if (['super_admin', 'pharmacy_admin', 'pharmacist'].includes(role)) {
    return PHARMACIST_TRANSITIONS[current] || []
  } else if (role === 'technician') {
    return TECHNICIAN_TRANSITIONS[current] || []
  } else if (role === 'cashier') {
    return CASHIER_TRANSITIONS[current] || []
  }
  return []
}

export const TRANSITION_LABELS: Record<PrescriptionStatus, string> = {
  received: 'Received',
  verified: 'Verified',
  on_hold: 'On Hold',
  filling: 'Filling',
  quality_check: 'Quality Check',
  ready: 'Ready for Pickup',
  dispensed: 'Dispensed',
  cancelled: 'Cancelled',
  transferred: 'Transferred',
}

export function getStatusColor(status: PrescriptionStatus): string {
  const colors: Record<PrescriptionStatus, string> = {
    received: 'bg-blue-100 text-blue-800',
    verified: 'bg-indigo-100 text-indigo-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    filling: 'bg-orange-100 text-orange-800',
    quality_check: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    dispensed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    transferred: 'bg-pink-100 text-pink-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
