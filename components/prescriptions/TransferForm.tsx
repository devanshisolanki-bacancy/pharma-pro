import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { initiatePrescriptionTransfer, receivePrescriptionTransfer } from '@/actions/transfers'

type TransferFormProps = {
  prescriptionId: string
  currentPharmacyId: string
}

export async function TransferForm({ prescriptionId, currentPharmacyId }: TransferFormProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (!profile || ['viewer', 'cashier', 'technician'].includes(profile.role)) {
    return null
  }

  const { data: locations } = await supabase
    .from('pharmacies')
    .select('id, name, npi, is_active')
    .eq('is_active', true)
    .order('name')

  async function outboundAction(formData: FormData) {
    'use server'
    await initiatePrescriptionTransfer(formData)
  }

  async function inboundAction(formData: FormData) {
    'use server'
    await receivePrescriptionTransfer(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prescription Transfer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={outboundAction} className="space-y-3 border rounded-lg p-3">
          <p className="text-sm font-medium">Outbound Transfer</p>
          <input type="hidden" name="prescription_id" value={prescriptionId} />
          <div className="space-y-1">
            <label htmlFor={`destination_pharmacy_${prescriptionId}`} className="text-xs text-slate-600">
              Destination Location
            </label>
            <select
              id={`destination_pharmacy_${prescriptionId}`}
              name="destination_pharmacy_id"
              className="h-9 w-full rounded-md border px-3 text-sm"
              defaultValue=""
            >
              <option value="">External / Unknown destination</option>
              {(locations ?? [])
                .filter((location) => location.id !== currentPharmacyId)
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.npi})
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor={`transfer_reason_${prescriptionId}`} className="text-xs text-slate-600">
              Reason
            </label>
            <textarea
              id={`transfer_reason_${prescriptionId}`}
              name="reason"
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Patient requested transfer..."
            />
          </div>
          <Button type="submit" size="sm">Initiate Transfer</Button>
        </form>

        <form action={inboundAction} className="space-y-3 border rounded-lg p-3">
          <p className="text-sm font-medium">Inbound Transfer</p>
          <div className="space-y-1">
            <label htmlFor={`transfer_code_${prescriptionId}`} className="text-xs text-slate-600">
              Transfer Code
            </label>
            <input
              id={`transfer_code_${prescriptionId}`}
              name="transfer_code"
              className="h-9 w-full rounded-md border px-3 text-sm uppercase"
              placeholder="RX-12345678-ABCDEF"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={`qr_payload_${prescriptionId}`} className="text-xs text-slate-600">
              QR Payload (Optional)
            </label>
            <textarea
              id={`qr_payload_${prescriptionId}`}
              name="qr_payload"
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Paste scanned transfer URL or QR text"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">Receive Transfer</Button>
        </form>
      </CardContent>
    </Card>
  )
}
