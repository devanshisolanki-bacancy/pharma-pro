import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatDate(date: string | Date | null | undefined, pattern = 'MMM d, yyyy'): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, pattern)
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'MMM d, yyyy h:mm a')
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '—'
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

export function formatNDC(ndc: string): string {
  const cleaned = ndc.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`
  }
  return ndc
}

export function formatDOB(dob: string | null | undefined): string {
  return formatDate(dob, 'MM/dd/yyyy')
}

export function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null
  try {
    const birthDate = parseISO(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  } catch {
    return null
  }
}

export function formatQuantity(qty: number | null | undefined, unit?: string): string {
  if (qty === null || qty === undefined) return '—'
  const formatted = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2)
  return unit ? `${formatted} ${unit}` : formatted
}

export function truncate(str: string, maxLength = 50): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength)}...`
}
