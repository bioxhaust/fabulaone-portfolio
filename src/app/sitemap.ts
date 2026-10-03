import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'


export const dynamic = 'force-dynamic'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fabulaone.ru'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    {
      url: `${SITE_URL}/personal`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    { url: `${SITE_URL}/privacy`, lastModified: new Date('2026-09-28'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/consent`, lastModified: new Date('2026-09-28'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/ads-consent`, lastModified: new Date('2026-09-28'), changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const payload = await getPayload({ config: configPromise })

    const [products, pages] = await Promise.all([
      payload.find({
        collection: 'products',
        where: { active: { equals: true } },
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'pages',
        limit: 50,
        depth: 0,
      }),
    ])

    const productRoutes: MetadataRoute.Sitemap = products.docs.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    }))

    const pageRoutes: MetadataRoute.Sitemap = pages.docs
      .filter((p) => p.slug !== 'privacy' && p.slug !== 'consent')
      .map((p) => ({
        url: `${SITE_URL}/pages/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.4,
      }))

    return [...staticRoutes, ...productRoutes, ...pageRoutes]
  } catch {
    return staticRoutes
  }
}
