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

// live follows the real time in atlanta. the others are handy for showing night in a
// daytime class. ?time=night works too
function startingTime(): TimeOfDay {
  const t = new URLSearchParams(location.search).get('time')
  return TIMES.includes(t as TimeOfDay) ? (t as TimeOfDay) : 'live'
}

const params = new URLSearchParams(location.search)
export const TILES_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
const tiles = Boolean(TILES_KEY) && !params.has('notiles')

// the tiles/buildings/outlines checkboxes, in dev or with ?debug
export const showDebug = import.meta.env.DEV || params.has('debug')

export const useSettings = create<{
  quality: Quality
  time: TimeOfDay
  photo: boolean
  tiles: boolean
  extruded: boolean
  outlines: boolean
}>(() => ({
  quality: startingQuality(),
  time: startingTime(),
  // everything on screen hidden, for screenshots
  photo: false,
  // google's photorealistic 3d tiles (scene/Tiles.tsx). needs a key, ?notiles turns them off
  tiles,
  // our own box buildings. they're hidden under the tiles but still there for walls,
  // directions and the insides. ?extruded draws them anyway
  extruded: !tiles || params.has('extruded'),
  // osm footprints drawn on top of everything, to check the tiles line up
  outlines: params.has('outlines'),
}))
