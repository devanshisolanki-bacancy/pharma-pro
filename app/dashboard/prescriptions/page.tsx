import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Plus, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'
import type { PrescriptionStatus } from '@/lib/supabase/types'
import { demoPrescriptions, isDemoMode } from '@/lib/demo'

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Ready', value: 'ready' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Controlled', value: 'controlled' },
]

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const statusFilter = params.status || ''

  if (isDemoMode()) {
    const filtered = demoPrescriptions.filter((rx) => {
      if (statusFilter === 'active' && !['received', 'verified', 'filling', 'quality_check'].includes(rx.status)) return false
      if (statusFilter === 'ready' && rx.status !== 'ready') return false
      if (statusFilter === 'on_hold' && rx.status !== 'on_hold') return false
      if (statusFilter === 'controlled' && !rx.is_controlled) return false
      if (query && !rx.rx_number.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
            <p className="text-slate-500">{filtered.length} demo prescriptions</p>
          </div>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            New Prescription
          </Button>
        </div>

        <div className="flex gap-4 flex-wrap items-center">
          <form className="flex-1 min-w-[200px] max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input name="q" defaultValue={query} placeholder="Search Rx number..." className="pl-9" />
            </div>
          </form>
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map(tab => (
              <Link key={tab.value} href={`/dashboard/prescriptions${tab.value ? `?status=${tab.value}` : ''}`}>
                <Button variant={statusFilter === tab.value ? 'default' : 'outline'} size="sm">
                  {tab.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">Demo prescription list</caption>
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Rx #</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Patient</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Medication</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Prescriber</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Written</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Qty/Days</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Refills</th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((rx) => (
                    <tr key={rx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm text-blue-600">
                        {rx.rx_number}
                        {rx.is_controlled && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1 rounded">C</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">{rx.patient}</td>
                      <td className="px-4 py-3 text-sm">{rx.medication} <span className="text-xs text-slate-500">{rx.strength}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-600">{rx.prescriber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(rx.written_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{rx.quantity} / {rx.days_supply}d</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{rx.refills_used}/{rx.refills_allowed}</td>
                      <td className="px-4 py-3"><StatusBadge status={rx.status as PrescriptionStatus} /></td>
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

  
  const page = parseInt(params.page || '1')
  const pageSize = 25

  let dbQuery = supabase
    .from('prescriptions')
    .select(
      '*, patients(first_name, last_name), medications(name, strength, schedule), providers(first_name, last_name)',
      { count: 'exact' }
    )
    .eq('pharmacy_id', profile?.pharmacy_id ?? '')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (statusFilter === 'active') {
    dbQuery = dbQuery.in('status', ['received', 'verified', 'filling', 'quality_check'])
  } else if (statusFilter === 'ready') {
    dbQuery = dbQuery.eq('status', 'ready')
  } else if (statusFilter === 'on_hold') {
    dbQuery = dbQuery.eq('status', 'on_hold')
  } else if (statusFilter === 'controlled') {
    dbQuery = dbQuery.eq('is_controlled', true)
  }

  if (query) {
    dbQuery = dbQuery.ilike('rx_number', `%${query}%`)
  }

  const { data: prescriptions, count } = await dbQuery

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
          <p className="text-slate-500">{count ?? 0} prescriptions</p>
        </div>
        <Link href="/dashboard/prescriptions/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Prescription
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <form className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input name="q" defaultValue={query} placeholder="Search Rx number..." className="pl-9" />
          </div>
        </form>
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab.value}
              href={`/dashboard/prescriptions${tab.value ? `?status=${tab.value}` : ''}`}
            >
              <Button
                variant={statusFilter === tab.value ? 'default' : 'outline'}
                size="sm"
              >
                {tab.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Prescription list</caption>
              <thead className="border-b bg-slate-50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Rx #</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Patient</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Medication</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Prescriber</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Written</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Qty/Days</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Refills</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prescriptions && prescriptions.length > 0 ? (
                  prescriptions.map((rx) => {
                    const patient = rx.patients as { first_name: string; last_name: string } | null
                    const med = rx.medications as { name: string; strength: string | null; schedule: string } | null
                    const provider = rx.providers as { first_name: string; last_name: string } | null
                    return (
                      <tr key={rx.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/prescriptions/${rx.id}`} className="font-mono text-blue-600 hover:underline text-sm">
                            {rx.rx_number}
                          </Link>
                          {rx.is_controlled && (
                            <span className="ml-1 text-xs bg-red-100 text-red-700 px-1 rounded">C</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {patient ? `${patient.last_name}, ${patient.first_name}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {med?.name ?? '—'}
                          {med?.strength && <span className="text-slate-400 ml-1 text-xs">{med.strength}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {provider ? `Dr. ${provider.last_name}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(rx.written_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {rx.quantity} / {rx.days_supply ?? '—'}d
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {rx.refills_used}/{rx.refills_allowed}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={rx.status as PrescriptionStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/prescriptions/${rx.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      No prescriptions found
                    </td>
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
