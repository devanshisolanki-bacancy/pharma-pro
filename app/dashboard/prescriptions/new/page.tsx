'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { createPrescription } from '@/actions/prescriptions'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'

type Patient = { id: string; first_name: string; last_name: string; date_of_birth: string }
type Provider = { id: string; first_name: string; last_name: string; npi: string; specialty: string | null }
type Medication = { id: string; name: string; strength: string | null; dosage_form: string | null; schedule: string; ndc: string }

const STEPS = ['Patient', 'Prescriber', 'Medication', 'Rx Details', 'Review']

export default function NewPrescriptionPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [medication, setMedication] = useState<Medication | null>(null)
  const [rxDetails, setRxDetails] = useState({
    quantity: '',
    days_supply: '',
    refills_allowed: '0',
    sig: '',
    daw_code: '0',
    written_date: new Date().toISOString().split('T')[0],
    is_electronic: false,
    notes: '',
  })

  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [providerSearch, setProviderSearch] = useState('')
  const [providerResults, setProviderResults] = useState<Provider[]>([])
  const [medSearch, setMedSearch] = useState('')
  const [medResults, setMedResults] = useState<Medication[]>([])

  const supabase = createClient()

  async function searchPatients(q: string) {
    if (q.length < 2) { setPatientResults([]); return }
    const { data } = await supabase
      .from('patients')
      .select('id, first_name, last_name, date_of_birth')
      .eq('is_active', true)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(8)
    setPatientResults((data as Patient[]) || [])
  }

  async function searchProviders(q: string) {
    if (q.length < 2) { setProviderResults([]); return }
    const { data } = await supabase
      .from('providers')
      .select('id, first_name, last_name, npi, specialty')
      .eq('is_active', true)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,npi.ilike.%${q}%`)
      .limit(8)
    setProviderResults((data as Provider[]) || [])
  }

  async function searchMedications(q: string) {
    if (q.length < 2) { setMedResults([]); return }
    const { data } = await supabase
      .from('medications')
      .select('id, name, strength, dosage_form, schedule, ndc')
      .eq('is_active', true)
      .or(`name.ilike.%${q}%,brand_name.ilike.%${q}%,generic_name.ilike.%${q}%,ndc.ilike.%${q}%`)
      .limit(8)
    setMedResults((data as Medication[]) || [])
  }

  async function handleSubmit() {
    if (!patient || !medication) { toast.error('Missing required fields'); return }
    setSubmitting(true)
    try {
      const result = await createPrescription({
        patient_id: patient.id,
        provider_id: provider?.id,
        medication_id: medication.id,
        written_date: rxDetails.written_date,
        quantity: parseFloat(rxDetails.quantity),
        days_supply: rxDetails.days_supply ? parseInt(rxDetails.days_supply) : undefined,
        refills_allowed: parseInt(rxDetails.refills_allowed),
        sig: rxDetails.sig,
        daw_code: parseInt(rxDetails.daw_code),
        is_controlled: ['II', 'III', 'IV', 'V'].includes(medication.schedule),
        is_electronic: rxDetails.is_electronic,
        notes: rxDetails.notes || undefined,
      })
      if ('error' in result && result.error) {
        toast.error('Failed to create prescription')
        return
      }
      toast.success('Prescription created!')
      router.push('/dashboard/prescriptions')
    } finally {
      setSubmitting(false)
    }
  }

  const canAdvance = [
    !!patient,
    true, // provider optional
    !!medication,
    !!(rxDetails.quantity && rxDetails.sig && rxDetails.written_date),
    true,
  ][step]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">New Prescription</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              i < step ? 'bg-green-500 text-white' :
              i === step ? 'bg-blue-600 text-white' :
              'bg-slate-200 text-slate-500'
            }`}>
              {i < step ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? 'font-medium text-slate-900' : 'text-slate-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step {step + 1}: {STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Step 0: Patient */}
          {step === 0 && (
            <div className="space-y-3">
              {patient ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                    <div className="text-sm text-slate-500">DOB: {patient.date_of_birth}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setPatient(null)}>Change</Button>
                </div>
              ) : (
                <>
                  <Label>Search Patient</Label>
                  <Input
                    value={patientSearch}
                    onChange={e => { setPatientSearch(e.target.value); searchPatients(e.target.value) }}
                    placeholder="Name or phone..."
                  />
                  {patientResults.length > 0 && (
                    <div className="border rounded-lg divide-y">
                      {patientResults.map(p => (
                        <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                          onClick={() => { setPatient(p); setPatientResults([]) }}>
                          <div className="font-medium">{p.first_name} {p.last_name}</div>
                          <div className="text-sm text-slate-500">DOB: {p.date_of_birth}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 1: Provider */}
          {step === 1 && (
            <div className="space-y-3">
              {provider ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-medium">Dr. {provider.first_name} {provider.last_name}</div>
                    <div className="text-sm text-slate-500">NPI: {provider.npi} · {provider.specialty ?? 'General'}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setProvider(null)}>Change</Button>
                </div>
              ) : (
                <>
                  <Label>Search Prescriber (optional)</Label>
                  <Input
                    value={providerSearch}
                    onChange={e => { setProviderSearch(e.target.value); searchProviders(e.target.value) }}
                    placeholder="Name or NPI..."
                  />
                  {providerResults.length > 0 && (
                    <div className="border rounded-lg divide-y">
                      {providerResults.map(p => (
                        <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                          onClick={() => { setProvider(p); setProviderResults([]) }}>
                          <div className="font-medium">Dr. {p.first_name} {p.last_name}</div>
                          <div className="text-sm text-slate-500">NPI: {p.npi} · {p.specialty ?? 'General'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">Skip if no prescriber on file</p>
                </>
              )}
            </div>
          )}

          {/* Step 2: Medication */}
          {step === 2 && (
            <div className="space-y-3">
              {medication ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-medium">{medication.name} {medication.strength}</div>
                    <div className="text-sm text-slate-500">{medication.dosage_form} · NDC: {medication.ndc}</div>
                    {['II', 'III', 'IV', 'V'].includes(medication.schedule) && (
                      <span className="text-xs text-red-600 font-medium">⚠ Schedule {medication.schedule} Controlled Substance</span>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setMedication(null)}>Change</Button>
                </div>
              ) : (
                <>
                  <Label>Search Medication</Label>
                  <Input
                    value={medSearch}
                    onChange={e => { setMedSearch(e.target.value); searchMedications(e.target.value) }}
                    placeholder="Name, brand, NDC..."
                  />
                  {medResults.length > 0 && (
                    <div className="border rounded-lg divide-y">
                      {medResults.map(m => (
                        <button key={m.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                          onClick={() => { setMedication(m); setMedResults([]) }}>
                          <div className="font-medium">{m.name} {m.strength}</div>
                          <div className="text-sm text-slate-500">{m.dosage_form} · NDC: {m.ndc} · Schedule: {m.schedule}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Rx Details */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input id="quantity" type="number" min="0" step="0.5"
                  value={rxDetails.quantity}
                  onChange={e => setRxDetails(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="days_supply">Days Supply</Label>
                <Input id="days_supply" type="number" min="1"
                  value={rxDetails.days_supply}
                  onChange={e => setRxDetails(p => ({ ...p, days_supply: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refills">Refills Allowed (0-11)</Label>
                <Input id="refills" type="number" min="0" max="11"
                  value={rxDetails.refills_allowed}
                  onChange={e => setRxDetails(p => ({ ...p, refills_allowed: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="written_date">Written Date *</Label>
                <Input id="written_date" type="date"
                  value={rxDetails.written_date}
                  onChange={e => setRxDetails(p => ({ ...p, written_date: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="sig">Directions (Sig) *</Label>
                <Textarea id="sig" rows={3} placeholder="Take 1 tablet by mouth once daily..."
                  value={rxDetails.sig}
                  onChange={e => setRxDetails(p => ({ ...p, sig: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daw">DAW Code</Label>
                <Input id="daw" type="number" min="0" max="9"
                  value={rxDetails.daw_code}
                  onChange={e => setRxDetails(p => ({ ...p, daw_code: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="is_electronic" checked={rxDetails.is_electronic}
                  onChange={e => setRxDetails(p => ({ ...p, is_electronic: e.target.checked }))} />
                <Label htmlFor="is_electronic">Electronic Prescription (eRx)</Label>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={2}
                  value={rxDetails.notes}
                  onChange={e => setRxDetails(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <ReviewRow label="Patient" value={patient ? `${patient.first_name} ${patient.last_name}` : '—'} />
                <ReviewRow label="Prescriber" value={provider ? `Dr. ${provider.last_name}` : 'Not specified'} />
                <ReviewRow label="Medication" value={medication ? `${medication.name} ${medication.strength}` : '—'} />
                <ReviewRow label="NDC" value={medication?.ndc ?? '—'} />
                <ReviewRow label="Quantity" value={rxDetails.quantity} />
                <ReviewRow label="Days Supply" value={rxDetails.days_supply || '—'} />
                <ReviewRow label="Refills" value={rxDetails.refills_allowed} />
                <ReviewRow label="Written" value={rxDetails.written_date} />
                <div className="col-span-2">
                  <ReviewRow label="Directions" value={rxDetails.sig} />
                </div>
                {medication && ['II', 'III', 'IV', 'V'].includes(medication.schedule) && (
                  <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ⚠ This is a Schedule {medication.schedule} controlled substance. Additional DEA tracking required.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance}>
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Prescription'}
            <Check className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
