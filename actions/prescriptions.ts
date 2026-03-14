'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { prescriptionSchema, type PrescriptionFormValues } from '@/lib/validations/prescription'
import { auditLog } from '@/lib/utils/hipaa-audit'
import { canTransition } from '@/lib/utils/prescription-state-machine'
import type { PrescriptionStatus } from '@/lib/supabase/types'
import { getProfileContext } from '@/lib/supabase/get-profile'

export async function createPrescription(data: PrescriptionFormValues) {
  const parsed = prescriptionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { pharmacyId } = await getProfileContext()
  const supabase = await createClient()

  const { data: prescription, error } = await supabase
    .from('prescriptions')
    .insert({ ...parsed.data, pharmacy_id: pharmacyId })
    .select()
    .single()

  if (error) return { error: { _form: [error.message] } }

  await auditLog('CREATE', 'prescriptions', prescription.id, undefined, prescription)
  revalidatePath('/dashboard/prescriptions')
  return { data: prescription }
}

export async function updatePrescriptionStatus(
  id: string,
  newStatus: PrescriptionStatus,
  notes?: string
) {
  const { role, userId } = await getProfileContext()
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) return { error: 'Prescription not found' }

  if (!canTransition(current.status as PrescriptionStatus, newStatus, role)) {
    return { error: `Cannot transition from ${current.status} to ${newStatus}` }
  }

  const updateData: Record<string, unknown> = { status: newStatus }
  if (notes) updateData.notes = notes
  if (newStatus === 'verified') updateData.verified_by = userId
  if (newStatus === 'dispensed') {
    updateData.dispenser_id = userId
    updateData.dispensed_at = new Date().toISOString()
  }

  const { data: updated, error } = await supabase
    .from('prescriptions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await auditLog('UPDATE', 'prescriptions', id, current, updated)
  revalidatePath(`/dashboard/prescriptions/${id}`)
  revalidatePath('/dashboard/prescriptions')
  revalidatePath('/dashboard/workflow')
  return { data: updated }
}

export async function createRefill(prescriptionId: string) {
  const { userId } = await getProfileContext()
  const supabase = await createClient()

  const { data: rx } = await supabase
    .from('prescriptions')
    .select('refills_allowed, refills_used, quantity, days_supply')
    .eq('id', prescriptionId)
    .single()

  if (!rx) return { error: 'Prescription not found' }
  if (rx.refills_used >= rx.refills_allowed) return { error: 'No refills remaining' }

  const { data: lastRefill } = await supabase
    .from('refills')
    .select('refill_number')
    .eq('prescription_id', prescriptionId)
    .order('refill_number', { ascending: false })
    .limit(1)
    .single()

  const refillNumber = (lastRefill?.refill_number ?? 0) + 1

  const { data: refill, error } = await supabase
    .from('refills')
    .insert({
      prescription_id: prescriptionId,
      refill_number: refillNumber,
      quantity: rx.quantity,
      days_supply: rx.days_supply,
      dispenser_id: userId,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Increment refills_used
  await supabase
    .from('prescriptions')
    .update({ refills_used: rx.refills_used + 1 })
    .eq('id', prescriptionId)

  await auditLog('CREATE', 'refills', refill.id)
  revalidatePath(`/dashboard/prescriptions/${prescriptionId}`)
  return { data: refill }
}
