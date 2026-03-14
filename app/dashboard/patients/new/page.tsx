'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema, type PatientFormValues } from '@/lib/validations/patient'
import { createPatient } from '@/actions/patients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Plus, X, User, Phone, AlertCircle, Shield, FileText } from 'lucide-react'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'zh', label: 'Chinese (Mandarin)' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'other', label: 'Other' },
]

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
]

export default function NewPatientPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [allergyInput, setAllergyInput] = useState('')
  const [conditionInput, setConditionInput] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [hasAddress, setHasAddress] = useState(false)
  const [hasEmergencyContact, setHasEmergencyContact] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      allergies: [],
      medical_conditions: [],
      preferred_language: 'en',
    },
  })

  const allergies = watch('allergies') ?? []
  const conditions = watch('medical_conditions') ?? []
  const hipaaChecked = watch('hipaa_signed_at')

  function addAllergy() {
    const trimmed = allergyInput.trim()
    if (trimmed && !allergies.includes(trimmed)) {
      setValue('allergies', [...allergies, trimmed])
    }
    setAllergyInput('')
  }

  function removeAllergy(item: string) {
    setValue('allergies', allergies.filter((a) => a !== item))
  }

  function addCondition() {
    const trimmed = conditionInput.trim()
    if (trimmed && !conditions.includes(trimmed)) {
      setValue('medical_conditions', [...conditions, trimmed])
    }
    setConditionInput('')
  }

  function removeCondition(item: string) {
    setValue('medical_conditions', conditions.filter((c) => c !== item))
  }

  function onSubmit(values: PatientFormValues) {
    setServerError(null)

    // Strip empty optional objects when toggles are off
    const payload: PatientFormValues = {
      ...values,
      address: hasAddress ? values.address : undefined,
      emergency_contact: hasEmergencyContact ? values.emergency_contact : undefined,
    }

    startTransition(async () => {
      const result = await createPatient(payload)
      if (result.error) {
        const flat = result.error as Record<string, string[]>
        const msg = flat._form?.[0] ?? Object.values(flat).flat().join(' · ')
        setServerError(msg)
        return
      }
      router.push(`/dashboard/patients/${result.data?.id}`)
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Patients
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Patient</h1>
          <p className="text-slate-500 text-sm">Add a new patient to your pharmacy</p>
        </div>
      </div>

      {serverError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Section 1: Basic Info ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  {...register('first_name')}
                  aria-invalid={!!errors.first_name}
                />
                {errors.first_name && (
                  <p className="text-xs text-red-600">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  {...register('last_name')}
                  aria-invalid={!!errors.last_name}
                />
                {errors.last_name && (
                  <p className="text-xs text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date_of_birth">Date of Birth <span className="text-red-500">*</span></Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  {...register('date_of_birth')}
                  aria-invalid={!!errors.date_of_birth}
                />
                {errors.date_of_birth && (
                  <p className="text-xs text-red-600">{errors.date_of_birth.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={(val) => setValue('gender', val as PatientFormValues['gender'])}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="preferred_language">Preferred Language</Label>
              <Select
                defaultValue="en"
                onValueChange={(val) => setValue('preferred_language', val)}
              >
                <SelectTrigger id="preferred_language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Contact Info ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  {...register('phone')}
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && (
                  <p className="text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Address toggle */}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="has_address"
                checked={hasAddress}
                onCheckedChange={(v) => setHasAddress(!!v)}
              />
              <Label htmlFor="has_address" className="cursor-pointer font-normal text-slate-600">
                Add mailing address
              </Label>
            </div>

            {hasAddress && (
              <div className="grid gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="address_street">Street</Label>
                  <Input
                    id="address_street"
                    placeholder="123 Main St"
                    {...register('address.street')}
                  />
                  {errors.address?.street && (
                    <p className="text-xs text-red-600">{errors.address.street.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <Label htmlFor="address_city">City</Label>
                    <Input
                      id="address_city"
                      placeholder="Springfield"
                      {...register('address.city')}
                    />
                    {errors.address?.city && (
                      <p className="text-xs text-red-600">{errors.address.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address_state">State</Label>
                    <Select onValueChange={(val) => setValue('address.state', val)}>
                      <SelectTrigger id="address_state">
                        <SelectValue placeholder="ST" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.address?.state && (
                      <p className="text-xs text-red-600">{errors.address.state.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address_zip">ZIP</Label>
                    <Input
                      id="address_zip"
                      placeholder="62701"
                      maxLength={10}
                      {...register('address.zip')}
                    />
                    {errors.address?.zip && (
                      <p className="text-xs text-red-600">{errors.address.zip.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section 3: Emergency Contact ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has_emergency"
                checked={hasEmergencyContact}
                onCheckedChange={(v) => setHasEmergencyContact(!!v)}
              />
              <Label htmlFor="has_emergency" className="cursor-pointer font-normal text-slate-600">
                Add emergency contact
              </Label>
            </div>

            {hasEmergencyContact && (
              <div className="grid gap-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ec_name">Name</Label>
                    <Input
                      id="ec_name"
                      placeholder="Jane Doe"
                      {...register('emergency_contact.name')}
                    />
                    {errors.emergency_contact?.name && (
                      <p className="text-xs text-red-600">{errors.emergency_contact.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ec_relationship">Relationship</Label>
                    <Input
                      id="ec_relationship"
                      placeholder="Spouse"
                      {...register('emergency_contact.relationship')}
                    />
                    {errors.emergency_contact?.relationship && (
                      <p className="text-xs text-red-600">{errors.emergency_contact.relationship.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ec_phone">Phone</Label>
                  <Input
                    id="ec_phone"
                    type="tel"
                    placeholder="(555) 000-0000"
                    {...register('emergency_contact.phone')}
                  />
                  {errors.emergency_contact?.phone && (
                    <p className="text-xs text-red-600">{errors.emergency_contact.phone.message}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section 4: Medical Info ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Allergies &amp; Medical Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Allergies */}
            <div className="space-y-2">
              <Label>Allergies</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Penicillin, Sulfa drugs..."
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addAllergy() }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addAllergy} aria-label="Add allergy">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {allergies.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {allergies.map((a) => (
                    <Badge
                      key={a}
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200 gap-1 pr-1"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => removeAllergy(a)}
                        className="hover:text-red-900 focus:outline-none ml-0.5"
                        aria-label={`Remove allergy ${a}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Medical Conditions */}
            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Type 2 Diabetes, Hypertension..."
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addCondition() }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addCondition} aria-label="Add condition">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {conditions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {conditions.map((c) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 gap-1 pr-1"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCondition(c)}
                        className="hover:text-blue-900 focus:outline-none ml-0.5"
                        aria-label={`Remove condition ${c}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Clinical Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this patient..."
                rows={3}
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section 5: HIPAA Consent ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              HIPAA Consent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <Checkbox
                id="hipaa"
                checked={!!hipaaChecked}
                onCheckedChange={(checked) =>
                  setValue('hipaa_signed_at', checked ? new Date().toISOString() : undefined)
                }
              />
              <div>
                <Label htmlFor="hipaa" className="cursor-pointer leading-snug">
                  Patient has signed the HIPAA Notice of Privacy Practices
                </Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Checking this records today&apos;s date as the HIPAA consent timestamp.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 6: Notes ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 mb-3">
              You can add insurance plans and prescriptions after the patient record is created.
            </p>
          </CardContent>
        </Card>

        {/* ── Submit ── */}
        <div className="flex justify-end gap-3 pb-6">
          <Link href="/dashboard/patients">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Create Patient'}
          </Button>
        </div>
      </form>
    </div>
  )
}
