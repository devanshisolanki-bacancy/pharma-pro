import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Building2, Settings } from 'lucide-react'
import { isDemoMode } from '@/lib/demo'

export default async function AdminPage() {
  if (isDemoMode()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
          <p className="text-slate-500">Demo mode is read-only</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Users, title: 'Staff Management', description: 'Manage pharmacists, technicians, and staff accounts' },
            { icon: Building2, title: 'Pharmacy Locations', description: 'Manage pharmacy locations and settings' },
            { icon: Settings, title: 'Settings', description: 'Configure pharmacy preferences and integrations' },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="pt-6">
                <item.icon className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{item.description}</p>
                <Button variant="outline" size="sm" className="w-full" disabled>Demo Only</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (!profile || !['super_admin', 'pharmacy_admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
        <p className="text-slate-500">Manage users, locations, and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/admin/users', icon: Users, title: 'Staff Management', description: 'Manage pharmacists, technicians, and staff accounts' },
          { href: '/dashboard/admin/locations', icon: Building2, title: 'Pharmacy Locations', description: 'Manage pharmacy locations and settings' },
          { href: '/dashboard/admin/settings', icon: Settings, title: 'Settings', description: 'Configure pharmacy preferences and integrations' },
        ].map(item => (
          <Card key={item.href} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <item.icon className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-slate-500 mb-4">{item.description}</p>
              <Link href={item.href}>
                <Button variant="outline" size="sm" className="w-full">Open</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
