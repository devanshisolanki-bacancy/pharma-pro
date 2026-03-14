import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateNotificationPreferences } from '@/actions/notifications'
import {
  parseContactTimeWindow,
  parseNotificationPreferences,
} from '@/lib/utils/notifications'
import type { Json } from '@/lib/supabase/types'

type NotificationPreferencePatient = {
  id: string
  sms_opt_in: boolean
  email_opt_in: boolean
  preferred_notification_channel: string
  notification_preferences: Json
  contact_time_window: Json
}

export function NotificationPreferences({ patient }: { patient: NotificationPreferencePatient }) {
  const prefs = parseNotificationPreferences(patient.notification_preferences)
  const timeWindow = parseContactTimeWindow(patient.contact_time_window)
  async function updateAction(formData: FormData) {
    'use server'
    await updateNotificationPreferences(patient.id, formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateAction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input name="sms_opt_in" type="checkbox" defaultChecked={patient.sms_opt_in} />
              SMS alerts enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="email_opt_in" type="checkbox" defaultChecked={patient.email_opt_in} />
              Email alerts enabled
            </label>
          </div>

          <div className="space-y-2">
            <label htmlFor="preferred_notification_channel" className="text-sm font-medium">
              Preferred Channel
            </label>
            <select
              id="preferred_notification_channel"
              name="preferred_notification_channel"
              defaultValue={patient.preferred_notification_channel === 'email' ? 'email' : 'sms'}
              className="h-9 rounded-md border px-3 text-sm"
            >
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="contact_start" className="text-sm font-medium">Contact Window Start</label>
              <input
                id="contact_start"
                name="contact_start"
                type="time"
                defaultValue={timeWindow.start}
                className="h-9 rounded-md border px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="contact_end" className="text-sm font-medium">Contact Window End</label>
              <input
                id="contact_end"
                name="contact_end"
                type="time"
                defaultValue={timeWindow.end}
                className="h-9 rounded-md border px-3 text-sm"
              />
            </div>
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <p className="text-sm font-medium">Notification Types</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                name="pref_prescription_ready"
                type="checkbox"
                defaultChecked={prefs.prescription_ready}
              />
              Prescription ready alerts
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                name="pref_refill_reminder"
                type="checkbox"
                defaultChecked={prefs.refill_reminder}
              />
              Refill reminders
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                name="pref_adherence"
                type="checkbox"
                defaultChecked={prefs.adherence}
              />
              Adherence reminders
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                name="pref_health_alert"
                type="checkbox"
                defaultChecked={prefs.health_alert}
              />
              Health alerts
            </label>
          </div>

          <Button type="submit" size="sm">Save Preferences</Button>
        </form>
      </CardContent>
    </Card>
  )
}
