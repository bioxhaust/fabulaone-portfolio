import { traceFieldLine } from '@/lib/field'
import styles from './FabulaAmbient.module.css'

/**
 * Фон внутренних страниц.
 *
 * Зачем он есть. До редизайна каждая внутренняя страница рисовала себе
 * атмосферу сама: свой `::before` с парой радиальных градиентов, у половины
 * ещё и с бесконечной анимацией «ауроры». Семь разных фонов в одном проекте —
 * это не одна узнаваемая система, а семь похожих. Здесь они сведены в один
 * компонент.
 *
 * Почему не поле частиц с главной. Полноценный canvas на странице оплаты или
 * в анкете — работа впустую: там читают текст и заполняют поля, а не
 * рассматривают фон. Поэтому линии те же самые, но посчитаны один раз и
 * лежат статическим SVG.
 *
 * Почему не Background Paths из реестра Kokonut UI, хотя приём оттуда.
 * В оригинале 37 путей, у каждого своя бесконечная анимация по y, а id
 * генерируются через Math.random() прямо в рендере. Идея хорошая, цена не
 * окупается: по ТЗ ни одной бесконечной анимации за пределами вьюпорта быть
 * не должно, а внутренние страницы должны быть дешевле главной, а не дороже.
 * Взята сама идея «фон из линий тока», геометрия — из нашей же fieldAngle(),
 * чтобы фон читался как тот же самый, что на главной.
 *
 * Стоимость: серверный компонент, ноль клиентского JS, ноль анимаций, ноль
 * фильтров. Пути считаются один раз при загрузке модуля.
 */

/* Система координат SVG. 1440×900 — размер десктопного экрана, на котором
   рисунок и подбирался; на других пропорциях кадр обрезается (slice), а не
   растягивается, поэтому линии нигде не «сплющиваются». */
const VIEW = { width: 1440, height: 900 }

/* Шесть линий, а не двадцать: фон должен читаться как намёк на движение, а
   не как графика. Точки старта разнесены по диагонали — так линии
   расходятся веером и ни одна не повторяет соседнюю.
   opacity подобрана так, чтобы самая яркая линия не спорила с вторичным
   текстом (--color-muted) поверх неё. */
const SEEDS: Array<{ x: number; y: number; opacity: number; width: number }> = [
  { x: -120, y: 120, opacity: 0.20, width: 1.6 },
  { x: 90, y: 480, opacity: 0.15, width: 1.3 },
  { x: 360, y: -60, opacity: 0.17, width: 1.4 },
  { x: 700, y: 620, opacity: 0.12, width: 1.1 },
  { x: 1020, y: 180, opacity: 0.16, width: 1.3 },
  { x: 1320, y: 700, opacity: 0.11, width: 1.0 },
]

/* Шаг 16px и 120 шагов — линия пересекает кадр целиком, а строка `d`
   остаётся около 700 байт. Мельче шаг даёт тот же рисунок и втрое больше
   разметки в HTML каждой страницы. */
const LINES = SEEDS.map((seed) => ({
  ...seed,
  d: traceFieldLine(seed.x, seed.y, 120, 16, VIEW),
})).filter((line) => line.d !== '')

export default function FabulaAmbient() {
  return (
    <div className={styles.host} aria-hidden>
      <svg
        className={styles.lines}
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      >
        <defs>
          <linearGradient id="fabulaAmbientStroke" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cyan)" />
            <stop offset="55%" stopColor="var(--color-accent)" />
            <stop offset="100%" stopColor="var(--color-accent-deep)" />
          </linearGradient>
        </defs>

        {LINES.map((line) => (
          <path
            d={line.d}
            key={line.d}
            opacity={line.opacity}
            stroke="url(#fabulaAmbientStroke)"
            strokeLinecap="round"
            strokeWidth={line.width}
          />
        ))}
      </svg>

      <div className={styles.glow} />
      <div className={styles.grain} />
    </div>
  )
}
