'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Reveal from '@/components/Reveal'
import { partnerReferralUrl } from '@/lib/site-url'
import styles from './page.module.css'

type Stats = {
  name: string
  email: string
  refCode: string
  referralLink?: string
  commissionRate: number
  balance: number
  totalEarned: number
  totalPaid: number
  totalClicks: number
  totalOrders: number
  totalSales: number
  earnings: {
    id: string
    amount: number
    rate: number
    status: string
    createdAt: string
    orderNumber: string | null
  }[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  earned: 'Начислено',
  paid: 'Выплачено',
  cancelled: 'Отменено',
}

export default function PartnerCabinetPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/partner/stats')
      .then(r => {
        if (r.status === 401) { router.replace('/partner/login'); return null }
        if (!r.ok) throw new Error('Ошибка загрузки')
        return r.json()
      })
      .then(d => d && setStats(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  async function logout() {
    await fetch('/api/partner/auth', { method: 'DELETE' })
    router.replace('/partner/login')
  }

  if (loading) return <div className={styles.loading}><div className={styles.spinner} role="status" aria-label="Загрузка" /></div>
  if (error) return <div className={styles.errorPage}><p>{error}</p></div>
  if (!stats) return null

  const refLink = stats.referralLink || partnerReferralUrl(stats.refCode)

  return (
    <div className={`${styles.page} scene-wash`}>
      

      <div className="container">
        <Reveal>
          <header className={styles.headerRow}>
            <div>
              <p className={`eyebrow ${styles.headerEyebrow}`}>Партнёрская программа</p>
              <h1 className={styles.heading}>Партнёрский кабинет</h1>
              <p className={styles.sub}>{stats.name} · {stats.email}</p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Выйти
            </button>
          </header>
        </Reveal>

        {/* Stats grid */}
        <Reveal>
          <div className={styles.statsGrid}>
            <StatCard label="Баланс" value={`${stats.balance} ₽`} highlight />
            <StatCard label="Всего заработано" value={`${stats.totalEarned} ₽`} />
            <StatCard label="Выплачено" value={`${stats.totalPaid} ₽`} />
            <StatCard label="Клики" value={String(stats.totalClicks)} />
            <StatCard label="Заказов" value={String(stats.totalOrders)} />
            <StatCard label="Комиссия" value={`${stats.commissionRate}%`} />
          </div>
        </Reveal>

        <div className={styles.refBlock}>
          <p className={`eyebrow ${styles.refLabel}`}>Ваша партнёрская ссылка</p>
          <div className={styles.refRow}>
            <a href={refLink} className={styles.refUrl}>{refLink}</a>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigator.clipboard?.writeText(refLink)}
            >
              Скопировать
            </button>
          </div>
          <p className={styles.refHint}>Эту ссылку можно передавать в рекламу. Переход сохраняется 30 дней.</p>
        </div>

        {/* Earnings table */}
        <Reveal>
          <section className={styles.tableSection}>
            <header className={styles.tableHead}>
              <h2 className={styles.tableTitle}>История начислений</h2>
            </header>
            {stats.earnings.length === 0 ? (
              <p className={styles.empty}>Начислений пока нет</p>
            ) : (
              /* data-native-scroll — инерционная прокрутка страницы
                 не перехватывает колесо внутри таблицы */
              <div
                className={styles.tableWrap}
                data-native-scroll
                role="region"
                aria-label="История начислений"
                tabIndex={0}
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Заказ</th>
                      <th scope="col">Дата</th>
                      <th scope="col" className={styles.num}>Сумма</th>
                      <th scope="col" className={styles.num}>Ставка</th>
                      <th scope="col">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.earnings.map(e => (
                      <tr key={e.id}>
                        <td>{e.orderNumber ?? '—'}</td>
                        <td>{new Date(e.createdAt).toLocaleDateString('ru-RU')}</td>
                        <td className={styles.num}>{e.amount} ₽</td>
                        <td className={styles.num}>{e.rate}%</td>
                        <td>
                          <span className={`${styles.badge} ${styles[`badge_${e.status}`]}`}>
                            {STATUS_LABELS[e.status] ?? e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`${styles.statCard}${highlight ? ` ${styles.statHighlight}` : ''}`}>
      <p className={`eyebrow ${styles.statLabel}`}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </div>
  )
}
