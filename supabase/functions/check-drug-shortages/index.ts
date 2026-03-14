import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ShortageRecord = {
  product_ndc?: string
  active_ingredient?: string
  reason?: string
  status?: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''
const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@pharmatech.pro'
const fallbackDigestEmails = (Deno.env.get('SHORTAGE_DIGEST_EMAILS') || '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean)

const supabase = createClient(supabaseUrl, serviceRoleKey)

function normalizeNdc(value: string | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function unique(values: string[]) {
  return [...new Set(values)]
}

Deno.serve(async () => {
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), { status: 500 })
  }

  const apiKey = Deno.env.get('FDA_API_KEY')
  const fdaUrl = new URL('https://api.fda.gov/drug/shortages.json')
  fdaUrl.searchParams.set('limit', '100')
  if (apiKey) fdaUrl.searchParams.set('api_key', apiKey)

  const shortageResponse = await fetch(fdaUrl.toString())
  if (!shortageResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch OpenFDA shortages' }), { status: 500 })
  }

  const shortageJson = await shortageResponse.json()
  const shortages = (shortageJson.results ?? []) as ShortageRecord[]

  const { data: inventory } = await supabase
    .from('inventory')
    .select('pharmacy_id, medication_id, medications(ndc, name, drug_class)')
    .neq('status', 'discontinued')

  if (!inventory || inventory.length === 0) {
    return new Response(JSON.stringify({ checked: 0, alerts: 0 }), { status: 200 })
  }

  const shortagesByNdc = new Map<string, ShortageRecord>()
  for (const shortage of shortages) {
    const ndc = normalizeNdc(shortage.product_ndc)
    if (ndc) shortagesByNdc.set(ndc, shortage)
  }

  const matched: Array<{
    pharmacy_id: string
    medication_name: string
    ndc: string
    reason: string
    status: string
    alternatives: string[]
  }> = []

  for (const item of inventory) {
    const med = item.medications as { ndc?: string; name?: string; drug_class?: string } | null
    const ndc = normalizeNdc(med?.ndc)
    const shortage = shortagesByNdc.get(ndc)
    if (!shortage) continue

    const drugClass = med?.drug_class ?? ''
    const { data: alternatives } = await supabase
      .from('medications')
      .select('name')
      .eq('drug_class', drugClass)
      .neq('ndc', med?.ndc ?? '')
      .limit(3)

    matched.push({
      pharmacy_id: item.pharmacy_id,
      medication_name: med?.name ?? 'Medication',
      ndc: med?.ndc ?? '',
      reason: shortage.reason ?? 'Reported shortage',
      status: shortage.status ?? 'Active',
      alternatives: (alternatives ?? []).map((entry: { name: string }) => entry.name),
    })
  }

  for (const shortageMatch of matched) {
    await supabase.from('alerts').insert({
      pharmacy_id: shortageMatch.pharmacy_id,
      type: 'low_stock',
      title: `Drug Shortage Alert: ${shortageMatch.medication_name}`,
      message: `${shortageMatch.reason}. Suggested alternatives: ${shortageMatch.alternatives.join(', ') || 'None available'}.`,
      reference_type: 'drug_shortage',
    })
  }

  if (resendApiKey && matched.length > 0) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, pharmacy_id, role')
      .in('role', ['super_admin', 'pharmacy_admin'])
      .eq('is_active', true)

    if (admins && admins.length > 0) {
      const matchedPharmacies = new Set(matched.map((item) => item.pharmacy_id))
      const relevantAdminIds = admins
        .filter((admin) => admin.role === 'super_admin' || (admin.pharmacy_id && matchedPharmacies.has(admin.pharmacy_id)))
        .map((admin) => admin.id)

      const emailById = new Map<string, string>()
      let page = 1
      const perPage = 1000
      while (true) {
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        })
        if (usersError || !usersData?.users?.length) break

        for (const authUser of usersData.users) {
          if (authUser.email) {
            emailById.set(authUser.id, authUser.email)
          }
        }

        if (usersData.users.length < perPage) break
        page += 1
      }

      const recipients = unique([
        ...relevantAdminIds
          .map((id) => emailById.get(id))
          .filter((email): email is string => Boolean(email)),
        ...fallbackDigestEmails,
      ])

      const digest = matched
        .slice(0, 25)
        .map((item) => `- ${item.medication_name} (${item.ndc}) — ${item.reason}`)
        .join('\n')

      if (recipients.length > 0) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: recipients,
            subject: `Drug shortage digest (${matched.length} matches)`,
            text: `OpenFDA shortage matches detected:\n\n${digest}`,
          }),
        })
      }
    }
  }

  return new Response(
    JSON.stringify({
      checked: inventory.length,
      alerts: matched.length,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
