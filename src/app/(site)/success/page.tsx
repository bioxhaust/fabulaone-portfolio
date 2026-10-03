import Link from 'next/link'
import { Suspense } from 'react'
import PaymentSync from '@/components/PaymentSync'
import { isPersonalReturnFlag } from '@/lib/site-url'
import styles from './page.module.css'

export const metadata = { title: 'Оплата прошла успешно' }

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ personal?: string; type?: string }>
}) {
  const params = await searchParams
  const personal = isPersonalReturnFlag(params.personal, params.type)

  return (
    <section className={`${styles.page} scene-wash`}>
      <div className={`container ${styles.inner}`}>
        <span className={styles.badge} aria-hidden>
          <svg
            className={styles.check}
            viewBox="0 0 32 32"
            width="30"
            height="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 16.6 L13.4 23 L25 9.6" />
          </svg>
        </span>

        <p className={`eyebrow ${styles.eyebrow}`}>Спасибо</p>

        <h1 className={styles.title}>
          <span>Оплата</span>
          <span>прошла!</span>
        </h1>

        <p className={styles.text}>
          {personal
            ? 'Оплата прошла. Сейчас откроется анкета — заполните её, чтобы мы собрали вашу персональную фабулу. Ссылка на анкету также придёт на почту.'
            : 'Ссылка на скачивание и доступ в личный кабинет отправлены на ваш email. Файл также доступен в разделе «Мои покупки».'}
        </p>

        <Suspense fallback={null}>
          <PaymentSync />
        </Suspense>

        <div className={styles.actions}>
          <Link href="/cabinet" className="btn btn-primary btn-lg">
            Мои покупки
          </Link>
          <Link href="/" className="btn btn-ghost">
            На главную
          </Link>
        </div>

        <span className={`timecode ${styles.timecode}`}>11:11</span>
      </div>
    </section>
  )
}
