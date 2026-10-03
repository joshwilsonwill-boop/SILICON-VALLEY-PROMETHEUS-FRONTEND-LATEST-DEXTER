import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/pricing', '/docs', '/contact', '/login', '/signup', '/terms', '/privacy', '/refund', '/cookie-policy'].map((path) => ({ url: `https://prometheusstudio.tech${path}`, changeFrequency: path === '/' ? 'weekly' : 'monthly', priority: path === '/' ? 1 : 0.6 }))
}
