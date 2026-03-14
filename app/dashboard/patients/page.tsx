import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search, User } from 'lucide-react'
import { formatDate, calculateAge } from '@/lib/utils/formatters'
import { demoPatients, isDemoMode } from '@/lib/demo'

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const showInactive = params.status === 'inactive'

  if (isDemoMode()) {
    const filteredPatients = demoPatients.filter((patient) => {
      if (showInactive && patient.is_active) return false
      if (!showInactive && !patient.is_active) return false
      if (!query) return true
      const q = query.toLowerCase()
      return (
        patient.first_name.toLowerCase().includes(q) ||
        patient.last_name.toLowerCase().includes(q) ||
        (patient.phone ?? '').toLowerCase().includes(q) ||
        (patient.email ?? '').toLowerCase().includes(q)
      )
    })

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
            <p className="text-slate-500">{filteredPatients.length} demo patients</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled>Network View</Button>
            <Button disabled>
              <Plus className="w-4 h-4 mr-2" />
              New Patient
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4 flex-wrap">
              <form className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input name="q" defaultValue={query} placeholder="Search by name, phone, or email..." className="pl-9" />
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">Demo patient list</caption>
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">DOB / Age</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Allergies</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">HIPAA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((patient) => {
                    const age = calculateAge(patient.date_of_birth)
                    return (
                      <tr key={patient.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {patient.last_name}, {patient.first_name}
                              </div>
                              {patient.email && <div className="text-xs text-slate-500">{patient.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(patient.date_of_birth, 'MM/dd/yyyy')}
                          {age !== null && <span className="text-slate-400 ml-1">({age}y)</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{patient.phone || '—'}</td>
                        <td className="px-4 py-3">
                          {patient.allergies.length > 0 ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {patient.allergies.join(', ')}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {patient.hipaa_signed_at ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Signed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
    .select('pharmacy_id, role')
    .eq('id', user.id)
    .single()

  const page = parseInt(params.page || '1')
  const pageSize = 25
  const offset = (page - 1) * pageSize

  let dbQuery = supabase
    .from('patients')
    .select('*, insurance_plans(id), prescriptions(id, status)', { count: 'exact' })
    .eq('pharmacy_id', profile?.pharmacy_id ?? '')
    .eq('is_active', !showInactive)
    .order('last_name', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (query) {
    dbQuery = dbQuery.or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`
    )
  }

  const { data: patients, count } = await dbQuery
  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-slate-500">{count ?? 0} total patients</p>
        </div>
        <div className="flex gap-2">
          {['super_admin', 'pharmacy_admin'].includes(profile?.role ?? '') && (
            <Link href="/dashboard/patients/network">
              <Button variant="outline">Network View</Button>
            </Link>
          )}
          <Link href="/dashboard/patients/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <form className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Search by name, phone, or email..."
                  className="pl-9"
                />
              </div>
            </form>
            <div className="flex gap-2">
              <Link href="/dashboard/patients">
                <Button variant={!showInactive ? 'default' : 'outline'} size="sm">Active</Button>
              </Link>
              <Link href="/dashboard/patients?status=inactive">
                <Button variant={showInactive ? 'default' : 'outline'} size="sm">Inactive</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Patient list</caption>
              <thead className="border-b bg-slate-50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">DOB / Age</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Allergies</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Insurance</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">HIPAA</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients && patients.length > 0 ? (
                  patients.map((patient) => {
                    const age = calculateAge(patient.date_of_birth)
                    const insurancePlans = patient.insurance_plans as { id: string }[] | null
                    return (
                      <tr key={patient.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <Link
                                href={`/dashboard/patients/${patient.id}`}
                                className="font-medium text-slate-900 hover:text-blue-600"
                              >
                                {patient.last_name}, {patient.first_name}
                              </Link>
                              {patient.email && (
                                <div className="text-xs text-slate-500">{patient.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(patient.date_of_birth, 'MM/dd/yyyy')}
                          {age !== null && <span className="text-slate-400 ml-1">({age}y)</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {patient.phone || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {patient.allergies && patient.allergies.length > 0 ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {patient.allergies.length} allerg{patient.allergies.length === 1 ? 'y' : 'ies'}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {insurancePlans && insurancePlans.length > 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {insurancePlans.length} plan{insurancePlans.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {patient.hipaa_signed_at ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Signed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/patients/${patient.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      {query ? `No patients found for "${query}"` : 'No patients yet. Add your first patient.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/dashboard/patients?q=${query}&page=${page - 1}`}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`/dashboard/patients?q=${query}&page=${page + 1}`}>
                    <Button variant="outline" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
