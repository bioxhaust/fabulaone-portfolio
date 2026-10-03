'use client'

/**
 * Поле частиц в шумовом векторном поле — фоновый слой главного экрана.
 *
 * Движок (шумовая функция + логика частиц со следами) взят из Kokonut UI
 * «Flow Field» © @dorian_baffier, MIT — https://kokonutui.com
 *
 * Что изменено под FABULA ONE:
 *  • Tailwind и `cn` убраны — проект на CSS Modules и своих OKLCH-токенах;
 *  • цвета сведены к палитре бренда (циан → фиолет), а не к темам библиотеки;
 *  • размер берётся у контейнера через ResizeObserver, а не у window: поле
 *    живёт внутри секции героя, а не на весь экран;
 *  • плотность зависит от площади и DPR — по ТЗ приоритет у мобильных,
 *    и фиксированные 1200 частиц на слабом телефоне роняют кадры;
 *  • при уходе секции из вида цикл останавливается (IntersectionObserver):
 *    иначе requestAnimationFrame продолжает жечь батарею на всей странице;
 *  • prefers-reduced-motion: поле досчитывается разом и замирает — картинка
 *    со следами остаётся, движения нет.
 *  • угол поля вынесен в src/lib/field.ts: ту же формулу рисует статический
 *    SVG внутренних страниц, иначе на сайте появились бы две фоновые системы.
 */

import { useEffect, useRef } from 'react'
import { fieldAngle } from '@/lib/field'
import styles from './FlowField.module.css'

interface Particle {
  x: number
  y: number
  speed: number
  hue: number
  life: number
  maxLife: number
}

/* Фон в rgb — тем же числом, что --color-surface-0 (#050815).
   Canvas не понимает CSS-переменные, поэтому значение дублируется здесь;
   при смене токена править оба места. */
const BG = '5, 8, 21'

/* Диапазон оттенков в HSL: 190 — ледяной циан, 275 — фиолет.
   Это HSL-эквивалент нашей пары --color-cyan / --color-accent. */
const HUE_START = 190
const HUE_RANGE = 85

const SATURATION = 88
const LIGHTNESS = 62

/* Насколько быстро гаснет предыдущий кадр. Меньше — длиннее следы. */
const TRAIL_ALPHA = 0.055

/* Частиц на миллион пикселей плюс жёсткие границы: без них на телефоне
   поле вырождается в редкие точки, а на большом мониторе счёт улетает
   в тысячи. */
const PARTICLES_PER_MPX = 420
const MIN_PARTICLES = 240
const MAX_PARTICLES = 640

/* Группировка цвета. Раньше на каждую частицу собиралась своя строка
   `hsla(...)` и присваивалась в fillStyle — то есть canvas парсил цвет
   заново 1000 раз за кадр, плюс столько же временных строк на сборщик
   мусора. Это давало 39% загрузки CPU в полном покое.

   Теперь оттенок и прозрачность квантуются в корзины, строка цвета для
   каждой корзины считается один раз при старте, а частицы корзины
   рисуются одним проходом. Вместо ~1000 присваиваний fillStyle — максимум
   50, и ни одной новой строки за кадр.

   10 корзин на 85° диапазона — это 8.5° на корзину, глазом не отличить. */
const HUE_BUCKETS = 10
const ALPHA_BUCKETS = 5

