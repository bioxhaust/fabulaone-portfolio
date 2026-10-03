import type { Media, Product } from '@/payload-types'

/**
 * Обложка фабулы в /public/scenery — по slug, не по номеру.
 * Файл: cover-{slug}.webp (2048×2048).
 */
export function sceneryCover(slug: string): string {
  return `/scenery/cover-${slug}.webp`
}

/** @deprecated Используйте sceneryCover(slug). */
export function sceneryFallback(slug: string): string {
  return sceneryCover(slug)
}

/**
 * URL обложки: из Payload, если там не SVG; иначе локальный webp по slug.
 */
export function productCoverUrl(product: Product): string | null {
  const cover = product.cover
  if (cover && typeof cover === 'object') {
    const media = cover as Media
    const url = media.sizes?.cover?.url ?? media.url ?? null
    if (url && !isSvgSrc(url)) return url
  }
  return product.slug ? sceneryCover(product.slug) : null
}

/** next/image не умеет оптимизировать SVG и отвечает 500. */
export function isSvgSrc(url: string): boolean {
  const path = url.split('?')[0]?.split('#')[0] ?? url
  return path.toLowerCase().endsWith('.svg')
}
