import type { UserRole } from '@/lib/supabase/types'

type Resource = 'patients' | 'prescriptions' | 'inventory' | 'claims' | 'transactions' | 'reports' | 'admin' | 'workflow' | 'notifications' | 'providers'
type Action = 'create' | 'read' | 'update' | 'delete' | 'verify' | 'dispense' | 'fill'

type PermissionMatrix = Record<UserRole, Record<Resource, Action[]>>

export const PERMISSIONS: PermissionMatrix = {
  super_admin: {
    patients: ['create', 'read', 'update', 'delete'],
    prescriptions: ['create', 'read', 'update', 'delete', 'verify', 'dispense', 'fill'],
    inventory: ['create', 'read', 'update', 'delete'],
    claims: ['create', 'read', 'update', 'delete'],
    transactions: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
    admin: ['create', 'read', 'update', 'delete'],
    workflow: ['create', 'read', 'update', 'delete'],
    notifications: ['create', 'read', 'update', 'delete'],
    providers: ['create', 'read', 'update', 'delete'],
  },
  pharmacy_admin: {
    patients: ['create', 'read', 'update', 'delete'],
    prescriptions: ['create', 'read', 'update', 'delete', 'verify', 'dispense', 'fill'],
    inventory: ['create', 'read', 'update', 'delete'],
    claims: ['create', 'read', 'update', 'delete'],
    transactions: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
    admin: ['create', 'read', 'update'],
    workflow: ['create', 'read', 'update', 'delete'],
    notifications: ['create', 'read', 'update'],
    providers: ['create', 'read', 'update'],
  },
  pharmacist: {
    patients: ['create', 'read', 'update'],
    prescriptions: ['create', 'read', 'update', 'verify', 'dispense', 'fill'],
    inventory: ['read', 'update'],
    claims: ['create', 'read', 'update'],
    transactions: ['create', 'read'],
    reports: ['read'],
    admin: [],
    workflow: ['read', 'update'],
    notifications: ['create', 'read'],
    providers: ['create', 'read', 'update'],
  },
  technician: {
    patients: ['read', 'update'],
    prescriptions: ['read', 'fill'],
    inventory: ['read', 'update'],
    claims: ['read'],
    transactions: ['read'],
    reports: ['read'],
    admin: [],
    workflow: ['read', 'update'],
    notifications: ['read'],
    providers: ['read'],
  },
  cashier: {
    patients: ['read'],
    prescriptions: ['read'],
    inventory: ['read'],
    claims: ['read'],
    transactions: ['create', 'read'],
    reports: ['read'],
    admin: [],
    workflow: ['read'],
    notifications: ['read'],
    providers: ['read'],
  },
  viewer: {
    patients: ['read'],
    prescriptions: ['read'],
    inventory: ['read'],
    claims: ['read'],
    transactions: ['read'],
    reports: ['read'],
    admin: [],
    workflow: ['read'],
    notifications: ['read'],
    providers: ['read'],
  },
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  pharmacy_admin: 'Pharmacy Admin',
  pharmacist: 'Pharmacist',
  technician: 'Technician',
  cashier: 'Cashier',
  viewer: 'Viewer',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-red-100 text-red-800',
  pharmacy_admin: 'bg-purple-100 text-purple-800',
  pharmacist: 'bg-blue-100 text-blue-800',
  technician: 'bg-green-100 text-green-800',
  cashier: 'bg-yellow-100 text-yellow-800',
  viewer: 'bg-gray-100 text-gray-800',
}
