import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  if (!params.error) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <LoginForm redirectTo={params.redirectTo} error={params.error} />
    </div>
  )
}
