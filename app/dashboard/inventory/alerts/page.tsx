import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'

export default async function InventoryAlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single()

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('pharmacy_id', profile?.pharmacy_id ?? '')
    .in('type', ['low_stock', 'expiration'])
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })

  const lowStock = alerts?.filter(a => a.type === 'low_stock') ?? []
  const expiring = alerts?.filter(a => a.type === 'expiration') ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Alerts</h1>
        <p className="text-slate-500">{alerts?.length ?? 0} active alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
              <Package className="w-4 h-4" />
              Low Stock ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length > 0 ? (
              <div className="space-y-3">
                {lowStock.map(alert => (
                  <div key={alert.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="font-medium text-sm">{alert.title}</div>
                    {alert.message && <div className="text-xs text-slate-500 mt-1">{alert.message}</div>}
                    <div className="text-xs text-slate-400 mt-1">{formatDate(alert.created_at)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">No low stock alerts</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-4 h-4" />
              Expiring Soon ({expiring.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiring.length > 0 ? (
              <div className="space-y-3">
                {expiring.map(alert => (
                  <div key={alert.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="font-medium text-sm">{alert.title}</div>
                    {alert.message && <div className="text-xs text-slate-500 mt-1">{alert.message}</div>}
                    <div className="text-xs text-slate-400 mt-1">{formatDate(alert.created_at)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">No expiration alerts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
