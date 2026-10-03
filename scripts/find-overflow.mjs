/**
 * Ищет горизонтальное переполнение на заданной ширине.
 *
 * Скриншот показывает, что страница шире экрана, но не показывает, какой
 * именно элемент её распирает. Здесь поднимается headless Chrome, страница
 * открывается на нужной ширине и через DevTools Protocol считаются реальные
 * габариты: document.scrollWidth против clientWidth и список элементов,
 * чей правый край выходит за viewport.
 *
 * Запуск: node scripts/find-overflow.mjs [url] [width] [height]
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_ARG = process.argv[2] ?? 'http://localhost:3000/'
const WIDTH = Number(process.argv[3] ?? 390)
const HEIGHT = Number(process.argv[4] ?? 844)
/* Четвёртый аргумент: mobile=0 отключает мобильную эмуляцию. Нужен для
   сверки с обычным скриншотом headless Chrome, который meta viewport
   не применяет — результаты могут разойтись, и важно видеть оба. */
const MOBILE = process.argv[5] !== '0' && WIDTH < 700

/* Пятый аргумент: путь для скриншота.
   Снимать обязательно здесь, а не флагом --screenshot: при --window-size=390
   Chrome верстает страницу в десктопную ширину и просто обрезает кадр до
   390px. Медиазапросы при этом не срабатывают, и «мобильный» скриншот
   показывает десктопную вёрстку с отрезанным правым краем. Через
   setDeviceMetricsOverride ширина настоящая. */
const SHOT = process.argv[6] ?? null

/* Шестой аргумент: CSS-селектор, к которому проскроллить перед съёмкой.
   Нужен, чтобы снять блок ниже первого экрана, не растягивая viewport на
   всю высоту страницы: при высоте 1750px герой (100svh) растягивается
   вместе с ней, и нужный блок всё равно уезжает вниз. */
const SCROLL_TO = process.argv[7] ?? null

/* Седьмой аргумент: селектор, над которым «подержать мышь» перед съёмкой.
   Иначе ховер-состояния (переворот карточки, подсветка плашек) проверить
   скриншотом нельзя — они просто не наступают. */
const HOVER = process.argv[8] ?? null

const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9222 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'chrome-overflow-'))

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  `--window-size=${WIDTH},${HEIGHT}`,
  'about:blank',
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function findTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      /* Chrome ещё не поднял порт — пробуем снова */
    }
    await sleep(100)
  }
  throw new Error('Chrome не отдал DevTools endpoint')
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    }
  })

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id
      pending.set(msgId, { resolve, reject })
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })

  return { ready, send, close: () => ws.close() }
}

