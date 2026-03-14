'use client'

import { useRouter } from 'next/navigation'
import { Bell, LogOut, Settings, Building2 } from 'lucide-react'
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
import { isDemoMode } from '@/lib/demo'

interface TopbarProps {
  pharmacyName: string
  userFirstName: string
  userLastName: string
  userRole: UserRole
  pharmacyId: string
}

export function Topbar({ pharmacyName, userFirstName, userLastName, userRole, pharmacyId }: TopbarProps) {
  const router = useRouter()
  const { unreadCount } = useRealtimeAlerts(pharmacyId)
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

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
      {/* Pharmacy name */}
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-slate-500" />
        <span className="font-semibold text-slate-700">{pharmacyName}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => router.push('/dashboard')}
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
