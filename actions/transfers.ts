'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { auditLog } from '@/lib/utils/hipaa-audit'
import {
  normalizePhoneNumber,
  sendEmailViaResend,
  sendSmsViaTwilio,
} from '@/lib/utils/notifications'
import type { Json, PrescriptionStatus, UserRole } from '@/lib/supabase/types'

type TransferContext = {
  userId: string
  role: UserRole
  pharmacyId: string | null
}

async function getTransferContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, pharmacy_id')
    .eq('id', user.id)
    .single<{ role: UserRole; pharmacy_id: string | null }>()

  if (!profile) return { error: 'Profile not found' as const }
  return {
    context: {
      userId: user.id,
      role: profile.role,
      pharmacyId: profile.pharmacy_id,
    } satisfies TransferContext,
  }
}

function randomTransferCode(prefix: 'INV' | 'RX') {
  const token = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${Date.now().toString().slice(-8)}-${token}`
}

function extractTransferCode(rawCode: string, rawPayload: string) {
  const direct = rawCode.trim().toUpperCase()
  if (direct) return direct

  const payload = rawPayload.trim()
  if (!payload) return ''

  try {
    const url = new URL(payload)
    const fromQuery = url.searchParams.get('transfer_code')?.trim().toUpperCase()
    if (fromQuery) return fromQuery
  } catch {
    // Not a URL payload; continue with regex extraction.
  }

  const match = payload.toUpperCase().match(/\bRX-\d{8}-[A-Z0-9]{6}\b/)
  return match?.[0] ?? ''
}

async function notifyPatientTransfer(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  params: {
    pharmacyId: string
    patientId: string
    rxNumber: string
    transferCode: string
    patient: {
      first_name: string
      phone: string | null
      email: string | null
      sms_opt_in: boolean
      email_opt_in: boolean
    }
  }
) {
  const { pharmacyId, patientId, patient, transferCode, rxNumber } = params
  const details = `Rx ${rxNumber} has been transferred (code ${transferCode}).`
  const smsBody = `Hi ${patient.first_name}, ${details} Contact the pharmacy if you need assistance.`
  const emailText = `Hi ${patient.first_name},

${details}

If you have questions about pickup timing or location, please contact your pharmacy team.`

  if (patient.sms_opt_in && patient.phone) {
    const phone = normalizePhoneNumber(patient.phone)
    const smsResult = phone
      ? await sendSmsViaTwilio(phone, smsBody)
      : { ok: false, provider: 'twilio' as const, error: 'Invalid phone number' }

    await service.from('notifications').insert({
      pharmacy_id: pharmacyId,
      patient_id: patientId,
      channel: 'sms',
      template: 'prescription_transferred',
      status: smsResult.ok ? 'sent' : 'failed',
      sent_at: smsResult.ok ? new Date().toISOString() : null,
      metadata: {
        transfer_code: transferCode,
        rx_number: rxNumber,
        provider: 'twilio',
        external_id: smsResult.externalId ?? null,
        error: smsResult.error ?? null,
      } as Json,
    })
  }

  if (patient.email_opt_in && patient.email) {
    const emailResult = await sendEmailViaResend(
      patient.email,
      `Prescription Transfer Notice (${rxNumber})`,
      emailText
    )
    await service.from('notifications').insert({
      pharmacy_id: pharmacyId,
      patient_id: patientId,
      channel: 'email',
      template: 'prescription_transferred',
      status: emailResult.ok ? 'sent' : 'failed',
      sent_at: emailResult.ok ? new Date().toISOString() : null,
      metadata: {
        transfer_code: transferCode,
        rx_number: rxNumber,
        provider: 'resend',
        external_id: emailResult.externalId ?? null,
        error: emailResult.error ?? null,
      } as Json,
    })
  }
}

function toPatientSnapshot(patient: {
  first_name: string
  last_name: string
  date_of_birth: string
  phone: string | null
  email: string | null
  gender: string | null
  allergies: string[]
  medical_conditions: string[]
  preferred_language: string
}) {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    date_of_birth: patient.date_of_birth,
    phone: patient.phone,
    email: patient.email,
    gender: patient.gender,
    allergies: patient.allergies,
    medical_conditions: patient.medical_conditions,
    preferred_language: patient.preferred_language,
  } as Json
}

function toPrescriptionSnapshot(prescription: {
  rx_number: string
  written_date: string
  expiration_date: string | null
  days_supply: number | null
  quantity: number
  refills_allowed: number
  refills_used: number
  sig: string
  daw_code: number
  is_controlled: boolean
  notes: string | null
  medication_id: string
  provider_id: string | null
}) {
  return {
    rx_number: prescription.rx_number,
    written_date: prescription.written_date,
    expiration_date: prescription.expiration_date,
    days_supply: prescription.days_supply,
    quantity: prescription.quantity,
    refills_allowed: prescription.refills_allowed,
    refills_used: prescription.refills_used,
    sig: prescription.sig,
    daw_code: prescription.daw_code,
    is_controlled: prescription.is_controlled,
    notes: prescription.notes,
    medication_id: prescription.medication_id,
    provider_id: prescription.provider_id,
  } as Json
}

export async function transferInventoryStock(formData: FormData) {
  const result = await getTransferContext()
  if ('error' in result) return { error: result.error }
  const { context } = result

  if (['viewer', 'cashier'].includes(context.role)) {
    return { error: 'Insufficient permissions to transfer inventory' }
  }

  const sourceInventoryId = String(formData.get('source_inventory_id') ?? '').trim()
  const destinationPharmacyId = String(formData.get('destination_pharmacy_id') ?? '').trim()
  const rawQuantity = Number.parseFloat(String(formData.get('quantity') ?? '0'))
  const quantity = Number.isFinite(rawQuantity) ? rawQuantity : 0
  const notes = String(formData.get('notes') ?? '').trim() || null

  if (!sourceInventoryId || !destinationPharmacyId || quantity <= 0) {
    return { error: 'Source item, destination location, and quantity are required' }
  }

  const service = await createServiceClient()
  const { data: sourceItem } = await service
    .from('inventory')
    .select('*')
    .eq('id', sourceInventoryId)
    .single()

  if (!sourceItem) return { error: 'Source inventory item not found' }
  if (sourceItem.quantity_on_hand < quantity) return { error: 'Insufficient stock for transfer' }
  if (sourceItem.pharmacy_id === destinationPharmacyId) return { error: 'Source and destination cannot be the same' }

  if (context.role !== 'super_admin' && context.pharmacyId !== sourceItem.pharmacy_id) {
    return { error: 'You can only transfer inventory from your assigned location' }
  }

  const transferCode = randomTransferCode('INV')

  const { data: transfer, error: transferError } = await service
    .from('inventory_transfers')
    .insert({
      from_pharmacy_id: sourceItem.pharmacy_id,
      to_pharmacy_id: destinationPharmacyId,
      medication_id: sourceItem.medication_id,
      quantity,
      status: 'received',
      requested_by: context.userId,
      approved_by: context.userId,
      notes: notes ? `${transferCode}: ${notes}` : transferCode,
      completed_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (transferError || !transfer) {
    return { error: transferError?.message ?? 'Failed to create inventory transfer record' }
  }

  const newSourceQty = Math.max(0, sourceItem.quantity_on_hand - quantity)
  const sourceStatus =
    newSourceQty === 0
      ? 'out_of_stock'
      : newSourceQty <= sourceItem.reorder_point
        ? 'low_stock'
        : 'active'

  const { error: sourceUpdateError } = await service
    .from('inventory')
    .update({
      quantity_on_hand: newSourceQty,
      status: sourceStatus,
    })
    .eq('id', sourceItem.id)

  if (sourceUpdateError) return { error: sourceUpdateError.message }

  let destinationQuery = service
    .from('inventory')
    .select('*')
    .eq('pharmacy_id', destinationPharmacyId)
    .eq('medication_id', sourceItem.medication_id)
    .eq('expiration_date', sourceItem.expiration_date)
    .limit(1)

  if (sourceItem.lot_number) {
    destinationQuery = destinationQuery.eq('lot_number', sourceItem.lot_number)
  } else {
    destinationQuery = destinationQuery.is('lot_number', null)
  }

  const { data: destinationMatches } = await destinationQuery
  const destinationExisting = destinationMatches?.[0]

  if (destinationExisting) {
    const destinationQty = destinationExisting.quantity_on_hand + quantity
    const destinationStatus =
      destinationQty <= destinationExisting.reorder_point ? 'low_stock' : 'active'

    const { error: destinationUpdateError } = await service
      .from('inventory')
      .update({
        quantity_on_hand: destinationQty,
        status: destinationStatus,
      })
      .eq('id', destinationExisting.id)
    if (destinationUpdateError) return { error: destinationUpdateError.message }
  } else {
    const { error: destinationInsertError } = await service.from('inventory').insert({
      pharmacy_id: destinationPharmacyId,
      medication_id: sourceItem.medication_id,
      lot_number: sourceItem.lot_number,
      expiration_date: sourceItem.expiration_date,
      quantity_on_hand: quantity,
      reorder_point: sourceItem.reorder_point,
      reorder_quantity: sourceItem.reorder_quantity,
      unit_cost: sourceItem.unit_cost,
      selling_price: sourceItem.selling_price,
      status: 'active',
      supplier_id: sourceItem.supplier_id,
      location_bin: sourceItem.location_bin,
    })
    if (destinationInsertError) return { error: destinationInsertError.message }
  }

  await service.from('alerts').insert({
    pharmacy_id: destinationPharmacyId,
    type: 'system',
    title: 'Inventory Transfer Received',
    message: `${quantity} units transferred with code ${transferCode}`,
    reference_id: transfer.id,
    reference_type: 'inventory_transfers',
  })

  await auditLog('CREATE', 'inventory_transfers', transfer.id, undefined, transfer)
  revalidatePath('/dashboard/admin/locations')
  revalidatePath(`/dashboard/admin/locations/${sourceItem.pharmacy_id}`)
  revalidatePath(`/dashboard/admin/locations/${destinationPharmacyId}`)
  revalidatePath('/dashboard/inventory')
  return { success: true, transferCode, transferId: transfer.id }
}

export async function initiatePrescriptionTransfer(formData: FormData) {
  const result = await getTransferContext()
  if ('error' in result) return { error: result.error }
  const { context } = result

  if (['viewer', 'cashier', 'technician'].includes(context.role)) {
    return { error: 'Insufficient permissions to transfer prescriptions' }
  }

  const prescriptionId = String(formData.get('prescription_id') ?? '').trim()
  const destinationPharmacyId = String(formData.get('destination_pharmacy_id') ?? '').trim() || null
  const reason = String(formData.get('reason') ?? '').trim() || null

  if (!prescriptionId) return { error: 'Prescription is required' }

  const service = await createServiceClient()
  const { data: prescription } = await service
    .from('prescriptions')
    .select('*, patients(first_name, last_name, date_of_birth, phone, email, gender, allergies, medical_conditions, preferred_language, sms_opt_in, email_opt_in)')
    .eq('id', prescriptionId)
    .single()

  if (!prescription) return { error: 'Prescription not found' }
  if (prescription.status === 'transferred') return { error: 'Prescription is already transferred' }
  if (context.role !== 'super_admin' && context.pharmacyId !== prescription.pharmacy_id) {
    return { error: 'You can only transfer prescriptions from your assigned location' }
  }

  const patient = prescription.patients as {
    first_name: string
    last_name: string
    date_of_birth: string
    phone: string | null
    email: string | null
    gender: string | null
    allergies: string[]
    medical_conditions: string[]
    preferred_language: string
    sms_opt_in: boolean
    email_opt_in: boolean
  } | null

  if (!patient) return { error: 'Patient record missing' }

  const transferCode = randomTransferCode('RX')
  const remainingRefills = Math.max(0, prescription.refills_allowed - prescription.refills_used)

  let destinationPrescriptionId: string | null = null
  if (destinationPharmacyId) {
    const { data: destinationPatient } = await service
      .from('patients')
      .select('id')
      .eq('pharmacy_id', destinationPharmacyId)
      .eq('first_name', patient.first_name)
      .eq('last_name', patient.last_name)
      .eq('date_of_birth', patient.date_of_birth)
      .limit(1)
      .maybeSingle()

    let destinationPatientId = destinationPatient?.id ?? null
    if (!destinationPatientId) {
      const { data: createdPatient, error: createPatientError } = await service
        .from('patients')
        .insert({
          pharmacy_id: destinationPharmacyId,
          first_name: patient.first_name,
          last_name: patient.last_name,
          date_of_birth: patient.date_of_birth,
          phone: patient.phone,
          email: patient.email,
          gender: patient.gender,
          allergies: patient.allergies,
          medical_conditions: patient.medical_conditions,
          preferred_language: patient.preferred_language,
          notes: `Created from transfer ${transferCode}`,
        })
        .select('id')
        .single()
      if (createPatientError || !createdPatient) {
        return { error: createPatientError?.message ?? 'Failed to create patient at destination' }
      }
      destinationPatientId = createdPatient.id
    }

    const { data: newPrescription, error: destinationRxError } = await service
      .from('prescriptions')
      .insert({
        pharmacy_id: destinationPharmacyId,
        patient_id: destinationPatientId,
        provider_id: prescription.provider_id,
        medication_id: prescription.medication_id,
        status: 'received' as PrescriptionStatus,
        written_date: prescription.written_date,
        expiration_date: prescription.expiration_date,
        days_supply: prescription.days_supply,
        quantity: prescription.quantity,
        refills_allowed: prescription.refills_allowed,
        refills_used: prescription.refills_used,
        sig: prescription.sig,
        daw_code: prescription.daw_code,
        is_controlled: prescription.is_controlled,
        is_electronic: prescription.is_electronic,
        notes: `Transferred from ${prescription.pharmacy_id} (${transferCode})`,
      })
      .select('id')
      .single()

    if (destinationRxError || !newPrescription) {
      return { error: destinationRxError?.message ?? 'Failed to create destination prescription' }
    }
    destinationPrescriptionId = newPrescription.id
  }

  const { data: transfer, error: transferError } = await service
    .from('prescription_transfers')
    .insert({
      transfer_code: transferCode,
      from_pharmacy_id: prescription.pharmacy_id,
      to_pharmacy_id: destinationPharmacyId,
      original_prescription_id: prescription.id,
      new_prescription_id: destinationPrescriptionId,
      patient_snapshot: toPatientSnapshot(patient),
      prescription_snapshot: toPrescriptionSnapshot({
        rx_number: prescription.rx_number,
        written_date: prescription.written_date,
        expiration_date: prescription.expiration_date,
        days_supply: prescription.days_supply,
        quantity: prescription.quantity,
        refills_allowed: prescription.refills_allowed,
        refills_used: prescription.refills_used,
        sig: prescription.sig,
        daw_code: prescription.daw_code,
        is_controlled: prescription.is_controlled,
        notes: prescription.notes,
        medication_id: prescription.medication_id,
        provider_id: prescription.provider_id,
      }),
      remaining_refills: remainingRefills,
      reason,
      authorization_user_id: context.userId,
      status: destinationPharmacyId ? 'received' : 'initiated',
      received_at: destinationPharmacyId ? new Date().toISOString() : null,
    })
    .select('*')
    .single()

  if (transferError || !transfer) {
    return { error: transferError?.message ?? 'Failed to create transfer record' }
  }

  const { error: originalRxUpdateError } = await service
    .from('prescriptions')
    .update({
      status: 'transferred' as PrescriptionStatus,
      notes: reason ? `${prescription.notes ?? ''}\nTransferred: ${reason}`.trim() : prescription.notes,
    })
    .eq('id', prescription.id)

  if (originalRxUpdateError) return { error: originalRxUpdateError.message }

  await service.from('notifications').insert({
    pharmacy_id: prescription.pharmacy_id,
    patient_id: prescription.patient_id,
    channel: 'system',
    template: 'prescription_transferred',
    status: 'processed',
    metadata: {
      transfer_code: transferCode,
      from_pharmacy_id: prescription.pharmacy_id,
      to_pharmacy_id: destinationPharmacyId,
      original_prescription_id: prescription.id,
      new_prescription_id: destinationPrescriptionId,
    } as Json,
  })
  await notifyPatientTransfer(service, {
    pharmacyId: prescription.pharmacy_id,
    patientId: prescription.patient_id,
    rxNumber: prescription.rx_number,
    transferCode,
    patient: {
      first_name: patient.first_name,
      phone: patient.phone,
      email: patient.email,
      sms_opt_in: patient.sms_opt_in,
      email_opt_in: patient.email_opt_in,
    },
  })

  await auditLog('CREATE', 'prescription_transfers', transfer.id, undefined, transfer)
  revalidatePath(`/dashboard/prescriptions/${prescription.id}`)
  revalidatePath('/dashboard/prescriptions')
  revalidatePath('/dashboard/admin/locations')
  return {
    success: true,
    transferCode,
    transferId: transfer.id,
    destinationPrescriptionId,
  }
}

export async function receivePrescriptionTransfer(formData: FormData) {
  const result = await getTransferContext()
  if ('error' in result) return { error: result.error }
  const { context } = result

  if (['viewer', 'cashier', 'technician'].includes(context.role)) {
    return { error: 'Insufficient permissions to receive transfers' }
  }

  const transferCode = extractTransferCode(
    String(formData.get('transfer_code') ?? ''),
    String(formData.get('qr_payload') ?? '')
  )
  if (!transferCode) return { error: 'Transfer code is required' }

  const service = await createServiceClient()
  const { data: transfer } = await service
    .from('prescription_transfers')
    .select('*')
    .eq('transfer_code', transferCode)
    .single()

  if (!transfer) return { error: 'Transfer code not found' }
  if (!context.pharmacyId && context.role !== 'super_admin') return { error: 'No pharmacy assigned' }

  if (transfer.new_prescription_id) {
    await service
      .from('prescription_transfers')
      .update({
        status: 'received',
        received_at: new Date().toISOString(),
        to_pharmacy_id: transfer.to_pharmacy_id ?? context.pharmacyId,
      })
      .eq('id', transfer.id)
    revalidatePath('/dashboard/prescriptions')
    return { success: true, prescriptionId: transfer.new_prescription_id }
  }

  const destinationPharmacyId =
    transfer.to_pharmacy_id ??
    (context.role === 'super_admin'
      ? String(formData.get('destination_pharmacy_id') ?? '').trim()
      : context.pharmacyId)

  if (!destinationPharmacyId) return { error: 'Destination pharmacy is required' }

  const patientSnapshot = transfer.patient_snapshot as Record<string, unknown>
  const rxSnapshot = transfer.prescription_snapshot as Record<string, unknown>

  const { data: patient } = await service
    .from('patients')
    .insert({
      pharmacy_id: destinationPharmacyId,
      first_name: String(patientSnapshot.first_name ?? 'Unknown'),
      last_name: String(patientSnapshot.last_name ?? 'Patient'),
      date_of_birth: String(patientSnapshot.date_of_birth ?? '1970-01-01'),
      phone: (patientSnapshot.phone as string | null) ?? null,
      email: (patientSnapshot.email as string | null) ?? null,
      gender: (patientSnapshot.gender as string | null) ?? null,
      allergies: (patientSnapshot.allergies as string[]) ?? [],
      medical_conditions: (patientSnapshot.medical_conditions as string[]) ?? [],
      preferred_language: String(patientSnapshot.preferred_language ?? 'en'),
      notes: `Imported from transfer ${transferCode}`,
    })
    .select('id')
    .single()

  if (!patient) return { error: 'Failed to create destination patient' }

  const { data: prescription, error: prescriptionError } = await service
    .from('prescriptions')
    .insert({
      pharmacy_id: destinationPharmacyId,
      patient_id: patient.id,
      provider_id: (rxSnapshot.provider_id as string | null) ?? null,
      medication_id: String(rxSnapshot.medication_id ?? ''),
      status: 'received' as PrescriptionStatus,
      written_date: String(rxSnapshot.written_date ?? new Date().toISOString().split('T')[0]),
      expiration_date: (rxSnapshot.expiration_date as string | null) ?? null,
      days_supply: (rxSnapshot.days_supply as number | null) ?? null,
      quantity: Number(rxSnapshot.quantity ?? 0),
      refills_allowed: Number(rxSnapshot.refills_allowed ?? 0),
      refills_used: Number(rxSnapshot.refills_used ?? 0),
      sig: String(rxSnapshot.sig ?? 'Transferred prescription'),
      daw_code: Number(rxSnapshot.daw_code ?? 0),
      is_controlled: Boolean(rxSnapshot.is_controlled ?? false),
      notes: `Received transfer ${transferCode}`,
    })
    .select('id')
    .single()

  if (prescriptionError || !prescription) {
    return { error: prescriptionError?.message ?? 'Failed to create destination prescription' }
  }

  const { error: transferUpdateError } = await service
    .from('prescription_transfers')
    .update({
      to_pharmacy_id: destinationPharmacyId,
      new_prescription_id: prescription.id,
      status: 'received',
      received_at: new Date().toISOString(),
    })
    .eq('id', transfer.id)

  if (transferUpdateError) return { error: transferUpdateError.message }

  await auditLog('UPDATE', 'prescription_transfers', transfer.id, undefined, {
    received_at: new Date().toISOString(),
    new_prescription_id: prescription.id,
  })
  revalidatePath('/dashboard/prescriptions')
  return { success: true, prescriptionId: prescription.id }
}
