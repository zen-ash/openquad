// Screenshots from the same camera spots every time, compared pixel by pixel with a
// baseline. Any change to how things are drawn (a shader, a material, the renderer) should
// come out the same here unless it's meant to look different. It also times every frame
// on the way to each spot: the 1% low (average of the slowest 1%) and any hitch over
// 50ms, which means something got built or uploaded on first sight (HITCH). Needs a real gpu and
// `pnpm dev` running.
//
//   pnpm visual                      compare with visual/baseline
//   pnpm visual --update             new baseline. take it on main, before the change
//   pnpm visual --mode low --only park-north,night
//   pnpm visual --only park-north --times 09:00,12:00,17:00,23:00   same spot, other times
//   BASE=http://localhost:5174 pnpm visual   another dev server (like main, for a baseline)
//
// Baselines depend on the gpu and browser, so they aren't committed (visual/ is ignored).
/* global requestAnimationFrame -- used inside page.evaluate, in the browser */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const URL = process.env.BASE ?? 'http://localhost:5173'
// same day every time so the sun is in the same place
const DAY = '&date=2026-09-24&still'
// share of pixels that can differ before a view counts as changed. a missing shader or
// texture changes way more than this
const LIMIT = 0.005
// a frame this long (ms) while going to a view is a hitch: something was built or
// uploaded on first sight that the warm-up (scene/WarmUp.tsx) should have done
const HITCH = 50

// from/at are camera positions (x east, y up, z south, hurt park is 0, 0). the player
// stands behind the camera so it's not in the shot, and decides what's loaded around it
const VIEWS = [
  { name: 'park-north', from: [0, 4, 55], at: [0, 8, -60], player: [0, 58] },
  // with someone standing there saying something: name tag and chat bubble
  { name: 'park-fountain', from: [-25, 4, -5], at: [4, 1, 27], player: [-27, -7], other: [-15, 5] },
  { name: 'park-west', from: [35, 4, 5], at: [-80, 8, 15], player: [38, 5] },
  { name: 'library-north', from: [-57, 4, 100], at: [-100, 12, 150], player: [-55, 98] },
  { name: 'dahlberg', from: [22, 3, 42], at: [55, 10, 70], player: [20, 40] },
  { name: 'arts-humanities', from: [-84, 2.5, -4], at: [-108, 7, 22], player: [-82, -6] },
  { name: 'research-tower', from: [36, 3, 465], at: [25, 20, 415], player: [37, 468] },
  {
    name: 'library-north-inside',
    from: [-93.8, 1.7, 142.9],
    at: [-75, 3, 125],
    player: [-95.8, 145.2],
    inside: 'Library North',
  },
  { name: 'fence-edge', from: [15, 4, -22], at: [40, 8, -100], player: [14, -19] },
  { name: 'night', from: [-30, 4, -10], at: [40, 12, 50], player: [-32, -12], time: '23:00' },
]

const MODES = {
  high: '',
  low: '&quality=low',
  // webgpu renderer falling back to webgl2, like on ci and browsers without webgpu.
  // those get the low preset, so it's held to the low baseline
  fallback: '&quality=low&webgl2',
}
const BASELINE_OF = { high: 'high', low: 'low', fallback: 'low' }

const args = process.argv.slice(2)
const update = args.includes('--update')
const pick = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1].split(',') : null
}
const modes = pick('--mode') ?? (update ? ['high', 'low'] : Object.keys(MODES))
const only = pick('--only')
const times = pick('--times')
const views = VIEWS.filter((v) => !only || only.includes(v.name)).flatMap((v) =>
  times ? times.map((t) => ({ ...v, time: t, name: `${v.name}-${t.replace(':', '')}` })) : [v],
)

const browser = await chromium.launch({
  headless: true,
  args: [
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    // headless chrome on a mac otherwise ends up on the software renderer
    ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
  ],
})

async function join(context, query, name) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`${URL}/?${query}`)
  await page.getByLabel("What's your name?").fill(name)
  await page.getByRole('button', { name: 'Join' }).click({ timeout: 120_000 })
  await page.getByText(/^\d+ online$/).waitFor({ timeout: 90_000 })
  return { page, errors }
}

