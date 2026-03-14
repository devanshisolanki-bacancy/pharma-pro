import { redirect } from 'next/navigation'

// Proxy handles routing, this is a server-side fallback
export default function RootPage() {
  redirect('/dashboard')
}
