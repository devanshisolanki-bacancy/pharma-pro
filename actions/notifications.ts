'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createRefillRequest } from '@/lib/utils/refill-requests'
import {
  buildPrescriptionReadyMessage,
  buildRefillReminderMessage,
  normalizePhoneNumber,
  parseNotificationPreferences,
  sendEmailViaResend,
  sendSmsViaTwilio,
} from '@/lib/utils/notifications'
import type { Json } from '@/lib/supabase/types'

type PatientWithNotificationPrefs = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  preferred_language: string
  sms_opt_in: boolean
  email_opt_in: boolean
  preferred_notification_channel: string
  notification_preferences: Json
}

async function getAuthenticatedPharmacyContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id')
    .eq('id', user.id)
    .single<{ pharmacy_id: string | null }>()

  if (!profile?.pharmacy_id) return { error: 'No pharmacy assigned' as const }
  return { pharmacyId: profile.pharmacy_id, userId: user.id }
}

async function logNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    pharmacy_id: string
    patient_id: string
    channel: 'sms' | 'email' | 'system'
    template: string
    status: 'pending' | 'sent' | 'failed' | 'processed'
    metadata: Json
    sent_at?: string
  }
) {
  await supabase.from('notifications').insert(payload)
}

function normalizeRxNumber(value: string) {
  return value.trim().toUpperCase()
}

async function dispatchPrescriptionReady(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: {
    pharmacyId: string
    prescriptionId: string
    rxNumber: string
    patient: PatientWithNotificationPrefs
  }
) {
  const patientPrefs = parseNotificationPreferences(data.patient.notification_preferences)
  const smsBody = buildPrescriptionReadyMessage(data.patient.first_name, data.rxNumber)
  const emailSubject = `Prescription ${data.rxNumber} is ready`
  const results: Array<{ channel: 'sms' | 'email'; status: 'sent' | 'failed'; message: string }> = []

  if (patientPrefs.prescription_ready) {
    if (data.patient.sms_opt_in && data.patient.phone) {
      const normalizedPhone = normalizePhoneNumber(data.patient.phone)
      if (!normalizedPhone) {
        results.push({ channel: 'sms', status: 'failed', message: 'Invalid patient phone number' })
      } else {
        const smsResult = await sendSmsViaTwilio(normalizedPhone, smsBody)
        await logNotification(supabase, {
          pharmacy_id: data.pharmacyId,
          patient_id: data.patient.id,
          channel: 'sms',
          template: 'prescription_ready',
          status: smsResult.ok ? 'sent' : 'failed',
          sent_at: smsResult.ok ? new Date().toISOString() : undefined,
          metadata: {
            prescription_id: data.prescriptionId,
            rx_number: data.rxNumber,
            provider: 'twilio',
            external_id: smsResult.externalId ?? null,
            error: smsResult.error ?? null,
          },
        })
        results.push({
          channel: 'sms',
          status: smsResult.ok ? 'sent' : 'failed',
          message: smsResult.ok ? 'SMS sent' : smsResult.error ?? 'SMS failed',
        })
      }
    }

    if (data.patient.email_opt_in && data.patient.email) {
      const emailText = `Hi ${data.patient.first_name},

Your prescription ${data.rxNumber} is ready for pickup.

Thank you,
PharmaTech Pro`

      const emailResult = await sendEmailViaResend(data.patient.email, emailSubject, emailText)
      await logNotification(supabase, {
        pharmacy_id: data.pharmacyId,
        patient_id: data.patient.id,
        channel: 'email',
        template: 'prescription_ready',
        status: emailResult.ok ? 'sent' : 'failed',
        sent_at: emailResult.ok ? new Date().toISOString() : undefined,
        metadata: {
          prescription_id: data.prescriptionId,
          rx_number: data.rxNumber,
          provider: 'resend',
          external_id: emailResult.externalId ?? null,
          error: emailResult.error ?? null,
        },
      })
      results.push({
        channel: 'email',
        status: emailResult.ok ? 'sent' : 'failed',
        message: emailResult.ok ? 'Email sent' : emailResult.error ?? 'Email failed',
      })
    }
  }

  return results
}

export async function sendPrescriptionReady(prescriptionId: string) {
  const supabase = await createClient()
  const context = await getAuthenticatedPharmacyContext(supabase)
  if ('error' in context) return { error: context.error }

  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('id, pharmacy_id, rx_number, patient_id, patients(id, first_name, last_name, phone, email, preferred_language, sms_opt_in, email_opt_in, preferred_notification_channel, notification_preferences)')
    .eq('id', prescriptionId)
    .single()

  if (!prescription) return { error: 'Prescription not found' }

  const patient = prescription.patients as PatientWithNotificationPrefs | null
  if (!patient) return { error: 'Patient record not found' }

  const results = await dispatchPrescriptionReady(supabase, {
    pharmacyId: context.pharmacyId,
    prescriptionId,
    rxNumber: prescription.rx_number,
    patient,
  })

  if (results.length === 0) {
    return { error: 'No delivery channel available for this patient or preferences disabled' }
  }

  revalidatePath('/dashboard/communications')
  revalidatePath(`/dashboard/prescriptions/${prescriptionId}`)
  return { success: true, results }
}

