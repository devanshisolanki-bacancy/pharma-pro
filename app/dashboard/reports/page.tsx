import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Shield, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { demoClaims, demoDashboard, isDemoMode } from '@/lib/demo'

export default async function ReportsPage() {
  if (isDemoMode()) {
    const totalRevenue = demoDashboard.revenueToday * 22
    const claimAcceptance = Math.round(
      (demoClaims.filter((claim) => claim.status === 'paid').length / demoClaims.length) * 100
    )
    const reportLinks = [
      {
        href: '/dashboard/reports/analytics',
        icon: BarChart3,
        title: 'Analytics Dashboard',
        description: 'Prescription volume, revenue trends, and operational KPIs',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        href: '/dashboard/reports/financial',
        icon: TrendingUp,
        title: 'Financial Reports',
        description: 'Revenue summaries, insurance performance, and profitability',
        color: 'text-green-600',
        bg: 'bg-green-50',
      },
      {
        href: '/dashboard/reports/compliance',
        icon: Shield,
        title: 'Compliance Reports',
        description: 'DEA reports, HIPAA audit trail, and regulatory submissions',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
      },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500">Demo month-to-date performance overview</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Prescriptions (MTD)', value: demoDashboard.prescriptionsToday * 22 },
            { label: 'Revenue (MTD)', value: formatCurrency(totalRevenue) },
            { label: 'Claim Acceptance Rate', value: `${claimAcceptance}%` },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportLinks.map(r => (
            <Card key={r.href} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className={`w-10 h-10 ${r.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <r.icon className={`w-5 h-5 ${r.color}`} />
                </div>
                <h3 className="font-semibold mb-1">{r.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{r.description}</p>
                <Button variant="outline" size="sm" className="w-full" disabled>Demo View</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('pharmacy_id, role').eq('id', user.id).single()
  const pid = profile?.pharmacy_id ?? ''

  // Quick stats for this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [{ count: rxCount }, { data: revenue }, { data: claims }] = await Promise.all([
    supabase.from('prescriptions').select('id', { count: 'exact', head: true })
      .eq('pharmacy_id', pid).gte('created_at', startOfMonth.toISOString()),
    supabase.from('transactions').select('total')
      .eq('pharmacy_id', pid).eq('type', 'sale').gte('created_at', startOfMonth.toISOString()),
    supabase.from('claims').select('status')
      .eq('pharmacy_id', pid).gte('created_at', startOfMonth.toISOString()),
  ])

  const totalRevenue = revenue?.reduce((s, t) => s + (t.total ?? 0), 0) ?? 0
  const claimAcceptance = claims && claims.length > 0
    ? Math.round((claims.filter(c => c.status === 'paid').length / claims.length) * 100)
    : 0

  const reportLinks = [
    {
      href: '/dashboard/reports/analytics',
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Prescription volume, revenue trends, and operational KPIs',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      href: '/dashboard/reports/financial',
      icon: TrendingUp,
      title: 'Financial Reports',
      description: 'Revenue summaries, insurance performance, and profitability',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      href: '/dashboard/reports/compliance',
      icon: Shield,
      title: 'Compliance Reports',
      description: 'DEA reports, HIPAA audit trail, and regulatory submissions',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  if (profile?.role === 'super_admin') {
    reportLinks.push({
      href: '/dashboard/reports/consolidated',
      icon: BarChart3,
      title: 'Consolidated Reports',
      description: 'Chain-level metrics across all locations and network operations',
      color: 'text-slate-700',
      bg: 'bg-slate-100',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-500">Month-to-date performance overview</p>
      </div>

      {/* MTD Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Prescriptions (MTD)', value: rxCount ?? 0 },
          { label: 'Revenue (MTD)', value: formatCurrency(totalRevenue) },
          { label: 'Claim Acceptance Rate', value: `${claimAcceptance}%` },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportLinks.map(r => (
          <Card key={r.href} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className={`w-10 h-10 ${r.bg} rounded-lg flex items-center justify-center mb-4`}>
                <r.icon className={`w-5 h-5 ${r.color}`} />
              </div>
              <h3 className="font-semibold mb-1">{r.title}</h3>
              <p className="text-sm text-slate-500 mb-4">{r.description}</p>
              <Link href={r.href}>
                <Button variant="outline" size="sm" className="w-full">Open Report</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
