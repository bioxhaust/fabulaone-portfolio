'use client'

import Image from 'next/image'
import { useState } from 'react'
import { isSvgSrc } from '@/lib/media'

type Props = {
  src: string | null
  alt: string
  fallback: string
  className?: string
  sizes: string
  priority?: boolean
}

/**
 * Обложка, которая не оставляет битую иконку.
 *
 * SVG из Payload идёт в /_next/image и падает с 500 — поэтому такие
 * файлы показываем как есть. Если и исходник не открылся, подставляем
 * пейзаж из /public/scenery, а не пустой img.
 */
export default function CoverImage({
  src,
  alt,
  fallback,
  className,
  sizes,
  priority,
}: Props) {
  const [failed, setFailed] = useState(false)
  const url = !src || failed ? fallback : src

  return (
    <Image
      alt={alt}
      className={className}
      fill
      onError={() => {
        if (url !== fallback) setFailed(true)
      }}
      priority={priority}
      sizes={sizes}
      src={url}
      unoptimized={isSvgSrc(url)}
    />
  )
}
