import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function auditLog(
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  resource: string,
  resourceId?: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  try {
    const supabase = await createClient()
    const headersList = await headers()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('pharmacy_id')
      .eq('id', user.id)
      .single()

    const ipAddress = headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      '127.0.0.1'
    const userAgent = headersList.get('user-agent') || ''

    await supabase.from('audit_logs').insert({
      pharmacy_id: profile?.pharmacy_id ?? undefined,
      user_id: user.id,
      action,
      resource,
      resource_id: resourceId,
      old_data: oldData ?? null,
      new_data: newData ?? null,
      ip_address: ipAddress.split(',')[0].trim(),
      user_agent: userAgent,
    })
  } catch (err) {
    console.error('Audit log failed:', err)
  }
}

export function withAudit<T extends unknown[], R>(
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
  resource: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const result = await fn(...args)
    await auditLog(action, resource)
    return result
  }
}
