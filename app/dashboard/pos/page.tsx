'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/formatters'
import { ShoppingCart, Search, Trash2, CreditCard, DollarSign, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { demoPrescriptions, demoUser, isDemoMode } from '@/lib/demo'

interface CartItem {
  prescriptionId: string
  rxNumber: string
  patientName: string
  medicationName: string
  price: number
  insurancePaid: number
  copay: number
}

export default function POSPage() {
  const demoEnabled = isDemoMode()
  const [readyRxs, setReadyRxs] = useState<{
    id: string; rx_number: string; quantity: number;
    patients: { first_name: string; last_name: string } | null;
    medications: { name: string; strength: string | null } | null;
  }[]>(
    demoEnabled
      ? demoPrescriptions
          .filter((rx) => rx.status === 'ready')
          .map((rx) => ({
            id: rx.id,
            rx_number: rx.rx_number,
            quantity: rx.quantity,
            patients: {
              first_name: rx.patient.split(', ')[1] ?? '',
              last_name: rx.patient.split(', ')[0] ?? '',
            },
            medications: {
              name: rx.medication,
              strength: rx.strength,
            },
          }))
      : []
  )
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [pharmacyId, setPharmacyId] = useState<string | null>(demoEnabled ? demoUser.pharmacyId : null)
  const [cashAmount, setCashAmount] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (demoEnabled) {
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('pharmacy_id').eq('id', user.id).single().then(({ data }) => {
        if (data?.pharmacy_id) {
          setPharmacyId(data.pharmacy_id)
          const today = new Date().toISOString().split('T')[0]
          supabase
            .from('prescriptions')
            .select('id, rx_number, quantity, patients(first_name, last_name), medications(name, strength)')
            .eq('pharmacy_id', data.pharmacy_id)
            .eq('status', 'ready')
            .gte('updated_at', today)
            .order('updated_at', { ascending: false })
            .then(({ data: readyData }) => {
              if (readyData) setReadyRxs(readyData as typeof readyRxs)
            })
        }
      })
    })
  }, [demoEnabled])

  async function refreshReadyRxs(pid: string) {
    if (demoEnabled) {
      setReadyRxs(
        demoPrescriptions
          .filter((rx) => rx.status === 'ready')
          .map((rx) => ({
            id: rx.id,
            rx_number: rx.rx_number,
            quantity: rx.quantity,
            patients: {
              first_name: rx.patient.split(', ')[1] ?? '',
              last_name: rx.patient.split(', ')[0] ?? '',
            },
            medications: {
              name: rx.medication,
              strength: rx.strength,
            },
          }))
      )
      return
    }

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('prescriptions')
      .select('id, rx_number, quantity, patients(first_name, last_name), medications(name, strength)')
      .eq('pharmacy_id', pid)
      .eq('status', 'ready')
      .gte('updated_at', today)
      .order('updated_at', { ascending: false })
    if (data) setReadyRxs(data as typeof readyRxs)
  }

  function addToCart(rx: typeof readyRxs[0]) {
    if (cart.find(c => c.prescriptionId === rx.id)) {
      toast.info('Already in cart')
      return
    }
    // Mock pricing - in production, pull from claims/insurance
    const retailPrice = parseFloat((Math.random() * 80 + 10).toFixed(2))
    const insurancePaid = parseFloat((retailPrice * 0.8).toFixed(2))
    const copay = parseFloat((retailPrice - insurancePaid).toFixed(2))

    setCart(prev => [...prev, {
      prescriptionId: rx.id,
      rxNumber: rx.rx_number,
      patientName: rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : 'Unknown',
      medicationName: rx.medications?.name ?? 'Unknown',
      price: retailPrice,
      insurancePaid,
      copay,
    }])
  }

  function removeFromCart(prescriptionId: string) {
    setCart(prev => prev.filter(c => c.prescriptionId !== prescriptionId))
  }

  const cartTotal = cart.reduce((s, i) => s + i.copay, 0)
  const cashChange = parseFloat(cashAmount || '0') - cartTotal
  const filtered = readyRxs.filter(rx =>
    !searchQuery ||
    rx.rx_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (rx.patients && `${rx.patients.first_name} ${rx.patients.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  async function handleCheckout(method: 'cash' | 'card') {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    if (method === 'cash' && parseFloat(cashAmount || '0') < cartTotal) {
      toast.error('Insufficient cash amount')
      return
    }

    if (demoEnabled) {
      toast.success(`Demo checkout complete (${method.toUpperCase()})`)
      setCart([])
      setCashAmount('')
      return
    }

    setProcessing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !pharmacyId) throw new Error('Not authenticated')

      for (const item of cart) {
        // Create transaction
        await supabase.from('transactions').insert({
          pharmacy_id: pharmacyId,
          prescription_id: item.prescriptionId,
          cashier_id: user.id,
          type: 'sale',
          subtotal: item.price,
          tax: 0,
          insurance_paid: item.insurancePaid,
          copay: item.copay,
          total: item.copay,
          payment_method: method,
        })
        // Mark prescription as dispensed
        await supabase.from('prescriptions').update({
          status: 'dispensed',
          dispensed_at: new Date().toISOString(),
          dispenser_id: user.id,
        }).eq('id', item.prescriptionId)
      }

      toast.success(`Checkout complete! ${method === 'cash' ? `Change: ${formatCurrency(cashChange)}` : ''}`)
      setCart([])
      setCashAmount('')
      if (pharmacyId) await refreshReadyRxs(pharmacyId)
    } catch (err) {
      toast.error('Checkout failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)_320px] gap-4">
      {/* Left: Ready Prescriptions */}
      <div className="flex flex-col gap-4 min-h-[320px]">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Point of Sale</h1>
          <p className="text-sm text-slate-500">Ready prescriptions for today</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Rx or patient..."
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length > 0 ? filtered.map(rx => (
            <button
              key={rx.id}
              type="button"
              onClick={() => addToCart(rx)}
              className="w-full text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              aria-label={`Add prescription ${rx.rx_number} for ${rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : 'unknown patient'} to cart`}
            >
              <Card className="cursor-pointer hover:border-blue-300 transition-colors">
                <CardContent className="pt-3 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm font-medium text-blue-600">{rx.rx_number}</div>
                      <div className="text-sm">{rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : '—'}</div>
                      <div className="text-xs text-slate-500">{rx.medications?.name} {rx.medications?.strength}</div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Ready</Badge>
                  </div>
                </CardContent>
              </Card>
            </button>
          )) : (
            <p className="text-center text-slate-400 text-sm py-8">
              {searchQuery ? 'No results' : 'No ready prescriptions today'}
            </p>
          )}
        </div>
      </div>

      {/* Center: Cart */}
      <div className="min-h-[320px]">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center text-slate-400 py-12">Click a prescription to add it to the cart</p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.prescriptionId} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{item.rxNumber}</span>
                        <span className="text-sm text-slate-600">— {item.patientName}</span>
                      </div>
                      <div className="text-sm text-slate-500">{item.medicationName}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Retail: {formatCurrency(item.price)} · Insurance: -{formatCurrency(item.insurancePaid)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatCurrency(item.copay)}</span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.prescriptionId)}
                        className="text-red-400 hover:text-red-600"
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Payment */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span>{formatCurrency(0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Cash Amount</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                placeholder="0.00"
              />
              {cashAmount && parseFloat(cashAmount) >= cartTotal && (
                <div className="text-sm text-green-600 font-medium">
                  Change: {formatCurrency(cashChange)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => handleCheckout('cash')}
                disabled={processing || cart.length === 0}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Cash Payment
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCheckout('card')}
                disabled={processing || cart.length === 0}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Card Payment
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={processing || cart.length === 0}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
