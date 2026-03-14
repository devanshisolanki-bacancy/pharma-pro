'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { PrescriptionStatus } from '@/lib/supabase/types'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { Clock, Users, Workflow } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { demoPrescriptions, isDemoMode } from '@/lib/demo'

type PrescriptionWithRelations = {
  id: string
  rx_number: string
  status: PrescriptionStatus
  is_controlled: boolean
  created_at: string
  updated_at: string
  patients: { first_name: string; last_name: string } | null
  medications: { name: string; strength: string | null } | null
}

const KANBAN_COLUMNS: PrescriptionStatus[] = [
  'received', 'verified', 'filling', 'quality_check', 'ready'
]

export default function WorkflowPage() {
  const demoEnabled = isDemoMode()
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithRelations[]>(
    demoEnabled
      ? demoPrescriptions.map((rx) => ({
          id: rx.id,
          rx_number: rx.rx_number,
          status: rx.status,
          is_controlled: rx.is_controlled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patients: { first_name: rx.patient.split(', ')[1] ?? '', last_name: rx.patient.split(', ')[0] ?? '' },
          medications: { name: rx.medication, strength: rx.strength },
        }))
      : []
  )
  const [loading, setLoading] = useState(!demoEnabled)

  useEffect(() => {
    if (demoEnabled) {
      return
    }

    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('pharmacy_id')
        .eq('id', user.id)
        .single<{ pharmacy_id: string | null }>()

      if (!profile?.pharmacy_id) return

      // Load active prescriptions
      const { data } = await supabase
        .from('prescriptions')
        .select('id, rx_number, status, is_controlled, created_at, updated_at, patients(first_name, last_name), medications(name, strength)')
        .eq('pharmacy_id', profile.pharmacy_id)
        .in('status', KANBAN_COLUMNS)
        .order('updated_at', { ascending: false })

      if (data) setPrescriptions(data as PrescriptionWithRelations[])
      setLoading(false)

      // Subscribe to realtime updates
      supabase
        .channel('workflow-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: `pharmacy_id=eq.${profile.pharmacy_id}`,
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPrescriptions(prev => {
              const updated = payload.new as PrescriptionWithRelations
              // Remove if no longer in active statuses
              if (!KANBAN_COLUMNS.includes(updated.status)) {
                return prev.filter(p => p.id !== updated.id)
              }
              return prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
            })
          } else if (payload.eventType === 'INSERT') {
            const newRx = payload.new as PrescriptionWithRelations
            if (KANBAN_COLUMNS.includes(newRx.status)) {
              setPrescriptions(prev => [newRx, ...prev])
            }
          }
        })
        .subscribe()
    }

    init()

    return () => {
      supabase.removeAllChannels()
    }
  }, [demoEnabled])

  useEffect(() => {
    if (prescriptions.length > 0) {
      localStorage.setItem(
        'workflow_offline_queue',
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          prescriptions,
        })
      )
    }
  }, [prescriptions])

  const byStatus = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = prescriptions.filter(p => p.status === status)
    return acc
  }, {} as Record<PrescriptionStatus, PrescriptionWithRelations[]>)

  const totalActive = prescriptions.length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full border-2 border-blue-600 border-t-transparent w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflow Queue</h1>
          <p className="text-slate-500">{totalActive} active prescriptions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/workflow/offline">
            <Button size="sm" variant="outline">Offline Queue</Button>
          </Link>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live updates
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Workflow className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-bold">{totalActive}</div>
              <div className="text-xs text-slate-500">Active Prescriptions</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <div className="font-bold">{byStatus.received?.length ?? 0}</div>
              <div className="text-xs text-slate-500">Awaiting Verification</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-bold">{byStatus.ready?.length ?? 0}</div>
              <div className="text-xs text-slate-500">Ready for Pickup</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(status => (
          <div key={status} className="flex-none w-64">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-sm font-medium text-slate-700">
                  ({byStatus[status]?.length ?? 0})
                </span>
              </div>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {byStatus[status]?.map(rx => (
                <Card key={rx.id} className={`cursor-pointer hover:shadow-md transition-shadow ${
                  rx.is_controlled ? 'border-l-4 border-l-red-500' : ''
                }`}>
                  <CardContent className="pt-3 pb-3 px-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-blue-600">{rx.rx_number}</span>
                      {rx.is_controlled && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs py-0">C</Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium truncate">
                      {rx.patients ? `${rx.patients.last_name}, ${rx.patients.first_name}` : '—'}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {rx.medications?.name} {rx.medications?.strength}
                    </div>
                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(rx.updated_at)}
                    </div>
                  </CardContent>
                </Card>
              )) ?? null}
              {(byStatus[status]?.length ?? 0) === 0 && (
                <div className="text-center py-8 text-slate-300 text-sm border-2 border-dashed rounded-lg">
                  Empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
