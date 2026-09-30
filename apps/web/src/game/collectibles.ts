import { create } from 'zustand'
import type { Point } from './collision'

// the game look's stars: floating around campus, picked up by gliding through them. where
// they are was picked by hand on the paths near the landmarks (the test checks they're
// inside the fence and not in anything)
export const STARS: Point[] = [
  { x: 4, z: 43 }, // hurt park, south of the fountain
  { x: -5, z: -18 }, // hurt park, by edgewood
  { x: 40, z: -3 },
  { x: -56, z: -12 },
  { x: -120, z: 67 }, // arts & humanities
  { x: 46, z: 48 }, // dahlberg hall
  { x: -68, z: 120 }, // panther quad
  { x: -38, z: 142 },
  { x: 3, z: 131 }, // bookstore
  { x: 79, z: 152 }, // student center east
  { x: -11, z: 191 }, // student center west
  { x: 39, z: 247 }, // urban life
  { x: -194, z: 113 }, // langdale hall
  { x: -236, z: 146 }, // classroom south
  { x: -123, z: 217 }, // library south plaza
  { x: -61, z: 271 }, // sports arena
  { x: -166, z: 286 }, // courtland st
  { x: 36, z: 341 }, // petit science center
  { x: 44, z: 455 }, // research tower
  { x: -199, z: -27 }, // edgewood ave
]

// how close the bean has to come (m). it's 1.1m wide and the star floats at its middle
export const REACH = 1.3

/** the stars in reach that weren't picked up yet */
export function pickUp(got: ReadonlySet<number>, at: Point) {
  const out: number[] = []
  STARS.forEach((s, i) => {
    if (!got.has(i) && Math.hypot(s.x - at.x, s.z - at.z) < REACH) out.push(i)
  })
  return out
}

// remembered between visits
const KEY = 'stars'

export function loadStars(): number[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    if (!Array.isArray(saved)) return []
    return saved.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < STARS.length)
  } catch {
    return []
  }
}

function saveStars(got: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(got))
  } catch {
    // private mode, they're just not remembered
  }
}

export const useStars = create<{ got: number[] }>(() => ({ got: loadStars() }))

export function collect(ids: number[]) {
  const got = [...new Set([...useStars.getState().got, ...ids])]
  useStars.setState({ got })
  saveStars(got)
}
