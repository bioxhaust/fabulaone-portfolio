'use client'

/**
 * Карточка фабулы с переворотом по наведению.
 *
 * Основано на компоненте «Card Flip» из реестра Kokonut UI
 * © @dorianbaffier, MIT — https://kokonutui.com
 *
 * Что изменено под FABULA ONE:
 *  • вместо абстрактного контента — обложка, номер, хронометраж, цена;
 *  • лицо — постер на всю карточку, подпись стеклом поверх снимка
 *    (так карточки стоят на выбранном макете, а не «фото сверху / текст снизу»);
 *  • 3D собрано в CSS-модуле: одно transform на риг, 880ms, ease-glide,
 *    пауза 160ms перед поворотом. В оригинале — 500ms и симметричный
 *    cubic-bezier(0.77,0,0.175,1): медленный старт, рывок в середине,
 *    жёсткий стоп. Предыдущая адаптация ушла в другую крайность —
 *    450ms ease-out, то есть рывок сразу. Оба читаются как щелчок;
 *  • React не участвует в ховере. Состояние только у сломанной обложки;
 *  • на таче переворота нет: первый жест ведёт на страницу фабулы.
 */

import { ArrowRight, Repeat2 } from 'lucide-react'
import Link from 'next/link'
import CoverImage from '@/components/CoverImage'
import { sceneryCover } from '@/lib/media'
import styles from './FabulaCardFlip.module.css'

export interface FabulaCardFlipProps {
  title: string
  href: string
  price: number
  duration: string
  index: number
  slug: string
  coverUrl: string | null
  shortDescription?: string | null
  details?: string[]
}

export default function FabulaCardFlip({
  title,
  href,
  price,
  duration,
  index,
  slug,
  coverUrl,
  shortDescription,
  details = [
    'Полный файл после оплаты',
    'Ссылка приходит на почту',
    'Остаётся у вас навсегда',
  ],
}: FabulaCardFlipProps) {
  const num = String(index + 1).padStart(2, '0')
  const fallback = sceneryCover(slug)
  const priceLabel = `${formatPrice(price)} ₽`

  return (
    <div className={styles.scene}>
      <div className={styles.rig}>
        <div className={styles.face + ' ' + styles.front}>
          <Link
            aria-label={`${title} — ${priceLabel}`}
            className={styles.frontHit}
            href={href}
          >
            <div className={styles.cover}>
              <CoverImage
                alt=""
                className={styles.coverImg}
                fallback={fallback}
                sizes="(max-width: 768px) 80vw, 320px"
                src={coverUrl}
              />
            </div>

            <span className={styles.num}>{num}</span>
            <span className={styles.duration}>{duration}</span>

            <div className={styles.caption}>
              <div className={styles.copy}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.price}>{priceLabel}</p>
              </div>
              <Repeat2 aria-hidden className={styles.hint} size={16} strokeWidth={1.75} />
            </div>
          </Link>
        </div>

        <div className={styles.face + ' ' + styles.back}>
          <h3 className={styles.backTitle}>{title}</h3>
          {shortDescription && <p className={styles.backLead}>{shortDescription}</p>}

          <ul className={styles.details}>
            {details.map((detail) => (
              <li className={styles.detail} key={detail}>
                <ArrowRight aria-hidden size={12} strokeWidth={2} />
                <span>{detail}</span>
              </li>
            ))}
          </ul>

          <Link className={styles.cta} href={href}>
            <span>Слушать за {priceLabel}</span>
            <ArrowRight aria-hidden size={16} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function formatPrice(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}
