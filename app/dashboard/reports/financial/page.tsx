import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'

export default async function FinancialReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id')
    .eq('id', user.id)
    .single<{ pharmacy_id: string | null }>()

  const pharmacyId = profile?.pharmacy_id
  if (!pharmacyId) redirect('/dashboard/reports')

  const [transactionsResult, claimsResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, total, insurance_paid, copay, payment_method, created_at')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('claims')
      .select('id, billed_amount, paid_amount, status, created_at')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const transactions = transactionsResult.data ?? []
  const claims = claimsResult.data ?? []
  const revenue = transactions.reduce((sum, tx) => sum + (tx.total ?? 0), 0)
  const insuranceCollections = claims.reduce((sum, claim) => sum + (claim.paid_amount ?? 0), 0)
  const outstandingClaims = claims
    .filter((claim) => ['pending', 'submitted', 'adjudicated'].includes(claim.status))
    .reduce((sum, claim) => sum + (claim.billed_amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
        <p className="text-slate-500">Revenue, collections, and reimbursement performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Revenue" value={formatCurrency(revenue)} />
        <MetricCard label="Insurance Collections" value={formatCurrency(insuranceCollections)} />
        <MetricCard label="Outstanding Claims" value={formatCurrency(outstandingClaims)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <caption className="sr-only">Recent pharmacy transactions</caption>
            <thead className="border-b bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Insurance</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Copay</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.slice(0, 20).map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-3 text-sm">{formatDate(tx.created_at)}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(tx.total)}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(tx.insurance_paid)}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(tx.copay)}</td>
                  <td className="px-4 py-3 text-sm capitalize">{tx.payment_method ?? 'unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
