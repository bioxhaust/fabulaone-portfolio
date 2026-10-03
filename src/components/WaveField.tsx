'use client'

import { useEffect, useRef } from 'react'
import styles from './WaveField.module.css'

/* 44, а не 72: волна теперь идёт поверх фотографии и должна её поддерживать,
   а не спорить с ней. Клиент просил «минимум визуального шума». */
const BAR_COUNT = 44

/**
 * Детерминированный профиль волны.
 *
 * Важно: без Math.random — иначе сервер и клиент нарисуют разные высоты
 * и React упадёт с ошибкой гидратации. Форма собирается из огибающей
 * (громче в центре) и «детализации» на несоизмеримых частотах, чтобы
 * рисунок читался как спектр, а не как ровная дуга.
 */
/* Дышит не каждая полоса, а каждая четвёртая — одиннадцать из сорока четырёх.
   Замер на /personal, 1440×900, CPU ×4: с анимацией на всех сорока четырёх
   загрузка CPU в покое 7%, пересчёт стилей 0.10s за 3s; если анимацию снять
   совсем — 3% и 0.02s. Причина не в самих кадрах: transform и opacity
   композитор умеет считать сам, но сорок четыре крошечных слоя он
   промотировать отказывается и уводит анимацию обратно в главный поток, где
   она каждый кадр пересчитывает стили всей волны.
   Одиннадцать полос слой получают, и рисунок от этого не беднеет: соседние
   полосы и так стоят на разных высотах, поэтому «живыми» читаются все. */
const BREATHE_EVERY = 4

const BARS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1)
  const envelope = Math.pow(Math.sin(Math.PI * t), 0.75)
  const detail =
    0.42 +
    0.34 * Math.abs(Math.sin(i * 1.7)) +
    0.24 * Math.abs(Math.cos(i * 0.53))
  return {
    height: Math.max(0.05, envelope * detail),
    delay: (i % 13) * 120 + (i % 5) * 45,
    breathes: i % BREATHE_EVERY === 1,
  }
})

/**
 * Слоистое звуковое поле — сигнатурный визуал главного экрана.
 *
 * Три плана двигаются с разной скоростью при прокрутке, давая глубину:
 *   аврора (дальний, медленный) → волна (средний) → горизонт (ближний).
 * Прогресс прокрутки пишется в CSS-переменную --p, вся геометрия
 * считается в CSS — JS за кадр делает одну запись свойства.
 */
export default function WaveField() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let queued = false

    const update = () => {
      queued = false
      const h = window.innerHeight || 1
      // 0 — экран не тронут, 1 — герой полностью ушёл вверх
      const p = Math.min(1, Math.max(0, window.scrollY / h))
      el.style.setProperty('--p', p.toFixed(4))
    }

    const onScroll = () => {
      if (queued) return
      queued = true
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div ref={ref} className={styles.field} aria-hidden>
      {/* Дальний план — свечение */}
      <div className={styles.aurora}>
        <span className={styles.blobA} />
        <span className={styles.blobB} />
      </div>

      {/* Средний план — волна */}
      <div className={styles.wave}>
        {BARS.map((bar, i) => (
          <span
            key={i}
            className={bar.breathes ? `${styles.bar} ${styles.breathing}` : styles.bar}
            style={
              {
                '--h': bar.height,
                '--d': `${bar.delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Ближний план — линия горизонта */}
      <div className={styles.horizon} />

      {/* Зерно поверх всего — убирает бандинг на градиентах */}
      <div className={styles.grain} />
    </div>
  )
}
