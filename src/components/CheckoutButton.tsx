'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Goals, reachGoal } from '@/lib/metrika'
import styles from './CheckoutButton.module.css'

type Props = {
  productId: string
  productSlug: string
  price: number
  compact?: boolean
}

export default function CheckoutButton({ productId, productSlug, price, compact }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function go() {
    setLoading(true)
    reachGoal(Goals.beginCheckout, { product_id: productId, product_slug: productSlug, price })
    router.push(`/checkout?productId=${productId}`)
  }

  return (
    <button
      type="button"
      className={`btn btn-primary ${compact ? styles.compact : 'btn-lg'} ${styles.btn}`}
      onClick={go}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden />
      ) : null}
      <span>{loading ? 'Загрузка…' : 'Купить'}</span>
      {!loading && <ArrowIcon />}
    </button>
  )
}

function ArrowIcon() {
  return (
    <svg
      className={styles.arrow}
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10h11M10.5 5.5L15 10l-4.5 4.5" />
    </svg>
  )
}
