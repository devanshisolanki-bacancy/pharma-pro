'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { auditLog } from '@/lib/utils/hipaa-audit'

async function getCurrentUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id, role')
    .eq('id', user.id)
    .single<{ pharmacy_id: string | null; role: string }>()
  if (!profile?.pharmacy_id) throw new Error('No pharmacy assigned')
  return { pharmacyId: profile.pharmacy_id, role: profile.role, userId: user.id }
}

export async function submitClaim(prescriptionId: string, insurancePlanId?: string) {
  const supabase = await createClient()
  const { pharmacyId } = await getCurrentUser(supabase)
  const claimsTable = supabase.from('claims') as unknown as {
    insert: (values: Record<string, unknown>) => {
      select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
    }
  }

  // Get prescription details
  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('*, patients(first_name, last_name), medications(name, ndc)')
    .eq('id', prescriptionId)
    .single()

  if (!prescription) return { error: 'Prescription not found' }

  const billedAmount = Math.random() * 100 + 20 // Mocked

  const { data: claim, error } = await claimsTable
    .insert({
      pharmacy_id: pharmacyId,
      prescription_id: prescriptionId,
      insurance_plan_id: insurancePlanId,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      billed_amount: parseFloat(billedAmount.toFixed(2)),
    })
    .select()
    .single()

  if (error) return { error: error.message }
  if (!claim) return { error: 'Failed to create claim' }

  await auditLog('CREATE', 'claims', claim.id)
  revalidatePath('/dashboard/insurance/claims')
  return { data: claim }
}

export async function updateClaimStatus(
  claimId: string,
  status: 'paid' | 'rejected' | 'appealed',
  data: {
    paid_amount?: number
    allowed_amount?: number
    copay_amount?: number
    rejection_code?: string
    rejection_reason?: string
  }
) {
  const supabase = await createClient()
  await getCurrentUser(supabase)
  const claimsTable = supabase.from('claims') as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> }
      }
    }
  }

  const { data: updated, error } = await claimsTable
    .update({
      status,
      adjudicated_at: new Date().toISOString(),
      ...data,
    })
    .eq('id', claimId)
    .select()
    .single()

  if (error) return { error: error.message }

  await auditLog('UPDATE', 'claims', claimId)
  revalidatePath('/dashboard/insurance/claims')
  return { data: updated }
}

export async function resubmitClaim(claimId: string, overrides?: Record<string, unknown>) {
  const supabase = await createClient()
  await getCurrentUser(supabase)
  const claimsTable = supabase.from('claims') as unknown as {
    select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown | null }> } }
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> }
      }
    }
  }

  const { data: claim } = await claimsTable.select('*').eq('id', claimId).single()
  if (!claim) return { error: 'Claim not found' }

  const { data: updated, error } = await claimsTable
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      rejection_code: null,
      rejection_reason: null,
      ...overrides,
    })
    .eq('id', claimId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/insurance/claims')
  return { data: updated }
}
