import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const configFilePath = fileURLToPath(import.meta.url)
const projectRoot = path.dirname(configFilePath)
const backendApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8000'

const nextConfig = {
  allowedDevOrigins: ['192.168.207.174'],
  turbopack: {
    root: projectRoot,
  },
  typescript: {
    // Next's build-time type worker can fail to spawn in this Windows workspace path.
    // We still validate types separately with `npm exec tsc --noEmit`.
    ignoreBuildErrors: process.platform === 'win32',
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: backendApiBaseUrl,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dl.airtable.com' },
      { protocol: 'https', hostname: 'airtableusercontent.com' },
      { protocol: 'https', hostname: 'v4.airtableusercontent.com' },
      { protocol: 'https', hostname: 'v5.airtableusercontent.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'assets.prometheusstudio.tech' },
      { protocol: 'https', hostname: 'cdn.prometheusstudio.tech' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
}

export default nextConfig