export async function scheduleRefillReminders(prescriptionId: string) {
  const supabase = await createClient()
  const context = await getAuthenticatedPharmacyContext(supabase)
  if ('error' in context) return { error: context.error }

  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('id, pharmacy_id, patient_id, rx_number, days_supply, refills_allowed, refills_used, patients(id, first_name, phone, email, sms_opt_in, email_opt_in, notification_preferences)')
    .eq('id', prescriptionId)
    .single()

  if (!prescription) return { error: 'Prescription not found' }

  const patient = prescription.patients as Pick<PatientWithNotificationPrefs, 'id' | 'first_name' | 'phone' | 'email' | 'sms_opt_in' | 'email_opt_in' | 'notification_preferences'> | null
  if (!patient) return { error: 'Patient record not found' }

  const prefs = parseNotificationPreferences(patient.notification_preferences)
  if (!prefs.refill_reminder) {
    return { error: 'Patient has refill reminders disabled' }
  }

  const daysSupply = prescription.days_supply ?? 30
  const refillsRemaining = Math.max(0, prescription.refills_allowed - prescription.refills_used)
  if (refillsRemaining <= 0) return { error: 'No refills remaining to schedule' }

  const reminderDays = Math.max(1, Math.floor(daysSupply * 0.75))
  const scheduledFor = new Date()
  scheduledFor.setDate(scheduledFor.getDate() + reminderDays)
  scheduledFor.setHours(15, 0, 0, 0)

  const inserts: Array<{
    pharmacy_id: string
    patient_id: string
    channel: 'sms' | 'email'
    template: string
    status: string
    metadata: Json
  }> = []

  if (patient.sms_opt_in && patient.phone) {
    inserts.push({
      pharmacy_id: context.pharmacyId,
      patient_id: patient.id,
      channel: 'sms',
      template: 'refill_reminder',
      status: 'pending',
      metadata: {
        scheduled_for: scheduledFor.toISOString(),
        prescription_id: prescriptionId,
        rx_number: prescription.rx_number,
        patient_first_name: patient.first_name,
      },
    })
  }

  if (patient.email_opt_in && patient.email) {
    inserts.push({
      pharmacy_id: context.pharmacyId,
      patient_id: patient.id,
      channel: 'email',
      template: 'refill_reminder',
      status: 'pending',
      metadata: {
        scheduled_for: scheduledFor.toISOString(),
        prescription_id: prescriptionId,
        rx_number: prescription.rx_number,
        patient_first_name: patient.first_name,
      },
    })
  }

  if (inserts.length === 0) {
    return { error: 'No delivery channel available for refill reminders' }
  }

  const { error } = await supabase.from('notifications').insert(inserts)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/communications')
  revalidatePath(`/dashboard/prescriptions/${prescriptionId}`)
  return { success: true, scheduledFor: scheduledFor.toISOString(), count: inserts.length }
}

export async function sendRefillReminder(patientId: string, prescriptionId: string) {
  const supabase = await createClient()
  const context = await getAuthenticatedPharmacyContext(supabase)
  if ('error' in context) return { error: context.error }

  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('id, pharmacy_id, rx_number, patient_id')
    .eq('id', prescriptionId)
    .eq('patient_id', patientId)
    .single()

  if (!prescription) return { error: 'Prescription not found' }

  const { data: patient } = await supabase
    .from('patients')
    .select('id, first_name, phone, email, sms_opt_in, email_opt_in, notification_preferences')
    .eq('id', patientId)
    .single()

  if (!patient) return { error: 'Patient not found' }

  const prefs = parseNotificationPreferences(patient.notification_preferences)
  if (!prefs.refill_reminder) return { error: 'Patient has refill reminders disabled' }

  const message = buildRefillReminderMessage(patient.first_name, prescription.rx_number)
  const results: Array<{ channel: 'sms' | 'email'; status: 'sent' | 'failed'; message: string }> = []

  if (patient.sms_opt_in && patient.phone) {
    const normalizedPhone = normalizePhoneNumber(patient.phone)
    if (!normalizedPhone) {
      results.push({ channel: 'sms', status: 'failed', message: 'Invalid patient phone number' })
    } else {
      const smsResult = await sendSmsViaTwilio(normalizedPhone, message)
      await logNotification(supabase, {
        pharmacy_id: context.pharmacyId,
        patient_id: patient.id,
        channel: 'sms',
        template: 'refill_reminder',
        status: smsResult.ok ? 'sent' : 'failed',
        sent_at: smsResult.ok ? new Date().toISOString() : undefined,
        metadata: {
          prescription_id: prescriptionId,
          rx_number: prescription.rx_number,
          provider: 'twilio',
          external_id: smsResult.externalId ?? null,
          error: smsResult.error ?? null,
        },
      })
      results.push({
        channel: 'sms',
        status: smsResult.ok ? 'sent' : 'failed',
        message: smsResult.ok ? 'SMS sent' : smsResult.error ?? 'SMS failed',
      })
    }
  }

  if (patient.email_opt_in && patient.email) {
    const emailText = `Hi ${patient.first_name},

This is your refill reminder for prescription ${prescription.rx_number}.

Reply to this message or contact the pharmacy to request your refill.`

    const emailResult = await sendEmailViaResend(
      patient.email,
      `Refill reminder for ${prescription.rx_number}`,
      emailText
    )
    await logNotification(supabase, {
      pharmacy_id: context.pharmacyId,
      patient_id: patient.id,
      channel: 'email',
      template: 'refill_reminder',
      status: emailResult.ok ? 'sent' : 'failed',
      sent_at: emailResult.ok ? new Date().toISOString() : undefined,
      metadata: {
        prescription_id: prescriptionId,
        rx_number: prescription.rx_number,
        provider: 'resend',
        external_id: emailResult.externalId ?? null,
        error: emailResult.error ?? null,
      },
    })
    results.push({
      channel: 'email',
      status: emailResult.ok ? 'sent' : 'failed',
      message: emailResult.ok ? 'Email sent' : emailResult.error ?? 'Email failed',
    })
  }

  if (results.length === 0) {
    return { error: 'No delivery channel available for this patient or preferences disabled' }
  }

  revalidatePath('/dashboard/communications')
  return { success: true, results }
}

