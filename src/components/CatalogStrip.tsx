import Link from 'next/link'
import CoverImage from '@/components/CoverImage'
import { sceneryCover } from '@/lib/media'
import type { ReleaseItem } from '@/components/ReleaseList'
import styles from './CatalogStrip.module.css'

export default function CatalogStrip({ items }: { items: ReleaseItem[] }) {
  return (
    <ul className={styles.row}>
      {items.map((item) => (
        <li className={styles.item} key={item.id}>
          <Link className={styles.link} href={item.href}>
            <figure className={styles.cover}>
              <CoverImage
                alt=""
                className={styles.img}
                fallback={sceneryCover(item.slug)}
                sizes="(max-width: 700px) 42vw, 168px"
                src={item.coverUrl}
              />
              <figcaption className={styles.caption}>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.time}>{item.duration}</p>
              </figcaption>
            </figure>
          </Link>
        </li>
      ))}
    </ul>
  )
}
