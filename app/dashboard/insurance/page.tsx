import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import type { ClaimStatus } from '@/lib/supabase/types'
import { demoClaims, isDemoMode } from '@/lib/demo'

export default async function InsurancePage() {
  if (isDemoMode()) {
    const claims = demoClaims
    const stats = {
      totalBilled: claims.reduce((s, c) => s + c.billed_amount, 0),
      totalPaid: claims.reduce((s, c) => s + c.paid_amount, 0),
      pending: claims.filter(c => ['pending', 'submitted'].includes(c.status)).length,
      rejected: claims.filter(c => c.status === 'rejected').length,
      acceptanceRate: claims.length > 0
        ? Math.round((claims.filter(c => c.status === 'paid').length / claims.length) * 100)
        : 0,
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Insurance & Claims</h1>
            <p className="text-slate-500">{claims.length} demo claims</p>
          </div>
          <Button variant="outline" disabled>View All Claims</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Billed', value: formatCurrency(stats.totalBilled) },
            { label: 'Total Paid', value: formatCurrency(stats.totalPaid) },
            { label: 'Pending Claims', value: stats.pending },
            { label: 'Rejected', value: stats.rejected },
            { label: 'Acceptance Rate', value: `${stats.acceptanceRate}%` },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">Insurance claims list</caption>
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Claim #</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Rx #</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Patient</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Payer</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Billed</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Paid</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm text-blue-600">{claim.claim_number}</td>
                      <td className="px-4 py-3 font-mono text-sm">{claim.rx_number}</td>
                      <td className="px-4 py-3 text-sm">{claim.patient}</td>
                      <td className="px-4 py-3 text-sm">{claim.payer_name}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(claim.billed_amount)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(claim.paid_amount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(claim.created_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={claim.status as ClaimStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single()

  const { data: claims, count } = await supabase
    .from('claims')
    .select('*, prescriptions(rx_number, patients(first_name, last_name)), insurance_plans(payer_name)', { count: 'exact' })
    .eq('pharmacy_id', profile?.pharmacy_id ?? '')
    .order('created_at', { ascending: false })
    .limit(50)

  // Summary stats
  const { data: allClaims } = await supabase
    .from('claims')
    .select('status, billed_amount, paid_amount')
    .eq('pharmacy_id', profile?.pharmacy_id ?? '')

  const stats = {
    totalBilled: allClaims?.reduce((s, c) => s + (c.billed_amount ?? 0), 0) ?? 0,
    totalPaid: allClaims?.reduce((s, c) => s + (c.paid_amount ?? 0), 0) ?? 0,
    pending: allClaims?.filter(c => ['pending', 'submitted'].includes(c.status)).length ?? 0,
    rejected: allClaims?.filter(c => c.status === 'rejected').length ?? 0,
    acceptanceRate: allClaims && allClaims.length > 0
      ? Math.round((allClaims.filter(c => c.status === 'paid').length / allClaims.length) * 100)
      : 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insurance & Claims</h1>
          <p className="text-slate-500">{count ?? 0} total claims</p>
        </div>
        <Link href="/dashboard/insurance/claims">
          <Button variant="outline">View All Claims</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Billed', value: formatCurrency(stats.totalBilled) },
          { label: 'Total Paid', value: formatCurrency(stats.totalPaid) },
          { label: 'Pending Claims', value: stats.pending },
          { label: 'Rejected', value: stats.rejected },
          { label: 'Acceptance Rate', value: `${stats.acceptanceRate}%` },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Claims */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Insurance claims list</caption>
              <thead className="border-b bg-slate-50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Claim #</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Rx #</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Patient</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Payer</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Billed</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Paid</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {claims && claims.length > 0 ? claims.map((claim) => {
                  const rx = claim.prescriptions as { rx_number: string; patients: { first_name: string; last_name: string } | null } | null
                  const ins = claim.insurance_plans as { payer_name: string } | null
                  return (
                    <tr key={claim.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm text-blue-600">{claim.claim_number ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-sm">{rx?.rx_number ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{rx?.patients ? `${rx.patients.last_name}, ${rx.patients.first_name}` : '—'}</td>
                      <td className="px-4 py-3 text-sm">{ins?.payer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(claim.billed_amount)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(claim.paid_amount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(claim.created_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={claim.status as ClaimStatus} /></td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No claims yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
