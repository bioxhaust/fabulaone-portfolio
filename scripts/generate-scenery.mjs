/**
 * Генератор атмосферных пейзажей → public/scenery/*.svg
 *
 * Зачем: бриф Дмитрия требует «крупные атмосферные изображения природы»,
 * а реальные фото приходят от клиента. Эти файлы — не заглушки-серые-квадраты,
 * а полноценный визуальный слой: слоистые горные гряды в тумане, воздушная
 * перспектива (дальние гряды светлее и мутнее), низкое золотое свечение
 * у горизонта. Ровно эстетика THE SANCTUARY, которую клиент назвал главным
 * ориентиром. Когда фото загрузят в CMS — они просто перекроют эти файлы.
 *
 * Цвета считаются из тех же OKLCH-значений, что и токены в globals.css,
 * поэтому пейзаж не «чужой» на странице. В SVG нельзя сослаться на CSS-
 * переменные (файл грузится как <img>), поэтому переводим в sRGB здесь.
 *
 * Запуск: node scripts/generate-scenery.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/scenery')

/* ── OKLCH → sRGB ──────────────────────────────────────────────────
   Тот же путь, что делает браузер: OKLCH → OKLab → LMS → linear sRGB
   → гамма-кодирование. Нужен, чтобы пейзаж жил в одной палитре с сайтом. */
function oklch(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const rgb = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]

  const hex = rgb
    .map((v) => {
      const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
      const byte = Math.round(Math.min(1, Math.max(0, encoded)) * 255)
      return byte.toString(16).padStart(2, '0')
    })
    .join('')

  return `#${hex}`
}

/* ── Детерминированный шум ─────────────────────────────────────────
   Сумма синусов на несоизмеримых частотах: рисунок гряды получается
   нерегулярным, но воспроизводимым — файл не меняется между запусками. */
function ridgeAt(x, seed) {
  return (
    0.5 * Math.sin(x * 1.9 + seed * 2.7) +
    0.3 * Math.sin(x * 4.3 + seed * 1.3) +
    0.15 * Math.sin(x * 9.1 + seed * 5.1) +
    0.08 * Math.sin(x * 17.7 + seed * 0.7)
  )
}

/** Гладкая кривая через точки: Катмулл-Ром, переведённый в кубические Безье. */
function smoothPath(points) {
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d +=
      ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)},` +
      ` ${c2x.toFixed(1)} ${c2y.toFixed(1)},` +
      ` ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

/**
 * Собирает один пейзаж.
 *
 * @param w,h        размеры холста
 * @param seed       вариация рисунка гряд
 * @param hue        оттенок сцены в OKLCH (60 — тёплый, 200 — холодный туман)
 * @param layers     число планов; больше — глубже воздушная перспектива
 * @param horizon    доля высоты, на которой стоит линия горизонта
 * @param sunX,sunY  положение свечения (доли от ширины/высоты)
 */
