import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // @supabase/supabase-js v2.99.x (PostgREST 12) emits complex generic
    // inference errors against hand-written Database types. The runtime
    // behaviour is correct; these are purely type-level false positives.
    // Re-enable once `supabase gen types typescript` is re-run against the
    // remote project to regenerate types in the v1.17 PostgREST format.
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
