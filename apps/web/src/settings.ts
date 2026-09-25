import { create } from 'zustand'

type Quality = 'high' | 'low'

// ?webgl2: three's webgl2 fallback even where webgpu works. it's what browsers without
// webgpu get (older safari, firefox on linux, the ci machines), so it can be tested here
export const forceWebGL = new URLSearchParams(location.search).has('webgl2')

function startingQuality(): Quality {
  // ?quality=low to force it, for old laptops (and the e2e tests, no real gpu there).
  // the webgl2 fallback is always low, see App
  if (forceWebGL) return 'low'
  return new URLSearchParams(location.search).get('quality') === 'low' ? 'low' : 'high'
}

// for the e2e tests: don't draw the city at all. ci machines have no gpu and drawing it
// on the cpu takes so long the tests time out. the map is still loaded for collisions,
// and everything the tests check (joining, moving, voice) works the same
export const hideCity = new URLSearchParams(location.search).has('nocity')

export const TIMES = ['live', 'morning', 'noon', 'sunset', 'night'] as const
export type TimeOfDay = (typeof TIMES)[number]

const params = new URLSearchParams(location.search)

// live follows the real time in atlanta. the others are handy for showing night in a
// daytime class. ?time=night works too, and so does an exact time like ?time=17:00
function startingTime(): string {
  const t = params.get('time') ?? ''
  return TIMES.includes(t as TimeOfDay) || /^\d{1,2}:\d{2}$/.test(t) ? t : 'live'
}

// ?date=2026-09-24 keeps the sun on that day, so screenshots taken weeks apart match
const pinnedDay = params.get('date')
export const today = () => (pinnedDay ? new Date(`${pinnedDay}T12:00:00-04:00`) : new Date())

// ?still: nothing moves by itself (wind in the trees, the route arrows). for screenshots
// that get compared pixel by pixel (scripts/visual.mjs)
export const still = params.has('still')

// the debug panel (hud/DebugLayers.tsx) and window.quad, in dev or with ?debug
export const showDebug = import.meta.env.DEV || params.has('debug')

// full resolution, remembered between visits (the resolution button)
function savedNative() {
  try {
    return localStorage.getItem('native') === '1'
  } catch {
    return false
  }
}

export const useSettings = create<{
  quality: Quality
  // which renderer backend we ended up with, null until it's started
  backend: 'webgpu' | 'webgl2' | null
  // the real sky and the effects. decided once, when the renderer starts on high quality
  // with webgpu. dropping to low later keeps them and only draws without the effects, so
  // the shaders built for both stay built
  atmosphere: boolean
  // shaders are being built before anyone can walk around (scene/WarmUp.tsx), and how
  // many of the gpu's pipelines are done out of how many were asked for
  warming: boolean
  built: [number, number]
  // draw at the screen's own resolution instead of at most 1920x1200 (scaled up by taa)
  native: boolean
  // taa on or off and the tone mapping, debug switches (the other effects' switches are
  // in scene/fx.ts)
  taa: boolean
  toneMapping: 'neutral' | 'aces' | 'agx' | 'none'
  time: string
  photo: boolean
  fenceLine: boolean
}>(() => ({
  quality: startingQuality(),
  backend: null,
  atmosphere: false,
  // nothing to build without the city (the e2e tests)
  warming: !hideCity,
  built: [0, 0],
  native: savedNative(),
  taa: true,
  toneMapping: 'neutral',
  time: startingTime(),
  // everything on screen hidden, for screenshots
  photo: false,
  // where the fence is, as a yellow curtain
  fenceLine: params.has('fence'),
}))
