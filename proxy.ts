import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isDemoMode } from '@/lib/demo'

const PROTECTED_ROUTES = ['/dashboard', '/patients', '/prescriptions', '/inventory', '/insurance', '/pos', '/reports', '/workflow', '/admin', '/communications']
const AUTH_ROUTES = ['/login', '/register', '/reset-password']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isDemoMode()) {
    if (pathname === '/') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users from protected routes
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from auth routes to dashboard
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))
  const hasAuthError = request.nextUrl.searchParams.has('error')
  if (isAuthRoute && user && !hasAuthError) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect root to dashboard or login
  if (pathname === '/') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = user ? '/dashboard' : '/login'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
