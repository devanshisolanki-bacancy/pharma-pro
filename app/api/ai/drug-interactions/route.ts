import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkAllergyConflict, checkDrugInteractions } from '@/lib/utils/drug-checker'

type DrugInteractionRequest = {
  patientId: string
  medicationId?: string
  ndc?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const payload = (await request.json()) as DrugInteractionRequest
  if (!payload.patientId) {
    return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
  }
  if (!payload.medicationId && !payload.ndc) {
    return NextResponse.json({ error: 'medicationId or ndc is required' }, { status: 400 })
  }

  const service = await createServiceClient()
  let medicationId = payload.medicationId ?? ''
  let medicationNdc = payload.ndc?.trim() ?? ''
  let medicationName = ''

  if (medicationId) {
    const { data: medication } = await service
      .from('medications')
      .select('id, ndc, name')
      .eq('id', medicationId)
      .single()

    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
    }
    medicationNdc = medication.ndc
    medicationName = medication.name
  } else if (medicationNdc) {
    const { data: medication } = await service
      .from('medications')
      .select('id, ndc, name')
      .eq('ndc', medicationNdc)
      .maybeSingle()
    if (medication) {
      medicationId = medication.id
      medicationName = medication.name
    }
  }

  if (!medicationNdc) {
    return NextResponse.json({ error: 'Unable to resolve medication NDC' }, { status: 400 })
  }

  const { data: patient } = await service
    .from('patients')
    .select('id, allergies')
    .eq('id', payload.patientId)
    .single()

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const interactionResult = await checkDrugInteractions(medicationNdc, payload.patientId)
  const allergyResult = medicationId
    ? await checkAllergyConflict(medicationId, patient.allergies ?? [])
    : { hasConflicts: false, conflicts: [] }

  return NextResponse.json({
    patientId: payload.patientId,
    medicationId: medicationId || null,
    medicationNdc,
    medicationName: medicationName || null,
    interactions: interactionResult,
    allergyConflicts: allergyResult,
  })
}
