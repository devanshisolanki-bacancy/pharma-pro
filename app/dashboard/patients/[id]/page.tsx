import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { NotificationPreferences } from '@/components/communications/NotificationPreferences'
import { ArrowLeft, Edit, User, Phone, Mail, MapPin, AlertCircle, Shield, Clock } from 'lucide-react'
import { formatDate, formatPhone, calculateAge } from '@/lib/utils/formatters'
import type { PrescriptionStatus } from '@/lib/supabase/types'

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()

  if (!patient) notFound()

  const [{ data: prescriptions }, { data: insurancePlans }, { data: auditLogs }] = await Promise.all([
    supabase
      .from('prescriptions')
      .select('*, medications(name, strength, dosage_form), providers(first_name, last_name), refills(id)')
      .eq('patient_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('insurance_plans')
      .select('*')
      .eq('patient_id', id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('audit_logs')
      .select('*')
      .eq('resource', 'patients')
      .eq('resource_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const address = patient.address as { street?: string; city?: string; state?: string; zip?: string } | null
  const age = calculateAge(patient.date_of_birth)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Patients
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {patient.first_name} {patient.last_name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-500 text-sm">
              DOB: {formatDate(patient.date_of_birth, 'MM/dd/yyyy')} {age !== null && `(${age} years)`}
            </span>
            {patient.hipaa_signed_at ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">HIPAA Signed</Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">HIPAA Pending</Badge>
            )}
            {!patient.is_active && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Inactive</Badge>
            )}
          </div>
        </div>
        <Link href={`/dashboard/patients/${id}/edit`}>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Patient
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medications">
            Medications {prescriptions && `(${prescriptions.length})`}
          </TabsTrigger>
          <TabsTrigger value="allergies">Allergies & Conditions</TabsTrigger>
          <TabsTrigger value="insurance">
            Insurance {insurancePlans && `(${insurancePlans.length})`}
          </TabsTrigger>
          <TabsTrigger value="history">Audit History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" /> Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Gender" value={patient.gender ?? '—'} />
                <InfoRow label="Language" value={patient.preferred_language || 'English'} />
                {patient.phone && (
                  <InfoRow label="Phone" value={<span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatPhone(patient.phone)}</span>} />
                )}
                {patient.email && (
                  <InfoRow label="Email" value={<span className="flex items-center gap-1"><Mail className="w-3 h-3" />{patient.email}</span>} />
                )}
                {address && (
                  <InfoRow label="Address" value={
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[address.street, address.city, address.state, address.zip].filter(Boolean).join(', ')}
                    </span>
                  } />
                )}
                {patient.notes && <InfoRow label="Notes" value={patient.notes} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.emergency_contact ? (
                  <div className="space-y-2">
                    {Object.entries(patient.emergency_contact as Record<string, string>).map(([k, v]) => (
                      <InfoRow key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No emergency contact on file</p>
                )}
              </CardContent>
            </Card>
          </div>
          <NotificationPreferences
            patient={{
              id: patient.id,
              sms_opt_in: patient.sms_opt_in,
              email_opt_in: patient.email_opt_in,
              preferred_notification_channel: patient.preferred_notification_channel,
              notification_preferences: patient.notification_preferences,
              contact_time_window: patient.contact_time_window,
            }}
          />
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <caption className="sr-only">Prescription history</caption>
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Rx#</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Medication</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Prescriber</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Refills</th>
                      <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {prescriptions && prescriptions.length > 0 ? (
                      prescriptions.map((rx) => {
                        const med = rx.medications as { name: string; strength: string | null; dosage_form: string | null } | null
                        const provider = rx.providers as { first_name: string; last_name: string } | null
                        return (
                          <tr key={rx.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <Link href={`/dashboard/prescriptions/${rx.id}`} className="text-blue-600 hover:underline text-sm font-mono">
                                {rx.rx_number}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {med?.name ?? '—'}
                              {med?.strength && <span className="text-slate-400 ml-1">{med.strength}</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {provider ? `Dr. ${provider.last_name}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(rx.written_date)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {rx.refills_used}/{rx.refills_allowed}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={rx.status as PrescriptionStatus} />
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No prescriptions on file</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allergies Tab */}
        <TabsContent value="allergies" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" /> Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.allergies && patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy: string) => (
                      <Badge key={allergy} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No known allergies</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Medical Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medical_conditions && patient.medical_conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.medical_conditions.map((condition: string) => (
                      <Badge key={condition} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No medical conditions on file</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insurance Tab */}
        <TabsContent value="insurance" className="mt-4 space-y-4">
          {insurancePlans && insurancePlans.length > 0 ? (
            insurancePlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {plan.payer_name}
                    {plan.is_primary && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Primary</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfoRow label="BIN" value={plan.bin} />
                  <InfoRow label="PCN" value={plan.pcn ?? '—'} />
                  <InfoRow label="Group #" value={plan.group_number ?? '—'} />
                  <InfoRow label="Member ID" value={plan.member_id} />
                  <InfoRow label="Relationship" value={plan.relationship} />
                  <InfoRow label="Effective" value={formatDate(plan.effective_date)} />
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-slate-400">
                No insurance plans on file
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="mt-0.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{log.action} on {log.resource}</div>
                        <div className="text-xs text-slate-500">{formatDate(log.created_at, 'MMM d, yyyy h:mm a')}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-slate-400">No audit history</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  )
}
