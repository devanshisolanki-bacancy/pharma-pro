import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/formatters'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single()
  const pid = profile?.pharmacy_id ?? ''

  // Last 30 days daily volume
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: rxData } = await supabase
    .from('prescriptions')
    .select('created_at, status')
    .eq('pharmacy_id', pid)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Group by status
  const statusCounts = rxData?.reduce((acc, rx) => {
    acc[rx.status] = (acc[rx.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const { data: txData } = await supabase
    .from('transactions')
    .select('total, payment_method, created_at')
    .eq('pharmacy_id', pid)
    .eq('type', 'sale')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const totalRevenue = txData?.reduce((s, t) => s + (t.total ?? 0), 0) ?? 0
  const avgPerTx = txData && txData.length > 0 ? totalRevenue / txData.length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        <p className="text-slate-500">Last 30 days</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Prescriptions', value: rxData?.length ?? 0 },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
          { label: 'Avg Transaction', value: formatCurrency(avgPerTx) },
          { label: 'Transactions', value: txData?.length ?? 0 },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Prescription Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => {
                const pct = rxData ? Math.round((count / rxData.length) * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <span className="font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {Object.keys(statusCounts).length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No prescription data for this period</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(
                txData?.reduce((acc, t) => {
                  const method = t.payment_method ?? 'unknown'
                  acc[method] = (acc[method] || 0) + 1
                  return acc
                }, {} as Record<string, number>) ?? {}
              ).map(([method, count]) => {
                const pct = txData ? Math.round((count / txData.length) * 100) : 0
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{method}</span>
                      <span className="font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {(!txData || txData.length === 0) && (
                <p className="text-slate-400 text-sm text-center py-4">No transaction data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