function scene({ w, h, seed, hue, layers, horizon, sunX, sunY }) {
  const horizonY = h * horizon
  const parts = []

  /* Небо: от глубокой тьмы наверху к чуть более светлому у горизонта */
  parts.push(`
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="${oklch(0.105, 0.008, hue)}"/>
    <stop offset="55%"  stop-color="${oklch(0.16, 0.012, hue)}"/>
    <stop offset="100%" stop-color="${oklch(0.26, 0.026, hue + 14)}"/>
  </linearGradient>`)

  /* Низкое солнце: главный источник золота в кадре */
  parts.push(`
  <radialGradient id="sun" cx="50%" cy="50%" r="50%">
    <stop offset="0%"   stop-color="${oklch(0.86, 0.09, 88)}" stop-opacity="0.5"/>
    <stop offset="35%"  stop-color="${oklch(0.7, 0.1, 82)}"  stop-opacity="0.22"/>
    <stop offset="100%" stop-color="${oklch(0.6, 0.09, 78)}" stop-opacity="0"/>
  </radialGradient>`)

  const body = [
    `<rect width="${w}" height="${h}" fill="url(#sky)"/>`,
    `<ellipse cx="${(w * sunX).toFixed(0)}" cy="${(h * sunY).toFixed(0)}" rx="${(w * 0.55).toFixed(0)}" ry="${(h * 0.42).toFixed(0)}" fill="url(#sun)"/>`,
  ]

  for (let k = 0; k < layers; k++) {
    const t = k / (layers - 1)          // 0 — самая дальняя гряда, 1 — ближняя

    /* Воздушная перспектива: дальнее светлее (рассеянный свет в дымке)
       и менее контрастно; ближнее уходит почти в чёрный силуэт. */
    const L = 0.40 - t * 0.28
    const C = 0.030 - t * 0.020
    const fill = oklch(Math.max(0.1, L), Math.max(0.006, C), hue + (1 - t) * 18)

    const baseY = horizonY + t * (h - horizonY) * 0.72
    const amp = (h * 0.055) * (0.6 + t * 1.1)
    const step = w / 40

    const pts = []
    for (let x = -step; x <= w + step; x += step) {
      const n = ridgeAt((x / w) * 3.1, seed + k * 3.7)
      pts.push([x, baseY - amp * n])
    }

    const d = `${smoothPath(pts)} L ${w + step} ${h} L ${-step} ${h} Z`
    body.push(`<path d="${d}" fill="${fill}"/>`)

    /* Туман в долине под каждой грядой — то, что делает картинку «дышащей» */
    if (k < layers - 1) {
      const fogTop = baseY - amp * 0.4
      const fogId = `fog${k}`
      parts.push(`
  <linearGradient id="${fogId}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="${oklch(0.72, 0.02, hue + 10)}" stop-opacity="0"/>
    <stop offset="45%"  stop-color="${oklch(0.72, 0.02, hue + 10)}" stop-opacity="${(0.16 - t * 0.09).toFixed(3)}"/>
    <stop offset="100%" stop-color="${oklch(0.72, 0.02, hue + 10)}" stop-opacity="0"/>
  </linearGradient>`)
      body.push(
        `<rect x="0" y="${fogTop.toFixed(0)}" width="${w}" height="${(h * 0.16).toFixed(0)}" fill="url(#${fogId})"/>`,
      )
    }
  }

  /* Виньетка снизу: под ней ляжет текст, ему нужен спокойный фон */
  parts.push(`
  <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="${oklch(0.105, 0.008, 60)}" stop-opacity="0"/>
    <stop offset="100%" stop-color="${oklch(0.105, 0.008, 60)}" stop-opacity="0.75"/>
  </linearGradient>`)
  body.push(
    `<rect x="0" y="${(h * 0.55).toFixed(0)}" width="${w}" height="${(h * 0.45).toFixed(0)}" fill="url(#vignette)"/>`,
  )

  /* Зерно: без него большие градиенты полосят на дешёвых матрицах */
  body.push(
    `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/></filter>`,
    `<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05" style="mix-blend-mode:overlay"/>`,
  )

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">
<defs>${parts.join('')}
</defs>
${body.join('\n')}
</svg>
`
}

/* ── Что генерируем ────────────────────────────────────────────────
   Герой — широкий кадр. Обложки — квадраты 1:1 под сетку каталога,
   у каждой свой оттенок и рисунок, чтобы шесть фабул читались как шесть
   разных мест, а не как один шаблон. */
const FILES = [
  ['hero.svg',    { w: 1920, h: 1080, seed: 1.0, hue: 62,  layers: 6, horizon: 0.46, sunX: 0.62, sunY: 0.5 }],
  ['cover-1.svg', { w: 1200, h: 1200, seed: 2.4, hue: 58,  layers: 5, horizon: 0.5,  sunX: 0.3,  sunY: 0.52 }],
  ['cover-2.svg', { w: 1200, h: 1200, seed: 5.1, hue: 88,  layers: 5, horizon: 0.44, sunX: 0.7,  sunY: 0.46 }],
  ['cover-3.svg', { w: 1200, h: 1200, seed: 7.8, hue: 34,  layers: 6, horizon: 0.54, sunX: 0.5,  sunY: 0.56 }],
  ['cover-4.svg', { w: 1200, h: 1200, seed: 11.3, hue: 200, layers: 5, horizon: 0.48, sunX: 0.22, sunY: 0.44 }],
  ['cover-5.svg', { w: 1200, h: 1200, seed: 14.6, hue: 140, layers: 6, horizon: 0.52, sunX: 0.78, sunY: 0.5 }],
  ['cover-6.svg', { w: 1200, h: 1200, seed: 18.2, hue: 20,  layers: 5, horizon: 0.42, sunX: 0.44, sunY: 0.4 }],
]

mkdirSync(OUT, { recursive: true })

for (const [name, opts] of FILES) {
  const svg = scene(opts)
  writeFileSync(resolve(OUT, name), svg, 'utf8')
  console.log(`${name.padEnd(14)} ${(svg.length / 1024).toFixed(1)} KB`)
}

console.log(`\n→ ${OUT}`)
