'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export interface ProfileContext {
  userId: string
  pharmacyId: string
  role: UserRole
}

/**
 * Fetches the current user's profile with an explicit generic type so the
 * Supabase client never infers the result as `never` under TypeScript strict
 * mode (which caused the Vercel build failure in actions/inventory.ts).
 *
 * Use this instead of inline profile queries in Server Actions.
 */
export async function getProfileContext(): Promise<ProfileContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error('Not authenticated')

  // The explicit generic prevents TypeScript from collapsing the return
  // type to `never` when it cannot fully resolve the Supabase column shape.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('pharmacy_id, role')
    .eq('id', user.id)
    .single<{ pharmacy_id: string | null; role: UserRole }>()

  if (profileError || !profile) throw new Error('Profile not found')
  if (!profile.pharmacy_id) throw new Error('No pharmacy assigned')

  return {
    userId: user.id,
    pharmacyId: profile.pharmacy_id,
    role: profile.role,
  }
}
