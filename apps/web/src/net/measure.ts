import { AVATAR_IDS } from '@quad/shared'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { WebGPURenderer } from 'three/webgpu'
import { create } from 'zustand'
import { input } from '../game/input'
import { localPlayer } from '../game/localPlayer'
import { campusGraph, navigateTo, stopNavigating } from '../game/nav'
import { round, summarize, type Summary } from '../game/frames'
import { placeNamed } from '../game/places'
import { style, useSettings } from '../settings'
import { connect } from './connection'
import { useGame } from './store'

// ?measure: a phone measures itself. it loads like anyone's would, joins, then stands at a
// few spots and walks a route on high and on low, timing every frame. after each step it
// sends what it has to the server (GET /measure lists them), so if ios kills the tab for
// using too much memory the steps before are still there, and the reload says where it
// stopped. nothing to plug in

// where to stand and what to look at, [x, z]. the same spots as the laptop timing runs
const SPOTS = [
  { name: 'Hurt Park', at: [0, 58], look: [0, -60] },
  { name: 'Panther Quad', at: [-10, 58], look: [-60, 105] },
  { name: 'Library North', at: [-55, 98], look: [-100, 150] },
  { name: 'Student Center East', at: [6, 97], look: [30, 145] },
  { name: 'Langdale Hall', at: [-225, 135], look: [-172, 108] },
  { name: 'Petit Science Center', at: [25.4, 318.6], look: [-15, 355] },
  { name: 'Woodruff Park', at: [-300, -118], look: [-250, -200] },
]
// "take me there" from hurt park toward petit, the way someone on a phone gets around
const WALK = { from: [0, 3], to: 'Petit Science Center', seconds: 30 }
// seconds at each spot before timing (the camera, taa, a building's furniture loading)
const SETTLE = 2.5
const SECONDS = 5
// frames slower than this are listed with when they happened
const SLOW = 50

export type Sample = Summary & {
  name: string
  quality: 'high' | 'low'
  canvas: string
  // what three has on the gpu (textures, buffers) and the js heap (chrome only), mb
  gpuMb: number
  heapMb: number | null
  // [seconds into the sample, ms] for each frame over SLOW
  slow: number[][]
  // the walk: meters covered
  meters?: number
}

type Report = {
  id: string
  build: string
  started: string
  step: string
  done: boolean
  // the run before this one on this phone didn't finish (the tab was killed or reloaded)
  previous: { id: string; stoppedAt: string } | null
  device: Record<string, unknown>
  // ms since the link was opened
  load: Record<string, number | null>
  samples: Sample[]
  errors: string[]
}

type State = {
  report: Report | null
  at: number
  of: number
  sent: 'not yet' | 'sent' | 'failed'
  awake: 'yes' | 'no' | 'unsupported'
}

export const useMeasure = create<State>(() => ({
  report: null,
  at: 0,
  of: 0,
  sent: 'not yet',
  awake: 'no',
}))

const KEY = 'measure-run'
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))
const nextFrame = () => new Promise((done) => requestAnimationFrame(done))

async function until(ok: () => boolean, seconds: number) {
  const end = performance.now() + seconds * 1000
  while (!ok()) {
    if (performance.now() > end) return false
    await wait(200)
  }
  return true
}

let report: Report
const update = () => useMeasure.setState({ report: { ...report } })

async function send() {
  try {
    const res = await fetch('/measure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    })
    useMeasure.setState({ sent: res.ok ? 'sent' : 'failed' })
  } catch {
    useMeasure.setState({ sent: 'failed' })
  }
}

// written before each step, so a reload knows where the last run got to
function mark(step: string) {
  report.step = step
  useMeasure.setState((s) => ({ at: s.at + 1 }))
  update()
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: report.id, step, time: Date.now() }))
  } catch {
    // no crash detection then
  }
}

function stoppedRun() {
  try {
    const last = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    // a run from more than half an hour ago is something else
    if (last && Date.now() - last.time < 30 * 60_000) return { id: last.id, stoppedAt: last.step }
  } catch {
    // nothing saved
  }
  return null
}

