// Runs a player around campus for 2 minutes in real Chrome, fullscreen on the laptop's own
// screen with vsync on, and records every frame. Medians hide stutter, so this reports the
// 1% and 0.1% lows (the average of the slowest 1% / 0.1% of frames) and the number of
// spikes, says what happened in each spike (shaders built, pipelines made, textures or
// tiles uploaded, garbage collection, other main thread work) and draws a frame time graph.
//
//   pnpm build && PORT=5173 node apps/server/dist/index.js   the production build
//   pnpm walk --label before                 walk/before.{json,png}
//   pnpm walk --label before --trace         also a chrome trace (open it in devtools)
//   pnpm walk --label x --params "&notiles"  extra url params
//   BASE=http://localhost:5173 pnpm walk     another server
//
// Port 5173 because google's tile key only works there. Needs a real screen, it takes it
// over for the walk. walk/ is ignored by git.
/* global document, requestAnimationFrame, innerWidth, innerHeight, devicePixelRatio */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const label = flag('--label', 'walk')
const seconds = Number(flag('--seconds', 120))
const params = flag('--params', '')
const trace = args.includes('--trace')
// quick checks without taking over the screen, same size page
const headless = args.includes('--headless')
const BASE = process.env.BASE ?? 'http://localhost:5173'
// a frame that missed a refresh of a 60hz screen, and one that's a visible hitch
const SPIKE = 25
const BIG = 50

// from the game's own directions (game/nav.ts): hurt park, library north, student center
// east, research tower, petit science center, run the whole way (shift)
// prettier-ignore
const ROUTE = [
  [0, 0], [-2, -13], [-5, -12], [-16, -9], [-23, -4], [-26, 4], [-21, 14], [-10, 21],
  [-11, 28], [-6, 38], [-13, 46], [-3, 54], [0, 65], [5, 67], [-3, 78], [-57, 141],
  [-60, 138], [-55, 132], [-68, 120], [-84, 132], [-68, 120], [-55, 132], [-60, 138],
  [-46, 150], [9, 90], [35, 115], [104, 174], [105, 176], [55, 228], [4, 292], [13, 298],
  [14, 301], [42, 325], [51, 337], [103, 383], [44, 455], [25, 442], [20, 435], [16, 434],
  [-8, 412], [9, 396], [-8, 412], [16, 434], [20, 435], [25, 442], [44, 455], [95, 394],
  [2, 312], [-14, 328], [-10, 331]
]

mkdirSync('walk', { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless,
  // no "controlled by automated software" bar, it takes screen space
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--enable-precise-memory-info'],
})
const context = await browser.newContext(
  headless ? { viewport: { width: 1470, height: 835 }, deviceScaleFactor: 2 } : { viewport: null },
)
const page = await context.newPage()
// fullscreen the way the green button does it (chrome ignores it until the window is up).
// chrome on a mac keeps its toolbar in fullscreen by default, so the page gets 1470x835
// of the 1470x956 screen
await page.goto('about:blank')
const cdp = await context.newCDPSession(page)
const { windowId } = await cdp.send('Browser.getWindowForTarget')
for (let i = 0; i < (headless ? 0 : 10); i++) {
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'fullscreen' } })
  await page.waitForTimeout(1000)
  const { bounds } = await cdp.send('Browser.getWindowBounds', { windowId })
  if (bounds.windowState === 'fullscreen') break
}
await page.waitForTimeout(1000)
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

const opened = Date.now()
await page.goto(`${BASE}/?debug&time=12:00&date=2026-09-24${params}`)
await page.getByLabel("What's your name?").fill('Walker')
await page.getByRole('button', { name: 'Join' }).click({ timeout: 120_000 })
await page.getByText(/^\d+ online$/).waitFor({ timeout: 120_000 })
const joined = (Date.now() - opened) / 1000
await page.waitForTimeout(5000)
const screen = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return {
    css: `${innerWidth}x${innerHeight}`,
    canvas: `${c.width}x${c.height}`,
    dpr: devicePixelRatio,
  }
})

if (trace)
  await browser.startTracing(page, {
    path: `walk/${label}.trace.json`,
    categories: [
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'blink.user_timing',
      'v8',
      'v8.execute',
      'disabled-by-default-v8.gc',
      'gpu',
      'toplevel',
    ],
  })

// steer toward the next point once a frame, turning the camera no faster than someone
// would with the mouse, and skip a point if it's been stuck for 3 seconds
await page.evaluate((route) => {
  const quad = globalThis.quad
  let next = 1
  let best = Infinity
  let since = performance.now()
  let last = performance.now()
  const step = (now) => {
    if (globalThis.walkDone) return
    const me = quad.myPosition()
    const [x, z] = route[next]
    const d = Math.hypot(x - me.x, z - me.z)
    if (d < 2.5 || now - since > 3000) {
      next = Math.min(next + 1, route.length - 1)
      best = Infinity
      since = now
    } else if (d < best - 0.5) {
      best = d
      since = now
    }
    const want = Math.atan2(-(x - me.x), -(z - me.z))
    const yaw = globalThis.walkYaw ?? want
    const err = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw))
    const max = 3 * ((now - last) / 1000)
    globalThis.walkYaw = yaw + Math.max(-max, Math.min(max, err))
    quad.faceYaw(globalThis.walkYaw)
    last = now
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}, ROUTE)
await page.evaluate(() => performance.mark('walk-start'))
await page.evaluate(() => globalThis.quad.perf.start())
await page.keyboard.down('ShiftLeft')
await page.keyboard.down('KeyW')
await page.waitForTimeout(seconds * 1000)
await page.keyboard.up('KeyW')
await page.keyboard.up('ShiftLeft')
const { frames, names, loafs } = await page.evaluate(() => {
  globalThis.walkDone = true
  return globalThis.quad.perf.stop()
})
const where = await page.evaluate(() => globalThis.quad.myPosition())
if (trace) await browser.stopTracing()

