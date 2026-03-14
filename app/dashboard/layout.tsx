import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import type { UserRole } from '@/lib/supabase/types'
import { demoUser, isDemoMode } from '@/lib/demo'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isDemoMode()) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar initialRole={demoUser.role} initialPharmacyId={demoUser.pharmacyId} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            pharmacyName={demoUser.pharmacyName}
            userFirstName={demoUser.firstName}
            userLastName={demoUser.lastName}
            userRole={demoUser.role}
            pharmacyId={demoUser.pharmacyId}
          />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('profiles')
    .select('*, pharmacies(name)')
    .eq('id', user.id)
    .single()

  // Recover: profile is missing entirely, OR exists but has no pharmacy_id.
  // Both cases are fixed by the service-role client which bypasses RLS.
  if (!profile || !profile.pharmacy_id) {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const adminClient = await createServiceClient()

    // Look up the first active pharmacy to use as the default assignment
    const { data: defaultPharmacy } = await adminClient
      .from('pharmacies')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const pharmacyId = defaultPharmacy?.id ?? null

    if (!profile) {
      // Profile doesn't exist at all — create it
      const firstName = (user.user_metadata?.first_name as string | undefined) ?? 'New'
      const lastName  = (user.user_metadata?.last_name  as string | undefined) ?? 'User'

      const { error: insertError } = await adminClient
        .from('profiles')
        .upsert(
          { id: user.id, first_name: firstName, last_name: lastName, role: 'viewer', pharmacy_id: pharmacyId },
          { onConflict: 'id' }
        )

      if (insertError) {
        await supabase.auth.signOut()
        redirect('/login?error=Your account profile is missing. Please contact your administrator.')
      }
    } else {
      // Profile exists but pharmacy_id is null — patch it
      await adminClient
        .from('profiles')
        .update({ pharmacy_id: pharmacyId })
        .eq('id', user.id)
    }

    // Re-fetch with updated pharmacy relation
    const { data: freshProfile } = await adminClient
      .from('profiles')
      .select('*, pharmacies(name)')
      .eq('id', user.id)
      .single()

    profile = freshProfile
  }

  if (!profile) {
    await supabase.auth.signOut()
    redirect('/login?error=Your account profile is missing. Please contact your administrator.')
  }

  const pharmacy = profile.pharmacies as { name: string } | null
  const pharmacyName = pharmacy?.name ?? 'PharmaTech Pro'

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar initialRole={profile.role as UserRole} initialPharmacyId={profile.pharmacy_id} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          pharmacyName={pharmacyName}
          userFirstName={profile.first_name}
          userLastName={profile.last_name}
          userRole={profile.role as UserRole}
          pharmacyId={profile.pharmacy_id ?? ''}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
