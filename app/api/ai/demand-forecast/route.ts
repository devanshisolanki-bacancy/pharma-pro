import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateAIText, hasOpenAIKey, tryParseJson } from '@/lib/utils/openai'
import type { Json } from '@/lib/supabase/types'

type ForecastRequest = {
  pharmacyId?: string
  medicationIds: string[]
  forecastDays: 30 | 60 | 90
}

type ForecastResult = {
  medication_id: string
  predicted_demand: number
  confidence: number
  recommendation: string
}

function fallbackForecast(
  medicationId: string,
  forecastDays: number,
  dispensedCount: number,
  currentStock: number,
  reorderPoint: number
): ForecastResult {
  const avgDaily = dispensedCount > 0 ? dispensedCount / 90 : 0.25
  const seasonalFactor = forecastDays === 90 ? 1.08 : forecastDays === 60 ? 1.05 : 1.02
  const predictedDemand = Math.max(1, Math.round(avgDaily * forecastDays * seasonalFactor))
  const confidence = Math.min(0.92, Math.max(0.45, dispensedCount / 200))
  const stockGap = currentStock - predictedDemand

  const recommendation = stockGap < 0
    ? `Projected shortfall of ${Math.abs(stockGap)} units. Place replenishment order above reorder point (${reorderPoint}).`
    : `Current stock likely sufficient. Keep monitoring consumption weekly.`

  return {
    medication_id: medicationId,
    predicted_demand: predictedDemand,
    confidence: Number(confidence.toFixed(2)),
    recommendation,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const payload = (await request.json()) as ForecastRequest
  if (!payload.medicationIds?.length) {
    return NextResponse.json({ error: 'medicationIds is required' }, { status: 400 })
  }
  if (![30, 60, 90].includes(payload.forecastDays)) {
    return NextResponse.json({ error: 'forecastDays must be 30, 60, or 90' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id, role')
    .eq('id', user.id)
    .single<{ pharmacy_id: string | null; role: string }>()

  if (!profile?.pharmacy_id && !payload.pharmacyId) {
    return NextResponse.json({ error: 'No pharmacy assigned' }, { status: 400 })
  }

  const pharmacyId = payload.pharmacyId && profile?.role === 'super_admin'
    ? payload.pharmacyId
    : profile?.pharmacy_id

  if (!pharmacyId) {
    return NextResponse.json({ error: 'No pharmacy selected' }, { status: 400 })
  }

  const service = await createServiceClient()
  const since = new Date()
  since.setMonth(since.getMonth() - 12)
  const sinceIso = since.toISOString()
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyIso = ninetyDaysAgo.toISOString()

  const [medicationsResult, inventoryResult, prescriptionsResult] = await Promise.all([
    service
      .from('medications')
      .select('id, name, ndc, drug_class')
      .in('id', payload.medicationIds),
    service
      .from('inventory')
      .select('medication_id, quantity_on_hand, reorder_point')
      .eq('pharmacy_id', pharmacyId)
      .in('medication_id', payload.medicationIds),
    service
      .from('prescriptions')
      .select('medication_id, quantity, created_at, status')
      .eq('pharmacy_id', pharmacyId)
      .in('medication_id', payload.medicationIds)
      .gte('created_at', sinceIso),
  ])

  const medications = medicationsResult.data ?? []
  const inventoryRows = inventoryResult.data ?? []
  const prescriptionRows = prescriptionsResult.data ?? []

  const usageByMedication = payload.medicationIds.map((medicationId) => {
    const medUsage = prescriptionRows.filter((rx) => rx.medication_id === medicationId)
    const recentDispensed = medUsage
      .filter((rx) => rx.created_at >= ninetyIso && ['dispensed', 'ready'].includes(rx.status))
      .reduce((sum, rx) => sum + (rx.quantity ?? 0), 0)
    const inventory = inventoryRows
      .filter((row) => row.medication_id === medicationId)
      .reduce(
        (acc, row) => ({
          currentStock: acc.currentStock + row.quantity_on_hand,
          reorderPoint: acc.reorderPoint + row.reorder_point,
        }),
        { currentStock: 0, reorderPoint: 0 }
      )

    return {
      medication_id: medicationId,
      recent_dispensed_90d: recentDispensed,
      current_stock: inventory.currentStock,
      reorder_point: inventory.reorderPoint,
      medication: medications.find((med) => med.id === medicationId) ?? null,
    }
  })

  let forecastResults: ForecastResult[] = usageByMedication.map((item) =>
    fallbackForecast(
      item.medication_id,
      payload.forecastDays,
      item.recent_dispensed_90d,
      item.current_stock,
      item.reorder_point
    )
  )

  if (hasOpenAIKey()) {
    try {
      const aiPrompt = `You are a pharmacy inventory analyst. Based on this dispensing history, predict demand for the next ${payload.forecastDays} days.
Return valid JSON array only, where each item is:
{ "medication_id": string, "predicted_demand": number, "confidence": number, "recommendation": string }.

Data:
${JSON.stringify(usageByMedication)}`

      const aiOutput = await generateAIText([
        {
          role: 'system',
          content: 'You provide medication demand forecasts as strict JSON arrays.',
        },
        {
          role: 'user',
          content: aiPrompt,
        },
      ])

      const aiResults = tryParseJson<ForecastResult[]>(aiOutput)
      if (aiResults && Array.isArray(aiResults) && aiResults.length > 0) {
        const byId = Object.fromEntries(aiResults.map((item) => [item.medication_id, item]))
        forecastResults = forecastResults.map((fallbackItem) => {
          const candidate = byId[fallbackItem.medication_id]
          if (!candidate) return fallbackItem
          return {
            medication_id: fallbackItem.medication_id,
            predicted_demand: Number.isFinite(candidate.predicted_demand)
              ? Number(candidate.predicted_demand)
              : fallbackItem.predicted_demand,
            confidence: Number.isFinite(candidate.confidence)
              ? Math.min(1, Math.max(0, Number(candidate.confidence)))
              : fallbackItem.confidence,
            recommendation: candidate.recommendation || fallbackItem.recommendation,
          }
        })
      }
    } catch {
      // Keep fallback forecast if AI call fails.
    }
  }

  const inserts = forecastResults.map((result) => ({
    pharmacy_id: pharmacyId,
    medication_id: result.medication_id,
    forecast_days: payload.forecastDays,
    predicted_demand: result.predicted_demand,
    confidence: result.confidence,
    recommendation: result.recommendation,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    input_data: {
      generated_from: 'historical_prescriptions_12_months',
      pharmacy_id: pharmacyId,
      forecast_days: payload.forecastDays,
    } as Json,
  }))

  await service.from('forecasts').insert(inserts)

  const output = forecastResults.map((result) => {
    const inventory = usageByMedication.find((item) => item.medication_id === result.medication_id)
    return {
      ...result,
      current_stock: inventory?.current_stock ?? 0,
      reorder_point: inventory?.reorder_point ?? 0,
      stock_gap: (inventory?.current_stock ?? 0) - result.predicted_demand,
    }
  })

  return NextResponse.json({
    pharmacyId,
    forecastDays: payload.forecastDays,
    forecasts: output,
  })
}
