import { z } from 'zod'

export const inventorySchema = z.object({
  medication_id: z.string().uuid('Invalid medication ID'),
  lot_number: z.string().optional(),
  expiration_date: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime()) && date > new Date()
  }, 'Expiration date must be in the future'),
  quantity_on_hand: z.number().min(0),
  reorder_point: z.number().min(0).default(10),
  reorder_quantity: z.number().positive().default(100),
  unit_cost: z.number().positive().optional(),
  selling_price: z.number().positive().optional(),
  supplier_id: z.string().uuid().optional(),
  location_bin: z.string().optional(),
})

export type InventoryFormValues = z.infer<typeof inventorySchema>
