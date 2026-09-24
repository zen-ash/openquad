import { create } from 'zustand'

type Quality = 'high' | 'low'

function startingQuality(): Quality {
  // ?quality=low to force it, for old laptops (and the e2e tests, no real gpu there)
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
export const TILES_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

// localStorage.notiles = '1' works like ?notiles and sticks. the e2e tests start with it
// set (playwright.config.ts): every page with the tiles on uses up one of the key's
// sessions for the day, and there aren't many
function tilesTurnedOff() {
  try {
    return localStorage.getItem('notiles') === '1'
  } catch {
    return false
  }
}
const tiles = Boolean(TILES_KEY) && !params.has('notiles') && !tilesTurnedOff()

// the tiles/buildings/outlines checkboxes, in dev or with ?debug
export const showDebug = import.meta.env.DEV || params.has('debug')

export const useSettings = create<{
  quality: Quality
  time: string
  photo: boolean
  tiles: boolean
  extruded: boolean
  outlines: boolean
  tilesInside: boolean
  fenceLine: boolean
}>(() => ({
  quality: startingQuality(),
  time: startingTime(),
  // everything on screen hidden, for screenshots
  photo: false,
  // google's photorealistic 3d tiles (scene/Tiles.tsx). needs a key, ?notiles turns them off
  tiles,
  // our own box buildings outside the fence, where the tiles are. the ones inside are
  // always drawn. ?extruded draws them anyway
  extruded: !tiles || params.has('extruded'),
  // osm footprints drawn on top of everything, to check the tiles line up
  outlines: params.has('outlines'),
  // where the fence is, as a yellow line on the ground
  fenceLine: params.has('fence'),
  // the tiles inside the fence too, on top of our buildings. for comparing
  tilesInside: params.has('tilesinside'),
}))
