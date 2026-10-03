'use client'

import type { PointerEvent } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import CoverImage from '@/components/CoverImage'
import { sceneryCover } from '@/lib/media'
import type { ReleaseItem } from '@/components/ReleaseList'
import styles from './CatalogCarousel.module.css'

export default function CatalogCarousel({ items }: { items: ReleaseItem[] }) {
  // Свет за курсором: пишем позицию указателя в CSS-переменные карточки,
  // свечение рисует радиальный градиент. JS двигает только точку — перерисовку
  // держит композитор, главный поток свободен.
  const trackPointer = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return (
    <div className={styles.carousel}>
      <ul className={styles.track}>
        {items.map((item) => (
          <li className={styles.item} key={item.id}>
            <Link className={styles.link} href={item.href} onPointerMove={trackPointer}>
              <figure className={styles.cover}>
                <CoverImage
                  alt=""
                  className={styles.img}
                  fallback={sceneryCover(item.slug)}
                  sizes="(max-width: 760px) 18vw, 280px"
                  src={item.coverUrl}
                />
                <span className={styles.coverGlow} aria-hidden />
                <span className={styles.spot} aria-hidden />
              </figure>

              <div className={styles.body}>
                <h3 className={styles.title}>{item.title}</h3>
                {item.shortDescription ? (
                  <p className={styles.desc}>{item.shortDescription}</p>
                ) : null}
                <span className={styles.cue}>
                  Слушать
                  <ChevronRight size={15} strokeWidth={2} aria-hidden />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
