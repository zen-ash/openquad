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
// debug for window.quad on a production build (BASE=... a server of apps/web/dist)
const DAY = '&date=2026-09-24&still&debug'
// share of pixels that can differ before a view counts as changed. a missing shader or
// texture changes way more than this
const LIMIT = 0.005
// a frame this long (ms) while going to a view is a hitch: something was built or
// uploaded on first sight that the warm-up (scene/WarmUp.tsx) should have done
const HITCH = 50

// from/at are camera positions (x east, y up, z south, hurt park is 0, 0). the player
// stands behind the camera so it's not in the shot, and decides what's loaded around it.
// they're the realistic look unless they say another style (the game look is the default
// now, so it's pinned)
const VIEWS = [
  { name: 'park-north', from: [0, 4, 55], at: [0, 8, -60], player: [0, 58] },
  // with someone standing there saying something: name tag and chat bubble
  { name: 'park-fountain', from: [-25, 4, -5], at: [4, 1, 27], player: [-27, -7], other: [-15, 5] },
  { name: 'park-west', from: [35, 4, 5], at: [-80, 8, 15], player: [38, 5] },
  { name: 'library-north', from: [-57, 4, 100], at: [-100, 12, 150], player: [-55, 98] },
  { name: 'dahlberg', from: [22, 3, 42], at: [55, 10, 70], player: [20, 40] },
  { name: 'arts-humanities', from: [-84, 2.5, -4], at: [-108, 7, 22], player: [-82, -6] },
  { name: 'research-tower', from: [36, 3, 465], at: [25, 20, 415], player: [37, 468] },
  { name: 'student-center-east', from: [8, 3, 100], at: [30, 5, 145], player: [6, 97] },
  { name: 'student-center-west', from: [-53, 3, 146.4], at: [-71.7, 6, 185.8], player: [-51, 144] },
  { name: 'langdale-hall', from: [-222, 3, 133], at: [-172, 16, 108], player: [-225, 135] },
  { name: 'classroom-south', from: [-221, 3, 116], at: [-196, 8, 150], player: [-223, 113] },
  { name: 'library-south', from: [-96, 3, 213], at: [-146, 17, 197], player: [-93, 214] },
  { name: 'urban-life', from: [-20, 2, 327], at: [20, 22, 255], player: [-22, 330] },
  { name: 'college-of-education', from: [-336, 3, 33], at: [-344, 10, 64], player: [-334, 31] },
  // on decatur st, the corner by the rec center is its fenced patio now
  { name: 'petit-science', from: [24, 2.5, 320], at: [-15, 20, 355], player: [25.4, 318.6] },
  { name: 'university-bookstore', from: [10, 3, 112], at: [-22, 10, 152], player: [12, 109] },
  { name: 'practice-facility', from: [-59, 3, 364], at: [-42, 7, 327], player: [-60, 366] },
  { name: 'sports-arena', from: [-91.5, 2.5, 212.6], at: [-68.3, 14, 266.4], player: [-93, 211] },
  { name: 'rec-center', from: [47.4, 3, 243.1], at: [100.8, 9, 220.6], player: [45.3, 243.9] },
  { name: 'natural-science', from: [-270, 3, 90], at: [-263, 10, 71], player: [-272, 90] },
  { name: 'science-annex', from: [-135, 3, 33], at: [-172, 8, 50], player: [-133, 31.5] },
  { name: 'one-park-place', from: [-288, 2.5, -31.5], at: [-330, 14, -8], player: [-285.5, -33] },
  // edgewood ave at peachtree center ave: the chamfer, the edgewood wing and its cornice
  { name: 'hurt-building', from: [-86, 2, -38], at: [-150, 30, -8], player: [-84, -36] },
  // across edgewood ave from the corner of equitable pl: the sign box, the marble ground floor
  { name: '58-edgewood', from: [-207, 2.5, -27], at: [-180, 10, -48], player: [-209, -25] },
  { name: '55-park-place', from: [-258, 1.6, -178], at: [-190, 30, -198], player: [-260, -176] },
  // across edgewood ave a bit to the east: the arch, the cornice and the east side over the
  // greek housing
  { name: '148-edgewood', from: [205, 1.7, -22], at: [190, 8, -45], player: [207, -20] },
  // across edgewood ave from the east: the town homes' brick and stucco bays, patton's west end
  { name: 'greek-housing', from: [248, 1.6, -26], at: [218, 4, -50], player: [250, -24] },
  // across edgewood ave: the stucco base, the brick with its sunshades, the open corner
  { name: 'patton-hall', from: [261, 1.6, -22], at: [280, 12, -45], player: [259, -20] },
  {
    name: 'student-success-center',
    from: [-214, 1.7, -173],
    at: [-186, 9, -140],
    player: [-216, -176],
  },
  // park place at the corner of woodruff park: the stone front, the glass box on jwd, the library's
  // glass at the south corner
  { name: 'college-of-law', from: [-214, 2.2, -232], at: [-192, 14, -290], player: [-214, -230] },
  // across the forsyth st / luckie st corner: the blade sign, the marquee, the banners on forsyth
  // st and the lobby's glass on luckie st
  { name: 'rialto', from: [-331, 1.7, -291.7], at: [-353, 11, -293.2], player: [-331, -288] },
  // broad st from marietta st: robinson's base and arches on the right, the commerce building's
  // blue canopy on the left
  { name: 'robinson-college', from: [-478, 2, -78], at: [-430, 14, -106], player: [-478, -78] },
  // broad st from walton st: the commerce building's broad side, blank over the canopy, with
  // robinson's base on the left
  {
    name: 'commerce-building',
    from: [-418.6, 2, -128.6],
    at: [-463, 20, -104],
    player: [-418.6, -128.6],
  },
  // edgewood ave at park place, from the campus side: the banking hall and the tower over it
  { name: '25-park-place', from: [-262, 2, -31], at: [-228, 30, -100], player: [-264, -29] },
  // peachtree st at woodruff park: the aderhold learning center's glass bay on the corner, the
  // arcade along luckie st and the shops on the plaza side
  { name: 'aderhold', from: [-276, 2, -227], at: [-330, 10, -244], player: [-274, -224] },
  // across forsyth st from the poplar st corner: the arches, the brick shaft, the cornice
  {
    name: 'haas-howell',
    from: [-403.9, 1.6, -230.6],
    at: [-400.3, 12, -252.2],
    player: [-404.2, -227.7],
  },
  // luckie st at fairlie st: the luckie st front, fairlie st's long side and the cornice
  {
    name: 'standard-building',
    from: [-394, 1.6, -365.5],
    at: [-398.1, 20, -333.2],
    player: [-393.7, -368.3],
  },
  // across edgewood ave near boulevard: the storefront, the stepped parapet and the sign
  { name: 'sculpture-studio', from: [545, 1.7, -18], at: [530, 3.5, -38], player: [547, -16] },
  // from hurt park's north edge across edgewood ave: the grid, the colonnade, the plaza's wall
  { name: '100-edgewood', from: [8, 1.7, -14], at: [-14, 22, -62], player: [10, -12] },
  // piedmont ave south of it, looking up at the fins and gsu's name on the band
  { name: '75-piedmont', from: [284, 1.7, -214], at: [320, 30, -268], player: [286, -212] },
  // on j deck's roof by the tower: the annex, the drop off canopy and the rows of cars
  { name: 'j-deck', from: [349, 4.2, -233.5], at: [339, 5.5, -266.4], player: [351, -231] },
  // courtland st at edgewood ave: the east end over the lot, the long front
  { name: '100-edgewood-east', from: [98, 1.7, -36], at: [0, 28, -64], player: [100, -34] },
  // across auburn ave at the south east: the drum, the curtain wall, the top floor over it
  { name: 'centennial-hall', from: [200, 1.6, -137], at: [178, 9, -178], player: [202, -135] },
  // from piedmont ave: the brick block's end with its paired windows, the wing and the canopy
  { name: 'alumni-center', from: [291, 1.6, -193], at: [272, 4, -210], player: [292, -191] },
  // from the w lot like gsu's nov 2026 photo: the court, the brick core, the dining hall
  { name: 'piedmont-central', from: [221.5, 1.5, -241], at: [225, 18, -296], player: [222, -238] },
  // piedmont ave at john wesley dobbs ave: the glass corner and the brick along the street
  {
    name: 'piedmont-central-corner',
    from: [292, 1.6, -323],
    at: [240, 16, -305],
    player: [294, -324],
  },
  {
    name: 'courtland-north',
    from: [-125.2, 3, 217.6],
    at: [-127.8, 5, 248.6],
    player: [-125.4, 214.8],
  },
  {
    name: 'courtland-building',
    from: [-156.3, 3, 252.8],
    at: [-160.9, 5, 286.1],
    player: [-156.4, 250],
  },
  {
    name: 'research-science',
    from: [56.95, 2.5, 352.85],
    at: [68.62, 12, 390.53],
    player: [56.14, 350.77],
  },
  // from across auditorium pl, the commons photos' spot: the tower, the step, the "135" door
  { name: 'university-lofts', from: [129, 2.5, 52], at: [140, 25, 25], player: [128.6, 54.5] },
  // piedmont ave at armstrong st: the deck's cable rails and storefront, the lofts' blank wall
  { name: 'lofts-parking', from: [222, 1.5, 80], at: [160, 9, 25], player: [224.9, 82.6] },
  { name: 'g-deck', from: [-268.99, 3, 182.41], at: [-192.92, 12, 246.76], player: [-272, 179.8] },
  { name: 'm-deck', from: [139.17, 1.5, 147.15], at: [208.36, 11, 75.79], player: [136.4, 150] },
  { name: 'n-deck', from: [36.25, 1.6, 327.67], at: [133.23, 26, 327.1], player: [32.25, 327.7] },
  { name: 't-deck', from: [-70, 3, -18], at: [-112, 16, -80], player: [-68, -16] },
  { name: 'k-deck', from: [70, 1.6, 360], at: [130, 8, 300], player: [68, 362] },
  { name: 's-deck', from: [163.53, 1.5, 331.14], at: [230.71, 14, 258.55], player: [160.8, 334.1] },
  // a deck from the auburn ave corner of peachtree center ave: the edge beam, sign and gate
  { name: 'a-deck', from: [-63, 1.6, -150], at: [-92, 4, -192], player: [-61, -148] },
  // the skyline north of campus: southern bell's microwave shaft from the edgewood ave end of
  // courtland st (lemay's 2019 photo), and 191 peachtree's crowns behind it from edgewood ave
  { name: 'southern-bell', from: [81.83, 1.5, -12.06], at: [-25, 55, -180], player: [84.1, -8.8] },
  { name: 'peachtree-191', from: [-60, 1.6, -35], at: [-125, 150, -530], player: [-58, -33] },
  {
    name: 'library-north-inside',
    from: [-93.8, 1.7, 142.9],
    at: [-75, 3, 125],
    player: [-95.8, 145.2],
    inside: 'Library North',
  },
  { name: 'fence-edge', from: [15, 4, -22], at: [40, 8, -100], player: [14, -19] },
  // the panther quad from the stair by library north, the lawn and the sparks column
  { name: 'panther-quad', from: [-70, 3, 128], at: [-22, 1, 76], player: [-72, 130] },
  { name: 'night', from: [-30, 4, -10], at: [40, 12, 50], player: [-32, -12], time: '23:00' },
  // the game look: its ground, trees, sky, a star and an entrance marker
  { name: 'game-park', from: [0, 4, 55], at: [0, 8, -60], player: [0, 58], style: 'game' },
  { name: 'game-sce', from: [2, 4, 108], at: [34, 2, 130], player: [0, 106], style: 'game' },
  {
    name: 'game-quad',
    from: [-25, 7, 92],
    at: [-70, 0, 135],
    player: [-27, 90],
    style: 'game',
  },
  {
    name: 'game-night',
    from: [-30, 4, -10],
    at: [40, 12, 50],
    player: [-32, -12],
    time: '23:00',
    style: 'game',
  },
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
  let opened = null
  let me = null
  for (const v of views) {
    // a new page when the time of day or the style changes, the sun only reads it at the start
    const t = v.time ?? '09:00'
    const style = v.style ?? 'realistic'
    if (`${t} ${style}` !== opened) {
      await me?.page.close()
      me = await join(context, `time=${t}&style=${style}${DAY}${MODES[mode]}`, 'Camera')
      await me.page.keyboard.press('KeyP') // photo mode, no hud
      // before the switch to webgpu there's no backend() (it's all webgl)
      me.backend = await me.page.evaluate(() => globalThis.quad.backend?.() ?? 'webgl')
      opened = `${t} ${style}`
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
      // the views' heights are above the ground under them
      const lift = ([x, y, z]) => [x, y + globalThis.quad.ground(x, z), z]
      globalThis.quad.lookFrom(lift(v.from), lift(v.at))
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
