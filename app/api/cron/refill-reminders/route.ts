import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buildRefillReminderMessage,
  normalizePhoneNumber,
  sendEmailViaResend,
  sendSmsViaTwilio,
} from '@/lib/utils/notifications'
import type { Json } from '@/lib/supabase/types'

type ReminderMetadata = {
  scheduled_for?: string
  prescription_id?: string
  rx_number?: string
  patient_first_name?: string
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function parseMetadata(value: Json): ReminderMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return {
    scheduled_for: typeof value.scheduled_for === 'string' ? value.scheduled_for : undefined,
    prescription_id: typeof value.prescription_id === 'string' ? value.prescription_id : undefined,
    rx_number: typeof value.rx_number === 'string' ? value.rx_number : undefined,
    patient_first_name: typeof value.patient_first_name === 'string' ? value.patient_first_name : undefined,
  }
}

export async function POST(request: NextRequest) {
  const providedSecret = request.headers.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return unauthorized()
  }

  const supabase = await createServiceClient()
  const nowIso = new Date().toISOString()

  const { data: pendingNotifications, error } = await supabase
    .from('notifications')
    .select('id, channel, patient_id, metadata')
    .eq('template', 'refill_reminder')
    .eq('status', 'pending')
    .filter('metadata->>scheduled_for', 'lte', nowIso)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const reminder of pendingNotifications ?? []) {
    const metadata = parseMetadata(reminder.metadata)
    const rxNumber = metadata.rx_number ?? 'your prescription'
    const patientFirstName = metadata.patient_first_name ?? 'Patient'
    const text = buildRefillReminderMessage(patientFirstName, rxNumber)

    const { data: patient } = await supabase
      .from('patients')
      .select('id, email, phone')
      .eq('id', reminder.patient_id ?? '')
      .single()

    if (!patient) {
      failed += 1
      await supabase
        .from('notifications')
        .update({
          status: 'failed',
          metadata: {
            ...metadata,
            error: 'Patient not found',
          },
        })
        .eq('id', reminder.id)
      continue
    }

    let deliveryOk = false
    let deliveryError: string | null = null
    let externalId: string | null = null

    if (reminder.channel === 'sms') {
      const phone = normalizePhoneNumber(patient.phone)
      if (!phone) {
        deliveryError = 'Invalid phone number'
      } else {
        const smsResult = await sendSmsViaTwilio(phone, text)
        deliveryOk = smsResult.ok
        deliveryError = smsResult.error ?? null
        externalId = smsResult.externalId ?? null
      }
    } else if (reminder.channel === 'email') {
      if (!patient.email) {
        deliveryError = 'Missing email'
      } else {
        const emailResult = await sendEmailViaResend(
          patient.email,
          `Refill reminder for ${rxNumber}`,
          text
        )
        deliveryOk = emailResult.ok
        deliveryError = emailResult.error ?? null
        externalId = emailResult.externalId ?? null
      }
    } else {
      deliveryError = `Unsupported channel: ${reminder.channel}`
    }

    await supabase
      .from('notifications')
      .update({
        status: deliveryOk ? 'sent' : 'failed',
        sent_at: deliveryOk ? new Date().toISOString() : null,
        metadata: {
          ...metadata,
          delivered_at: deliveryOk ? new Date().toISOString() : null,
          error: deliveryError,
          external_id: externalId,
        },
      })
      .eq('id', reminder.id)

    if (deliveryOk) sent += 1
    else failed += 1
  }

  return NextResponse.json({
    scanned: pendingNotifications?.length ?? 0,
    sent,
    failed,
    processed_at: nowIso,
  })
}
