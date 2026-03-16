'use client'

import { useRouter } from 'next/navigation'
import {
  Bell, LogOut, Settings, Building2,
  AlertTriangle, Package, Clock, RefreshCw, XCircle, Info, CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeAlerts } from '@/hooks/useRealtime'
import { ROLE_LABELS } from '@/lib/constants/roles'
import type { UserRole } from '@/lib/supabase/types'
import type { Database } from '@/lib/supabase/types'
import { isDemoMode } from '@/lib/demo'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils'

type AlertType = Database['public']['Enums']['alert_type']

const ALERT_META: Record<AlertType, { icon: React.ElementType; color: string; bg: string }> = {
  low_stock:        { icon: Package,       color: 'text-yellow-600', bg: 'bg-yellow-50' },
  expiration:       { icon: Clock,         color: 'text-orange-600', bg: 'bg-orange-50' },
  drug_interaction: { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50'    },
  refill_due:       { icon: RefreshCw,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
  claim_rejected:   { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50'    },
  system:           { icon: Info,          color: 'text-slate-600',  bg: 'bg-slate-100' },
}

interface TopbarProps {
  pharmacyName: string
  userFirstName: string
  userLastName: string
  userRole: UserRole
  pharmacyId: string
}

export function Topbar({ pharmacyName, userFirstName, userLastName, userRole, pharmacyId }: TopbarProps) {
  const router = useRouter()
  const { alerts, unreadCount, markAsRead, markAllAsRead } = useRealtimeAlerts(pharmacyId)
  const initials = `${userFirstName[0]}${userLastName[0]}`.toUpperCase()

  async function handleSignOut() {
    if (isDemoMode()) {
      router.push('/dashboard')
      return
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const visibleAlerts = alerts.slice(0, 10)

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Pharmacy name */}
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-slate-500" />
        <span className="font-semibold text-slate-700">{pharmacyName}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={`${unreadCount} unread alerts`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <DropdownMenuLabel className="p-0 text-sm font-semibold text-slate-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllAsRead()}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Alert list */}
            <div className="max-h-80 overflow-y-auto">
              {visibleAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                  <Bell className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                visibleAlerts.map((alert) => {
                  const meta = ALERT_META[alert.type] ?? ALERT_META.system
                  const Icon = meta.icon
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors',
                        alert.is_read
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-blue-50/40 hover:bg-blue-50/70'
                      )}
                    >
                      <div className={cn('mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center', meta.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm leading-snug', alert.is_read ? 'text-slate-600' : 'text-slate-900 font-medium')}>
                          {alert.title}
                        </p>
                        {alert.message && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{alert.message}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {formatRelativeTime(alert.created_at)}
                        </p>
                      </div>
                      {!alert.is_read && (
                        <button
                          onClick={() => void markAsRead(alert.id)}
                          className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-blue-500 hover:bg-blue-700 transition-colors"
                          aria-label="Mark as read"
                          title="Mark as read"
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <DropdownMenuSeparator className="m-0" />
            <div className="px-4 py-2">
              <button
                onClick={() => router.push('/dashboard/inventory/alerts')}
                className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-medium py-1 transition-colors"
              >
                View all alerts →
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-600 text-white text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium leading-tight">{userFirstName} {userLastName}</div>
                <div className="text-xs text-slate-500">{ROLE_LABELS[userRole]}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{userFirstName} {userLastName}</div>
              <div className="text-xs text-slate-500 font-normal">{ROLE_LABELS[userRole]}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push(isDemoMode() ? '/dashboard' : '/dashboard/admin/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
