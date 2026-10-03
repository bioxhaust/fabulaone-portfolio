'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/partner/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (r.ok) {
        router.push('/partner/cabinet')
      } else {
        const data = await r.json()
        setError(data.error ?? 'Ошибка входа')
      }
    } catch {
      setError('Сетевая ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.page} scene-wash`}>
      
      <div className={styles.card}>
        <header className={styles.head}>
          <p className="eyebrow">Партнёрам</p>
          <h1 className={styles.title}>Партнёрский кабинет</h1>
        </header>
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Пароль</label>
            <input id="password" type="password" className="input"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" required />
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={`btn btn-primary ${styles.submit}`}
            disabled={loading} aria-busy={loading}>
            {loading ? 'Входим…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