const results = []
for (const mode of modes) {
  const dir = update ? `visual/baseline/${mode}` : `visual/latest/${mode}`
  mkdirSync(dir, { recursive: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  let time = null
  let me = null
  for (const v of views) {
    // a new page when the time of day changes, the sun only reads it at the start
    const t = v.time ?? '09:00'
    if (t !== time) {
      await me?.page.close()
      me = await join(context, `time=${t}${DAY}${MODES[mode]}`, 'Camera')
      await me.page.keyboard.press('KeyP') // photo mode, no hud
      // before the switch to webgpu there's no backend() (it's all webgl)
      me.backend = await me.page.evaluate(() => globalThis.quad.backend?.() ?? 'webgl')
      time = t
    }
    const { page } = me
    // every frame of going to the spot and the first seconds there
    await page.evaluate(() => {
      const times = (globalThis.frameTimes = [])
      let last = performance.now()
      const tick = (now) => {
        if (globalThis.frameTimes !== times) return
        times.push(now - last)
        last = now
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await page.evaluate((v) => {
      globalThis.quad.teleport(v.player[0], v.player[1])
      globalThis.quad.lookFrom(v.from, v.at)
    }, v)
    if (v.inside) await page.waitForFunction((n) => globalThis.quad.inside() === n, v.inside)

    // timed until the second person (if any) joins: their page loading on the same machine
    // slows this one down, which isn't something a player sees
    const settle = v === views[0] ? 8000 : 4000
    await page.waitForTimeout(settle / 2)
    const frames = await page.evaluate(() => {
      const times = globalThis.frameTimes
      globalThis.frameTimes = null
      return times.sort((a, b) => a - b)
    })

    let other = null
    if (v.other) {
      // its own window: a background tab gets no frames, and join waits for the warm-up
      other = await join(await browser.newContext(), `quality=low&nocity${DAY}`, 'Sam')
      await other.page.evaluate(([x, z]) => globalThis.quad.teleport(x, z), v.other)
    }
    // textures, furniture and the shadow map settle in the first few seconds
    await page.waitForTimeout(settle / 2)
    if (other) {
      // the bubble only stays up for 6 seconds
      const chat = other.page.getByRole('textbox', { name: 'Chat message' })
      await chat.fill('meet at the fountain?')
      await chat.press('Enter')
      await page.waitForTimeout(1500)
    }
    const shot = await page.screenshot()
    await other?.page.context().close()
    writeFileSync(`${dir}/${v.name}.png`, shot)
    // the average of the slowest 1% of frames, and how many were hitches
    const worst = frames.slice(-Math.max(1, Math.round(frames.length / 100)))
    const pacing = {
      '1% low': `${(worst.reduce((a, b) => a + b) / worst.length).toFixed(1)}ms`,
      hitches: frames.filter((f) => f >= HITCH).length,
    }
    if (update) {
      results.push({
        mode,
        view: v.name,
        diff: '-',
        ...pacing,
        renderer: me.backend,
        errors: me.errors.length,
      })
      continue
    }

    const base = `visual/baseline/${BASELINE_OF[mode]}/${v.name}.png`
    if (!existsSync(base)) {
      results.push({
        mode,
        view: v.name,
        diff: 'no baseline',
        ...pacing,
        ok: pacing.hitches > 0 ? 'HITCH' : '',
        renderer: me.backend,
        errors: me.errors.length,
      })
      continue
    }
    const a = PNG.sync.read(readFileSync(base))
    const b = PNG.sync.read(shot)
    const out = new PNG({ width: a.width, height: a.height })
    const n = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0.1 })
    writeFileSync(`${dir}/${v.name}.diff.png`, PNG.sync.write(out))
    const share = n / (a.width * a.height)
    results.push({
      mode,
      view: v.name,
      diff: `${(share * 100).toFixed(2)}%`,
      ...pacing,
      ok: share > LIMIT ? 'CHANGED' : pacing.hitches > 0 ? 'HITCH' : 'ok',
      renderer: me.backend,
      errors: me.errors.length,
    })
  }
  const errors = [...new Set(me.errors)]
  if (errors.length) console.log(`${mode}: page errors\n  ${errors.slice(0, 10).join('\n  ')}`)
  await context.close()
}
await browser.close()

console.table(results)
if (!update) console.log('diff images (changed pixels in red) are in visual/latest/<mode>/')
process.exit(
  results.some((r) => r.ok === 'CHANGED' || r.ok === 'HITCH' || r.diff === 'no baseline') ? 1 : 0,
)
