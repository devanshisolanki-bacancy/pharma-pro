import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const STATUS_STYLES: Record<string, string> = {
  // Prescription statuses
  received: 'bg-blue-100 text-blue-800 border-blue-200',
  verified: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  filling: 'bg-orange-100 text-orange-800 border-orange-200',
  quality_check: 'bg-purple-100 text-purple-800 border-purple-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  dispensed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  transferred: 'bg-pink-100 text-pink-800 border-pink-200',
  // Inventory statuses
  active: 'bg-green-100 text-green-800 border-green-200',
  low_stock: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  out_of_stock: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-gray-100 text-gray-800 border-gray-200',
  discontinued: 'bg-slate-100 text-slate-800 border-slate-200',
  // Claim statuses
  pending: 'bg-blue-100 text-blue-800 border-blue-200',
  submitted: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  adjudicated: 'bg-purple-100 text-purple-800 border-purple-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  appealed: 'bg-orange-100 text-orange-800 border-orange-200',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <Badge
      variant="outline"
      className={cn(style, 'font-medium', className)}
      aria-label={`Status: ${label}`}
    >
      {label}
    </Badge>
  )
}
