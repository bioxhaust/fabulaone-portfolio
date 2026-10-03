'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import styles from './Header.module.css'

const NAV = [
  { href: '/#catalog', label: 'Каталог', match: (p: string) => p === '/' },
  {
    href: '/personal',
    label: 'Персональная',
    match: (p: string) => p === '/personal' || p.startsWith('/personal/'),
  },
]

const CABINET = {
  href: '/cabinet',
  label: 'Личный кабинет',
  match: (p: string) => p.startsWith('/cabinet'),
}

function WaveMark() {
  return (
    <svg
      aria-hidden
      className={styles.mark}
      fill="none"
      viewBox="0 0 28 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 6.5c2.4-3.6 4.8-3.6 7.2 0s4.8 3.6 7.2 0 4.8-3.6 7.2 0 3.6 2.4 4.4 2.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export default function Header({ loggedIn = false }: { loggedIn?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const drawerId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)

  // Закрываем меню при смене маршрута — иначе после перехода оно висит.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Блок прокрутки фона + фокус-ловушка + Esc, пока drawer открыт.
  useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusables = panel
      ? panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
      : null
    focusables?.[0]?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      // Возврат фокуса на кнопку-бургер после закрытия.
      burgerRef.current?.focus()
    }
  }, [open])

  const nav = loggedIn ? [...NAV, CABINET] : NAV
  const loginActive = pathname.startsWith('/auth')

  return (
    <header className={loggedIn ? `${styles.header} ${styles.session}` : styles.header} role="banner">
      <div className={styles.shell}>
        <div className={styles.bar}>
          <Link href="/" className={styles.logo} aria-label="FABULA ONE — на главную">
            <WaveMark />
            <span className={styles.logoText}>
              <span className={styles.logoName}>FABULA ONE</span>
              <span className={styles.logoTag}>звук глубже слов</span>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Основная навигация">
            {nav.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? styles.active : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className={styles.actions}>
            {loggedIn ? null : (
              <Link
                href="/auth/login"
                className={styles.loginPill}
                aria-current={loginActive ? 'page' : undefined}
              >
                Войти
              </Link>
            )}

            <button
              ref={burgerRef}
              type="button"
              className={styles.burger}
              aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={open}
              aria-controls={drawerId}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              ref={panelRef}
              id={drawerId}
              className={styles.drawer}
              role="dialog"
              aria-modal="true"
              aria-label="Меню"
              initial={{ opacity: 0, y: reduce ? 0 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -12 }}
              transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <nav className={styles.drawerNav} aria-label="Меню">
                {nav.map((item) => {
                  const active = item.match(pathname)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? styles.drawerActive : undefined}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  )
                })}
                {loggedIn ? null : (
                  <Link
                    href="/auth/login"
                    className={styles.drawerLogin}
                    aria-current={loginActive ? 'page' : undefined}
                  >
                    Войти
                  </Link>
                )}
              </nav>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
