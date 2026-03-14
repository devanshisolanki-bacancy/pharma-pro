import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react'
import { formatDate, formatDateTime, formatQuantity } from '@/lib/utils/formatters'
import { DRUG_SCHEDULE_COLORS, DRUG_SCHEDULE_LABELS } from '@/lib/constants/drug-schedules'
import type { PrescriptionStatus, DrugSchedule } from '@/lib/supabase/types'
import {
  processRefillRequest,
  scheduleRefillReminders,
  sendPrescriptionReady,
} from '@/actions/notifications'
import { TransferForm } from '@/components/prescriptions/TransferForm'

// Workaround: import DAW_CODES from constants
const DAW_CODE_LABELS: Record<number, string> = {
  0: 'No Product Selection Indicated',
  1: 'Substitution Not Allowed by Prescriber',
  2: 'Substitution Allowed - Patient Requested Brand',
  3: 'Substitution Allowed - Pharmacist Selected Brand',
  4: 'Substitution Allowed - Generic Not in Stock',
  5: 'Substitution Allowed - Brand Dispensed as Generic',
}

export default async function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rx } = await supabase
    .from('prescriptions')
    .select('*, patients(first_name, last_name, date_of_birth, phone, allergies), medications(name, brand_name, ndc, strength, dosage_form, schedule, drug_class), providers(first_name, last_name, npi, specialty, phone), dispenser:profiles!prescriptions_dispenser_id_fkey(first_name, last_name), verifier:profiles!prescriptions_verified_by_fkey(first_name, last_name)')
    .eq('id', id)
    .single()

  if (!rx) notFound()

  const [{ data: refills }, { data: claims }, { data: auditLogs }] = await Promise.all([
    supabase.from('refills').select('*').eq('prescription_id', id).order('refill_number'),
    supabase.from('claims').select('*, insurance_plans(payer_name)').eq('prescription_id', id),
    supabase.from('audit_logs').select('*').eq('resource', 'prescriptions').eq('resource_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  const patient = rx.patients as { first_name: string; last_name: string; date_of_birth: string; phone: string | null; allergies: string[] } | null
  const med = rx.medications as { name: string; brand_name: string | null; ndc: string; strength: string | null; dosage_form: string | null; schedule: string; drug_class: string | null } | null
  const provider = rx.providers as { first_name: string; last_name: string; npi: string; specialty: string | null; phone: string | null } | null
  const dispenser = rx.dispenser as { first_name: string; last_name: string } | null
  const verifier = rx.verifier as { first_name: string; last_name: string } | null

  async function sendReadyAction() {
    'use server'
    await sendPrescriptionReady(id)
  }

  async function scheduleRemindersAction() {
    'use server'
    await scheduleRefillReminders(id)
  }

  async function requestRefillAction() {
    'use server'
    await processRefillRequest(rx.patient_id, rx.rx_number)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/prescriptions">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Prescriptions</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-mono">{rx.rx_number}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={rx.status as PrescriptionStatus} />
            {rx.is_controlled && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Controlled</Badge>}
            {rx.is_electronic && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">eRx</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-1" />
            Print Label
          </Button>
          <form action={sendReadyAction}>
            <Button size="sm" variant="outline">
              Notify Ready
            </Button>
          </form>
          <form action={scheduleRemindersAction}>
            <Button size="sm" variant="outline">
              Schedule Reminder
            </Button>
          </form>
          {rx.refills_used < rx.refills_allowed && rx.status === 'dispensed' && (
            <form action={requestRefillAction}>
              <Button size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Request Refill
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medication Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Medication</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-semibold text-lg">{med?.name}</div>
              {med?.brand_name && <div className="text-sm text-slate-500">Brand: {med.brand_name}</div>}
            </div>
            <InfoGrid>
              <InfoItem label="Strength" value={med?.strength ?? '—'} />
              <InfoItem label="Form" value={med?.dosage_form ?? '—'} />
              <InfoItem label="NDC" value={<span className="font-mono text-xs">{med?.ndc ?? '—'}</span>} />
              <InfoItem label="Drug Class" value={med?.drug_class ?? '—'} />
              <InfoItem label="Schedule" value={
                med?.schedule ? (
                  <Badge variant="outline" className={`text-xs ${DRUG_SCHEDULE_COLORS[med.schedule as DrugSchedule]}`}>
                    {DRUG_SCHEDULE_LABELS[med.schedule as DrugSchedule] ?? med.schedule}
                  </Badge>
                ) : '—'
              } />
            </InfoGrid>
          </CardContent>
        </Card>

        {/* Patient Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Patient</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Link href={`/dashboard/patients/${rx.patient_id}`} className="font-semibold text-blue-600 hover:underline">
                {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
              </Link>
            </div>
            <InfoGrid>
              <InfoItem label="DOB" value={formatDate(patient?.date_of_birth, 'MM/dd/yyyy')} />
              <InfoItem label="Phone" value={patient?.phone ?? '—'} />
              <InfoItem label="Allergies" value={
                patient?.allergies && patient.allergies.length > 0
                  ? <span className="text-red-600">{patient.allergies.join(', ')}</span>
                  : 'None'
              } />
            </InfoGrid>
          </CardContent>
        </Card>

        {/* Rx Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Prescription Details</CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label="Quantity" value={formatQuantity(rx.quantity)} />
              <InfoItem label="Days Supply" value={rx.days_supply ? `${rx.days_supply} days` : '—'} />
              <InfoItem label="Refills" value={`${rx.refills_used} used / ${rx.refills_allowed} allowed`} />
              <InfoItem label="Written Date" value={formatDate(rx.written_date)} />
              <InfoItem label="Expiration" value={formatDate(rx.expiration_date)} />
              <InfoItem label="DAW Code" value={`${rx.daw_code} — ${DAW_CODE_LABELS[rx.daw_code] ?? 'N/A'}`} />
              <div className="col-span-2">
                <InfoItem label="Directions (Sig)" value={rx.sig} />
              </div>
              {rx.notes && <div className="col-span-2"><InfoItem label="Notes" value={rx.notes} /></div>}
            </InfoGrid>
          </CardContent>
        </Card>

        {/* Prescriber & Dispensing */}
        <Card>
          <CardHeader><CardTitle className="text-base">Prescriber & Dispensing</CardTitle></CardHeader>
          <CardContent>
            <InfoGrid>
              <InfoItem label="Prescriber" value={provider ? `Dr. ${provider.first_name} ${provider.last_name}` : '—'} />
              <InfoItem label="NPI" value={<span className="font-mono text-xs">{provider?.npi ?? '—'}</span>} />
              <InfoItem label="Specialty" value={provider?.specialty ?? '—'} />
              <InfoItem label="Prescriber Phone" value={provider?.phone ?? '—'} />
              <InfoItem label="Verified By" value={verifier ? `${verifier.first_name} ${verifier.last_name}` : '—'} />
              <InfoItem label="Dispensed By" value={dispenser ? `${dispenser.first_name} ${dispenser.last_name}` : '—'} />
              <InfoItem label="Dispensed At" value={formatDateTime(rx.dispensed_at)} />
            </InfoGrid>
          </CardContent>
        </Card>
      </div>

      {/* Claims */}
      {claims && claims.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Insurance Claims</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <caption className="sr-only">Insurance claims for this prescription</caption>
              <thead className="border-b bg-slate-50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Claim #</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Payer</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Billed</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Paid</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(claim => {
                  const ins = claim.insurance_plans as { payer_name: string } | null
                  return (
                    <tr key={claim.id}>
                      <td className="px-4 py-3 font-mono text-sm">{claim.claim_number}</td>
                      <td className="px-4 py-3 text-sm">{ins?.payer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">${claim.billed_amount?.toFixed(2) ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">${claim.paid_amount?.toFixed(2) ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={claim.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Refills */}
      {refills && refills.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Refill History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {refills.map(r => (
                <div key={r.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                  <span>Refill #{r.refill_number}</span>
                  <span className="text-slate-500">{formatDate(r.requested_at)}</span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TransferForm prescriptionId={id} currentPharmacyId={rx.pharmacy_id} />

      {/* Audit Trail */}
      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLogs?.map(log => (
              <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <Badge variant="outline" className="text-xs">{log.action}</Badge>
                <span className="text-slate-500">{formatDateTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  )
}
