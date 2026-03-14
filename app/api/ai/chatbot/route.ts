import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateAIText, hasOpenAIKey } from '@/lib/utils/openai'
import type { Json } from '@/lib/supabase/types'

type ChatRequest = {
  message: string
  patientId: string
  conversationId?: string
}

function fallbackChatReply(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('side effect')) {
    return 'Possible side effects vary by medication. Please review your label instructions and contact your pharmacist for personalized guidance.'
  }
  if (lower.includes('refill')) {
    return 'You can request a refill in the portal or by replying REFILL with your Rx number by SMS. If urgent, call your pharmacy directly.'
  }
  return 'I can help with medication instructions, refill questions, and general pharmacy guidance. For diagnoses or medical decisions, please speak with your pharmacist.'
}

function streamText(text: string) {
  const encoder = new TextEncoder()
  const words = text.split(' ')

  return new ReadableStream({
    start(controller) {
      let index = 0
      const timer = setInterval(() => {
        if (index >= words.length) {
          clearInterval(timer)
          controller.close()
          return
        }
        const chunk = `${words[index]}${index < words.length - 1 ? ' ' : ''}`
        controller.enqueue(encoder.encode(chunk))
        index += 1
      }, 25)
    },
  })
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ChatRequest
  if (!payload.message?.trim() || !payload.patientId) {
    return new Response('Missing message or patientId', { status: 400 })
  }

  const service = await createServiceClient()
  const { data: patient } = await service
    .from('patients')
    .select('id, pharmacy_id, first_name, last_name')
    .eq('id', payload.patientId)
    .single()

  if (!patient) {
    return new Response('Patient not found', { status: 404 })
  }

  const { data: meds } = await service
    .from('prescriptions')
    .select('status, sig, medications(name, strength, dosage_form)')
    .eq('patient_id', payload.patientId)
    .not('status', 'in', '(cancelled,transferred)')
    .order('created_at', { ascending: false })
    .limit(15)

  let sessionId = payload.conversationId || ''
  if (sessionId) {
    const { data: session } = await service
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) sessionId = ''
  }

  if (!sessionId) {
    const { data: createdSession, error: createSessionError } = await service
      .from('chat_sessions')
      .insert({
        patient_id: payload.patientId,
        pharmacy_id: patient.pharmacy_id,
        conversation_title: `Chat with ${patient.first_name} ${patient.last_name}`,
      })
      .select('id')
      .single()

    if (createSessionError || !createdSession) {
      return new Response(createSessionError?.message || 'Failed to create chat session', { status: 500 })
    }
    sessionId = createdSession.id
  }

  await service.from('chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: payload.message,
    metadata: {
      source: 'portal',
    } as Json,
  })

  const medicationContext = (meds ?? []).map((item) => {
    const medication = item.medications as { name: string; strength: string | null; dosage_form: string | null } | null
    return {
      medication: medication?.name ?? 'Unknown',
      strength: medication?.strength,
      dosage_form: medication?.dosage_form,
      status: item.status,
      sig: item.sig,
    }
  })

  let responseText = fallbackChatReply(payload.message)
  if (hasOpenAIKey()) {
    try {
      const aiOutput = await generateAIText([
        {
          role: 'system',
          content:
            'You are PharmaCare AI, a helpful pharmacy assistant. You can answer medication and refill questions. You cannot diagnose. Always recommend pharmacist consultation for clinical decisions.',
        },
        {
          role: 'user',
          content: `Patient medication context: ${JSON.stringify(medicationContext)}\n\nQuestion: ${payload.message}`,
        },
      ])
      if (aiOutput.trim()) {
        responseText = aiOutput.trim()
      }
    } catch {
      // Keep fallback response.
    }
  }

  await service.from('chat_messages').insert({
    session_id: sessionId,
    role: 'assistant',
    content: responseText,
    metadata: {
      escalation: /pharmacist|doctor|emergency/i.test(responseText),
    } as Json,
  })

  await service
    .from('chat_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', sessionId)

  const stream = streamText(responseText)
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Conversation-Id': sessionId,
    },
  })
}
