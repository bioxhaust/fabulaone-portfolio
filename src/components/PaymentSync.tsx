'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Goals, reachGoal } from '@/lib/metrika'
import { isPersonalReturnFlag } from '@/lib/site-url'

/**
 * If webhook lags, poll YooKassa via /api/payments/sync
 * (same idea as yookassa_proof/payment_flow_example.py).
 * A confirmed personal order opens the questionnaire.
 */
export default function PaymentSync() {
  const params = useSearchParams()
  const orderId = params.get('order')
  const personal = isPersonalReturnFlag(params.get('personal'), params.get('type'))
  const kind = personal ? 'personal' : 'order'
  const [note, setNote] = useState<string | null>(null)
  const [questionnairePath, setQuestionnairePath] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return

    let cancelled = false
    let tries = 0

    const tick = async () => {
      tries += 1
      try {
        const res = await fetch('/api/payments/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId, kind }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return

        if (res.status === 404) {
          setNote('Заказ не найден. Если оплата прошла, напишите в поддержку.')
          return
        }
        if (res.status === 409) {
          setNote('Сумма платежа не совпала с заказом. Напишите в поддержку.')
          return
        }

        const nextPath = typeof data.questionnairePath === 'string' ? data.questionnairePath : ''
        if (nextPath.startsWith('/personal/questionnaire?')) {
          reachGoal(Goals.purchase, { order_id: orderId, kind })
          setQuestionnairePath(nextPath)
          window.location.replace(nextPath)
          return
        }

        if (data.status === 'questionnaire_done' || data.status === 'in_progress' || data.status === 'ready') {
          setNote('Анкета уже отправлена. Заказ есть в разделе «Мои покупки».')
          return
        }

        if (data.status === 'paid' || data.status === 'paid_questionnaire') {
          reachGoal(Goals.purchase, { order_id: orderId, kind })
          setNote(
            personal
              ? 'Оплата подтверждена. Если анкета не открылась, она также есть в письме.'
              : 'Заказ подтверждён. Письмо уже в пути — проверьте почту.',
          )
          return
        }
        if (tries < 15) {
          setTimeout(tick, 2000)
        } else if (personal) {
          setNote('Платёж ещё подтверждается. Анкета откроется сама или придёт на почту.')
        }
      } catch {
        if (!cancelled && tries < 15) setTimeout(tick, 2500)
        else if (!cancelled && personal) {
          setNote('Не удалось подтвердить оплату. Обновите страницу или откройте письмо.')
        }
      }
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [orderId, kind, personal])

  if (questionnairePath) {
    return (
      <p style={{ marginTop: '1rem' }}>
        <a href={questionnairePath}>Открыть анкету</a>
      </p>
    )
  }

  if (!note) {
    if (!personal || !orderId) return null
    return <p style={{ marginTop: '1rem', opacity: 0.75 }}>Подтверждаем оплату и открываем анкету…</p>
  }
  return <p style={{ marginTop: '1rem', opacity: 0.75 }}>{note}</p>
}
