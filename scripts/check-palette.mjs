/**
 * Проверка тёмной палитры расчётом, а не на глаз.
 *
 * Светлота в OKLCH перцептивная: oklch(0.075 …) — это почти чистый чёрный,
 * а не «мягкий near-black», и на глаз в коде это не видно. Поэтому каждый
 * токен переводим OKLCH → OKLab → linear sRGB → sRGB и считаем WCAG.
 *
 * Запуск: node scripts/check-palette.mjs
 */

const TOKENS = {
  void: [0.085, 0.022, 270],
  'surface-0': [0.140, 0.028, 268],
  'surface-1': [0.255, 0.032, 268],
  'surface-2': [0.305, 0.035, 268],
  'surface-3': [0.355, 0.038, 268],
  border: [0.470, 0.030, 268],
  'border-strong': [0.565, 0.035, 268],
  'border-lit': [0.600, 0.085, 292],
  muted: [0.720, 0.025, 265],
  body: [0.920, 0.012, 265],
  heading: [0.985, 0.004, 265],
  accent: [0.700, 0.165, 298],
  'accent-hover': [0.770, 0.128, 300],
  'accent-muted': [0.730, 0.115, 290],
  'accent-deep': [0.480, 0.170, 292],
  cyan: [0.820, 0.130, 212],
  'aurora-1': [0.700, 0.160, 300],
  'aurora-2': [0.750, 0.110, 215],
  /* «Тёмная пилюля» главного CTA — сплошная заливка вместо аурора-градиента.
     Подпись белая (heading), значит проверяем heading на этой заливке и в
     ховер-состоянии, плюс отделение самой пилюли от плоского фона. */
  'cta-solid': [0.205, 0.024, 268],
  'cta-solid-hover': [0.275, 0.028, 268],
  /* Семантика была объявлена в :root, но сюда не попадала — то есть три
     цвета, которыми покрашены ошибки полей, статусы начислений и галочка
     успешной оплаты, никем не проверялись. Ошибка формы обязана читаться
     не хуже основного текста, иначе человек не понимает, что не так. */
  success: [0.76, 0.15, 165],
  danger: [0.68, 0.19, 20],
  warning: [0.82, 0.14, 85],
}

function oklchToLinearSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const encode = (v) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055

const clamp01 = (v) => Math.min(1, Math.max(0, v))

