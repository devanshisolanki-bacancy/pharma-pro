import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'

export default async function NetworkPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pharmacy?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, pharmacy_id')
    .eq('id', user.id)
    .single<{ role: string; pharmacy_id: string | null }>()

  if (!profile || !['super_admin', 'pharmacy_admin'].includes(profile.role)) {
    redirect('/dashboard/patients')
  }

  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const selectedPharmacy = params.pharmacy?.trim() ?? ''

  const { data: accessRows } = profile.role === 'super_admin'
    ? await supabase.from('pharmacies').select('id')
    : await supabase.from('user_pharmacy_access').select('pharmacy_id').eq('user_id', user.id).eq('is_active', true)

  const allowedPharmacies = profile.role === 'super_admin'
    ? (accessRows ?? []).map((row) => (row as { id: string }).id)
    : [profile.pharmacy_id, ...(accessRows ?? []).map((row) => (row as { pharmacy_id: string }).pharmacy_id)].filter(Boolean) as string[]

  let patientQuery = supabase
    .from('patients')
    .select('id, pharmacy_id, first_name, last_name, date_of_birth, phone, is_active, hipaa_signed_at, pharmacies(name)')
    .in('pharmacy_id', allowedPharmacies)
    .order('last_name')
    .limit(300)

  if (selectedPharmacy) {
    patientQuery = patientQuery.eq('pharmacy_id', selectedPharmacy)
  }
  if (query) {
    patientQuery = patientQuery.or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`
    )
  }

  const [{ data: patients }, { data: pharmacies }] = await Promise.all([
    patientQuery,
    supabase
      .from('pharmacies')
      .select('id, name')
      .in('id', allowedPharmacies)
      .order('name'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network Patients</h1>
          <p className="text-slate-500">Cross-location patient lookup</p>
        </div>
        <Link href="/dashboard/patients">
          <Button variant="outline">Back To Patients</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input name="q" placeholder="Search by patient name or phone..." defaultValue={query} className="pl-9" />
            </div>
            <select
              name="pharmacy"
              className="h-9 rounded-md border px-3 text-sm"
              defaultValue={selectedPharmacy}
            >
              <option value="">All Locations</option>
              {(pharmacies ?? []).map((pharmacy) => (
                <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name}</option>
              ))}
            </select>
            <Button type="submit">Apply Filters</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <caption className="sr-only">Cross-location patients</caption>
            <thead className="border-b bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">DOB</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Location</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">HIPAA</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(patients ?? []).map((patient) => {
                const pharmacy = patient.pharmacies as { name: string } | null
                return (
                  <tr key={patient.id}>
                    <td className="px-4 py-3 text-sm">{patient.last_name}, {patient.first_name}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(patient.date_of_birth)}</td>
                    <td className="px-4 py-3 text-sm">{pharmacy?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline" className={patient.hipaa_signed_at ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                        {patient.hipaa_signed_at ? 'Signed' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{patient.is_active ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm">Open</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(patients?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No patients found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
