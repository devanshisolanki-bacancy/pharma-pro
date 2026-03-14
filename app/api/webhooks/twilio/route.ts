import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createRefillRequest } from '@/lib/utils/refill-requests'
import { getLast4Digits, normalizePhoneNumber, toTwimlMessage } from '@/lib/utils/notifications'
import type { Json } from '@/lib/supabase/types'

function normalizeMessageParts(body: string) {
  return body
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
}

function createXmlResponse(message: string) {
  return new NextResponse(toTwimlMessage(message), {
    status: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function toStatusLabel(status: string) {
  return status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function POST(request: NextRequest) {
  const supabase = await createServiceClient()
  const formData = await request.formData()

  const fromRaw = String(formData.get('From') ?? '')
  const bodyRaw = String(formData.get('Body') ?? '')
  const parts = normalizeMessageParts(bodyRaw)
  const command = parts[0]?.toUpperCase() ?? 'HELP'
  const rxFromCommand = parts[1]?.toUpperCase()

  const normalizedFrom = normalizePhoneNumber(fromRaw)
  const last4 = getLast4Digits(normalizedFrom)

  if (!last4) {
    return createXmlResponse('Invalid phone number. Please contact the pharmacy directly.')
  }

  const { data: patients } = await supabase
    .from('patients')
    .select('id, pharmacy_id, first_name, sms_opt_in')
    .ilike('phone', `%${last4}`)
    .limit(1)

  const patient = patients?.[0]

  if (!patient) {
    return createXmlResponse('We could not verify your account. Please call the pharmacy for help.')
  }

  await supabase.from('notifications').insert({
    pharmacy_id: patient.pharmacy_id,
    patient_id: patient.id,
    channel: 'sms',
    template: 'twilio_inbound',
    status: 'processed',
    metadata: {
      from: fromRaw,
      command,
      body: bodyRaw,
    } as Json,
  })

  let reply = 'HELP: Reply REFILL [RX#], STATUS [RX#], or STOP to opt out.'

  if (command === 'STOP') {
    await supabase
      .from('patients')
      .update({
        sms_opt_in: false,
        sms_opted_out_at: new Date().toISOString(),
      })
      .eq('id', patient.id)

    reply = 'You are now opted out of pharmacy SMS alerts. Reply HELP for options or call the pharmacy.'
  } else if (command === 'HELP') {
    reply = 'Commands: REFILL [RX#] to request refill, STATUS [RX#] for status, STOP to opt out.'
  } else if (command === 'STATUS') {
    let rxQuery = supabase
      .from('prescriptions')
      .select('id, rx_number, status')
      .eq('patient_id', patient.id)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (rxFromCommand) {
      rxQuery = rxQuery.eq('rx_number', rxFromCommand)
    }

    const { data: prescriptions } = await rxQuery
    const rx = prescriptions?.[0]

    if (!rx) {
      reply = rxFromCommand
        ? `No prescription found for ${rxFromCommand}.`
        : 'No recent prescription found.'
    } else {
      reply = `Prescription ${rx.rx_number} is currently ${toStatusLabel(rx.status)}.`
    }
  } else if (command === 'REFILL') {
    let rxQuery = supabase
      .from('prescriptions')
      .select('id, rx_number, status')
      .eq('patient_id', patient.id)
      .in('status', ['ready', 'dispensed', 'received', 'verified', 'filling', 'quality_check'])
      .order('updated_at', { ascending: false })
      .limit(1)

    if (rxFromCommand) {
      rxQuery = rxQuery.eq('rx_number', rxFromCommand)
    }

    const { data: prescriptions } = await rxQuery
    const rx = prescriptions?.[0]

    if (!rx) {
      reply = rxFromCommand
        ? `No refill-eligible prescription found for ${rxFromCommand}.`
        : 'No refill-eligible prescription found.'
    } else if (!patient.sms_opt_in) {
      reply = 'SMS notifications are currently disabled for your account. Call the pharmacy to request refill.'
    } else {
      const refillResult = await createRefillRequest(supabase, {
        prescriptionId: rx.id,
        source: 'sms',
      })
      if (refillResult.success) {
        reply = `Refill request received for ${rx.rx_number}. We will notify you when it is ready.`
      } else {
        reply = refillResult.error ?? 'Unable to process refill request at this time.'
      }
    }
  }

  await supabase.from('notifications').insert({
    pharmacy_id: patient.pharmacy_id,
    patient_id: patient.id,
    channel: 'sms',
    template: 'twilio_reply',
    status: 'sent',
    sent_at: new Date().toISOString(),
    metadata: {
      to: fromRaw,
      command,
      body: reply,
    } as Json,
  })

  return createXmlResponse(reply)
}
