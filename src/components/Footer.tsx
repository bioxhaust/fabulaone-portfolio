import Link from 'next/link'
import styles from './Footer.module.css'

const LEGAL = [
  { href: '/pages/offer', label: 'Оферта' },
  { href: '/privacy', label: 'Политика обработки персональных данных' },
  { href: '/consent', label: 'Согласие' },
  { href: '/pages/payment-refund', label: 'Оплата и возврат' },
  { href: '/pages/contacts', label: 'Контакты' },
  { href: '/partner/login', label: 'Партнёрам' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={`container ${styles.inner}`}>
        <p className={styles.mark}>FABULA ONE</p>
        <p className={styles.line}>Звук глубже слов</p>

        <nav className={styles.links} aria-label="Юридическая информация">
          {LEGAL.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className={styles.baseline}>
          <p className={styles.copy}>© {year} FABULA ONE. Все права защищены.</p>
          <span className={styles.time}>11:11</span>
        </div>
      </div>
    </footer>
  )
}
