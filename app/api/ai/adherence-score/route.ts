import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateAIText, hasOpenAIKey, tryParseJson } from '@/lib/utils/openai'
import type { Json } from '@/lib/supabase/types'

type AdherenceRequest = {
  patientId: string
  prescriptionId?: string
}

type AdherenceInsight = {
  score: number
  risk_level: 'high' | 'medium' | 'low'
  recommendations: string[]
}

function fallbackAdherence(daysSupply: number | null, refillGapDays: number): AdherenceInsight {
  const baseline = daysSupply ? 90 : 75
  const penalty = Math.max(0, refillGapDays * 2)
  const score = Math.max(15, Math.min(99, baseline - penalty))
  const risk_level = score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high'
  const recommendations =
    risk_level === 'high'
      ? ['Immediate pharmacist follow-up', 'Assess side effects and barriers', 'Offer synchronization program']
      : risk_level === 'medium'
        ? ['Send refill reminders', 'Review dosing schedule']
        : ['Continue standard monitoring']

  return { score, risk_level, recommendations }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const payload = (await request.json()) as AdherenceRequest
  if (!payload.patientId) {
    return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
  }

  const service = await createServiceClient()
  let prescriptionQuery = service
    .from('prescriptions')
    .select('id, patient_id, days_supply, dispensed_at, refills_allowed, refills_used')
    .eq('patient_id', payload.patientId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (payload.prescriptionId) {
    prescriptionQuery = prescriptionQuery.eq('id', payload.prescriptionId)
  }

  const { data: prescriptions } = await prescriptionQuery
  const prescription = prescriptions?.[0]
  if (!prescription) {
    return NextResponse.json({ error: 'Prescription not found for patient' }, { status: 404 })
  }

  const { data: refills } = await service
    .from('refills')
    .select('requested_at, dispensed_at, refill_number')
    .eq('prescription_id', prescription.id)
    .order('refill_number', { ascending: false })

  const latestDispensed = refills?.find((refill) => Boolean(refill.dispensed_at))?.dispensed_at ?? prescription.dispensed_at
  const lastDispensedDate = latestDispensed ? new Date(latestDispensed) : null
  const now = new Date()
  const daysSinceDispensed = lastDispensedDate
    ? Math.floor((now.getTime() - lastDispensedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const expectedCycle = prescription.days_supply ?? 30
  const refillGapDays = Math.max(0, daysSinceDispensed - expectedCycle)

  let insight = fallbackAdherence(prescription.days_supply, refillGapDays)

  if (hasOpenAIKey()) {
    try {
      const prompt = `Given refill adherence signals, provide adherence risk JSON:
{ "score": number, "risk_level": "high"|"medium"|"low", "recommendations": string[] }.

Signals:
${JSON.stringify({
  daysSinceDispensed,
  expectedCycle,
  refillGapDays,
  refillsAllowed: prescription.refills_allowed,
  refillsUsed: prescription.refills_used,
})}`

      const aiOutput = await generateAIText([
        { role: 'system', content: 'Return strict JSON for adherence scoring.' },
        { role: 'user', content: prompt },
      ])
      const parsed = tryParseJson<AdherenceInsight>(aiOutput)
      if (parsed && typeof parsed.score === 'number' && Array.isArray(parsed.recommendations)) {
        insight = {
          score: Math.min(99, Math.max(1, parsed.score)),
          risk_level: parsed.risk_level || insight.risk_level,
          recommendations: parsed.recommendations,
        }
      }
    } catch {
      // use fallback
    }
  }

  const { data: stored } = await service
    .from('adherence_scores')
    .insert({
      patient_id: payload.patientId,
      prescription_id: prescription.id,
      score: Number(insight.score.toFixed(2)),
      risk_level: insight.risk_level,
      recommendations: insight.recommendations as Json,
      model_version: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })
    .select('id, calculated_at')
    .single()

  return NextResponse.json({
    patientId: payload.patientId,
    prescriptionId: prescription.id,
    scoreId: stored?.id ?? null,
    calculatedAt: stored?.calculated_at ?? new Date().toISOString(),
    ...insight,
  })
}