export async function holdScreen() {
  // phones turn the screen off after 30 s or so, and a hidden page draws nothing
  if (!('wakeLock' in navigator)) return useMeasure.setState({ awake: 'unsupported' })
  try {
    await navigator.wakeLock.request('screen')
    useMeasure.setState({ awake: 'yes' })
  } catch {
    useMeasure.setState({ awake: 'no' })
  }
}

// what it is, before anything's drawn
function deviceInfo() {
  const nav = navigator as { deviceMemory?: number; connection?: { effectiveType?: string } }
  return {
    ua: navigator.userAgent,
    css: `${innerWidth}x${innerHeight}`,
    dpr: devicePixelRatio,
    screen: `${screen.width}x${screen.height}`,
    cores: navigator.hardwareConcurrency,
    memoryGb: nav.deviceMemory ?? null,
    network: nav.connection?.effectiveType ?? null,
    webgpu: 'gpu' in navigator,
    style,
  }
}

// and what three ended up drawing with
async function gpuInfo(gl: WebGPURenderer) {
  let gpu = ''
  const backend = gl.backend as { gl?: WebGL2RenderingContext }
  if (backend.gl) {
    const info = backend.gl.getExtension('WEBGL_debug_renderer_info')
    gpu = info ? String(backend.gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  } else if ('gpu' in navigator) {
    const info = (await navigator.gpu.requestAdapter())?.info
    if (info) gpu = [info.vendor, info.architecture, info.device, info.description].join(' ')
  }
  return { backend: useSettings.getState().backend, gpu: gpu.trim() }
}

function loadTimes() {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const files = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const kb = (key: 'transferSize' | 'encodedBodySize') =>
    Math.round(files.reduce((s, f) => s + f[key], nav?.[key] ?? 0) / 1024)
  return {
    // the server answering (a sleeping free server wakes up first), the page, the campus
    // ready to walk in (the shader warm-up done)
    server: nav ? Math.round(nav.responseStart) : null,
    page: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    ready: Math.round(performance.now()),
    shaders: useSettings.getState().built[0],
    // over the network, and the files' own sizes (bigger when the cache had some)
    downloadKb: kb('transferSize'),
    filesKb: kb('encodedBodySize'),
  }
}

// frame times for this long, or null if the page was hidden in between
function record(seconds: number) {
  return new Promise<number[] | null>((done) => {
    const ms: number[] = []
    let hidden = false
    const onHide = () => (hidden ||= document.hidden)
    document.addEventListener('visibilitychange', onHide)
    let last = performance.now()
    let total = 0
    const tick = (now: number) => {
      ms.push(now - last)
      total += now - last
      last = now
      if (total < seconds * 1000 && !hidden) return requestAnimationFrame(tick)
      document.removeEventListener('visibilitychange', onHide)
      done(hidden ? null : ms)
    }
    requestAnimationFrame((now) => {
      last = now
      requestAnimationFrame(tick)
    })
  })
}

function standAt([x, z]: number[], [lx, lz]: number[]) {
  localPlayer.teleport = { x: x!, z: z! }
  input.turn += Math.atan2(-(lx! - x!), -(lz! - z!)) - localPlayer.cameraYaw
}

async function sample(
  gl: WebGPURenderer,
  name: string,
  quality: 'high' | 'low',
  start: () => void,
  seconds = SECONDS,
) {
  mark(`${name} (${quality})`)
  for (let tries = 0; tries < 3; tries++) {
    useSettings.setState({ quality })
    start()
    await wait(SETTLE * 1000)
    const from = { x: localPlayer.x, z: localPlayer.z }
    const ms = await record(seconds)
    if (!ms) {
      await until(() => !document.hidden, 600)
      continue
    }
    const heap = (performance as { memory?: { usedJSHeapSize: number } }).memory
    let t = 0
    const slow: number[][] = []
    for (const m of ms) {
      t += m
      if (m > SLOW && slow.length < 30) slow.push([round(t / 1000), round(m)])
    }
    const moved = Math.hypot(localPlayer.x - from.x, localPlayer.z - from.z)
    report.samples.push({
      name,
      quality,
      ...summarize(ms),
      canvas: `${gl.domElement.width}x${gl.domElement.height}`,
      gpuMb: Math.round(gl.info.memory.total / 1048576),
      heapMb: heap ? Math.round(heap.usedJSHeapSize / 1048576) : null,
      slow,
      ...(name === 'Walk' && { meters: Math.round(moved) }),
    })
    update()
    await send()
    return
  }
  report.errors.push(`${name} (${quality}): the screen kept going off`)
}

// handed over by MeasureRun once the canvas has one. a phone that can't draw at all never
// gets here, and that's worth knowing too
let renderer: WebGPURenderer | null = null
let started = false

export async function startMeasuring() {
  if (started) return
  started = true
  const id = Math.random().toString(36).slice(2, 10)
  const main = document.querySelector<HTMLScriptElement>('script[type="module"][src]')
  report = {
    id,
    build: main?.src.split('/').pop() ?? '',
    started: new Date().toISOString(),
    step: '',
    done: false,
    previous: stoppedRun(),
    device: deviceInfo(),
    load: {},
    samples: [],
    errors: [],
  }
  addEventListener('error', (e) => report.errors.push(String(e.message).slice(0, 300)))
  addEventListener('unhandledrejection', (e) => report.errors.push(String(e.reason).slice(0, 300)))
  void holdScreen()
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void holdScreen()
  })
  const steps = (qualities: number) => 3 + qualities * (SPOTS.length + 1)
  useMeasure.setState({ of: steps(2) })

  mark('Starting the 3d view')
  await send()
  if (!(await until(() => renderer !== null, 120))) {
    report.errors.push('the 3d view never started')
    update()
    return send()
  }
  const gl = renderer!
  Object.assign(report.device, await gpuInfo(gl))
  const device = (gl.backend as { device?: GPUDevice }).device
  void device?.lost.then((info) => {
    report.errors.push(`gpu lost: ${info.reason} ${info.message}`)
    void send()
  })

  // the run before stopped on high: the tab most likely ran out of memory there, so this
  // one only does low (high would just kill it again)
  const webgpu = useSettings.getState().backend === 'webgpu'
  const qualities: ('high' | 'low')[] =
    webgpu && !report.previous?.stoppedAt.includes('(high)') ? ['high', 'low'] : ['low']
  useMeasure.setState({ of: steps(qualities.length) })

  mark('Loading the campus')
  if (!(await until(() => !useSettings.getState().warming, 300)))
    report.errors.push('still loading after 5 minutes')
  report.load = loadTimes()
  await send()

  mark('Joining')
  connect('Measuring', AVATAR_IDS[0]!)
  if (!(await until(() => useGame.getState().status === 'connected', 60))) {
    report.errors.push("couldn't join")
    update()
    return send()
  }
  await nextFrame()
  await nextFrame()
  report.load.walking = Math.round(performance.now())
  // the paths are worked out the first time someone asks for a route: not in a timed frame
  campusGraph()
  update()
  await send()

  for (const quality of qualities) {
    for (const spot of SPOTS)
      await sample(gl, spot.name, quality, () => standAt(spot.at, spot.look))
    const to = placeNamed(WALK.to)!
    await sample(
      gl,
      'Walk',
      quality,
      () => {
        stopNavigating()
        standAt(WALK.from, [to.spot.x, to.spot.z])
        // starts walking once it's there: the route waits for the settle time
        setTimeout(
          () => {
            navigateTo(to.label, to.spot, { x: localPlayer.x, z: localPlayer.z }, true)
          },
          (SETTLE * 1000) / 2,
        )
      },
      WALK.seconds,
    )
    stopNavigating()
  }

  report.step = 'done'
  report.done = true
  try {
    localStorage.removeItem(KEY)
  } catch {
    // fine
  }
  update()
  await send()
}

// inside the canvas, for the renderer
export function MeasureRun() {
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer
  useEffect(() => {
    renderer = gl
  }, [gl])
  return null
}
