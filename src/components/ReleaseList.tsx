import Link from 'next/link'
import CoverImage from '@/components/CoverImage'
import { sceneryCover } from '@/lib/media'
import styles from './ReleaseList.module.css'

export type ReleaseItem = {
  id: string | number
  title: string
  href: string
  price: number
  duration: string
  slug: string
  coverUrl: string | null
  shortDescription?: string | null
}

function formatPrice(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}

export default function ReleaseList({
  items,
  featured = false,
}: {
  items: ReleaseItem[]
  featured?: boolean
}) {
  return (
    <ul className={styles.list}>
      {items.map((item, i) => {
        const lead = featured && i === 0
        return (
          <li className={lead ? styles.feature : styles.item} key={item.id}>
            <Link className={styles.link} href={item.href}>
              <figure className={styles.cover}>
                <CoverImage
                  alt=""
                  className={styles.img}
                  fallback={sceneryCover(item.slug)}
                  sizes={
                    lead
                      ? '(max-width: 800px) 100vw, 62vw'
                      : '(max-width: 800px) 100vw, 40vw'
                  }
                  src={item.coverUrl}
                />
              </figure>
              <div className={styles.copy}>
                <h3 className={styles.title}>{item.title}</h3>
                {item.shortDescription ? (
                  <p className={styles.desc}>{item.shortDescription}</p>
                ) : null}
                <p className={styles.meta}>
                  <span className={styles.time}>{item.duration}</span>
                  <span className={styles.price}>{formatPrice(item.price)} ₽</span>
                </p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
