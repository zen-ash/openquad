// How long a frame takes at 1920x1200 (a 1280x800 window on a retina screen, which the
// game draws at 1.5x), with vsync and the frame cap off so it's the real cost and not the
// screen's refresh rate. Run it before and after a rendering change, plugged in (a macbook
// on battery or hot from a long run is way slower). Needs a real gpu and `pnpm dev`.
//
//   pnpm frametime                 median ms per frame at a few spots
//   pnpm frametime "&quality=low"  extra url params
//   BASE=http://localhost:5174 pnpm frametime   another dev server (like main, to compare)
/* global document, requestAnimationFrame -- used inside page.evaluate, in the browser */
import { chromium } from '@playwright/test'

const [extra = ''] = process.argv.slice(2)
const SPOTS = [
  { name: 'park', from: [0, 4, 55], at: [0, 8, -60], player: [0, 58] },
  { name: 'library-north', from: [-57, 4, 100], at: [-100, 12, 150], player: [-55, 98] },
  // long view down the street, the most buildings on screen
  { name: 'edgewood', from: [60, 4, -30], at: [-300, 10, -45], player: [62, -30] },
]

const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--disable-gpu-vsync',
    '--disable-frame-rate-limit',
    ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
  ],
})
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
})
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(
  `${process.env.BASE ?? 'http://localhost:5173'}/?time=09:00&date=2026-09-24&still&notiles${extra}`,
)
await page.getByLabel("What's your name?").fill('Timer')
await page.getByRole('button', { name: 'Join' }).click({ timeout: 120_000 })
await page.getByText(/^\d+ online$/).waitFor({ timeout: 90_000 })
await page.keyboard.press('KeyP')

const all = []
for (const s of SPOTS) {
  await page.evaluate((s) => {
    globalThis.quad.teleport(s.player[0], s.player[1])
    globalThis.quad.lookFrom(s.from, s.at)
  }, s)
  await page.waitForTimeout(4000)
  const ms = await page.evaluate(
    () =>
      new Promise((done) => {
        const times = []
        let last = performance.now()
        const tick = () => {
          const now = performance.now()
          times.push(now - last)
          last = now
          if (times.length < 400) requestAnimationFrame(tick)
          else done(times.slice(20).sort((a, b) => a - b))
        }
        requestAnimationFrame(tick)
      }),
  )
  const median = ms[ms.length >> 1]
  all.push(median)
  console.log(
    `${s.name.padEnd(14)} ${median.toFixed(2)} ms  (p90 ${ms[Math.floor(ms.length * 0.9)].toFixed(2)})`,
  )
}
const canvas = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return `${c.width}x${c.height}`
})
console.log(
  `mean of medians ${(all.reduce((a, b) => a + b) / all.length).toFixed(2)} ms at ${canvas}`,
)
if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 5))
await browser.close()
