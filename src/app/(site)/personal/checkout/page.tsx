'use client'

import { useState } from 'react'
import Link from 'next/link'
import OrderConsents from '@/components/OrderConsents'
import styles from './page.module.css'

const PRICE = 9900

export default function PersonalCheckoutPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [offerAccepted, setOfferAccepted] = useState(false)
  const [pdAccepted, setPdAccepted] = useState(false)
  const [marketingAccepted, setMarketingAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdError, setPdError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setPdError('')

    if (!offerAccepted) setError('Необходимо принять оферту')
    if (!pdAccepted) setPdError('Необходимо дать согласие на обработку персональных данных')
    if (!offerAccepted || !pdAccepted) return

    setLoading(true)
    try {
      const params = new URLSearchParams(window.location.search)
      const r = await fetch('/api/checkout/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          offerAccepted: true as const,
          pdAccepted: true as const,
          marketingAccepted,
          utmSource: params.get('utm_source') ?? undefined,
          utmMedium: params.get('utm_medium') ?? undefined,
          utmCampaign: params.get('utm_campaign') ?? undefined,
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'Ошибка оформления заказа')
        return
      }
      window.location.href = data.confirmationUrl
    } catch {
      setError('Сетевая ошибка. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.page} scene-wash`}>
      
      <div className="container">
        <header className={styles.head}>
          <span className={`eyebrow ${styles.eyebrow}`}>Индивидуально</span>
          <h1 className={styles.title}>Заказ персональной фабулы</h1>
        </header>

        <div className={styles.layout}>
          {/* Form */}
          <div className={styles.formWrap}>
            <form onSubmit={handleSubmit} noValidate className={`${styles.formCard} ${styles.form}`}>
              <div className="field">
                <label className="label" htmlFor="name">Имя *</label>
                <input
                  id="name" type="text" className="input"
                  value={name} onChange={e => setName(e.target.value)}
                  autoComplete="name" required
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="email">Email *</label>
                <input
                  id="email" type="email" className="input"
                  value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="email" required
                />
              </div>
              <hr className={styles.divider} />

              <div className={styles.consents}>
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={offerAccepted} onChange={e => setOfferAccepted(e.target.checked)}
                    required
                  />
                  <span className={styles.checkLabel}>
                    Принимаю{' '}
                    <Link href="/pages/offer" target="_blank" className={styles.link}>публичную оферту</Link>
                  </span>
                </label>

                <OrderConsents
                  pdAccepted={pdAccepted}
                  marketingAccepted={marketingAccepted}
                  onPd={(value) => { setPdAccepted(value); setPdError('') }}
                  onMarketing={setMarketingAccepted}
                  pdError={pdError}
                />
              </div>

              {error && <p className={styles.submitError} role="alert">{error}</p>}

              <button
                type="submit"
                className={`btn btn-primary btn-lg ${styles.submit}`}
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? 'Переходим к оплате…' : `Оплатить ${PRICE.toLocaleString('ru-RU')} ₽`}
              </button>
            </form>
          </div>

          {/* Summary */}
          <aside className={styles.summary} aria-label="Состав заказа">
            <div className={styles.summaryCard}>
              <p className={styles.summaryTitle}>Персональная фабула</p>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Длина</span>
                  <span className={styles.summaryValue}>11 мин 11 сек</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Срок</span>
                  <span className={styles.summaryValue}>до 7 рабочих дней</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Формат</span>
                  <span className={styles.summaryValue}>MP3, личный кабинет</span>
                </div>
              </div>
              <hr className={styles.rule} />
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Итого</span>
                <span className={styles.totalAmount}>{PRICE.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
