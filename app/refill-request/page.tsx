import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createServiceClient } from '@/lib/supabase/server'
import { createRefillRequest } from '@/lib/utils/refill-requests'
import { getLast4Digits, normalizePhoneNumber } from '@/lib/utils/notifications'
import { AIChat } from '@/components/shared/AIChat'
import { isDemoMode } from '@/lib/demo'

export const dynamic = 'force-dynamic'

async function requestRefill(formData: FormData) {
  'use server'

  const rxNumber = String(formData.get('rx_number') ?? '').trim().toUpperCase()
  const dateOfBirth = String(formData.get('date_of_birth') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!rxNumber || !dateOfBirth || !phone) {
    redirect('/refill-request?error=Please+fill+in+all+fields')
  }

  if (isDemoMode()) {
    redirect(`/refill-request?success=1&rx=${encodeURIComponent(rxNumber)}&pid=p-1`)
  }

  const normalizedPhone = normalizePhoneNumber(phone)
  const last4 = getLast4Digits(normalizedPhone)
  if (!last4) {
    redirect('/refill-request?error=Invalid+phone+number')
  }

  const supabase = await createServiceClient()

  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select('id, patient_id')
    .eq('rx_number', rxNumber)
    .limit(1)

  const prescription = prescriptions?.[0]
  if (!prescription) {
    redirect('/refill-request?error=Prescription+not+found')
  }

  const { data: patients } = await supabase
    .from('patients')
    .select('id')
    .eq('id', prescription.patient_id)
    .eq('date_of_birth', dateOfBirth)
    .ilike('phone', `%${last4}`)
    .limit(1)

  const patient = patients?.[0]
  if (!patient) {
    redirect('/refill-request?error=Unable+to+verify+patient+details')
  }

  const refillResult = await createRefillRequest(supabase, {
    prescriptionId: prescription.id,
    source: 'portal',
  })

  if (!refillResult.success) {
    redirect(`/refill-request?error=${encodeURIComponent(refillResult.error ?? 'Unable to submit refill request')}`)
  }

  redirect(`/refill-request?success=1&rx=${encodeURIComponent(rxNumber)}&pid=${encodeURIComponent(patient.id)}`)
}

export default async function RefillRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; rx?: string; pid?: string }>
}) {
  const params = await searchParams
  const success = params.success === '1'
  const error = params.error
  const rx = params.rx
  const patientId = params.pid

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Request A Refill</h1>
          <p className="text-slate-600 mt-2">
            Submit your refill request securely with your prescription number, date of birth, and phone.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patient Refill Portal</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={requestRefill} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="rx_number" className="text-sm font-medium text-slate-700">
                  Prescription Number
                </label>
                <Input id="rx_number" name="rx_number" placeholder="RX00001234" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="date_of_birth" className="text-sm font-medium text-slate-700">
                  Date of Birth
                </label>
                <Input id="date_of_birth" name="date_of_birth" type="date" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <Input id="phone" name="phone" placeholder="(555) 123-4567" required />
              </div>

              <Button type="submit" className="w-full">
                Submit Refill Request
              </Button>
            </form>
          </CardContent>
        </Card>

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <p className="text-sm text-green-800">
                Refill request submitted successfully{rx ? ` for ${rx}` : ''}. We will notify you when it is ready.
              </p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-slate-500">
          Pharmacy staff? <Link href="/login" className="text-blue-600 hover:underline">Sign in to dashboard</Link>
        </p>
      </div>
      {patientId && !isDemoMode() && <AIChat patientId={patientId} />}
    </main>
  )
}
