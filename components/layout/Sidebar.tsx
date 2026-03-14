'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Package,
  BarChart3, Workflow, Settings, ChevronLeft, ChevronRight, Pill
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { useState } from 'react'
import type { UserRole } from '@/lib/supabase/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, resource: null },
  { href: '/dashboard/patients', label: 'Patients', icon: Users, resource: 'patients' },
  { href: '/dashboard/prescriptions', label: 'Prescriptions', icon: FileText, resource: 'prescriptions' },
  { href: '/dashboard/workflow', label: 'Workflow Queue', icon: Workflow, resource: 'workflow' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package, resource: 'inventory' },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, resource: 'reports' },
  { href: '/dashboard/admin', label: 'Admin', icon: Settings, resource: 'admin' },
]

interface SidebarProps {
  /**
   * Role fetched server-side by the dashboard layout.
   * Passed here so the hook can skip the client-side Supabase
   * call and start with isLoading = false, preventing the
   * server/client HTML mismatch (hydration error) that occurs
   * when the skeleton <div> on the client doesn't match the
   * <ul> rendered on the server.
   */
  initialRole?: UserRole | null
  initialPharmacyId?: string | null
}

export function Sidebar({ initialRole, initialPharmacyId }: SidebarProps = {}) {
  const pathname = usePathname()
  const { can, isAdmin, isLoading } = usePermissions({ initialRole, initialPharmacyId })
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = navItems.filter(item => {
    if (!item.resource) return true
    if (item.resource === 'admin') return isAdmin()
    return can('read', item.resource as Parameters<typeof can>[1])
  })

  return (
    <aside className={cn(
      'flex flex-col bg-slate-900 text-white transition-all duration-300 h-screen sticky top-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-700">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Pill className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm">PharmaTech Pro</div>
            <div className="text-xs text-slate-400">Pharmacy Management</div>
          </div>
        )}
      </div>

      {/* Nav — always a <ul> so the element type never changes between
          loading and loaded states, keeping server/client HTML in sync. */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="h-10 bg-slate-800 rounded-lg animate-pulse" />
              ))
            : visibleItems.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })
          }
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-700 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
