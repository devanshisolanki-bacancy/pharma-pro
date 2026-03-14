import { z } from 'zod'

export const insurancePlanSchema = z.object({
  payer_name: z.string().min(1, 'Payer name is required'),
  bin: z.string().length(6, 'BIN must be exactly 6 digits').regex(/^\d{6}$/, 'BIN must be numeric'),
  pcn: z.string().optional(),
  group_number: z.string().optional(),
  member_id: z.string().min(1, 'Member ID is required'),
  relationship: z.enum(['self', 'spouse', 'child', 'other']).default('self'),
  is_primary: z.boolean().default(true),
  effective_date: z.string().optional(),
  termination_date: z.string().optional(),
})

export type InsurancePlanFormValues = z.infer<typeof insurancePlanSchema>
