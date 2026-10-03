import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import CoverImage from '@/components/CoverImage'
import { productCoverUrl, sceneryCover } from '@/lib/media'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { signMagicToken, verifyMagicToken } from '@/lib/magic-link'
import { syncPersonalPayment } from '@/lib/personal-payment'
import { questionnairePath } from '@/lib/site-url'
import { getSignedDownloadUrl, resolveProductAudioKey } from '@/lib/storage'
import Reveal from '@/components/Reveal'
import type { Order, PersonalOrder, Product } from '@/payload-types'
import styles from './page.module.css'

const VISIBLE_PERSONAL = new Set(['paid_questionnaire', 'questionnaire_done', 'in_progress', 'ready'])

const PERSONAL_STATUS: Record<string, string> = {
  paid_questionnaire: 'Оплачено — заполните анкету',
  questionnaire_done: 'Анкета получена, фабула в работе',
  in_progress: 'Фабула в работе',
  ready: 'Готово к скачиванию',
}


export const dynamic = 'force-dynamic'
export const metadata = { title: 'Мои покупки' }

async function getSession() {
  const store = await cookies()
  const token = store.get('fabula_session')?.value
  if (!token) return null
  try {
    return await verifyMagicToken(token)
  } catch {
    return null
  }
}

export default async function CabinetPage() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  const payload = await getPayload({ config: configPromise })

  const ordersResult = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { 'customer.email': { equals: session.email } },
        { status: { equals: 'paid' } },
      ],
    },
    sort: '-createdAt',
    limit: 50,
    depth: 2,
  })

  const orders = ordersResult.docs as Order[]

  let personalOrders = (
    await payload.find({
      collection: 'personal-orders',
      where: { 'customer.email': { equals: session.email } },
      sort: '-createdAt',
      limit: 50,
      depth: 0,
    })
  ).docs as PersonalOrder[]

  const pendingPaid = personalOrders.filter((order) => order.status === 'pending_payment' && order.yookassaPaymentId)
  if (pendingPaid.length > 0) {
    await Promise.all(pendingPaid.map(async (order) => {
      try {
        await syncPersonalPayment(payload, order.id)
      } catch (err) {
        console.error('personal payment reconcile failed', order.id, err)
      }
    }))
    personalOrders = (
      await payload.find({
        collection: 'personal-orders',
        where: { 'customer.email': { equals: session.email } },
        sort: '-createdAt',
        limit: 50,
        depth: 0,
      })
    ).docs as PersonalOrder[]
  }

  const visiblePersonal = personalOrders.filter((order) => VISIBLE_PERSONAL.has(order.status))

  type Row =
    | { kind: 'catalog'; at: string; order: Order }
    | { kind: 'personal'; at: string; order: PersonalOrder }

  const rows: Row[] = [
    ...orders.map((order) => ({ kind: 'catalog' as const, at: order.paidAt ?? order.createdAt, order })),
    ...visiblePersonal.map((order) => ({ kind: 'personal' as const, at: order.paidAt ?? order.createdAt, order })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at))

  return (
    <div className={`${styles.page} scene-wash`}>
      

      <div className="container">
        <Reveal>
          <header className={styles.head}>
            <div>
              <p className={`eyebrow ${styles.headEyebrow}`}>Личный кабинет</p>
              <h1 className={styles.heading}>Мои покупки</h1>
            </div>
            <p className={styles.email}>{session.email}</p>
          </header>
        </Reveal>

        {rows.length === 0 ? (
          <Reveal>
            <div className={styles.empty}>
              <p>У вас ещё нет покупок.</p>
            </div>
          </Reveal>
        ) : (
          <div className={styles.list}>
            {rows.map((row, i) => (
              <Reveal key={`${row.kind}-${row.order.id}`}>
                {row.kind === 'catalog' ? (
                  <OrderRow order={row.order} index={i} payload={payload} />
                ) : (
                  <PersonalRow order={row.order} index={i} email={session.email} />
                )}
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

async function OrderRow({
  order,
  index,
  payload,
}: {
  order: Order
  index: number
  payload: Awaited<ReturnType<typeof getPayload>>
}) {
  const product = order.product as Product | undefined
  if (!product) return null

  let downloadUrl: string | null = null
  const audioKey = await resolveProductAudioKey(product, payload)
  if (audioKey) {
    try {
      downloadUrl = await getSignedDownloadUrl(audioKey)
    } catch {
      downloadUrl = null
    }
  }

  const date = new Date(order.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const cover = productCoverUrl(product)
  const num = String(index + 1).padStart(2, '0')

  return (
    <article className={styles.orderCard}>
      <div className={styles.cover}>
        <CoverImage
          alt=""
          className={styles.coverImg}
          fallback={sceneryCover(product.slug)}
          sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 380px"
          src={cover}
        />

        <span className={styles.cardNum}>{num}</span>
        <span className={`timecode ${styles.cardTime}`}>{product.duration ?? '11:11'}</span>
      </div>

      <div className={styles.orderBody}>
        <h2 className={styles.orderTitle}>{product.title}</h2>

        <div className={styles.orderInfo}>
          <span className={styles.orderMeta}>{date}</span>
          <span className={styles.orderPrice}>{order.amount} ₽</span>
        </div>

        <div className={styles.action}>
          {downloadUrl ? (
            <a href={downloadUrl} className={`btn btn-primary ${styles.download}`} download>
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M10 3v9m0 0 3.4-3.4M10 12 6.6 8.6" />
                <path d="M3.6 14.4v1.1A1.5 1.5 0 0 0 5.1 17h9.8a1.5 1.5 0 0 0 1.5-1.5v-1.1" />
              </svg>
              Скачать
            </a>
          ) : (
            <span className={styles.noLink}>Файл временно недоступен</span>
          )}
        </div>
      </div>
    </article>
  )
}

async function PersonalRow({
  order,
  index,
  email,
}: {
  order: PersonalOrder
  index: number
  email: string
}) {
  const customerId = typeof order.customer === 'string' ? order.customer : order.customer.id
  const date = new Date(order.paidAt ?? order.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const num = String(index + 1).padStart(2, '0')
  const statusLabel = PERSONAL_STATUS[order.status] ?? order.status

  let downloadUrl: string | null = null
  if (order.status === 'ready' && order.audioKey) {
    try {
      downloadUrl = await getSignedDownloadUrl(order.audioKey)
    } catch {
      downloadUrl = null
    }
  }

  let questionnaireHref: string | null = null
  if (order.status === 'paid_questionnaire') {
    const token = await signMagicToken({ sub: customerId, email })
    questionnaireHref = questionnairePath(order.id, token)
  }

  return (
    <article className={styles.orderCard}>
      <div className={styles.cover}>
        <div className={styles.coverFallback} />
        <span className={styles.cardNum}>{num}</span>
        <span className={`timecode ${styles.cardTime}`}>11:11</span>
      </div>

      <div className={styles.orderBody}>
        <h2 className={styles.orderTitle}>Персональная фабула</h2>

        <div className={styles.orderInfo}>
          <span className={styles.orderMeta}>{order.orderNumber} · {date}</span>
          <span className={styles.orderPrice}>{order.amount ?? 0} ₽</span>
        </div>

        <div className={styles.action}>
          {questionnaireHref ? (
            <Link href={questionnaireHref} className={`btn btn-primary ${styles.download}`}>
              Заполнить анкету
            </Link>
          ) : downloadUrl ? (
            <a href={downloadUrl} className={`btn btn-primary ${styles.download}`} download>
              Скачать
            </a>
          ) : (
            <span className={styles.noLink}>
              {order.status === 'ready' ? 'Файл появится здесь, когда будет загружен' : statusLabel}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
