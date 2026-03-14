'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { auditLog } from '@/lib/utils/hipaa-audit'
import type { UserRole } from '@/lib/supabase/types'

type AdminContext = {
  userId: string
  role: UserRole
  pharmacyId: string | null
}

async function getAdminContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, pharmacy_id')
    .eq('id', user.id)
    .single<{ role: UserRole; pharmacy_id: string | null }>()

  if (!profile) return { error: 'Profile not found' as const }
  return {
    supabase,
    context: {
      userId: user.id,
      role: profile.role,
      pharmacyId: profile.pharmacy_id,
    } satisfies AdminContext,
  }
}

function parseAddress(formData: FormData) {
  return {
    street: String(formData.get('street') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    state: String(formData.get('state') ?? '').trim(),
    zip: String(formData.get('zip') ?? '').trim(),
    country: String(formData.get('country') ?? 'US').trim(),
  }
}

function parseLocationSettings(formData: FormData) {
  const rawTax = Number.parseFloat(String(formData.get('tax_rate') ?? '0'))
  const taxRate = Number.isFinite(rawTax) ? rawTax : 0

  return {
    operating_hours: {
      weekdays: String(formData.get('hours_weekdays') ?? '09:00-18:00').trim(),
      saturday: String(formData.get('hours_saturday') ?? '09:00-14:00').trim(),
      sunday: String(formData.get('hours_sunday') ?? 'closed').trim(),
    },
    notification_templates: {
      ready: String(formData.get('tpl_ready') ?? 'Your prescription is ready for pickup.').trim(),
      refill: String(formData.get('tpl_refill') ?? 'Your refill is available.').trim(),
    },
    label_template: String(formData.get('label_template') ?? 'standard').trim(),
    tax_rate: taxRate,
    accepted_payers: String(formData.get('accepted_payers') ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  }
}

export async function createPharmacyLocation(formData: FormData) {
  const ctxResult = await getAdminContext()
  if ('error' in ctxResult) return { error: ctxResult.error }
  const { context, supabase } = ctxResult

  if (context.role !== 'super_admin') {
    return { error: 'Only super admins can create pharmacy locations' }
  }

  const name = String(formData.get('name') ?? '').trim()
  const npi = String(formData.get('npi') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim() || null
  const phone = String(formData.get('phone') ?? '').trim() || null
  const deaNumber = String(formData.get('dea_number') ?? '').trim() || null
  const address = parseAddress(formData)
  const settings = parseLocationSettings(formData)

  if (!name || !npi || !address.city || !address.state) {
    return { error: 'Name, NPI, city, and state are required' }
  }

  const { data: location, error } = await supabase
    .from('pharmacies')
    .insert({
      name,
      npi,
      email,
      phone,
      dea_number: deaNumber,
      address,
      settings,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !location) {
    return { error: error?.message ?? 'Unable to create location' }
  }

  await auditLog('CREATE', 'pharmacies', location.id, undefined, location)
  revalidatePath('/dashboard/admin/locations')
  return { success: true, locationId: location.id }
}

export async function updateLocationSettings(locationId: string, formData: FormData) {
  const ctxResult = await getAdminContext()
  if ('error' in ctxResult) return { error: ctxResult.error }
  const { context, supabase } = ctxResult

  if (!['super_admin', 'pharmacy_admin'].includes(context.role)) {
    return { error: 'Insufficient permissions' }
  }

  const settings = parseLocationSettings(formData)

  const query = supabase.from('pharmacies').update({ settings }).eq('id', locationId)
  if (context.role !== 'super_admin') {
    query.eq('id', context.pharmacyId ?? '')
  }

  const { data: updated, error } = await query.select('*').single()
  if (error || !updated) {
    return { error: error?.message ?? 'Unable to update location settings' }
  }

  await auditLog('UPDATE', 'pharmacies', locationId, undefined, updated)
  revalidatePath(`/dashboard/admin/locations/${locationId}`)
  revalidatePath('/dashboard/admin/locations')
  return { success: true }
}

export async function setLocationStatus(locationId: string, isActive: boolean) {
  const ctxResult = await getAdminContext()
  if ('error' in ctxResult) return { error: ctxResult.error }
  const { context, supabase } = ctxResult

  if (context.role !== 'super_admin') {
    return { error: 'Only super admins can change location status' }
  }

  const { error } = await supabase
    .from('pharmacies')
    .update({ is_active: isActive })
    .eq('id', locationId)

  if (error) return { error: error.message }
  await auditLog('UPDATE', 'pharmacies', locationId, undefined, { is_active: isActive })
  revalidatePath('/dashboard/admin/locations')
  revalidatePath(`/dashboard/admin/locations/${locationId}`)
  return { success: true }
}

export async function inviteLocationStaff(locationId: string, formData: FormData) {
  const ctxResult = await getAdminContext()
  if ('error' in ctxResult) return { error: ctxResult.error }
  const { context } = ctxResult

  if (!['super_admin', 'pharmacy_admin'].includes(context.role)) {
    return { error: 'Insufficient permissions' }
  }

  if (context.role === 'pharmacy_admin' && context.pharmacyId !== locationId) {
    return { error: 'You can only invite staff to your own location' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const role = String(formData.get('role') ?? 'viewer') as UserRole

  if (!email || !firstName || !lastName) {
    return { error: 'Email, first name, and last name are required' }
  }

  const service = await createServiceClient()
  const {
    data: { user },
    error: inviteError,
  } = await service.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name: firstName,
      last_name: lastName,
      role,
      pharmacy_id: locationId,
    },
  })

  if (inviteError || !user) {
    return { error: inviteError?.message ?? 'Failed to invite staff member' }
  }

  const { error: profileError } = await service.from('profiles').upsert({
    id: user.id,
    pharmacy_id: locationId,
    first_name: firstName,
    last_name: lastName,
    role,
    is_active: true,
  })

  if (profileError) return { error: profileError.message }

  await auditLog('CREATE', 'profiles', user.id, undefined, {
    role,
    pharmacy_id: locationId,
    email,
  })
  revalidatePath(`/dashboard/admin/locations/${locationId}`)
  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function assignStaffToLocation(
  staffUserId: string,
  locationId: string,
  mode: 'primary' | 'additional'
) {
  const ctxResult = await getAdminContext()
  if ('error' in ctxResult) return { error: ctxResult.error }
  const { context, supabase } = ctxResult

  if (!['super_admin', 'pharmacy_admin'].includes(context.role)) {
    return { error: 'Insufficient permissions' }
  }

  if (mode === 'primary') {
    const { error } = await supabase
      .from('profiles')
      .update({ pharmacy_id: locationId })
      .eq('id', staffUserId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('user_pharmacy_access')
      .upsert({
        user_id: staffUserId,
        pharmacy_id: locationId,
        is_active: true,
      })
    if (error) return { error: error.message }
  }

  await auditLog('UPDATE', 'profiles', staffUserId, undefined, {
    assigned_location: locationId,
    assignment_mode: mode,
  })
  revalidatePath(`/dashboard/admin/locations/${locationId}`)
  revalidatePath('/dashboard/admin/users')
  return { success: true }
}

export async function deactivateStaffMember(staffUserId: string) {
  const ctxResult = await getAdminContext()
  if ('error' in ctxResult) return { error: ctxResult.error }
  const { context, supabase } = ctxResult

  if (!['super_admin', 'pharmacy_admin'].includes(context.role)) {
    return { error: 'Insufficient permissions' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', staffUserId)

  if (error) return { error: error.message }
  await auditLog('UPDATE', 'profiles', staffUserId, undefined, { is_active: false })
  revalidatePath('/dashboard/admin/users')
  revalidatePath('/dashboard/admin/locations')
  return { success: true }
}
