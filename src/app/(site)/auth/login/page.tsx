'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'

/* Чтение ?error= вынесено в отдельный компонент под Suspense:
   useSearchParams уводит поддерево в клиентский рендер, и без границы
   next build падает на пререндере /auth/login. Так под CSR уходит только
   сообщение, а карточка с формой по-прежнему приходит с сервера. */
function LinkNotice() {
  const params = useSearchParams()
  const error = params.get('error')

  if (error === 'expired') {
    return (
      <p className={styles.notice} role="alert">
        Ссылка устарела. Запросите новую.
      </p>
    )
  }
  if (error === 'missing_token') {
    return (
      <p className={styles.notice} role="alert">
        Ссылка некорректна. Запросите новую.
      </p>
    )
  }
  return null
}

export default function AuthLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr('Введите корректный email')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setErr(data?.error ?? 'Не удалось отправить письмо. Попробуйте ещё раз.')
        return
      }
      setSent(true)
    } catch {
      setErr('Сетевая ошибка. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.page} scene-wash`}>
      

      <div className={styles.card}>
        <header className={styles.head}>
          <p className="eyebrow">Личный кабинет</p>
          <h1 className={styles.title}>Мои покупки</h1>
        </header>

        <Suspense fallback={null}>
          <LinkNotice />
        </Suspense>

        {sent ? (
          <div className={styles.sent} role="status">
            <span className={styles.sentIcon} aria-hidden>✉</span>
            <p className={styles.sentText}>Мы отправили ссылку на <strong>{email}</strong>.</p>
            <p className={styles.sentSub}>
              Перейдите по ней, чтобы войти в личный кабинет. Ссылка действует 24 часа.
              Если письма нет во «Входящих» — проверьте папки «Рассылки» и «Спам».
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            <p className={styles.desc}>
              Введите email, который вы указывали при покупке. Мы пришлём одноразовую
              ссылку для входа — без пароля.
            </p>

            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email" type="email"
                className={`input${err ? ' input-error' : ''}`}
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" inputMode="email" required
                aria-describedby={err ? 'email-err' : undefined}
              />
              {err && <p id="email-err" className="error-text" role="alert">{err}</p>}
            </div>

            <button type="submit" className={`btn btn-primary ${styles.submit}`}
              disabled={loading} aria-busy={loading}>
              {loading ? 'Отправка…' : 'Получить ссылку'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
