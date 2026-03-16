'use client'

import { useEffect, useState } from 'react'

type PermissionState = NotificationPermission | 'unsupported'

function base64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications() {
  // Start with a consistent initial value on both server and client to avoid
  // the hydration mismatch that occurs when useState reads browser APIs
  // (Notification.permission) which are undefined during SSR.
  const [permission, setPermission] = useState<PermissionState>('default')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission)
  }, [])

  async function subscribe() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return { error: 'Push notifications are not supported on this device' }
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      return { error: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing' }
    }

    setIsLoading(true)
    try {
      const requestedPermission = await Notification.requestPermission()
      setPermission(requestedPermission)
      if (requestedPermission !== 'granted') {
        return { error: 'Notification permission was not granted' }
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(vapidPublicKey),
      })

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to save push subscription' }))
        return { error: data.error || 'Failed to save push subscription' }
      }

      return { success: true }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to subscribe for push notifications' }
    } finally {
      setIsLoading(false)
    }
  }

  async function sendTestNotification() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return { error: 'Service worker is not available' }
    }
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('PharmaTech Pro', {
        body: 'Push notifications are enabled on this device.',
        icon: '/icons/icon-192.svg',
      })
      return { success: true }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to show test notification' }
    }
  }

  return {
    permission,
    isLoading,
    subscribe,
    sendTestNotification,
  }
}
