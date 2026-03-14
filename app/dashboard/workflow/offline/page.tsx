'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { WifiOff } from 'lucide-react'

type OfflinePrescription = {
  id: string
  rx_number: string
  status: string
  updated_at: string
  patients: { first_name: string; last_name: string } | null
  medications: { name: string; strength: string | null } | null
}

export default function OfflineWorkflowPage() {
  const [snapshot] = useState(() => {
    if (typeof window === 'undefined') {
      return { updatedAt: null as string | null, prescriptions: [] as OfflinePrescription[] }
    }

    const raw = localStorage.getItem('workflow_offline_queue')
    if (!raw) {
      return { updatedAt: null as string | null, prescriptions: [] as OfflinePrescription[] }
    }

    try {
      const parsed = JSON.parse(raw) as {
        updatedAt?: string
        prescriptions?: OfflinePrescription[]
      }
      return {
        updatedAt: parsed.updatedAt ?? null,
        prescriptions: parsed.prescriptions ?? [],
      }
    } catch {
      return { updatedAt: null as string | null, prescriptions: [] as OfflinePrescription[] }
    }
  })

  const updatedAt = snapshot.updatedAt
  const prescriptions = snapshot.prescriptions

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-orange-600" />
            Offline Workflow Queue
          </h1>
          <p className="text-slate-500">
            Last synced {updatedAt ? formatRelativeTime(updatedAt) : 'never'}
          </p>
        </div>
        <Link href="/dashboard/workflow">
          <Button variant="outline">Back To Live Queue</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cached Prescriptions ({prescriptions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prescriptions.length === 0 && (
            <p className="text-sm text-slate-400">No cached data available yet. Open live workflow first while online.</p>
          )}
          {prescriptions.map((rx) => (
            <div key={rx.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold text-blue-600">{rx.rx_number}</p>
                <p className="text-sm text-slate-700">
                  {rx.patients ? `${rx.patients.last_name}, ${rx.patients.first_name}` : 'Unknown patient'}
                </p>
                <p className="text-xs text-slate-500">
                  {rx.medications?.name} {rx.medications?.strength ?? ''}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {rx.status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
