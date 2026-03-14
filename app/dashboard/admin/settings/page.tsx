import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateLocationSettings } from '@/actions/locations'
import { PushNotificationSettings } from '@/components/shared/PushNotificationSettings'
import { demoUser, isDemoMode } from '@/lib/demo'

export default async function AdminSettingsPage() {
  if (isDemoMode()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>
          <p className="text-slate-500">{demoUser.pharmacyName} (demo mode)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operational Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input name="hours_weekdays" className="h-9 rounded-md border px-3 text-sm" defaultValue="09:00-18:00" disabled />
              <input name="hours_saturday" className="h-9 rounded-md border px-3 text-sm" defaultValue="09:00-14:00" disabled />
              <input name="hours_sunday" className="h-9 rounded-md border px-3 text-sm" defaultValue="closed" disabled />
              <input name="tax_rate" className="h-9 rounded-md border px-3 text-sm" defaultValue="7.5" disabled />
              <input name="label_template" className="h-9 rounded-md border px-3 text-sm md:col-span-2" defaultValue="standard" disabled />
              <input name="accepted_payers" className="h-9 rounded-md border px-3 text-sm md:col-span-2" defaultValue="Aetna, Cigna, Humana" disabled />
              <textarea name="tpl_ready" rows={2} className="rounded-md border px-3 py-2 text-sm" defaultValue="Your prescription is ready for pickup." disabled />
              <textarea name="tpl_refill" rows={2} className="rounded-md border px-3 py-2 text-sm" defaultValue="Your refill is available." disabled />
              <Button type="button" className="md:col-span-2" disabled>Read Only In Demo</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

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
    redirect('/dashboard')
  }

  const targetLocationId = profile.pharmacy_id
  if (!targetLocationId) redirect('/dashboard')

  const { data: pharmacy } = await supabase
    .from('pharmacies')
    .select('id, name, settings')
    .eq('id', targetLocationId)
    .single()

  if (!pharmacy) redirect('/dashboard')
  const settings = (pharmacy.settings as Record<string, unknown> | null) ?? {}
  const operatingHours = (settings.operating_hours as Record<string, string> | undefined) ?? {}
  const templates = (settings.notification_templates as Record<string, string> | undefined) ?? {}
  const acceptedPayers = Array.isArray(settings.accepted_payers)
    ? settings.accepted_payers.map(String).join(', ')
    : ''

  async function updateSettingsAction(formData: FormData) {
    'use server'
    await updateLocationSettings(pharmacy.id, formData)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>
        <p className="text-slate-500">{pharmacy.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operational Settings</CardTitle>
        </CardHeader>
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

      <PushNotificationSettings />
    </div>
  )
}
