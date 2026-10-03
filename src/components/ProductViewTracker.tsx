'use client'

import { useEffect } from 'react'
import { Goals, reachGoal } from '@/lib/metrika'

export default function ProductViewTracker({
  productId,
  slug,
  price,
}: {
  productId: string
  slug: string
  price: number
}) {
  useEffect(() => {
    reachGoal(Goals.productView, { product_id: productId, slug, price })
  }, [productId, slug, price])

  return null
}
