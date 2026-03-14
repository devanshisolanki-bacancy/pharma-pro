import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateAIText, hasOpenAIKey } from '@/lib/utils/openai'

type PriorAuthRequest = {
  prescriptionId: string
  denialCode?: string
  insurancePlanId?: string
  claimId?: string
}

const PRIOR_AUTH_BUCKET = 'prior-auth-letters'

function sanitizeForPath(value: string | null | undefined) {
  if (!value) return 'unknown'
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const payload = (await request.json()) as PriorAuthRequest
  if (!payload.prescriptionId) {
    return NextResponse.json({ error: 'prescriptionId is required' }, { status: 400 })
  }

  const service = await createServiceClient()

  const { data: prescription } = await service
    .from('prescriptions')
    .select('*, patients(*), medications(name, generic_name, strength, dosage_form, drug_class), providers(first_name, last_name, npi)')
    .eq('id', payload.prescriptionId)
    .single()

  if (!prescription) {
    return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
  }

  const { data: medicationHistory } = await service
    .from('prescriptions')
    .select('medication_id, medications(name), status, created_at')
    .eq('patient_id', prescription.patient_id)
    .order('created_at', { ascending: false })
    .limit(30)

  const patient = prescription.patients as {
    first_name: string
    last_name: string
    date_of_birth: string
    medical_conditions: string[]
    allergies: string[]
  } | null
  const medication = prescription.medications as {
    name: string
    generic_name: string | null
    strength: string | null
    dosage_form: string | null
    drug_class: string | null
  } | null
  const provider = prescription.providers as {
    first_name: string
    last_name: string
    npi: string
  } | null

  let letterText = `Prior Authorization Appeal\n\n`
  letterText += `Patient: ${patient?.first_name ?? ''} ${patient?.last_name ?? ''}\n`
  letterText += `DOB: ${patient?.date_of_birth ?? 'N/A'}\n`
  letterText += `Medication: ${medication?.name ?? 'N/A'}\n`
  letterText += `Denial Code: ${payload.denialCode ?? 'N/A'}\n\n`
  letterText += `Clinical Necessity:\n`
  letterText += `This patient requires coverage for the prescribed therapy due to ongoing clinical need and treatment continuity.\n\n`
  letterText += `Please review this appeal and approve coverage at the earliest convenience.`

  if (hasOpenAIKey()) {
    try {
      const prompt = `You are a clinical pharmacist writing a prior authorization appeal.
Generate a professional, medically accurate PA letter for this case.
Include clinical necessity, prior treatment history support, and references to clinical guidelines.

Case:
${JSON.stringify({
  denialCode: payload.denialCode ?? null,
  patient,
  medication,
  provider,
  medicationHistory,
  insurancePlanId: payload.insurancePlanId ?? null,
})}`

      const aiText = await generateAIText([
        {
          role: 'system',
          content: 'You produce formal prior authorization appeal letters for pharmacy claims.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])

      if (aiText.trim()) {
        letterText = aiText.trim()
      }
    } catch {
      // Keep fallback template if AI fails.
    }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single<{ id: string }>()

  const { data: letterRow, error: letterError } = await service
    .from('prior_auth_letters')
    .insert({
      claim_id: payload.claimId ?? null,
      prescription_id: payload.prescriptionId,
      insurance_plan_id: payload.insurancePlanId ?? null,
      denial_code: payload.denialCode ?? null,
      letter_text: letterText,
      status: 'draft',
      generated_by: profile?.id ?? null,
    })
    .select('id, created_at')
    .single()

  if (letterError) {
    return NextResponse.json({ error: letterError.message }, { status: 500 })
  }

  const pharmacySegment = sanitizeForPath(prescription.pharmacy_id)
  const filePath = `${pharmacySegment}/${payload.prescriptionId}/${letterRow.id}.txt`
  const fileContents = `Prior Authorization Appeal Letter\nGenerated: ${new Date().toISOString()}\n\n${letterText}`

  await service.storage.createBucket(PRIOR_AUTH_BUCKET, { public: false }).catch(() => {
    // Bucket may already exist.
  })

  const { error: storageError } = await service.storage
    .from(PRIOR_AUTH_BUCKET)
    .upload(filePath, new Blob([fileContents], { type: 'text/plain; charset=utf-8' }), {
      cacheControl: '3600',
      upsert: true,
    })

  if (!storageError) {
    await service
      .from('prior_auth_letters')
      .update({
        file_path: `${PRIOR_AUTH_BUCKET}/${filePath}`,
      })
      .eq('id', letterRow.id)
  }

  if (payload.claimId) {
    const { data: claim } = await service
      .from('claims')
      .select('id, ncpdp_response')
      .eq('id', payload.claimId)
      .maybeSingle<{ id: string; ncpdp_response: Record<string, unknown> | null }>()

    const currentResponse =
      claim?.ncpdp_response && typeof claim.ncpdp_response === 'object'
        ? claim.ncpdp_response
        : {}

    await service
      .from('claims')
      .update({
        status: 'appealed',
        ncpdp_response: {
          ...currentResponse,
          prior_auth_letter_id: letterRow.id,
          prior_auth_letter_path: storageError ? null : `${PRIOR_AUTH_BUCKET}/${filePath}`,
          prior_auth_generated_at: new Date().toISOString(),
        },
      })
      .eq('id', payload.claimId)
  }

  return NextResponse.json({
    letterId: letterRow.id,
    createdAt: letterRow.created_at,
    letterText,
    filePath: storageError ? null : `${PRIOR_AUTH_BUCKET}/${filePath}`,
  })
}
