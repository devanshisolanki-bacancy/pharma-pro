import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createPharmacyLocation, setLocationStatus } from '@/actions/locations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, PlusCircle, BarChart3 } from 'lucide-react'

async function createLocationAction(formData: FormData) {
  'use server'
  await createPharmacyLocation(formData)
}

async function toggleLocationStatusAction(formData: FormData) {
  'use server'
  const locationId = String(formData.get('location_id') ?? '')
  const nextStatus = String(formData.get('next_status') ?? '') === 'active'
  if (locationId) {
    await setLocationStatus(locationId, nextStatus)
  }
}

export default async function LocationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/dashboard/admin')
  }

  const { data: locations } = await supabase
    .from('pharmacies')
    .select('id, name, npi, address, phone, email, is_active, settings, created_at')
    .order('name')

  const today = new Date().toISOString().split('T')[0]
  const stats = await Promise.all(
    (locations ?? []).map(async (location) => {
      const [{ count: staffCount }, { count: todayRxCount }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { head: true, count: 'exact' })
          .eq('pharmacy_id', location.id)
          .eq('is_active', true),
        supabase
          .from('prescriptions')
          .select('id', { head: true, count: 'exact' })
          .eq('pharmacy_id', location.id)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lte('created_at', `${today}T23:59:59.999Z`),
      ])
      return {
        locationId: location.id,
        staffCount: staffCount ?? 0,
        todayRxCount: todayRxCount ?? 0,
      }
    })
  )

  const byLocation = Object.fromEntries(stats.map((s) => [s.locationId, s]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Locations</h1>
          <p className="text-slate-500">Chain-wide location administration</p>
        </div>
        <Link href="/dashboard/reports/consolidated">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Consolidated Reporting
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Add New Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLocationAction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input name="name" className="h-9 rounded-md border px-3 text-sm" placeholder="Location name" required />
            <input name="npi" className="h-9 rounded-md border px-3 text-sm" placeholder="NPI" required />
            <input name="dea_number" className="h-9 rounded-md border px-3 text-sm" placeholder="DEA number" />
            <input name="phone" className="h-9 rounded-md border px-3 text-sm" placeholder="Phone" />
            <input name="email" className="h-9 rounded-md border px-3 text-sm" placeholder="Email" />
            <input name="street" className="h-9 rounded-md border px-3 text-sm" placeholder="Street address" />
            <input name="city" className="h-9 rounded-md border px-3 text-sm" placeholder="City" required />
            <input name="state" className="h-9 rounded-md border px-3 text-sm" placeholder="State" required />
            <input name="zip" className="h-9 rounded-md border px-3 text-sm" placeholder="ZIP" />
            <input name="tax_rate" className="h-9 rounded-md border px-3 text-sm" placeholder="Tax rate (%)" />
            <input name="accepted_payers" className="h-9 rounded-md border px-3 text-sm md:col-span-2" placeholder="Accepted payers (comma separated)" />
            <Button type="submit">Create Location</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(locations ?? []).map((location) => {
          const locationAddress = location.address as {
            street?: string
            city?: string
            state?: string
            zip?: string
          } | null
          const stat = byLocation[location.id]
          return (
            <Card key={location.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <h2 className="font-semibold">{location.name}</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">NPI: {location.npi}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={location.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}
                  >
                    {location.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <p className="text-sm text-slate-600">
                  {[locationAddress?.street, locationAddress?.city, locationAddress?.state, locationAddress?.zip]
                    .filter(Boolean)
                    .join(', ') || 'Address not configured'}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-slate-50 p-2">
                    <p className="text-xs text-slate-500">Active Staff</p>
                    <p className="font-semibold">{stat?.staffCount ?? 0}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <p className="text-xs text-slate-500">Rx Today</p>
                    <p className="font-semibold">{stat?.todayRxCount ?? 0}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/dashboard/admin/locations/${location.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">Open</Button>
                  </Link>
                  <form action={toggleLocationStatusAction}>
                    <input type="hidden" name="location_id" value={location.id} />
                    <input type="hidden" name="next_status" value={location.is_active ? 'inactive' : 'active'} />
                    <Button size="sm" variant={location.is_active ? 'destructive' : 'default'}>
                      {location.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
