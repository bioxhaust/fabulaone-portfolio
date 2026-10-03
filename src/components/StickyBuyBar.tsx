'use client'

import { useEffect, useState } from 'react'
import CheckoutButton from './CheckoutButton'
import styles from './StickyBuyBar.module.css'

type Props = {
  productId: string
  productSlug: string
  price: number
  title: string
}

/**
 * Нижняя полоса покупки на телефоне.
 * Появляется, когда основной блок с ценой уходит за верх экрана —
 * чтобы кнопка «Купить» не терялась под обложкой и описанием.
 */
export default function StickyBuyBar({ productId, productSlug, price, title }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const buy = document.querySelector('[data-buy-panel]')
    if (!buy) return

    const update = () => {
      if (!window.matchMedia('(max-width: 700px)').matches) {
        setShow(false)
        return
      }
      const header = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      ) || 72
      setShow(buy.getBoundingClientRect().bottom < header)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const priceLabel = formatPrice(price)

  return (
    <div
      aria-hidden={!show}
      aria-label="Купить"
      className={`${styles.bar} ${show ? styles.barShow : ''}`}
      inert={!show}
      role="region"
    >
        <p className={styles.meta}>
          <span className={styles.name}>{title}</span>
          <span className={styles.price}>{priceLabel}&nbsp;₽</span>
        </p>
        <CheckoutButton
          compact
          price={price}
          productId={productId}
          productSlug={productSlug}
        />
    </div>
  )
}

function formatPrice(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}
