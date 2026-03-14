import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/formatters'

export default async function ConsolidatedReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/dashboard/reports')
  }

  const { data: locations } = await supabase
    .from('pharmacies')
    .select('id, name, is_active')
    .order('name')

  const locationStats = await Promise.all(
    (locations ?? []).map(async (location) => {
      const [{ count: patientCount }, { count: rxCount }, { data: tx }, { data: inventory }] = await Promise.all([
        supabase.from('patients').select('id', { head: true, count: 'exact' }).eq('pharmacy_id', location.id).eq('is_active', true),
        supabase.from('prescriptions').select('id', { head: true, count: 'exact' }).eq('pharmacy_id', location.id),
        supabase.from('transactions').select('total').eq('pharmacy_id', location.id).eq('type', 'sale'),
        supabase.from('inventory').select('quantity_on_hand, unit_cost').eq('pharmacy_id', location.id),
      ])

      const revenue = (tx ?? []).reduce((sum, row) => sum + (row.total ?? 0), 0)
      const inventoryValue = (inventory ?? []).reduce(
        (sum, row) => sum + row.quantity_on_hand * (row.unit_cost ?? 0),
        0
      )

      return {
        locationId: location.id,
        name: location.name,
        isActive: location.is_active,
        patientCount: patientCount ?? 0,
        rxCount: rxCount ?? 0,
        revenue,
        inventoryValue,
      }
    })
  )

  const totals = locationStats.reduce(
    (acc, row) => ({
      patients: acc.patients + row.patientCount,
      prescriptions: acc.prescriptions + row.rxCount,
      revenue: acc.revenue + row.revenue,
      inventoryValue: acc.inventoryValue + row.inventoryValue,
    }),
    { patients: 0, prescriptions: 0, revenue: 0, inventoryValue: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consolidated Chain Report</h1>
          <p className="text-slate-500">Cross-location operational and financial rollup</p>
        </div>
        <Link href="/dashboard/reports">
          <Button variant="outline">Back To Reports</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Active Patients" value={String(totals.patients)} />
        <SummaryCard label="Total Prescriptions" value={String(totals.prescriptions)} />
        <SummaryCard label="Total Revenue" value={formatCurrency(totals.revenue)} />
        <SummaryCard label="Inventory Value" value={formatCurrency(totals.inventoryValue)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <caption className="sr-only">Consolidated location metrics</caption>
            <thead className="border-b bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Location</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patients</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Prescriptions</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Revenue</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Inventory Value</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {locationStats.map((row) => (
                <tr key={row.locationId}>
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.patientCount}</td>
                  <td className="px-4 py-3 text-sm">{row.rxCount}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.inventoryValue)}</td>
                  <td className="px-4 py-3 text-sm">{row.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
