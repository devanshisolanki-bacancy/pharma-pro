import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils/formatters'
import { Shield } from 'lucide-react'

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single()
  const pid = profile?.pharmacy_id ?? ''

  const [{ data: auditLogs }, { data: controlledRxs }] = await Promise.all([
    supabase.from('audit_logs').select('*')
      .eq('pharmacy_id', pid)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('prescriptions')
      .select('rx_number, created_at, quantity, medications(name, schedule), patients(first_name, last_name)')
      .eq('pharmacy_id', pid)
      .eq('is_controlled', true)
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance Reports</h1>
        <p className="text-slate-500">DEA reporting, HIPAA audit trail, and regulatory documentation</p>
      </div>

      {/* Controlled Substances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            Controlled Substance Dispensing Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <caption className="sr-only">Controlled substance dispensing log</caption>
            <thead className="border-b bg-slate-50">
              <tr>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Rx #</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Patient</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Medication</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Schedule</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Qty</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {controlledRxs && controlledRxs.length > 0 ? controlledRxs.map((rx) => {
                const med = rx.medications as { name: string; schedule: string } | null
                const patient = rx.patients as { first_name: string; last_name: string } | null
                return (
                  <tr key={rx.rx_number} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm">{rx.rx_number}</td>
                    <td className="px-4 py-3 text-sm">{patient ? `${patient.last_name}, ${patient.first_name}` : '—'}</td>
                    <td className="px-4 py-3 text-sm">{med?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                        C{med?.schedule ?? '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{rx.quantity}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(rx.created_at)}</td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No controlled substance records</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* HIPAA Audit Trail */}
      <Card>
        <CardHeader><CardTitle className="text-base">HIPAA Audit Trail</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <caption className="sr-only">HIPAA audit log</caption>
            <thead className="border-b bg-slate-50">
              <tr>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Action</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Resource</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">IP Address</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {auditLogs && auditLogs.length > 0 ? auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${
                      log.action === 'CREATE' ? 'bg-green-50 text-green-700 border-green-200' :
                      log.action === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                      log.action === 'UPDATE' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{log.resource}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.ip_address ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(log.created_at)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No audit records</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