export async function processRefillRequest(patientId: string, rxNumber: string) {
  const supabase = await createClient()
  const context = await getAuthenticatedPharmacyContext(supabase)
  if ('error' in context) return { error: context.error }

  const normalizedRxNumber = normalizeRxNumber(rxNumber)
  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('id, pharmacy_id')
    .eq('patient_id', patientId)
    .eq('rx_number', normalizedRxNumber)
    .single()

  if (!prescription) return { error: `Prescription ${normalizedRxNumber} not found for patient` }
  if (prescription.pharmacy_id !== context.pharmacyId) {
    return { error: 'Prescription does not belong to your pharmacy' }
  }

  const result = await createRefillRequest(supabase, {
    prescriptionId: prescription.id,
    source: 'dashboard',
  })

  if (!result.success) return { error: result.error ?? 'Unable to create refill request' }

  revalidatePath('/dashboard/workflow')
  revalidatePath(`/dashboard/prescriptions/${prescription.id}`)
  return { success: true, data: result }
}

export async function updateNotificationPreferences(patientId: string, formData: FormData) {
  const supabase = await createClient()
  const context = await getAuthenticatedPharmacyContext(supabase)
  if ('error' in context) return { error: context.error }

  const smsOptIn = formData.get('sms_opt_in') === 'on'
  const emailOptIn = formData.get('email_opt_in') === 'on'
  const preferredChannel = formData.get('preferred_notification_channel') === 'email' ? 'email' : 'sms'
  const contactStart = String(formData.get('contact_start') || '08:00')
  const contactEnd = String(formData.get('contact_end') || '21:00')

  const notificationPrefs = {
    prescription_ready: formData.get('pref_prescription_ready') === 'on',
    refill_reminder: formData.get('pref_refill_reminder') === 'on',
    adherence: formData.get('pref_adherence') === 'on',
    health_alert: formData.get('pref_health_alert') === 'on',
  }

  const updatePayload: Record<string, Json | string | boolean | null> = {
    sms_opt_in: smsOptIn,
    email_opt_in: emailOptIn,
    preferred_notification_channel: preferredChannel,
    contact_time_window: {
      start: contactStart,
      end: contactEnd,
    },
    notification_preferences: notificationPrefs,
  }

  if (smsOptIn) {
    updatePayload.sms_opted_in_at = new Date().toISOString()
    updatePayload.sms_opted_out_at = null
  } else {
    updatePayload.sms_opted_out_at = new Date().toISOString()
  }

  const { data: updatedPatient, error } = await supabase
    .from('patients')
    .update(updatePayload)
    .eq('id', patientId)
    .eq('pharmacy_id', context.pharmacyId)
    .select('id')
    .single()

  if (error || !updatedPatient) {
    return { error: error?.message ?? 'Unable to update notification preferences' }
  }

  await logNotification(supabase, {
    pharmacy_id: context.pharmacyId,
    patient_id: patientId,
    channel: 'system',
    template: 'preferences_updated',
    status: 'processed',
    metadata: {
      sms_opt_in: smsOptIn,
      email_opt_in: emailOptIn,
      preferred_channel: preferredChannel,
      notification_preferences: notificationPrefs,
      contact_time_window: {
        start: contactStart,
        end: contactEnd,
      },
    },
  })

  revalidatePath(`/dashboard/patients/${patientId}`)
  revalidatePath('/dashboard/communications')
  return { success: true }
}