// the first frame's time is from before recording started
const rows = frames.slice(1)
const ms = rows.map((r) => r[1]).sort((a, b) => a - b)
const worst = (share) => {
  const n = Math.max(1, Math.round(ms.length * share))
  return ms.slice(-n).reduce((a, b) => a + b) / n
}
const round = (v) => Math.round(v * 10) / 10

// what happened in each spike, from the counts net/perf.ts keeps and chrome's long
// animation frames. a heap drop of 2mb+ is a garbage collection
const spikes = []
rows.forEach((r, i) => {
  if (r[1] < SPIKE) return
  const [t, dt, builds, buildMs, pipelines, pipelineMs, textures, textureMs, bufferKb, tiles] = r
  const heapDrop = i > 0 ? rows[i - 1][10] - r[10] : 0
  const loaf = loafs.filter((l) => l.start < t && l.start + l.ms > t - dt)
  const causes = []
  if (builds) causes.push(`${builds} shader builds ${round(buildMs)}ms`)
  if (pipelines) causes.push(`${pipelines} pipelines ${round(pipelineMs)}ms`)
  if (textures) causes.push(`${textures} texture uploads ${round(textureMs)}ms`)
  if (tiles > 0) causes.push(`${tiles} tiles loaded`)
  if (bufferKb > 256) causes.push(`${Math.round(bufferKb)}kb of buffers`)
  if (heapDrop > 2) causes.push(`gc (${round(heapDrop)}mb freed)`)
  const scripts = loaf.flatMap((l) => l.scripts).slice(0, 3)
  spikes.push({
    at: round((t - rows[0][0]) / 1000),
    ms: round(dt),
    causes: causes.length ? causes : ['nothing on the main thread (gpu or compositor)'],
    scripts,
    built: names[i + 1]?.slice(0, 6) ?? [],
  })
})

const result = {
  label,
  url: page.url(),
  screen,
  joinedAfter: joined,
  frames: ms.length,
  seconds: round((rows.at(-1)[0] - rows[0][0]) / 1000),
  medianMs: round(ms[ms.length >> 1]),
  low1Ms: round(worst(0.01)),
  low01Ms: round(worst(0.001)),
  worstMs: round(ms.at(-1)),
  spikes: ms.filter((v) => v >= SPIKE).length,
  bigSpikes: ms.filter((v) => v >= BIG).length,
  endedAt: where,
  errors: [...new Set(errors)],
  spikeList: spikes,
  // every frame that built shaders, and what for
  builds: rows.flatMap((r, i) =>
    r[2] ? [[round((r[0] - rows[0][0]) / 1000), round(r[1]), r[2], names[i + 1]]] : [],
  ),
  frameMs: rows.map((r) => round(r[1])),
}
writeFileSync(`walk/${label}.json`, JSON.stringify(result, null, 1))

// the graph: every frame's time, the 16.7ms line and the spikes colored by cause
const W = 1400
const H = 420
const maxMs = 100
const x = (i) => 50 + (i / rows.length) * (W - 70)
const y = (v) => H - 40 - (Math.min(v, maxMs) / maxMs) * (H - 80)
const color = (s) =>
  /shader|pipeline/.test(s.causes[0])
    ? '#d9480f'
    : /tile|buffer|texture/.test(s.causes[0])
      ? '#1971c2'
      : /gc/.test(s.causes[0])
        ? '#9c36b5'
        : '#495057'
const line = rows.map((r, i) => `${x(i).toFixed(1)},${y(r[1]).toFixed(1)}`).join(' ')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Helvetica" font-size="13">
<rect width="100%" height="100%" fill="#fff"/>
${[0, 16.7, 33.3, 50, 100].map((v) => `<line x1="50" x2="${W - 20}" y1="${y(v)}" y2="${y(v)}" stroke="#dee2e6"/><text x="8" y="${y(v) + 4}">${v}ms</text>`).join('')}
<polyline points="${line}" fill="none" stroke="#212529" stroke-width="1"/>
${rows
  .map((r, i) => (r[1] >= SPIKE ? { i, s: spikes.find((s) => s.ms === round(r[1])) } : null))
  .filter(Boolean)
  .map(
    ({ i, s }) =>
      `<circle cx="${x(i)}" cy="${y(rows[i][1])}" r="3.5" fill="${s ? color(s) : '#495057'}"/>`,
  )
  .join('')}
<text x="50" y="20" font-size="15">${label}: median ${result.medianMs}ms, 1% low ${result.low1Ms}ms, 0.1% low ${result.low01Ms}ms, ${result.spikes} frames over ${SPIKE}ms (${result.bigSpikes} over ${BIG}ms), ${screen.canvas} canvas</text>
<text x="50" y="${H - 12}">${result.seconds}s of running &#8212; orange: shaders/pipelines, blue: tiles/buffers/textures, purple: gc, grey: other</text>
</svg>`
writeFileSync(`walk/${label}.svg`, svg)
await browser.close()
const drawer = await chromium.launch()
const sheet = await drawer.newPage({ viewport: { width: W, height: H } })
await sheet.setContent(svg)
await sheet.screenshot({ path: `walk/${label}.png` })
await drawer.close()

const summary = { ...result }
delete summary.frameMs
delete summary.spikeList
delete summary.builds
console.log(summary)
const byCause = {}
for (const s of spikes)
  for (const c of s.causes) {
    const k = c.replace(/[\d.]+/g, '#')
    byCause[k] = (byCause[k] ?? 0) + 1
  }
console.log('spikes by cause:', byCause)
