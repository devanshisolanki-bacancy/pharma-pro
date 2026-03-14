'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { isDemoMode } from '@/lib/demo'

type SelectOption = { id: string; label: string }

export default function AIControlCenterPage() {
  const demoEnabled = isDemoMode()
  const [pharmacyId, setPharmacyId] = useState<string>('')
  const [medications, setMedications] = useState<SelectOption[]>([])
  const [patients, setPatients] = useState<SelectOption[]>([])
  const [prescriptions, setPrescriptions] = useState<SelectOption[]>([])
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<string[]>([])
  const [selectedInteractionMedicationId, setSelectedInteractionMedicationId] = useState('')
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [forecastDays, setForecastDays] = useState<30 | 60 | 90>(30)
  const [denialCode, setDenialCode] = useState('')
  const [output, setOutput] = useState<string>('Run an AI action to view output.')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (demoEnabled) {
      return
    }

    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('pharmacy_id')
        .eq('id', user.id)
        .single<{ pharmacy_id: string | null }>()

      if (!profile?.pharmacy_id) return
      setPharmacyId(profile.pharmacy_id)

      const [medsResult, patientsResult, rxResult] = await Promise.all([
        supabase.from('inventory').select('medication_id, medications(name)').eq('pharmacy_id', profile.pharmacy_id).limit(100),
        supabase.from('patients').select('id, first_name, last_name').eq('pharmacy_id', profile.pharmacy_id).eq('is_active', true).limit(100),
        supabase.from('prescriptions').select('id, rx_number').eq('pharmacy_id', profile.pharmacy_id).order('created_at', { ascending: false }).limit(100),
      ])

      const medSet = new Map<string, string>()
      ;(medsResult.data ?? []).forEach((row) => {
        const medication = row.medications as { name: string } | null
        if (row.medication_id) {
          medSet.set(row.medication_id, medication?.name ?? row.medication_id)
        }
      })
      setMedications(Array.from(medSet.entries()).map(([id, name]) => ({ id, label: name })))

      setPatients(
        (patientsResult.data ?? []).map((patient) => ({
          id: patient.id,
          label: `${patient.last_name}, ${patient.first_name}`,
        }))
      )
      setPrescriptions(
        (rxResult.data ?? []).map((rx) => ({
          id: rx.id,
          label: rx.rx_number,
        }))
      )
    }

    void load()
  }, [demoEnabled])

  async function runAction(path: string, body: Record<string, unknown>) {
    if (demoEnabled) {
      setOutput(
        JSON.stringify(
          {
            message: 'AI integrations are disabled in demo mode.',
            endpoint: path,
            requestPreview: body,
          },
          null,
          2
        )
      )
      return
    }

    setLoading(true)
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      setOutput(JSON.stringify(data, null, 2))
    } catch (error) {
      setOutput(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function toggleMedication(id: string) {
    setSelectedMedicationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Control Center</h1>
        <p className="text-slate-500">
          {demoEnabled
            ? 'AI integrations are disabled in demo mode.'
            : 'Demand forecasting, prior auth drafting, MTM suggestions, and adherence scoring'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Demand Forecast</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {medications.slice(0, 20).map((medication) => (
                <button
                  key={medication.id}
                  type="button"
                  onClick={() => toggleMedication(medication.id)}
                  className="focus-visible:outline-none"
                >
                  <Badge variant={selectedMedicationIds.includes(medication.id) ? 'default' : 'outline'}>
                    {medication.label}
                  </Badge>
                </button>
              ))}
            </div>
            <select
              value={forecastDays}
              onChange={(event) => setForecastDays(Number(event.target.value) as 30 | 60 | 90)}
              className="h-9 rounded-md border px-3 text-sm"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
            <Button
              type="button"
              disabled={loading || selectedMedicationIds.length === 0}
              onClick={() =>
                runAction('/api/ai/demand-forecast', {
                  pharmacyId,
                  medicationIds: selectedMedicationIds,
                  forecastDays,
                })
              }
            >
              Generate Forecast
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Prior Auth Generator</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedPrescriptionId}
              onChange={(event) => setSelectedPrescriptionId(event.target.value)}
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select Prescription</option>
              {prescriptions.map((rx) => (
                <option key={rx.id} value={rx.id}>{rx.label}</option>
              ))}
            </select>
            <Input value={denialCode} onChange={(event) => setDenialCode(event.target.value)} placeholder="Denial code (optional)" />
            <Button
              type="button"
              disabled={loading || !selectedPrescriptionId}
              onClick={() =>
                runAction('/api/ai/prior-auth', {
                  prescriptionId: selectedPrescriptionId,
                  denialCode: denialCode || undefined,
                })
              }
            >
              Draft Prior Auth Letter
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">MTM Suggestions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select Patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.label}</option>
              ))}
            </select>
            <Button
              type="button"
              disabled={loading || !selectedPatientId}
              onClick={() => runAction('/api/ai/mtm-suggestions', { patientId: selectedPatientId })}
            >
              Generate MTM Suggestions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Adherence Scoring</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select Patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.label}</option>
              ))}
            </select>
            <Button
              type="button"
              disabled={loading || !selectedPatientId}
              onClick={() => runAction('/api/ai/adherence-score', { patientId: selectedPatientId })}
            >
              Calculate Adherence
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Drug Interaction Check</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedPatientId}
              onChange={(event) => setSelectedPatientId(event.target.value)}
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select Patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.label}</option>
              ))}
            </select>
            <select
              value={selectedInteractionMedicationId}
              onChange={(event) => setSelectedInteractionMedicationId(event.target.value)}
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Select Medication</option>
              {medications.map((medication) => (
                <option key={medication.id} value={medication.id}>{medication.label}</option>
              ))}
            </select>
            <Button
              type="button"
              disabled={loading || !selectedPatientId || !selectedInteractionMedicationId}
              onClick={() =>
                runAction('/api/ai/drug-interactions', {
                  patientId: selectedPatientId,
                  medicationId: selectedInteractionMedicationId,
                })
              }
            >
              Check Interactions
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">AI Output</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs bg-slate-900 text-slate-100 rounded-md p-3 overflow-auto max-h-[420px]">{output}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
