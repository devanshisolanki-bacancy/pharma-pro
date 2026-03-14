import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Users, DollarSign, AlertTriangle, Package,
  CheckCircle, TrendingUp
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { demoDashboard, demoUser, isDemoMode } from '@/lib/demo'

export default async function DashboardPage() {
  const statusColors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800',
    verified: 'bg-indigo-100 text-indigo-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    filling: 'bg-orange-100 text-orange-800',
    quality_check: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    dispensed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  if (isDemoMode()) {
    const kpiCards = [
      {
        title: 'Prescriptions Today',
        value: demoDashboard.prescriptionsToday,
        icon: FileText,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        title: 'Revenue Today',
        value: formatCurrency(demoDashboard.revenueToday),
        icon: DollarSign,
        color: 'text-green-600',
        bg: 'bg-green-50',
      },
      {
        title: 'Active Patients',
        value: demoDashboard.activePatients,
        icon: Users,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
      },
      {
        title: 'Pending Claims',
        value: `${demoDashboard.pendingClaims} (${formatCurrency(demoDashboard.pendingClaimsAmount)})`,
        icon: TrendingUp,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
      },
      {
        title: 'Low Stock Items',
        value: demoDashboard.lowStockCount,
        icon: Package,
        color: 'text-red-600',
        bg: 'bg-red-50',
      },
      {
        title: 'Unread Alerts',
        value: demoDashboard.unreadAlerts,
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
      },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Demo Mode: {demoUser.firstName}
          </h1>
          <p className="text-slate-500 mt-1">
            Static demo data is enabled. No live Supabase, Twilio, OpenAI, or Stripe calls.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((card) => (
            <Card key={card.title} className="overflow-hidden">
              <CardContent className="pt-4">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                <div className="text-xs text-slate-500 mt-1">{card.title}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Recent Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demoDashboard.recentPrescriptions.map((rx) => (
                  <div key={rx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <div className="text-sm font-medium">{rx.rx_number}</div>
                      <div className="text-xs text-slate-500">{rx.patient} · {rx.medication}</div>
                    </div>
                    <Badge className={statusColors[rx.status] || 'bg-gray-100'} variant="outline">
                      {rx.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {demoDashboard.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0 bg-yellow-500" />
                    <div>
                      <div className="text-sm font-medium">{alert.title}</div>
                      {alert.message && (
                        <div className="text-xs text-slate-500">{alert.message}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id, first_name')
    .eq('id', user.id)
    .single()

  if (!profile?.pharmacy_id) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">No pharmacy assigned to your account. Contact your administrator.</p>
      </div>
    )
  }

  // Fetch dashboard stats
  const { data: stats } = await supabase
    .rpc('get_dashboard_stats', { p_pharmacy_id: profile.pharmacy_id })

  const s = stats as {
    prescriptions_today?: number
    revenue_today?: number
    pending_claims?: number
    pending_claims_amount?: number
    active_patients?: number
    low_stock_count?: number
    unread_alerts?: number
    prescriptions_by_status?: Record<string, number>
  } | null

  // Fetch recent prescriptions
  const { data: recentPrescriptions } = await supabase
    .from('prescriptions')
    .select('id, rx_number, status, created_at, patients(first_name, last_name), medications(name)')
    .eq('pharmacy_id', profile.pharmacy_id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch unread alerts
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('pharmacy_id', profile.pharmacy_id)
    .eq('is_read', false)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const kpiCards = [
    {
      title: 'Prescriptions Today',
      value: s?.prescriptions_today ?? 0,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Revenue Today',
      value: formatCurrency(s?.revenue_today ?? 0),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Active Patients',
      value: s?.active_patients ?? 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Pending Claims',
      value: `${s?.pending_claims ?? 0} (${formatCurrency(s?.pending_claims_amount ?? 0)})`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Low Stock Items',
      value: s?.low_stock_count ?? 0,
      icon: Package,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Unread Alerts',
      value: s?.unread_alerts ?? 0,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good morning, {profile.first_name}
        </h1>
        <p className="text-slate-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="pt-4">
              <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <div className="text-xs text-slate-500 mt-1">{card.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Recent Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPrescriptions && recentPrescriptions.length > 0 ? (
                recentPrescriptions.map((rx) => {
                  const patient = rx.patients as { first_name: string; last_name: string } | null
                  const med = rx.medications as { name: string } | null
                  return (
                    <div key={rx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="text-sm font-medium">{rx.rx_number}</div>
                        <div className="text-xs text-slate-500">
                          {patient ? `${patient.first_name} ${patient.last_name}` : '—'} · {med?.name ?? '—'}
                        </div>
                      </div>
                      <Badge className={statusColors[rx.status] || 'bg-gray-100'} variant="outline">
                        {rx.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center">No prescriptions today</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts && alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      alert.type === 'drug_interaction' ? 'bg-red-500' :
                      alert.type === 'low_stock' || alert.type === 'out_of_stock' ? 'bg-yellow-500' :
                      alert.type === 'expiration' ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`} />
                    <div>
                      <div className="text-sm font-medium">{alert.title}</div>
                      {alert.message && (
                        <div className="text-xs text-slate-500">{alert.message}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-green-600 py-4">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">No active alerts</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
