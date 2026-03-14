import { z } from 'zod'

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2-letter abbreviation'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().default('US'),
})

export const patientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  date_of_birth: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime()) && date < new Date()
  }, 'Date of birth must be in the past'),
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say', 'other']).optional(),
  phone: z.string().regex(/^\+?[\d\s\-().]{10,}$/, 'Invalid phone number').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: addressSchema.optional(),
  emergency_contact: z.object({
    name: z.string().min(1),
    relationship: z.string().min(1),
    phone: z.string().min(10),
  }).optional(),
  allergies: z.array(z.string()).default([]),
  medical_conditions: z.array(z.string()).default([]),
  preferred_language: z.string().default('en'),
  notes: z.string().optional(),
  hipaa_signed_at: z.string().optional(),
})

export const patientUpdateSchema = patientSchema.partial()

export type PatientFormValues = z.infer<typeof patientSchema>
export type PatientUpdateValues = z.infer<typeof patientUpdateSchema>
