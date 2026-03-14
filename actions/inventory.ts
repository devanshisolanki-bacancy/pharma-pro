'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { inventorySchema, type InventoryFormValues } from '@/lib/validations/inventory'
import { auditLog } from '@/lib/utils/hipaa-audit'
import { getProfileContext } from '@/lib/supabase/get-profile'

export async function receiveStock(data: InventoryFormValues) {
  const parsed = inventorySchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { pharmacyId } = await getProfileContext()
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('inventory')
    .insert({ ...parsed.data, pharmacy_id: pharmacyId })
    .select()
    .single()

  if (error) return { error: { _form: [error.message] } }

  await auditLog('CREATE', 'inventory', item.id, undefined, item)
  revalidatePath('/dashboard/inventory')
  return { data: item }
}

export async function adjustStock(inventoryId: string, quantity: number, reason: string) {
  await getProfileContext()
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', inventoryId)
    .single()

  if (!current) return { error: 'Inventory item not found' }

  const newQty = current.quantity_on_hand + quantity
  if (newQty < 0) return { error: 'Cannot reduce quantity below 0' }

  const newStatus = newQty === 0 ? 'out_of_stock'
    : newQty <= current.reorder_point ? 'low_stock'
    : 'active'

  const { data: updated, error } = await supabase
    .from('inventory')
    .update({
      quantity_on_hand: newQty,
      status: newStatus,
    })
    .eq('id', inventoryId)
    .select()
    .single()

  if (error) return { error: error.message }

  await auditLog('UPDATE', 'inventory', inventoryId, current, { ...updated, adjustment_reason: reason })
  revalidatePath('/dashboard/inventory')
  return { data: updated }
}

export async function updateReorderPoint(
  inventoryId: string,
  reorderPoint: number,
  reorderQuantity: number
) {
  await getProfileContext()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory')
    .update({ reorder_point: reorderPoint, reorder_quantity: reorderQuantity })
    .eq('id', inventoryId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard/inventory')
  return { data }
}

export async function markExpired(inventoryId: string) {
  const { pharmacyId } = await getProfileContext()
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('inventory')
    .select('*, medications(name)')
    .eq('id', inventoryId)
    .single()

  if (!item) return { error: 'Item not found' }

  const { error } = await supabase
    .from('inventory')
    .update({ status: 'expired' })
    .eq('id', inventoryId)

  if (error) return { error: error.message }

  const medName = (item.medications as { name: string } | null)?.name ?? 'Unknown'
  await supabase.from('alerts').insert({
    pharmacy_id: pharmacyId,
    type: 'expiration',
    title: `Inventory Expired: ${medName}`,
    message: `Lot ${item.lot_number ?? 'N/A'} has been marked as expired`,
    reference_id: inventoryId,
    reference_type: 'inventory',
  })

  await auditLog('UPDATE', 'inventory', inventoryId)
  revalidatePath('/dashboard/inventory')
  return { success: true }
}
