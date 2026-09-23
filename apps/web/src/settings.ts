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

export const useSettings = create<{ quality: Quality; time: TimeOfDay }>(() => ({
  quality: startingQuality(),
  time: startingTime(),
}))
