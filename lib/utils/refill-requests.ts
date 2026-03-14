import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'

type PharmacySupabaseClient = SupabaseClient<Database>

type CanRefillResponse = {
  eligible?: boolean
  reason?: string
}

export type RefillRequestResult = {
  success: boolean
  refillId?: string
  refillNumber?: number
  prescriptionId?: string
  rxNumber?: string
  error?: string
}

const ACTIVE_REFILL_REQUEST_STATUSES = ['received', 'verified', 'filling', 'quality_check', 'ready']

export async function createRefillRequest(
  supabase: PharmacySupabaseClient,
  params: {
    prescriptionId: string
    source: 'dashboard' | 'portal' | 'sms'
  }
): Promise<RefillRequestResult> {
  const { data: prescription, error: rxError } = await supabase
    .from('prescriptions')
    .select('id, pharmacy_id, patient_id, rx_number, refills_used, quantity, days_supply')
    .eq('id', params.prescriptionId)
    .single()

  if (rxError || !prescription) {
    return { success: false, error: 'Prescription not found' }
  }

  const { data: refillCheck, error: refillCheckError } = await supabase.rpc('can_refill', {
    prescription_uuid: params.prescriptionId,
  })

  if (refillCheckError) {
    return { success: false, error: refillCheckError.message }
  }

  const eligibility = (refillCheck ?? {}) as CanRefillResponse
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason ?? 'Prescription is not eligible for refill' }
  }

  const { data: activeRefill } = await supabase
    .from('refills')
    .select('id, status')
    .eq('prescription_id', params.prescriptionId)
    .in('status', ACTIVE_REFILL_REQUEST_STATUSES)
    .maybeSingle()

  if (activeRefill) {
    return { success: false, error: 'A refill request is already in progress' }
  }

  const { data: lastRefill } = await supabase
    .from('refills')
    .select('refill_number')
    .eq('prescription_id', params.prescriptionId)
    .order('refill_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const refillNumber = Math.max(lastRefill?.refill_number ?? 0, prescription.refills_used) + 1

  const { data: refill, error: refillInsertError } = await supabase
    .from('refills')
    .insert({
      prescription_id: params.prescriptionId,
      refill_number: refillNumber,
      status: 'received',
      quantity: prescription.quantity,
      days_supply: prescription.days_supply,
    })
    .select('id, refill_number')
    .single()

  if (refillInsertError || !refill) {
    return { success: false, error: refillInsertError?.message ?? 'Failed to create refill request' }
  }

  await supabase.from('workflow_tasks').insert({
    pharmacy_id: prescription.pharmacy_id,
    prescription_id: params.prescriptionId,
    task_type: 'refill_request',
    priority: 4,
    status: 'pending',
    notes: `Refill #${refill.refill_number} requested via ${params.source}`,
  })

  await supabase.from('notifications').insert({
    pharmacy_id: prescription.pharmacy_id,
    patient_id: prescription.patient_id,
    channel: 'system',
    template: 'refill_requested',
    status: 'processed',
    metadata: {
      source: params.source,
      prescription_id: params.prescriptionId,
      rx_number: prescription.rx_number,
      refill_number: refill.refill_number,
    } as Json,
  })

  return {
    success: true,
    refillId: refill.id,
    refillNumber: refill.refill_number,
    prescriptionId: prescription.id,
    rxNumber: prescription.rx_number,
  }
}
