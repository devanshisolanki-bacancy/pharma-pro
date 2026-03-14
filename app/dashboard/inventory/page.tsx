import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Plus, Search, Package, AlertTriangle, DollarSign } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'
import { demoInventory, isDemoMode } from '@/lib/demo'

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
  { label: 'Expiring Soon', value: 'expiring' },
  { label: 'Expired', value: 'expired' },
]

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const filter = params.filter || ''

  if (isDemoMode()) {
    const filtered = demoInventory.filter((item) => {
      if (filter && item.status !== filter && !(filter === 'expiring' && item.status === 'low_stock')) return false
      if (!query) return true
      const q = query.toLowerCase()
      return item.medication_name.toLowerCase().includes(q) || item.ndc.toLowerCase().includes(q)
    })

    const stats = {
      total: demoInventory.length,
      value: demoInventory.reduce((sum, i) => sum + (i.quantity_on_hand * i.selling_price), 0),
      lowStock: demoInventory.filter((i) => i.status === 'low_stock').length,
      outOfStock: demoInventory.filter((i) => i.status === 'out_of_stock').length,
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
            <p className="text-slate-500">{stats.total} demo SKUs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alerts ({stats.lowStock + stats.outOfStock})
            </Button>
            <Button variant="outline" disabled>Suppliers</Button>
            <Button disabled>
              <Plus className="w-4 h-4 mr-2" />
              Receive Stock
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total SKUs', value: stats.total, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Inventory Value', value: formatCurrency(stats.value), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(card => (
            <Card key={card.label}>
              <CardContent className="pt-4">
                <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className="text-xl font-bold">{card.value}</div>
                <div className="text-xs text-slate-500">{card.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap items-center">
          <form className="flex-1 min-w-[200px] max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input name="q" defaultValue={query} placeholder="Search medication or NDC..." className="pl-9" />
            </div>
          </form>
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map(tab => (
              <Link key={tab.value} href={tab.value ? `/dashboard/inventory?filter=${tab.value}` : '/dashboard/inventory'}>
                <Button variant={filter === tab.value ? 'default' : 'outline'} size="sm">{tab.label}</Button>
              </Link>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">Demo inventory list</caption>
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Medication</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">NDC</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Lot #</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Expiry</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Qty on Hand</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Reorder At</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Unit Cost</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Sell Price</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium">{item.medication_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.ndc}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.lot_number}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(item.expiration_date)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{item.quantity_on_hand}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.reorder_point}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.unit_cost)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.selling_price)}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id')
    .eq('id', user.id)
    .single()

  

  // Summary stats
  const { data: allInventory } = await supabase
    .from('inventory')
    .select('status, quantity_on_hand, selling_price')
    .eq('pharmacy_id', profile?.pharmacy_id ?? '')

  const stats = {
    total: allInventory?.length ?? 0,
    value: allInventory?.reduce((sum, i) => sum + (i.quantity_on_hand * (i.selling_price ?? 0)), 0) ?? 0,
    lowStock: allInventory?.filter(i => i.status === 'low_stock').length ?? 0,
    outOfStock: allInventory?.filter(i => i.status === 'out_of_stock').length ?? 0,
  }

  let dbQuery = supabase
    .from('inventory')
    .select('*, medications(name, ndc, brand_name, strength, dosage_form, schedule), suppliers(name)')
    .eq('pharmacy_id', profile?.pharmacy_id ?? '')
    .order('updated_at', { ascending: false })

  if (filter === 'low_stock') {
    dbQuery = dbQuery.eq('status', 'low_stock')
  } else if (filter === 'out_of_stock') {
    dbQuery = dbQuery.eq('status', 'out_of_stock')
  } else if (filter === 'expired') {
    dbQuery = dbQuery.eq('status', 'expired')
  } else if (filter === 'expiring') {
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    dbQuery = dbQuery
      .gt('expiration_date', new Date().toISOString().split('T')[0])
      .lte('expiration_date', thirtyDays.toISOString().split('T')[0])
  }

  const { data: inventory } = await dbQuery

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500">{stats.total} SKUs</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/inventory/alerts">
            <Button variant="outline">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alerts {(stats.lowStock + stats.outOfStock) > 0 && `(${stats.lowStock + stats.outOfStock})`}
            </Button>
          </Link>
          <Link href="/dashboard/inventory/suppliers">
            <Button variant="outline">Suppliers</Button>
          </Link>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Receive Stock
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total SKUs', value: stats.total, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Inventory Value', value: formatCurrency(stats.value), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(card => (
          <Card key={card.label}>
            <CardContent className="pt-4">
              <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center mb-2`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="text-xl font-bold">{card.value}</div>
              <div className="text-xs text-slate-500">{card.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <form className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input name="q" defaultValue={query} placeholder="Search medication or NDC..." className="pl-9" />
          </div>
        </form>
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <Link key={tab.value} href={tab.value ? `/dashboard/inventory?filter=${tab.value}` : '/dashboard/inventory'}>
              <Button variant={filter === tab.value ? 'default' : 'outline'} size="sm">{tab.label}</Button>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Inventory list</caption>
              <thead className="border-b bg-slate-50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Medication</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">NDC</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Lot #</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Expiry</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Qty on Hand</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Reorder At</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Unit Cost</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Sell Price</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventory && inventory.length > 0 ? (
                  inventory.map((item) => {
                    const med = item.medications as { name: string; ndc: string; brand_name: string | null; strength: string | null } | null
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{med?.name ?? '—'}</div>
                          {med?.brand_name && <div className="text-xs text-slate-400">{med.brand_name}</div>}
                          {med?.strength && <div className="text-xs text-slate-400">{med.strength}</div>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{med?.ndc ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{item.lot_number ?? '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span>
                            {formatDate(item.expiration_date)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <span className={
                            item.quantity_on_hand === 0 ? 'text-red-600' :
                            item.quantity_on_hand <= item.reorder_point ? 'text-yellow-600' :
                            'text-slate-900'
                          }>
                            {item.quantity_on_hand}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{item.reorder_point}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.unit_cost)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.selling_price)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">No inventory items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
