import { existsSync } from 'node:fs'
import path from 'node:path'

function publicUrlIfExists(rel: string): string | null {
  const file = path.join(process.cwd(), 'public', rel)
  return existsSync(file) ? `/${rel}` : null
}

/**
 * Фон главной. Кладёте файл — он подхватывается сам.
 * 3840×2160, 16:9, webp.
 */
export function heroLandscapeUrl(): string | null {
  return publicUrlIfExists('scenery/hero-landscape.webp')
}

/** Телефонный кадр фона. 1440×2560, 9:16. Необязательный. */
export function heroLandscapeMobileUrl(): string | null {
  return publicUrlIfExists('scenery/hero-landscape-mobile.webp')
}

/**
 * Фигура в сфере. webp или png с прозрачностью.
 * 2400×2400, 1:1. Без файла рисуется стеклянная сфера.
 */
export function heroFigureUrl(): string | null {
  return (
    publicUrlIfExists('scenery/hero-figure.webp') ??
    publicUrlIfExists('scenery/hero-figure.png')
  )
}
