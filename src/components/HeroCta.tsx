'use client'

import { type MouseEvent, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Play, X } from 'lucide-react'
import styles from './HeroCta.module.css'

function scrollToCatalog(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
  const catalog = document.getElementById('catalog')
  if (!catalog) return
  event.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  catalog.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

export default function HeroCta() {
  // Ролика ещё нет. Кнопка не мёртвая: открывает честную заглушку с
  // объяснением и уводит на выбор набора. Заменить на плеер, когда появится
  // видео (см. отчёт о недостающем ассете).
  const [videoOpen, setVideoOpen] = useState(false)
  const reduce = useReducedMotion()
  const dialogId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!videoOpen) return

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
        setVideoOpen(false)
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
      triggerRef.current?.focus()
    }
  }, [videoOpen])

  return (
    <>
      <div className={styles.row}>
        <Link className={styles.primary} href="/#catalog" onClick={scrollToCatalog}>
          Выбрать набор
          <ArrowRight aria-hidden size={18} strokeWidth={2} />
        </Link>

        <button
          ref={triggerRef}
          type="button"
          className={styles.play}
          aria-haspopup="dialog"
          aria-expanded={videoOpen}
          aria-controls={dialogId}
          onClick={() => setVideoOpen(true)}
        >
          <span className={styles.playIcon} aria-hidden>
            <Play size={15} strokeWidth={2} fill="currentColor" />
          </span>
          Посмотреть видео · 1 минута
        </button>
      </div>

      <AnimatePresence>
        {videoOpen ? (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={() => setVideoOpen(false)}
          >
            <motion.div
              ref={panelRef}
              id={dialogId}
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${dialogId}-title`}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.98, y: reduce ? 0 : 8 }}
              transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Закрыть"
                onClick={() => setVideoOpen(false)}
              >
                <X size={18} aria-hidden />
              </button>

              <div className={styles.modalArt} aria-hidden>
                <Play size={26} strokeWidth={1.75} fill="currentColor" />
              </div>

              <h2 id={`${dialogId}-title`} className={styles.modalTitle}>
                Видео готовится
              </h2>
              <p className={styles.modalText}>
                Минутный ролик о FABULA ONE скоро появится здесь. А пока —
                выберите набор и начните с первого прослушивания.
              </p>

              <button type="button" className={styles.modalCta} onClick={scrollToCatalog}>
                Выбрать набор
                <ArrowRight aria-hidden size={18} strokeWidth={2} />
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