export default function FlowField() {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches

    // DPR = 1 намеренно, без учёта devicePixelRatio. Это мягкое фоновое
    // свечение из точек: на Retina разница не читается, а работы с DPR 2
    // ровно в четыре раза больше по пикселям — и заливка кадра, и рисование.
    const dpr = 1

    // Цвета корзин считаются один раз. Индекс: hue * ALPHA_BUCKETS + alpha.
    const bucketColors: string[] = []
    for (let h = 0; h < HUE_BUCKETS; h++) {
      const hue = HUE_START + (HUE_RANGE * (h + 0.5)) / HUE_BUCKETS
      for (let a = 0; a < ALPHA_BUCKETS; a++) {
        const alpha = ((a + 1) / ALPHA_BUCKETS) * 0.9
        bucketColors.push(
          `hsla(${hue.toFixed(1)}, ${SATURATION}%, ${LIGHTNESS}%, ${alpha.toFixed(3)})`,
        )
      }
    }
    const BUCKETS = bucketColors.length

    let width = 0
    let height = 0
    let time = 0
    let animId = 0
    let running = false
    let particles: Particle[] = []

    const spawn = (): Particle => {
      const maxLife = 200 + Math.floor(Math.random() * 300)
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 1.1 + Math.random() * 1.8,
        hue: HUE_START + Math.random() * HUE_RANGE,
        life: Math.floor(Math.random() * maxLife),
        maxLife,
      }
    }

    // Координаты частиц, разложенные по цветовым корзинам. Массивы
    // выделяются один раз на ресайзе: создавать их каждый кадр означало бы
    // отдавать сборщику мусора по 50 массивов 60 раз в секунду.
    let bucketXY: Float32Array[] = []
    const bucketCount = new Int32Array(BUCKETS)

    /** Один шаг симуляции. Рисование отделено от планирования кадра, чтобы
        этой же функцией можно было «досчитать» статичный кадр. */
    const step = () => {
      time++

      ctx.fillStyle = `rgba(${BG}, ${TRAIL_ALPHA})`
      ctx.fillRect(0, 0, width, height)

      bucketCount.fill(0)

      for (const p of particles) {
        const angle = fieldAngle(p.x, p.y, time)

        p.x += Math.cos(angle) * p.speed
        p.y += Math.sin(angle) * p.speed
        p.life++

        if (p.life > p.maxLife) {
          p.x = Math.random() * width
          p.y = Math.random() * height
          p.life = 0
          p.hue = HUE_START + Math.random() * HUE_RANGE
          continue
        }

        if (p.x < 0) p.x += width
        else if (p.x > width) p.x -= width
        if (p.y < 0) p.y += height
        else if (p.y > height) p.y -= height

        const progress = p.life / p.maxLife
        const alpha =
          Math.min(progress * 8, 1) * Math.min((1 - progress) * 6, 1)
        if (alpha <= 0) continue

        // Оттенок слегка ведёт за направлением поля — иначе частицы
        // выглядят как одноцветная крупа.
        const hueShift = (angle / (Math.PI * 2)) * 60
        const hueNorm =
          ((p.hue + hueShift - HUE_START) % HUE_RANGE + HUE_RANGE) % HUE_RANGE

        const hb = Math.min(
          HUE_BUCKETS - 1,
          ((hueNorm / HUE_RANGE) * HUE_BUCKETS) | 0,
        )
        const ab = Math.min(ALPHA_BUCKETS - 1, (alpha * ALPHA_BUCKETS) | 0)
        const bucket = hb * ALPHA_BUCKETS + ab

        const slot = bucketCount[bucket]++
        const arr = bucketXY[bucket]
        arr[slot * 2] = p.x
        arr[slot * 2 + 1] = p.y
      }

      // Один fillStyle и один проход на корзину. fillRect вместо arc:
      // для точки 2×2 разницы на глаз нет, а дуга строит путь и считает
      // сглаживание окружности — на сотнях частиц это заметная разница.
      for (let b = 0; b < BUCKETS; b++) {
        const n = bucketCount[b]
        if (n === 0) continue
        ctx.fillStyle = bucketColors[b]
        const arr = bucketXY[b]
        for (let i = 0; i < n; i++) {
          ctx.fillRect(arr[i * 2] - 1, arr[i * 2 + 1] - 1, 2, 2)
        }
      }
    }

    const loop = () => {
      step()
      animId = requestAnimationFrame(loop)
    }

    // Свечения (.glow::before/::after) анимируются в CSS и раньше тикали
    // всегда — даже когда герой давно уехал вверх и рисовать было нечего.
    // Цикл canvas в этот момент уже останавливался, а композитор продолжал
    // двигать два слоя по 1000px. Помечаем секцию, CSS ставит паузу.
    // Именно paused, а не none: анимация замирает на текущем кадре, поэтому
    // при возврате свечение не прыгает в начальное положение.
    const markRunning = (on: boolean) => {
      host.dataset.running = on ? '1' : '0'
    }

    const start = () => {
      markRunning(true)
      if (running || reduceMotion) return
      running = true
      loop()
    }

    const stop = () => {
      markRunning(false)
      running = false
      cancelAnimationFrame(animId)
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      // setTransform, а не scale: scale умножается на предыдущий и после
      // второго ресайза поле рисуется в четверть кадра.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      ctx.fillStyle = `rgb(${BG})`
      ctx.fillRect(0, 0, width, height)

      const count = Math.max(
        MIN_PARTICLES,
        Math.min(
          MAX_PARTICLES,
          Math.round(((width * height) / 1_000_000) * PARTICLES_PER_MPX),
        ),
      )
      particles = Array.from({ length: count }, spawn)

      // По массиву на корзину, каждый вместимостью на все частицы: в худшем
      // случае весь кадр попадает в одну корзину, и переаллокация посреди
      // отрисовки была бы дороже, чем разом занятая память (~50×640×2×4 ≈ 320 КБ).
      bucketXY = Array.from({ length: BUCKETS }, () => new Float32Array(count * 2))

      if (reduceMotion) {
        // Движение выключено — досчитываем следы разом и замираем.
        for (let i = 0; i < 260; i++) step()
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    // Герой уехал за пределы экрана — цикл незачем крутить.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    )
    io.observe(host)

    const onVisibility = () =>
      document.hidden ? stop() : start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div ref={hostRef} className={styles.host} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.glow} />
      <div className={styles.vignette} />
      <div className={styles.grain} />
    </div>
  )
}
