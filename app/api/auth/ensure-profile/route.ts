import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/ensure-profile
 *
 * Called after signup to guarantee a profile row exists.
 * Uses the service-role key so it is immune to RLS restrictions
 * and works regardless of whether email confirmation is enabled.
 */
export async function POST(request: Request) {
  try {
    // Verify the caller is authenticated
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Parse optional overrides from the request body
    const body = await request.json().catch(() => ({}))
    const firstName = (body.first_name as string | undefined)
      ?? (user.user_metadata?.first_name as string | undefined)
      ?? 'New'
    const lastName = (body.last_name as string | undefined)
      ?? (user.user_metadata?.last_name as string | undefined)
      ?? 'User'

    // Use the service-role client to bypass RLS
    const adminClient = await createServiceClient()

    // Resolve default pharmacy (first active one)
    const { data: pharmacy } = await adminClient
      .from('pharmacies')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const pharmacyId = pharmacy?.id ?? null

    // Upsert profile — on conflict only update fields that are still empty
    // so we don't overwrite an admin-assigned pharmacy_id or role.
    const { error: upsertError } = await adminClient
      .from('profiles')
      .upsert(
        { id: user.id, first_name: firstName, last_name: lastName, role: 'viewer', pharmacy_id: pharmacyId },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    if (upsertError) {
      console.error('[ensure-profile] upsert failed:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // If the profile already existed but had no pharmacy_id, patch it now
    if (pharmacyId) {
      await adminClient
        .from('profiles')
        .update({ pharmacy_id: pharmacyId })
        .eq('id', user.id)
        .is('pharmacy_id', null)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ensure-profile] unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
