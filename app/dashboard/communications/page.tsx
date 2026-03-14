import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils/formatters'
import { MessageSquare, Mail, Smartphone } from 'lucide-react'
import { demoNotifications, isDemoMode } from '@/lib/demo'

export default async function CommunicationsPage() {
  if (isDemoMode()) {
    const notifications = demoNotifications
    const stats = {
      smsSent: notifications.filter(n => n.channel === 'sms' && n.status === 'sent').length,
      emailSent: notifications.filter(n => n.channel === 'email' && n.status === 'sent').length,
      sent: notifications.filter(n => n.status === 'sent').length,
      pending: notifications.filter(n => n.status === 'pending').length,
      failed: notifications.filter(n => n.status === 'failed').length,
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Communications</h1>
            <p className="text-slate-500">{notifications.length} demo notification records</p>
          </div>
          <Button variant="outline" disabled>Refill Portal (Disabled)</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'SMS Sent', value: stats.smsSent, icon: Smartphone, color: 'text-blue-600' },
            { label: 'Emails Sent', value: stats.emailSent, icon: Mail, color: 'text-green-600' },
            { label: 'Delivered', value: stats.sent, icon: MessageSquare, color: 'text-purple-600' },
            { label: 'Pending', value: stats.pending, icon: MessageSquare, color: 'text-orange-600' },
            { label: 'Failed', value: stats.failed, icon: MessageSquare, color: 'text-red-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Notification Log</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <caption className="sr-only">Notification log</caption>
              <thead className="border-b bg-slate-50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Patient</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Channel</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Template</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{n.patient}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={n.channel === 'sms' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}>
                        {n.channel.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{n.template.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={n.status === 'sent' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                        {n.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{n.sent_at ? formatDateTime(n.sent_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single()

  const { data: notifications, count } = await supabase
    .from('notifications')
    .select('*, patients(first_name, last_name)', { count: 'exact' })
    .eq('pharmacy_id', profile?.pharmacy_id ?? '')
    .order('created_at', { ascending: false })
    .limit(50)

  const stats = {
    smsSent: notifications?.filter(n => n.channel === 'sms' && n.status === 'sent').length ?? 0,
    emailSent: notifications?.filter(n => n.channel === 'email' && n.status === 'sent').length ?? 0,
    sent: notifications?.filter(n => n.status === 'sent').length ?? 0,
    pending: notifications?.filter(n => n.status === 'pending').length ?? 0,
    failed: notifications?.filter(n => n.status === 'failed').length ?? 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communications</h1>
          <p className="text-slate-500">{count ?? 0} notification records</p>
        </div>
        <Link href="/refill-request">
          <Button variant="outline">Open Patient Refill Portal</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'SMS Sent', value: stats.smsSent, icon: Smartphone, color: 'text-blue-600' },
          { label: 'Emails Sent', value: stats.emailSent, icon: Mail, color: 'text-green-600' },
          { label: 'Delivered', value: stats.sent, icon: MessageSquare, color: 'text-purple-600' },
          { label: 'Pending', value: stats.pending, icon: MessageSquare, color: 'text-orange-600' },
          { label: 'Failed', value: stats.failed, icon: MessageSquare, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Notification Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <caption className="sr-only">Notification log</caption>
            <thead className="border-b bg-slate-50">
              <tr>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Patient</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Channel</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Template</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notifications && notifications.length > 0 ? notifications.map(n => {
                const patient = n.patients as { first_name: string; last_name: string } | null
                return (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{patient ? `${patient.last_name}, ${patient.first_name}` : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={n.channel === 'sms' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}>
                        {n.channel.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{n.template.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={n.status === 'sent' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                        {n.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{n.sent_at ? formatDateTime(n.sent_at) : '—'}</td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No notifications sent yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
