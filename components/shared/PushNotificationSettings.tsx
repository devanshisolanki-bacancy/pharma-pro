'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function PushNotificationSettings() {
  const { permission, isLoading, subscribe, sendTestNotification } = usePushNotifications()
  const [message, setMessage] = useState<string>('')

  async function enablePush() {
    const result = await subscribe()
    setMessage(result.error ? `Error: ${result.error}` : 'Push notifications enabled successfully.')
  }

  async function testPush() {
    const result = await sendTestNotification()
    setMessage(result.error ? `Error: ${result.error}` : 'Test notification sent.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Push Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Permission status: <span className="font-medium capitalize">{permission}</span>
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void enablePush()} disabled={isLoading || permission === 'granted'}>
            Enable Push
          </Button>
          <Button type="button" variant="outline" onClick={() => void testPush()} disabled={isLoading || permission !== 'granted'}>
            Send Test Notification
          </Button>
        </div>
        {message && <p className="text-sm text-slate-500">{message}</p>}
      </CardContent>
    </Card>
  )
}