const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  // Вертикаль первого экрана: влезает ли герой вместе с рядом фич в один
  // экран, или нижние плашки срезаются сгибом.
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
  };

  const fold = {
    viewportHeight: vh,
    hero: pick('section[class*="hero"]'),
    heroInner: pick('div[class*="heroInner"]'),
    heroCopy: pick('div[class*="heroCopy"]'),
    railRight: pick('ul[class*="railRight"]'),
    features: pick('div[class*="features"]'),
  };

  /* Элемент, торчащий за viewport, виноват в прокрутке страницы только если
     ни один его предок не является скроллером. Иначе он просто лежит внутри
     горизонтальной ленты (карусель, ряд плашек) — это нормально, и раньше
     такие элементы забивали отчёт десятками строк-пустышек. */
  const insideScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
    }
    return false;
  };

  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const overhang = Math.round(r.right - vw);
    const leftOut = Math.round(-r.left);
    if ((overhang > 1 || leftOut > 1) && !insideScroller(el)) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute('class') || '').slice(0, 60),
        width: Math.round(r.width),
        right: Math.round(r.right),
        overhang,
        leftOut,
      });
    }
  }
  // Оставляем только самые внешние: вложенные дети повторяют переполнение родителя
  return JSON.stringify({
    viewport: vw,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: offenders.slice(0, 25),
    fold,
  });
})()`

const run = async () => {
  const wsUrl = await findTarget()
  const { ready, send, close } = connect(wsUrl)
  await ready

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: MOBILE,
  })

  await send('Page.navigate', { url: URL_ARG })
  await sleep(4000)

  const { result } = await send('Runtime.evaluate', {
    expression: PROBE,
    returnByValue: true,
  })

  const data = JSON.parse(result.value)

  console.log(`\nURL: ${URL_ARG}`)
  console.log(`Viewport: ${data.viewport}px`)
  console.log(`document.scrollWidth: ${data.scrollWidth}px`)

  const overflow = data.scrollWidth - data.viewport
  console.log(
    overflow > 1
      ? `\n✗ Горизонтальное переполнение: +${overflow}px`
      : '\n✓ Горизонтального переполнения нет',
  )

  if (data.offenders.length) {
    console.log('\nЭлементы, выходящие за viewport:')
    for (const o of data.offenders) {
      console.log(
        `  <${o.tag}> ${o.cls || '(без класса)'}`.padEnd(72) +
          `w=${o.width} right=${o.right} +${o.overhang}px`,
      )
    }
  }

  const f = data.fold
  console.log(`\n── Первый экран (высота ${f.viewportHeight}px) ──`)
  for (const key of ['hero', 'heroInner', 'heroCopy', 'railRight', 'features']) {
    const m = f[key]
    if (!m) {
      console.log(`  ${key.padEnd(10)} — не найден`)
      continue
    }
    console.log(
      `  ${key.padEnd(10)} top=${String(m.top).padStart(5)} ` +
        `bottom=${String(m.bottom).padStart(5)} h=${String(m.height).padStart(4)}`,
    )
  }

  // Требовать, чтобы ряд фич целиком влез в первый экран, неправильно: на
  // низком широком экране это заставляет резать заголовок. Важно другое —
  // видно ли его начало, то есть понимает ли человек, что ниже есть контент.
  if (f.features) {
    const visible = Math.min(f.features.bottom, f.viewportHeight) - f.features.top
    const share = Math.round((visible / f.features.height) * 100)
    console.log(
      share >= 40
        ? `\n✓ Ряд фич виден на ${share}% — начало контента заметно`
        : `\n✗ Ряд фич почти не виден (${share}%) — первый экран выглядит тупиком`,
    )
  }

  if (SHOT) {
    if (SCROLL_TO) {
      await send('Runtime.evaluate', {
        expression: `document.querySelector(${JSON.stringify(SCROLL_TO)})
          ?.scrollIntoView({ block: 'start' })`,
      })
      // Даём доехать плавной прокрутке и досчитаться Reveal-анимациям,
      // иначе в кадр попадают ещё не проявленные блоки.
      await sleep(1200)
    }

    if (HOVER) {
      const { result: box } = await send('Runtime.evaluate', {
        expression: `(() => {
          const el = document.querySelector(${JSON.stringify(HOVER)});
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        })()`,
        returnByValue: true,
      })

      if (box.value) {
        const { x, y } = JSON.parse(box.value)
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
        // Ждём дольше полного переворота: пауза 160ms + 880ms ease-glide.
        await sleep(1400)
      } else {
        console.log(`\n⚠ Элемент для наведения не найден: ${HOVER}`)
      }
    }

    const shot = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(SHOT, Buffer.from(shot.data, 'base64'))
    console.log(`\nСкриншот: ${SHOT}`)
  }

  close()
  cleanup()
  process.exit(overflow > 1 ? 1 : 0)
}

/** Chrome ещё пишет в профиль в момент kill — удаление падает с ENOTEMPTY.
    Профиль лежит в tmp и нас не волнует, поэтому ошибку глотаем. */
function cleanup() {
  chrome.kill()
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 })
  } catch {
    /* остатки временного профиля подберёт система */
  }
}

run().catch((err) => {
  console.error(err)
  cleanup()
  process.exit(2)
})
