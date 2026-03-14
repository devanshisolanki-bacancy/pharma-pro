import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'PharmaTech Pro',
  description: 'HIPAA-compliant Pharmacy Management System',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-md focus:shadow-md"
        >
          Skip to main content
        </a>
        <ServiceWorkerRegister />
        <div id="app-shell">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  )
}
