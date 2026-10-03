/**
 * Геометрия шумового векторного поля — общая для двух фонов проекта.
 *
 * Поле частиц на главной (FlowField, canvas) и статический фон внутренних
 * страниц (FabulaAmbient, SVG) рисуют одну и ту же картину разными
 * средствами. Функция живёт здесь, а не внутри FlowField, ровно поэтому:
 * если у внутренних страниц будет свой собственный узор, фоновых систем на
 * сайте станет две, и они начнут спорить. Одна формула — одна система.
 *
 * Функция чистая и без зависимостей, поэтому её одинаково зовут и клиентский
 * компонент, и серверный.
 */

/**
 * Плавный органический угол поля в точке.
 *
 * Сумма синусов на несоизмеримых частотах: периоды не кратны друг другу,
 * поэтому рисунок не собирается в видимую сетку и не повторяется в кадре.
 *
 * @param x  координата в пикселях
 * @param y  координата в пикселях
 * @param t  время в кадрах; для статичной картины 0
 */
export function fieldAngle(x: number, y: number, t: number): number {
  const s = 0.0025
  return (
    Math.sin(x * s + t * 0.0007) * Math.PI +
    Math.cos(y * s + t * 0.0005) * Math.PI +
    Math.sin((x + y) * s * 0.6 + t * 0.0009) * Math.PI * 0.6 +
    Math.cos((x - y) * s * 0.4 + t * 0.0006) * Math.PI * 0.4
  )
}

/**
 * Прослеживает одну линию тока поля из заданной точки.
 *
 * Возвращает готовую строку для атрибута `d` у <path>.
 *
 * Сглаживание квадратичными кривыми через середины отрезков, а не ломаной по
 * точкам: при шаге 16px ломаная на тонкой линии даёт заметные изломы, а
 * кривых при этом вдвое меньше команд, чем было бы точек.
 */
export function traceFieldLine(
  startX: number,
  startY: number,
  steps: number,
  step: number,
  bounds: { width: number; height: number },
): string {
  const pts: Array<[number, number]> = []
  let x = startX
  let y = startY

  // Запас за края: линия должна уходить за кадр, а не обрываться на границе.
  const margin = Math.max(bounds.width, bounds.height) * 0.35

  for (let i = 0; i < steps; i++) {
    pts.push([x, y])
    const angle = fieldAngle(x, y, 0)
    x += Math.cos(angle) * step
    y += Math.sin(angle) * step
    if (
      x < -margin ||
      x > bounds.width + margin ||
      y < -margin ||
      y > bounds.height + margin
    ) {
      break
    }
  }

  if (pts.length < 3) return ''

  const r = (n: number) => Math.round(n * 10) / 10
  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [cx, cy] = pts[i]
    const [nx, ny] = pts[i + 1]
    d += `Q${r(cx)} ${r(cy)} ${r((cx + nx) / 2)} ${r((cy + ny) / 2)}`
  }
  return d
}
