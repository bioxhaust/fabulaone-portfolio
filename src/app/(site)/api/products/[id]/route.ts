/**
 * GET /api/products/[id]
 * Public endpoint — returns minimal product info for the checkout page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const payload = await getPayload({ config: configPromise })

  let product: any
  try {
    product = await payload.findByID({ collection: 'products', id })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!product || !product.active) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: product.id,
    title: product.title,
    price: product.price,
    shortDescription: product.shortDescription ?? null,
  })
}
