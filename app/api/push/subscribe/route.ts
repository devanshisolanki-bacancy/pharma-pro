import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type SubscriptionPayload = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const payload = (await request.json()) as SubscriptionPayload
  const endpoint = payload.endpoint?.trim()
  const p256dh = payload.keys?.p256dh?.trim()
  const auth = payload.keys?.auth?.trim()

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { error } = await service
    .from('push_subscriptions')
    .upsert({
      profile_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get('user-agent'),
      is_active: true,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
