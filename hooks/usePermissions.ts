'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PERMISSIONS } from '@/lib/constants/roles'
import type { UserRole } from '@/lib/supabase/types'
import { demoUser, isDemoMode } from '@/lib/demo'

type Resource = keyof typeof PERMISSIONS[UserRole]
type Action = string

interface PermissionsState {
  role: UserRole | null
  pharmacyId: string | null
  isLoading: boolean
  can: (action: Action, resource: Resource) => boolean
  isAdmin: () => boolean
}

interface UsePermissionsOptions {
  /**
   * Role pre-fetched on the server (e.g. from the dashboard layout).
   * When provided the hook skips the client-side Supabase fetch and
   * sets isLoading = false immediately, eliminating the hydration mismatch
   * caused by a loading skeleton whose element type differs from the
   * loaded state.
   */
  initialRole?: UserRole | null
  initialPharmacyId?: string | null
}

export function usePermissions(options: UsePermissionsOptions = {}): PermissionsState {
  const { initialRole, initialPharmacyId } = options
  const demoEnabled = isDemoMode()

  // Determine the seed values — prefer server-supplied data over demo fallbacks
  const seedRole: UserRole | null = initialRole ?? (demoEnabled ? demoUser.role : null)
  const seedPharmacyId: string | null = initialPharmacyId ?? (demoEnabled ? demoUser.pharmacyId : null)

  // isLoading is false when we already have a role from the server or demo mode
  const [role, setRole] = useState<UserRole | null>(seedRole)
  const [pharmacyId, setPharmacyId] = useState<string | null>(seedPharmacyId)
  const [isLoading, setIsLoading] = useState<boolean>(!seedRole)

  useEffect(() => {
    // Skip the client-side fetch when the role was provided by the server
    if (seedRole || demoEnabled) return

    const supabase = createClient()

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, pharmacy_id')
        .eq('id', user.id)
        .single<{ role: string; pharmacy_id: string | null }>()

      if (profile) {
        setRole(profile.role as UserRole)
        setPharmacyId(profile.pharmacy_id)
      }
      setIsLoading(false)
    }

    loadProfile()
  }, [demoEnabled, seedRole])

  function can(action: Action, resource: Resource): boolean {
    if (!role) return false
    const allowed = PERMISSIONS[role]?.[resource] as string[] | undefined
    return allowed?.includes(action) ?? false
  }

  function isAdmin(): boolean {
    return role === 'super_admin' || role === 'pharmacy_admin'
  }

  return { role, pharmacyId, isLoading, can, isAdmin }
}
