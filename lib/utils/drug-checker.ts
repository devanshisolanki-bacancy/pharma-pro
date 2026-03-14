import { createClient } from '@/lib/supabase/server'

export interface DrugInteractionResult {
  hasInteractions: boolean
  interactions: Array<{
    severity: string
    description: string | null
    clinical_effects: string | null
    management: string | null
    drug_a_ndc: string
    drug_b_ndc: string
  }>
  overallRisk: 'safe' | 'caution' | 'danger' | 'contraindicated'
}

export interface AllergyConflictResult {
  hasConflicts: boolean
  conflicts: Array<{
    allergy: string
    medication: string
    medicationClass: string | null
  }>
}

export async function checkDrugInteractions(
  newNdc: string,
  patientId: string
): Promise<DrugInteractionResult> {
  const supabase = await createClient()

  // Get patient's active prescriptions' NDCs
  const { data: activePrescriptions } = await supabase
    .from('prescriptions')
    .select('medication:medications(ndc)')
    .eq('patient_id', patientId)
    .in('status', ['received', 'verified', 'filling', 'quality_check', 'ready', 'dispensed'])

  const activeNdcs = activePrescriptions
    ?.map((p: { medication: { ndc: string } | { ndc: string }[] | null }) => {
      const med = p.medication
      if (!med) return null
      if (Array.isArray(med)) return med[0]?.ndc
      return med.ndc
    })
    .filter(Boolean) as string[] || []

  if (activeNdcs.length === 0) {
    return { hasInteractions: false, interactions: [], overallRisk: 'safe' }
  }

  // Check interactions in both directions
  const { data: interactions } = await supabase
    .from('drug_interactions')
    .select('*')
    .or(
      `and(drug_a_ndc.eq.${newNdc},drug_b_ndc.in.(${activeNdcs.join(',')})),and(drug_b_ndc.eq.${newNdc},drug_a_ndc.in.(${activeNdcs.join(',')}))`
    )

  if (!interactions || interactions.length === 0) {
    return { hasInteractions: false, interactions: [], overallRisk: 'safe' }
  }

  const severityOrder = ['minor', 'moderate', 'major', 'contraindicated']
  const maxSeverity = interactions.reduce((max, interaction) => {
    const idx = severityOrder.indexOf(interaction.severity)
    return idx > severityOrder.indexOf(max) ? interaction.severity : max
  }, 'minor')

  const overallRisk = maxSeverity === 'contraindicated' ? 'contraindicated'
    : maxSeverity === 'major' ? 'danger'
    : maxSeverity === 'moderate' ? 'caution'
    : 'safe'

  return {
    hasInteractions: true,
    interactions,
    overallRisk,
  }
}

export async function checkAllergyConflict(
  medicationId: string,
  patientAllergies: string[]
): Promise<AllergyConflictResult> {
  if (!patientAllergies || patientAllergies.length === 0) {
    return { hasConflicts: false, conflicts: [] }
  }

  const supabase = await createClient()
  const { data: medication } = await supabase
    .from('medications')
    .select('name, generic_name, drug_class, contraindications')
    .eq('id', medicationId)
    .single()

  if (!medication) return { hasConflicts: false, conflicts: [] }

  const conflicts: AllergyConflictResult['conflicts'] = []
  const allergyLower = patientAllergies.map(a => a.toLowerCase())

  const checkAgainst = [
    medication.name,
    medication.generic_name,
    medication.drug_class,
    ...(medication.contraindications || []),
  ].filter(Boolean) as string[]

  for (const term of checkAgainst) {
    for (const allergy of allergyLower) {
      if (term.toLowerCase().includes(allergy) || allergy.includes(term.toLowerCase())) {
        conflicts.push({
          allergy,
          medication: medication.name,
          medicationClass: medication.drug_class,
        })
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  }
}
