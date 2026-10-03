/**
 * Замер плавности страницы.
 *
 * «Сайт лагает» на глаз не отлаживается: непонятно, кто именно ест кадр —
 * canvas, прокрутка или анимации. Здесь поднимается headless Chrome, в
 * странице считаются интервалы между кадрами, и отдельно снимаются два
 * режима: покой и прокрутка колесом.
 *
 * Дополнительно считаются «долгие задачи» (>50ms) — это то, что пользователь
 * ощущает как подвисание, а не как низкий fps.
 *
 * Запуск: node scripts/measure-fps.mjs [url] [width] [height]
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_ARG = process.argv[2] ?? 'http://localhost:3000/'
const WIDTH = Number(process.argv[3] ?? 1440)
const HEIGHT = Number(process.argv[4] ?? 900)

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9300 + Math.floor(Math.random() * 500)
const profile = mkdtempSync(join(tmpdir(), 'chrome-fps-'))

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
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const page = (await res.json()).find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      /* порт ещё не открыт */
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

/** Ставит в страницу сборщики кадров и долгих задач. */
const INSTALL = `(() => {
  window.__fps = { frames: [], longTasks: [] };

  let last = performance.now();
  const loop = (t) => {
    window.__fps.frames.push(t - last);
    last = t;
    window.__fps.raf = requestAnimationFrame(loop);
  };
  window.__fps.raf = requestAnimationFrame(loop);

  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__fps.longTasks.push(Math.round(e.duration));
    });
    po.observe({ entryTypes: ['longtask'] });
    window.__fps.observer = po;
  } catch {}

  return 'ok';
})()`

const RESET = `(() => { window.__fps.frames = []; window.__fps.longTasks = []; return 'ok' })()`

const REPORT = `(() => {
  const f = window.__fps.frames.filter((d) => d > 0 && d < 2000);
  if (!f.length) return JSON.stringify({ frames: 0 });
  const sorted = [...f].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const avg = f.reduce((a, b) => a + b, 0) / f.length;
  return JSON.stringify({
    frames: f.length,
    avgMs: +avg.toFixed(1),
    fps: +(1000 / avg).toFixed(1),
    p50: +pct(0.5).toFixed(1),
    p95: +pct(0.95).toFixed(1),
    worst: +sorted[sorted.length - 1].toFixed(1),
    janky: f.filter((d) => d > 33).length,
    longTasks: window.__fps.longTasks.length,
    longTaskMax: window.__fps.longTasks.length ? Math.max(...window.__fps.longTasks) : 0,
  });
})()`

const show = (label, raw) => {
  const m = JSON.parse(raw)
  if (!m.frames) {
    console.log(`${label}: кадров не собрано`)
    return m
  }
  console.log(
    `${label.padEnd(12)} ${String(m.fps).padStart(5)} fps   ` +
      `p95 ${String(m.p95).padStart(6)}ms   худший ${String(m.worst).padStart(6)}ms   ` +
      `просадок>33ms ${String(m.janky).padStart(3)}/${m.frames}`,
  )
  return m
}

/**
 * Процессорное время страницы за окно наблюдения.
 *
 * Частота кадров в headless упирается в фиксированный vsync (ровно 30 fps),
 * поэтому по ней нельзя понять, сколько работы уходит на кадр. А вот
 * счётчики из Performance.getMetrics кумулятивные и в потолок не упираются:
 * по их приросту видно реальную нагрузку.
 */
async function cpuOver(send, label, ms, duringFn) {
  const read = async () => {
    const { metrics } = await send('Performance.getMetrics')
    const pick = (n) => metrics.find((m) => m.name === n)?.value ?? 0
    return {
      task: pick('TaskDuration'),
      script: pick('ScriptDuration'),
      layout: pick('LayoutDuration'),
      style: pick('RecalcStyleDuration'),
    }
  }

  const before = await read()
  const t0 = Date.now()
  if (duringFn) await duringFn()
  else await sleep(ms)
  const wall = (Date.now() - t0) / 1000
  const after = await read()

  const d = {
    task: after.task - before.task,
    script: after.script - before.script,
    layout: after.layout - before.layout,
    style: after.style - before.style,
  }

  console.log(
    `${label.padEnd(12)} загрузка CPU ${String(Math.round((d.task / wall) * 100)).padStart(4)}%   ` +
      `скрипт ${d.script.toFixed(2)}s   ` +
      `лейаут ${d.layout.toFixed(2)}s   ` +
      `стили ${d.style.toFixed(2)}s   ` +
      `(за ${wall.toFixed(1)}s)`,
  )
  return d
}

const run = async () => {
  const { ready, send, close } = connect(await findTarget())
  await ready

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 2,
    mobile: false,
  })

  // Замедление процессора: на headless-маке всё летает, а у клиента ноутбук.
  // 4× — типичный множитель для «среднего ноутбука» из Lighthouse.
  await send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await send('Page.navigate', { url: URL_ARG })
  await sleep(5000)

  await send('Performance.enable')
  await send('Runtime.evaluate', { expression: INSTALL, returnByValue: true })

  console.log(`\nURL: ${URL_ARG}   ${WIDTH}x${HEIGHT}   CPU ×4 медленнее\n`)

  // ── Покой ──────────────────────────────────────────────────────────
  await cpuOver(send, 'покой', 3000)
  const idle = await send('Runtime.evaluate', { expression: REPORT, returnByValue: true })
  show('покой', idle.result.value)

  // ── Прокрутка ──────────────────────────────────────────────────────
  await send('Runtime.evaluate', { expression: RESET, returnByValue: true })

  const wheel = async () => {
    for (let i = 0; i < 30; i++) {
      await send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: WIDTH / 2,
        y: HEIGHT / 2,
        deltaX: 0,
        deltaY: 120,
      })
      await sleep(60)
    }
    await sleep(600)
  }

  await cpuOver(send, 'прокрутка', 0, wheel)
  const scrolled = await send('Runtime.evaluate', { expression: REPORT, returnByValue: true })
  show('прокрутка', scrolled.result.value)

  close()
  cleanup()
}

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
