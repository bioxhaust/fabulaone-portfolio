'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Goals, reachGoal } from '@/lib/metrika'
import OrderConsents from '@/components/OrderConsents'
import styles from './page.module.css'

type ProductInfo = {
  id: string
  title: string
  price: number
  shortDescription?: string
}

type PromoResult =
  | { valid: true; discountType: 'percent' | 'fixed'; discountValue: number }
  | { valid: false; reason?: string }

function calcFinal(price: number, promo: PromoResult | null): number {
  if (!promo || !promo.valid) return price
  if (promo.discountType === 'percent') {
    return Math.max(1, Math.round(price * (1 - promo.discountValue / 100)))
  }
  return Math.max(1, price - promo.discountValue)
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className={`${styles.loading} scene-wash`}><div className={styles.spinner} role="status" aria-label="Загрузка" /></div>}>
      <CheckoutForm />
    </Suspense>
  )
}

function CheckoutForm() {
  const params = useSearchParams()
  const router = useRouter()
  const productId = params.get('productId') ?? ''

  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [productError, setProductError] = useState('')

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [promo, setPromo] = useState('')
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)

  const [offerAccepted, setOfferAccepted] = useState(false)
  const [pdAccepted, setPdAccepted] = useState(false)
  const [marketingAccepted, setMarketingAccepted] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!productId) { setProductError('Товар не выбран'); setLoadingProduct(false); return }
    fetch(`/api/products/${productId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setProduct)
      .catch(() => setProductError('Товар не найден'))
      .finally(() => setLoadingProduct(false))
  }, [productId])

  const checkPromo = useCallback(async () => {
    const code = promo.trim().toUpperCase()
    if (!code || !productId) return
    setPromoLoading(true)
    try {
      const r = await fetch(`/api/promo/validate?code=${encodeURIComponent(code)}&productId=${productId}`)
      setPromoResult(await r.json())
    } finally {
      setPromoLoading(false)
    }
  }, [promo, productId])

  function validate() {
    const e: Record<string, string> = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Введите корректный email'
    if (!offerAccepted) e.offer = 'Необходимо принять оферту'
    if (!pdAccepted) e.pd = 'Необходимо дать согласие на обработку данных'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      reachGoal(Goals.payClick, { product_id: productId, price: finalPrice })
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
          promoCode: promo.trim().toUpperCase() || undefined,
          offerAccepted,
          pdAccepted,
          marketingAccepted,
        }),
      })
      const data = await r.json()
      if (!r.ok) { setSubmitError(data.error ?? 'Ошибка оформления'); return }
      window.location.href = data.confirmationUrl
    } catch {
      setSubmitError('Сетевая ошибка. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  const finalPrice = product ? calcFinal(product.price, promoResult) : 0
  const discount = product ? product.price - finalPrice : 0

  if (loadingProduct) return <div className={`${styles.loading} scene-wash`}><div className={styles.spinner} role="status" aria-label="Загрузка" /></div>
  if (productError || !product) return (
    <div className={`${styles.state} scene-wash`}>
      
      <div className={styles.stateCard}>
        <p className={styles.stateText}>{productError || 'Товар не найден'}</p>
        <button className="btn btn-ghost" onClick={() => router.push('/')}>На главную</button>
      </div>
    </div>
  )

  return (
    <div className={`${styles.page} scene-wash`}>
      
      <div className="container">
        <header className={styles.head}>
          <span className={`eyebrow ${styles.eyebrow}`}>Оплата</span>
          <h1 className={styles.heading}>Оформление</h1>
        </header>

        <div className={styles.grid}>
          {/* Order summary */}
          <aside className={styles.summary}>
            <div className={styles.summaryCard}>
              <h2 className={`eyebrow ${styles.summaryTitle}`}>Ваш заказ</h2>

              <div className={styles.summaryProduct}>
                <p className={styles.productName}>{product.title}</p>
                {product.shortDescription && (
                  <p className={styles.productDesc}>{product.shortDescription}</p>
                )}
              </div>

              <hr className={styles.rule} />

              <div className={styles.rows}>
                <div className={styles.summaryRow}>
                  <span>Стоимость</span>
                  <span>{product.price} ₽</span>
                </div>
                {discount > 0 && (
                  <div className={`${styles.summaryRow} ${styles.discount}`}>
                    <span>Скидка</span>
                    <span>−{discount} ₽</span>
                  </div>
                )}
              </div>

              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Итого</span>
                <span className={styles.totalValue}>{finalPrice} ₽</span>
              </div>

              <p className={styles.summaryHint}>
                <svg className={styles.hintIcon} width="14" height="14" viewBox="0 0 16 16"
                  fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M8 1.5l5.5 2.3v3.8c0 3.2-2.2 5.9-5.5 6.9-3.3-1-5.5-3.7-5.5-6.9V3.8L8 1.5z" />
                  <path d="M5.6 8.1l1.7 1.7 3.2-3.4" />
                </svg>
                Файл доступен сразу после оплаты в личном кабинете
              </p>
            </div>
          </aside>

          {/* Form */}
          <div className={styles.formWrap}>
            <form onSubmit={handleSubmit} noValidate className={`${styles.formCard} ${styles.form}`}>
              <div className="field">
                <label className="label" htmlFor="email">Email *</label>
                <input
                  id="email" type="email" className={`input${errors.email ? ' input-error' : ''}`}
                  value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" inputMode="email" required
                  aria-describedby={errors.email ? 'email-err' : undefined}
                />
                {errors.email && <p id="email-err" className="error-text" role="alert">{errors.email}</p>}
                <p className={styles.fieldHint}>Ссылка на файл придёт на этот адрес</p>
              </div>

              <div className="field">
                <label className="label" htmlFor="name">Имя (необязательно)</label>
                <input id="name" type="text" className="input"
                  value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" />
              </div>

              {/* Promo */}
              <div className={styles.promoRow}>
                <div className={`field ${styles.promoField}`}>
                  <label className="label" htmlFor="promo">Промокод</label>
                  <input id="promo" type="text" className="input"
                    value={promo}
                    onChange={e => { setPromo(e.target.value.toUpperCase()); setPromoResult(null) }}
                    placeholder="FABULA10"
                    autoComplete="off"
                  />
                </div>
                <button type="button" className={`btn btn-outline ${styles.promoBtn}`} onClick={checkPromo}
                  disabled={!promo.trim() || promoLoading}>
                  {promoLoading ? '…' : 'Применить'}
                </button>
              </div>
              {promoResult && (
                <p className={promoResult.valid ? styles.promoOk : styles.promoErr} role="status">
                  {promoResult.valid
                    ? `Скидка применена: −${discount} ₽`
                    : promoResult.reason === 'expired' ? 'Промокод истёк'
                    : promoResult.reason === 'limit_reached' ? 'Промокод использован'
                    : promoResult.reason === 'not_applicable' ? 'Промокод не для этого товара'
                    : 'Промокод не найден'}
                </p>
              )}

              <hr className={styles.divider} />

              {/* Consents */}
              <div className={styles.consents}>
                <div className="field">
                  <label className="checkbox-wrap">
                    <input type="checkbox" checked={offerAccepted}
                      onChange={e => { setOfferAccepted(e.target.checked); setErrors(v => ({ ...v, offer: '' })) }}
                      aria-describedby={errors.offer ? 'offer-err' : undefined}
                    />
                    <span className={styles.checkLabel}>
                      Я принимаю условия{' '}
                      <a href="/pages/offer" target="_blank" rel="noopener" className={styles.link}>публичной оферты</a>
                      {' '}и согласен с тем, что это цифровой товар без права возврата
                    </span>
                  </label>
                  {errors.offer && <p id="offer-err" className="error-text" role="alert">{errors.offer}</p>}
                </div>

                <OrderConsents
                  pdAccepted={pdAccepted}
                  marketingAccepted={marketingAccepted}
                  onPd={(value) => { setPdAccepted(value); setErrors(v => ({ ...v, pd: '' })) }}
                  onMarketing={setMarketingAccepted}
                  pdError={errors.pd}
                />
              </div>

              {submitError && (
                <p className={styles.submitError} role="alert">{submitError}</p>
              )}

              <button type="submit" className={`btn btn-primary btn-lg ${styles.submit}`}
                disabled={submitting} aria-busy={submitting}>
                {submitting ? 'Переход к оплате…' : `Оплатить ${finalPrice} ₽`}
              </button>

              <p className={styles.paymentNote}>
                <svg className={styles.noteIcon} width="13" height="13" viewBox="0 0 16 16"
                  fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <rect x="3" y="7" width="10" height="7" rx="1.6" />
                  <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
                </svg>
                Оплата через ЮKassa. Карты и СБП. Данные карты защищены PCI DSS.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
