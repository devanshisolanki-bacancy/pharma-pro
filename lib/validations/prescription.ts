import { z } from 'zod'

export const prescriptionSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  provider_id: z.string().uuid('Invalid provider ID').optional(),
  medication_id: z.string().uuid('Invalid medication ID'),
  written_date: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid written date'),
  expiration_date: z.string().optional(),
  days_supply: z.number().int().positive().max(365).optional(),
  quantity: z.number().positive('Quantity must be positive'),
  refills_allowed: z.number().int().min(0).max(11),
  sig: z.string().min(1, 'Directions are required'),
  daw_code: z.number().int().min(0).max(9).default(0),
  is_controlled: z.boolean().default(false),
  is_electronic: z.boolean().default(false),
  notes: z.string().optional(),
})

export type PrescriptionFormValues = z.infer<typeof prescriptionSchema>
