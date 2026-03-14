'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { patientSchema, patientUpdateSchema, type PatientFormValues } from '@/lib/validations/patient'
import { auditLog } from '@/lib/utils/hipaa-audit'

async function getPharmacyId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.pharmacy_id) throw new Error('No pharmacy assigned')
  return { pharmacyId: profile.pharmacy_id, role: profile.role, userId: user.id }
}

export async function createPatient(data: PatientFormValues) {
  const parsed = patientSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { pharmacyId } = await getPharmacyId(supabase)

  const { data: patient, error } = await supabase
    .from('patients')
    .insert({ ...parsed.data, pharmacy_id: pharmacyId })
    .select()
    .single()

  if (error) return { error: { _form: [error.message] } }

  await auditLog('CREATE', 'patients', patient.id, undefined, patient)
  revalidatePath('/dashboard/patients')
  return { data: patient }
}

export async function updatePatient(id: string, data: Partial<PatientFormValues>) {
  const parsed = patientUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  await getPharmacyId(supabase)

  const { data: oldPatient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()

  const { data: patient, error } = await supabase
    .from('patients')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: { _form: [error.message] } }

  await auditLog('UPDATE', 'patients', id, oldPatient ?? undefined, patient)
  revalidatePath(`/dashboard/patients/${id}`)
  revalidatePath('/dashboard/patients')
  return { data: patient }
}

export async function deletePatient(id: string) {
  const supabase = await createClient()
  await getPharmacyId(supabase)

  const { data: oldPatient } = await supabase.from('patients').select('*').eq('id', id).single()

  const { error } = await supabase
    .from('patients')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { error: error.message }

  await auditLog('DELETE', 'patients', id, oldPatient ?? undefined)
  revalidatePath('/dashboard/patients')
  return { success: true }
}

export async function searchPatients(query: string) {
  const supabase = await createClient()
  const { pharmacyId } = await getPharmacyId(supabase)

  const { data, error } = await supabase
    .from('patients')
    .select('id, first_name, last_name, date_of_birth, phone, email')
    .eq('pharmacy_id', pharmacyId)
    .eq('is_active', true)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .order('last_name')
    .limit(20)

  if (error) return { error: error.message }
  return { data }
}

export async function addInsurancePlan(patientId: string, data: {
  payer_name: string
  bin: string
  pcn?: string
  group_number?: string
  member_id: string
  relationship?: string
  is_primary?: boolean
  effective_date?: string
  termination_date?: string
}) {
  const supabase = await createClient()

  // If setting as primary, unset other primary plans
  if (data.is_primary) {
    await supabase
      .from('insurance_plans')
      .update({ is_primary: false })
      .eq('patient_id', patientId)
  }

  const { data: plan, error } = await supabase
    .from('insurance_plans')
    .insert({ ...data, patient_id: patientId })
    .select()
    .single()

  if (error) return { error: error.message }
  await auditLog('CREATE', 'insurance_plans', plan.id)
  revalidatePath(`/dashboard/patients/${patientId}`)
  return { data: plan }
}
