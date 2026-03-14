import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateAIText, hasOpenAIKey, tryParseJson } from '@/lib/utils/openai'

type MTMRequest = {
  patientId: string
}

type MTMSuggestion = {
  title: string
  rationale: string
  priority: 'high' | 'medium' | 'low'
}

function fallbackSuggestions(): MTMSuggestion[] {
  return [
    {
      title: 'Comprehensive medication reconciliation',
      rationale: 'Review active and historical medications for duplicate therapy and adherence barriers.',
      priority: 'high',
    },
    {
      title: 'Adherence outreach',
      rationale: 'Schedule pharmacist counseling call for refill timing and side effect management.',
      priority: 'medium',
    },
  ]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const payload = (await request.json()) as MTMRequest
  if (!payload.patientId) {
    return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
  }

  const service = await createServiceClient()
  const [patientResult, medicationsResult] = await Promise.all([
    service
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, medical_conditions, allergies')
      .eq('id', payload.patientId)
      .single(),
    service
      .from('prescriptions')
      .select('id, medication_id, status, sig, medications(name, drug_class, contraindications)')
      .eq('patient_id', payload.patientId)
      .not('status', 'in', '(cancelled,transferred)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!patientResult.data) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const patient = patientResult.data
  const medications = medicationsResult.data ?? []
  let suggestions = fallbackSuggestions()

  if (hasOpenAIKey()) {
    try {
      const prompt = `You are a clinical pharmacist.
Generate medication therapy management suggestions for this patient.
Return strict JSON array:
[{ "title": string, "rationale": string, "priority": "high"|"medium"|"low" }]

Patient:
${JSON.stringify(patient)}

Active medications:
${JSON.stringify(medications)}`

      const aiOutput = await generateAIText([
        { role: 'system', content: 'Return concise MTM recommendations as strict JSON.' },
        { role: 'user', content: prompt },
      ])

      const parsed = tryParseJson<MTMSuggestion[]>(aiOutput)
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        suggestions = parsed
      }
    } catch {
      // fallback suggestions retained
    }
  }

  return NextResponse.json({
    patientId: payload.patientId,
    suggestions,
  })
}