function toHexAndLuminance(L, C, h) {
  const lin = oklchToLinearSrgb(L, C, h)
  // Признак выхода за пределы sRGB — важно знать до того, как браузер сам обрежет
  const clipped = lin.some((v) => v < -0.0005 || v > 1.0005)
  const linClamped = lin.map(clamp01)

  const hex =
    '#' +
    linClamped
      .map((v) =>
        Math.round(encode(v) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')

  const luminance =
    0.2126 * linClamped[0] + 0.7152 * linClamped[1] + 0.0722 * linClamped[2]

  return { hex, luminance, clipped }
}

const resolved = {}
for (const [name, [L, C, h]] of Object.entries(TOKENS)) {
  resolved[name] = toHexAndLuminance(L, C, h)
}

const contrast = (a, b) => {
  const hi = Math.max(resolved[a].luminance, resolved[b].luminance)
  const lo = Math.min(resolved[a].luminance, resolved[b].luminance)
  return (hi + 0.05) / (lo + 0.05)
}

console.log('\n── Токены ────────────────────────────────────────────────')
for (const [name, v] of Object.entries(resolved)) {
  const [L, C, h] = TOKENS[name]
  const warn = v.clipped ? '  ⚠ ВНЕ sRGB' : ''
  console.log(
    `${name.padEnd(15)} oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h})`.padEnd(45) +
      `${v.hex}${warn}`,
  )
}

// Порог берём из того, что реально требует WCAG для каждой роли:
// текст — 1.4.3 (4.5:1), элементы управления и границы полей — 1.4.11 (3:1),
// ступени поверхностей — не норматив, а читаемость иерархии.
const CHECKS = [
  ['body', 'surface-0', 4.5, 'основной текст на фоне'],
  ['body', 'surface-1', 4.5, 'основной текст на карточке'],
  ['muted', 'surface-0', 4.5, 'вторичный текст на фоне'],
  ['muted', 'surface-1', 4.5, 'вторичный текст на карточке'],
  ['heading', 'surface-0', 4.5, 'заголовок на фоне'],
  ['accent', 'surface-0', 4.5, 'акцентный текст на фоне'],
  ['accent', 'surface-1', 4.5, 'акцентный текст на карточке'],
  ['cyan', 'surface-0', 4.5, 'циан как текст на фоне'],
  ['border-strong', 'surface-0', 3.0, 'граница поля ввода (1.4.11)'],
  ['border-strong', 'surface-1', 3.0, 'граница поля на карточке'],
  ['surface-1', 'surface-0', 1.2, 'карточка отделяется от фона'],
  ['surface-2', 'surface-1', 1.1, 'поднятая поверхность от карточки'],

  // Тёмная пилюля CTA: белая подпись обязана читаться на заливке и в ховере.
  // Почти-чёрная заливка НЕ отделяется от почти-чёрного фона сама по себе —
  // край держит опаковая рамка border-strong (проверка «граница поля» выше
  // уже даёт 4.36:1 к фону, WCAG 1.4.11); здесь проверяем, что та же рамка
  // видна и на самой заливке пилюли (внутренний край).
  ['heading', 'cta-solid', 4.5, 'подпись CTA на тёмной пилюле'],
  ['heading', 'cta-solid-hover', 4.5, 'подпись CTA на пилюле (ховер)'],
  ['border-strong', 'cta-solid', 3.0, 'рамка CTA видна на заливке (1.4.11)'],

  // Семантика. Текст ошибки и статуса — обычный текст, 1.4.3 → 4.5:1.
  ['danger', 'surface-0', 4.5, 'текст ошибки на фоне'],
  ['danger', 'surface-1', 4.5, 'текст ошибки на карточке'],
  ['success', 'surface-0', 4.5, 'успех / скидка на фоне'],
  ['success', 'surface-1', 4.5, 'успех / скидка на карточке'],
  ['warning', 'surface-0', 4.5, 'предупреждение на фоне'],
  ['warning', 'surface-1', 4.5, 'предупреждение на карточке'],
  // .input-error красит границу поля, а поле лежит на surface-2 — это
  // элемент управления, значит 1.4.11 → 3:1, а не 4.5:1.
  ['danger', 'surface-2', 3.0, 'граница поля с ошибкой (1.4.11)'],
]

console.log('\n── Контраст ──────────────────────────────────────────────')
let failed = 0
for (const [fg, bg, min, label] of CHECKS) {
  const ratio = contrast(fg, bg)
  const ok = ratio >= min
  if (!ok) failed++
  console.log(
    `${ok ? '✓' : '✗'} ${label.padEnd(34)} ${ratio.toFixed(2)}:1  (нужно ≥${min})`,
  )
}

// ── Градиентный CTA ───────────────────────────────────────────────────────
// У .btn-primary тёмный текст (--color-void) лежит на градиенте, а не на
// плоской заливке. Проверять надо КАЖДЫЙ стоп: достаточно одного тёмного
// участка, чтобы подпись на нём провалилась. Плюс градиент уезжает по ховеру,
// то есть под текстом со временем оказываются все стопы.
const GRADIENT_AURORA = [
  [0.62, 0.16, 288],
  [0.74, 0.15, 298],
  [0.84, 0.078, 250],
  [0.86, 0.115, 212],
  [0.72, 0.105, 205],
]

console.log('\n── Градиентный CTA: тёмный текст на каждом стопе ──────────')
for (const [i, [L, C, h]] of GRADIENT_AURORA.entries()) {
  const stop = toHexAndLuminance(L, C, h)
  const hi = Math.max(stop.luminance, resolved.void.luminance)
  const lo = Math.min(stop.luminance, resolved.void.luminance)
  const ratio = (hi + 0.05) / (lo + 0.05)
  const ok = ratio >= 4.5 && !stop.clipped
  if (!ok) failed++
  console.log(
    `${ok ? '✓' : '✗'} стоп ${i + 1} ${stop.hex}  ${ratio.toFixed(2)}:1` +
      `${stop.clipped ? '  ⚠ ВНЕ sRGB' : ''}`,
  )
}

const clippedTokens = Object.entries(resolved).filter(([, v]) => v.clipped)
if (clippedTokens.length) {
  console.log(
    `\n⚠ Вне sRGB: ${clippedTokens.map(([n]) => n).join(', ')} — браузер обрежет цвет`,
  )
}

console.log(
  failed === 0
    ? '\nВсе проверки пройдены.\n'
    : `\nНе пройдено проверок: ${failed}.\n`,
)
process.exit(failed === 0 ? 0 : 1)
