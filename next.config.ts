import type { NextConfig } from 'next'
import { withPayload } from '@payloadcms/next/withPayload'

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.yandexcloud.net',
      },
    ],
  },
  experimental: {
    reactCompiler: false,
  },
}

export default withPayload(nextConfig)
