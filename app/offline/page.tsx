import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <WifiOff className="w-5 h-5 text-orange-600" />
              You Are Offline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>
              Network connectivity appears unavailable. You can still access cached workflow data and previously loaded pages.
            </p>
            <div className="flex gap-2">
              <Link href="/dashboard/workflow/offline">
                <Button>Open Offline Queue</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Back To Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
