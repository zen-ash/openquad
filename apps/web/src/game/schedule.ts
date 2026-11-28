import { create } from 'zustand'
import type { Point } from './collision'
import { minutes, walkMeters } from './nav'
import { placeNamed } from './places'

// "my day": the buildings of a day's classes in order, and whether you can walk from each
// one to the next in the time between. kept only on this device

export type Class = { place: string; start: string; end: string }

export type Walk = {
  from: string
  to: string
  meters: number
  // minutes on foot, and minutes between the classes (null if a time's missing)
  walk: number
  gap: number | null
  // too far for the gap, or only just (a couple of minutes to find the room)
  late: boolean
  tight: boolean
}

// time to find the room and sit down
const SLACK = 2

/** "13:05" to minutes after midnight, null if it isn't a time */
export function toMinutes(time: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return null
  const [h, min] = [Number(m[1]), Number(m[2])]
  return h < 24 && min < 60 ? h * 60 + min : null
}

/** the walks between one class and the next */
export function walks(day: Class[], meters = (a: Point, b: Point) => walkMeters(a, b)): Walk[] {
  const out: Walk[] = []
  for (let i = 1; i < day.length; i++) {
    const [a, b] = [day[i - 1]!, day[i]!]
    const [pa, pb] = [placeNamed(a.place), placeNamed(b.place)]
    if (!pa || !pb) continue
    const m = a.place === b.place ? 0 : meters(pa.spot, pb.spot)
    const walk = m ? minutes(m) : 0
    const [end, start] = [toMinutes(a.end), toMinutes(b.start)]
    const gap = end === null || start === null ? null : start - end
    out.push({
      from: a.place,
      to: b.place,
      meters: m,
      walk,
      gap,
      late: gap !== null && walk > gap,
      tight: gap !== null && walk <= gap && walk > gap - SLACK,
    })
  }
  return out
}

const KEY = 'day'

function saved(): Class[] {
  try {
    const day = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(day)
      ? day.filter((c) => c && typeof c.place === 'string' && placeNamed(c.place))
      : []
  } catch {
    return []
  }
}

export const useDay = create<{ day: Class[] }>(() => ({ day: saved() }))

export function setDay(day: Class[]) {
  useDay.setState({ day })
  try {
    localStorage.setItem(KEY, JSON.stringify(day))
  } catch {
    // not remembered then
  }
}
