import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  assignStaffToLocation,
  deactivateStaffMember,
  inviteLocationStaff,
  updateLocationSettings,
} from '@/actions/locations'
import { transferInventoryStock } from '@/actions/transfers'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role, pharmacy_id')
    .eq('id', user.id)
    .single<{ role: string; pharmacy_id: string | null }>()

  if (!me || !['super_admin', 'pharmacy_admin'].includes(me.role)) {
    redirect('/dashboard/admin')
  }

  if (me.role !== 'super_admin' && me.pharmacy_id !== id) {
    redirect('/dashboard/admin')
  }

  const { data: location } = await supabase
    .from('pharmacies')
    .select('*')
    .eq('id', id)
    .single()

  if (!location) notFound()

  const [staffResult, inventoryResult, locationsResult, transfersResult] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, role, is_active, created_at').eq('pharmacy_id', id).order('last_name'),
    supabase
      .from('inventory')
      .select('id, quantity_on_hand, reorder_point, expiration_date, unit_cost, medications(name, ndc)')
      .eq('pharmacy_id', id)
      .order('updated_at', { ascending: false })
      .limit(200),
    supabase.from('pharmacies').select('id, name').neq('id', id).eq('is_active', true).order('name'),
    supabase
      .from('inventory_transfers')
      .select('id, quantity, status, requested_at, from_pharmacy_id, to_pharmacy_id, medications(name)')
      .or(`from_pharmacy_id.eq.${id},to_pharmacy_id.eq.${id}`)
      .order('requested_at', { ascending: false })
      .limit(50),
  ])

  const staff = staffResult.data ?? []
  const inventory = inventoryResult.data ?? []
  const otherLocations = locationsResult.data ?? []
  const transfers = transfersResult.data ?? []
  const settings = (location.settings as Record<string, unknown> | null) ?? {}
  const operatingHours = (settings.operating_hours as Record<string, string> | undefined) ?? {}
  const templates = (settings.notification_templates as Record<string, string> | undefined) ?? {}
  const acceptedPayers = Array.isArray(settings.accepted_payers)
    ? settings.accepted_payers.map(String).join(', ')
    : ''

  async function inviteStaffAction(formData: FormData) {
    'use server'
    await inviteLocationStaff(id, formData)
  }

  async function updateSettingsAction(formData: FormData) {
    'use server'
    await updateLocationSettings(id, formData)
  }

  async function assignStaffAction(formData: FormData) {
    'use server'
    const staffUserId = String(formData.get('staff_user_id') ?? '')
    const locationId = String(formData.get('location_id') ?? '')
    const mode = String(formData.get('mode') ?? 'additional') as 'primary' | 'additional'
    if (staffUserId && locationId) {
      await assignStaffToLocation(staffUserId, locationId, mode)
    }
  }

  async function deactivateStaffAction(formData: FormData) {
    'use server'
    const staffUserId = String(formData.get('staff_user_id') ?? '')
    if (staffUserId) await deactivateStaffMember(staffUserId)
  }

  async function transferInventoryAction(formData: FormData) {
    'use server'
    await transferInventoryStock(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{location.name}</h1>
          <p className="text-slate-500">NPI {location.npi}</p>
        </div>
        <Link href="/dashboard/admin/locations">
          <Button variant="outline">Back To Locations</Button>
        </Link>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Location Profile</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><span className="text-slate-500">Phone:</span> {location.phone ?? '—'}</p>
              <p><span className="text-slate-500">Email:</span> {location.email ?? '—'}</p>
              <p><span className="text-slate-500">DEA:</span> {location.dea_number ?? '—'}</p>
              <p><span className="text-slate-500">Created:</span> {formatDate(location.created_at)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Inventory Transfer</CardTitle></CardHeader>
            <CardContent>
              <form action={transferInventoryAction} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1 md:col-span-2">
                  <label htmlFor="source_inventory_id" className="text-xs text-slate-600">Source Medication Lot</label>
                  <select id="source_inventory_id" name="source_inventory_id" className="h-9 w-full rounded-md border px-3 text-sm" required>
                    <option value="">Select inventory item</option>
                    {inventory.map((item) => {
                      const medication = item.medications as { name: string; ndc: string } | null
                      return (
                        <option key={item.id} value={item.id}>
                          {medication?.name ?? 'Medication'} ({medication?.ndc ?? 'NDC'}) - Qty {item.quantity_on_hand}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="destination_pharmacy_id" className="text-xs text-slate-600">Destination</label>
                  <select id="destination_pharmacy_id" name="destination_pharmacy_id" className="h-9 w-full rounded-md border px-3 text-sm" required>
                    <option value="">Select location</option>
                    {otherLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="quantity" className="text-xs text-slate-600">Quantity</label>
                  <input id="quantity" name="quantity" type="number" step="0.01" min="0.01" className="h-9 w-full rounded-md border px-3 text-sm" required />
                </div>
                <textarea name="notes" rows={2} className="md:col-span-4 rounded-md border px-3 py-2 text-sm" placeholder="Transfer reason / notes" />
                <Button type="submit" className="md:col-span-4">Transfer Inventory</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Invite Staff</CardTitle></CardHeader>
            <CardContent>
              <form action={inviteStaffAction} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input name="email" type="email" className="h-9 rounded-md border px-3 text-sm md:col-span-2" placeholder="email@pharmacy.com" required />
                <input name="first_name" className="h-9 rounded-md border px-3 text-sm" placeholder="First name" required />
                <input name="last_name" className="h-9 rounded-md border px-3 text-sm" placeholder="Last name" required />
                <select name="role" className="h-9 rounded-md border px-3 text-sm" defaultValue="technician">
                  <option value="pharmacy_admin">Pharmacy Admin</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="technician">Technician</option>
                  <option value="cashier">Cashier</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button type="submit" className="md:col-span-5">Send Invite</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Current Staff ({staff.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <caption className="sr-only">Location staff</caption>
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Joined</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staff.map((member) => (
                    <tr key={member.id}>
                      <td className="px-4 py-3 text-sm">{member.last_name}, {member.first_name}</td>
                      <td className="px-4 py-3 text-sm capitalize">{member.role.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={member.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatDate(member.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <form action={assignStaffAction}>
                            <input type="hidden" name="staff_user_id" value={member.id} />
                            <input type="hidden" name="location_id" value={id} />
                            <input type="hidden" name="mode" value="additional" />
                            <Button type="submit" size="sm" variant="outline">Grant Access</Button>
                          </form>
                          {member.is_active && (
                            <form action={deactivateStaffAction}>
                              <input type="hidden" name="staff_user_id" value={member.id} />
                              <Button type="submit" size="sm" variant="destructive">Deactivate</Button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Location Settings</CardTitle></CardHeader>
            <CardContent>
              <form action={updateSettingsAction} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input name="hours_weekdays" className="h-9 rounded-md border px-3 text-sm" defaultValue={operatingHours.weekdays ?? '09:00-18:00'} placeholder="Weekdays hours" />
                <input name="hours_saturday" className="h-9 rounded-md border px-3 text-sm" defaultValue={operatingHours.saturday ?? '09:00-14:00'} placeholder="Saturday hours" />
                <input name="hours_sunday" className="h-9 rounded-md border px-3 text-sm" defaultValue={operatingHours.sunday ?? 'closed'} placeholder="Sunday hours" />
                <input name="tax_rate" className="h-9 rounded-md border px-3 text-sm" defaultValue={String(settings.tax_rate ?? '')} placeholder="Tax rate (%)" />
                <input name="label_template" className="h-9 rounded-md border px-3 text-sm md:col-span-2" defaultValue={String(settings.label_template ?? 'standard')} placeholder="Label template" />
                <input name="accepted_payers" className="h-9 rounded-md border px-3 text-sm md:col-span-2" defaultValue={acceptedPayers} placeholder="Accepted payers (comma separated)" />
                <textarea name="tpl_ready" rows={2} className="rounded-md border px-3 py-2 text-sm" defaultValue={templates.ready ?? 'Your prescription is ready for pickup.'} placeholder="Ready notification template" />
                <textarea name="tpl_refill" rows={2} className="rounded-md border px-3 py-2 text-sm" defaultValue={templates.refill ?? 'Your refill is available.'} placeholder="Refill notification template" />
                <Button type="submit" className="md:col-span-2">Save Settings</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Location Reports Snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ReportTile label="Staff Count" value={String(staff.length)} />
                <ReportTile
                  label="Inventory Value"
                  value={formatCurrency(
                    inventory.reduce(
                      (sum, item) => sum + item.quantity_on_hand * Number((item as { unit_cost?: number | null }).unit_cost ?? 0),
                      0
                    )
                  )}
                />
                <ReportTile
                  label="Recent Transfers"
                  value={String(transfers.length)}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-700">Latest Inventory Transfers</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <caption className="sr-only">Latest inventory transfers for this location</caption>
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Medication</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Quantity</th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transfers.slice(0, 10).map((transfer) => {
                        const medication = transfer.medications as { name: string } | null
                        return (
                          <tr key={transfer.id}>
                            <td className="px-4 py-2 text-sm">{formatDate(transfer.requested_at)}</td>
                            <td className="px-4 py-2 text-sm">{medication?.name ?? 'Medication'}</td>
                            <td className="px-4 py-2 text-sm">{transfer.quantity}</td>
                            <td className="px-4 py-2 text-sm capitalize">{transfer.status.replace('_', ' ')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ReportTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 border">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}
