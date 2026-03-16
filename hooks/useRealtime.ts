'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { demoDashboard, isDemoMode } from '@/lib/demo'

type PrescriptionRow = Database['public']['Tables']['prescriptions']['Row']
type AlertRow = Database['public']['Tables']['alerts']['Row']

export function useRealtimePrescriptions(pharmacyId: string | null) {
  const demoEnabled = isDemoMode()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([])

  const handleInsert = useCallback((payload: { new: PrescriptionRow }) => {
    setPrescriptions(prev => [payload.new, ...prev])
  }, [])

  const handleUpdate = useCallback((payload: { new: PrescriptionRow }) => {
    setPrescriptions(prev =>
      prev.map(p => p.id === payload.new.id ? payload.new : p)
    )
  }, [])

  useEffect(() => {
    if (demoEnabled) {
      return
    }

    if (!pharmacyId) return

    const supabase = createClient()
    const channel = supabase
      .channel('realtime-prescriptions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prescriptions',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prescriptions',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        handleUpdate
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [demoEnabled, pharmacyId, handleInsert, handleUpdate])

  return prescriptions
}

// Shape the static demo alerts to match AlertRow so the dropdown can render them.
const DEMO_ALERTS: AlertRow[] = demoDashboard.alerts.map((a, i) => ({
  id: a.id,
  pharmacy_id: '11111111-1111-1111-1111-111111111111',
  type: a.type as AlertRow['type'],
  title: a.title,
  message: a.message ?? null,
  reference_id: null,
  reference_type: null,
  is_read: false,
  is_dismissed: false,
  created_at: new Date(Date.now() - i * 60_000).toISOString(),
}))

export function useRealtimeAlerts(pharmacyId: string | null) {
  const demoEnabled = isDemoMode()
  const [unreadCount, setUnreadCount] = useState(
    demoEnabled ? demoDashboard.unreadAlerts : 0
  )
  const [alerts, setAlerts] = useState<AlertRow[]>(demoEnabled ? DEMO_ALERTS : [])

  useEffect(() => {
    if (demoEnabled) return
    if (!pharmacyId) return

    const supabase = createClient()

    // Initial fetch of unread, non-dismissed alerts
    supabase
      .from('alerts')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('is_read', false)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setAlerts(data)
          setUnreadCount(data.length)
        }
      })

    const channel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        (payload) => {
          setAlerts(prev => [payload.new as AlertRow, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        (payload) => {
          const updated = payload.new as AlertRow
          setAlerts(prev =>
            prev.map(a => a.id === updated.id ? updated : a).filter(a => !a.is_dismissed)
          )
          setUnreadCount(prev => updated.is_read ? Math.max(0, prev - 1) : prev)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [demoEnabled, pharmacyId])

  async function markAsRead(alertId: string) {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a))
    setUnreadCount(prev => Math.max(0, prev - 1))

    if (demoEnabled || !pharmacyId) return
    const supabase = createClient()
    await supabase.from('alerts').update({ is_read: true }).eq('id', alertId)
  }

  async function markAllAsRead() {
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    setUnreadCount(0)

    if (demoEnabled || !pharmacyId) return
    const supabase = createClient()
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('pharmacy_id', pharmacyId)
      .eq('is_read', false)
  }

  return { alerts, unreadCount, markAsRead, markAllAsRead }
}
