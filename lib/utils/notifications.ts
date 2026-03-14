import type { Json } from '@/lib/supabase/types'

export type NotificationPreferenceFlags = {
  prescription_ready: boolean
  refill_reminder: boolean
  adherence: boolean
  health_alert: boolean
}

export type ContactTimeWindow = {
  start: string
  end: string
}

export type DeliveryResult = {
  ok: boolean
  provider: 'twilio' | 'resend'
  externalId?: string
  error?: string
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceFlags = {
  prescription_ready: true,
  refill_reminder: true,
  adherence: true,
  health_alert: true,
}

const DEFAULT_CONTACT_TIME_WINDOW: ContactTimeWindow = {
  start: '08:00',
  end: '21:00',
}

export function parseNotificationPreferences(value: Json | null | undefined): NotificationPreferenceFlags {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }

  return {
    prescription_ready: value.prescription_ready !== false,
    refill_reminder: value.refill_reminder !== false,
    adherence: value.adherence !== false,
    health_alert: value.health_alert !== false,
  }
}

export function parseContactTimeWindow(value: Json | null | undefined): ContactTimeWindow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_CONTACT_TIME_WINDOW
  }

  const start = typeof value.start === 'string' ? value.start : DEFAULT_CONTACT_TIME_WINDOW.start
  const end = typeof value.end === 'string' ? value.end : DEFAULT_CONTACT_TIME_WINDOW.end

  return { start, end }
}

export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (phone.startsWith('+')) return phone
  return `+${digits}`
}

export function getLast4Digits(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, '')
  if (!digits || digits.length < 4) return null
  return digits.slice(-4)
}

export function buildPrescriptionReadyMessage(patientFirstName: string, rxNumber: string) {
  return `Hi ${patientFirstName}, your prescription ${rxNumber} is ready for pickup. Reply STATUS for updates or STOP to opt out of SMS.`
}

export function buildRefillReminderMessage(patientFirstName: string, rxNumber: string) {
  return `Hi ${patientFirstName}, refill reminder for ${rxNumber}. Reply REFILL ${rxNumber} to request it now, or STOP to opt out of SMS.`
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function toTwimlMessage(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
}

export async function sendSmsViaTwilio(to: string, body: string): Promise<DeliveryResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromPhone = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromPhone) {
    return { ok: false, provider: 'twilio', error: 'Twilio is not configured' }
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const payload = new URLSearchParams({
    To: to,
    From: fromPhone,
    Body: body,
  })

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({} as Record<string, unknown>))

    if (!response.ok) {
      const errorMessage = typeof data.message === 'string' ? data.message : 'Twilio delivery failed'
      return { ok: false, provider: 'twilio', error: errorMessage }
    }

    const sid = typeof data.sid === 'string' ? data.sid : undefined
    return { ok: true, provider: 'twilio', externalId: sid }
  } catch (error) {
    return {
      ok: false,
      provider: 'twilio',
      error: error instanceof Error ? error.message : 'Twilio delivery failed',
    }
  }
}

export async function sendEmailViaResend(
  to: string,
  subject: string,
  text: string
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.FROM_EMAIL

  if (!apiKey || !from) {
    return { ok: false, provider: 'resend', error: 'Resend is not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: `<p>${text.replace(/\n/g, '<br/>')}</p>`,
      }),
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({} as Record<string, unknown>))

    if (!response.ok) {
      const errorMessage = typeof data.message === 'string' ? data.message : 'Email delivery failed'
      return { ok: false, provider: 'resend', error: errorMessage }
    }

    const id = typeof data.id === 'string' ? data.id : undefined
    return { ok: true, provider: 'resend', externalId: id }
  } catch (error) {
    return {
      ok: false,
      provider: 'resend',
      error: error instanceof Error ? error.message : 'Email delivery failed',
    }
  }
}
