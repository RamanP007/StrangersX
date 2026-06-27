import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes: { path: string; priority: number; freq: 'monthly' | 'yearly' }[] = [
    { path: '', priority: 1.0, freq: 'monthly' },
    { path: '/about', priority: 0.7, freq: 'monthly' },
    { path: '/privacy', priority: 0.4, freq: 'yearly' },
    { path: '/terms', priority: 0.4, freq: 'yearly' },
  ]

  return routes.map(r => ({
    url: `${siteConfig.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }))
}
