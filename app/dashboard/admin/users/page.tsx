import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants/roles'
import type { UserRole } from '@/lib/supabase/types'
import { formatDate } from '@/lib/utils/formatters'
import { Users } from 'lucide-react'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id, role')
    .eq('id', user.id)
    .single<{ pharmacy_id: string | null; role: string }>()

  if (!profile || !['super_admin', 'pharmacy_admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .eq('pharmacy_id', profile.pharmacy_id ?? '')
    .order('last_name')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{users?.length ?? 0} Staff Members</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <caption className="sr-only">Staff list</caption>
            <thead className="border-b bg-slate-50">
              <tr>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Name</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Role</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Phone</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">License</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users && users.length > 0 ? users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-sm">{u.last_name}, {u.first_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role as UserRole]}`}>
                      {ROLE_LABELS[u.role as UserRole]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.license_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={u.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(u.created_at)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No staff members found</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
