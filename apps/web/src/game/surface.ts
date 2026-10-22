import campus from '../campus/campus.json'
import { interiorAt } from './interiors'
import { fromElevation, heightAt } from './terrain'

// what you stand on: the ground (terrain.ts), or a bridge's deck (courtland st is a viaduct
// 8m over decatur st and collins st). roads and paths on a bridge have the deck's height as a
// third number on each point (scripts/build-campus.mjs)
type Deck = { width: number; points: number[][] }
const decks = [...campus.roads, ...campus.paths].filter((l): l is Deck => l.points[0]?.length === 3)
// how far up you can step without it being a different level
const STEP = 0.6

// every deck at a spot, as heights
export function decksAt(x: number, z: number, reach = 0) {
  const out: number[] = []
  for (const { width, points } of decks)
    for (let i = 1; i < points.length; i++) {
      const [ax, az, ah] = points[i - 1] as [number, number, number]
      const [bx, bz, bh] = points[i] as [number, number, number]
      const [dx, dz] = [bx - ax, bz - az]
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
      if (Math.hypot(ax + dx * t - x, az + dz * t - z) <= width / 2 + reach)
        out.push(fromElevation(ah + (bh - ah) * t))
    }
  return out
}

// the height of what's under you at x, z: the highest thing there that's not more than a
// step above where you were (on the viaduct you stay on it, under it you stay under it)
export function surfaceAt(x: number, z: number, from = Infinity) {
  let best = heightAt(x, z)
  for (const d of decksAt(x, z)) if (d > best && d <= from + STEP) best = d
  return best
}

// the hand-built buildings that have to agree with a neighbour: petit's bridge lands on the
// research science center, and the practice facility shares petit's sidewalk. meters above
// sea level, like docs/reference has them
const DATUMS: Record<string, number> = {
  'Petit Science Center': 306.5,
  'Research Science Center': 306.5,
  'Practice Facility': 306.5,
  // the police door's sidewalk (lidar), the terrain there is 0.25m low
  'One Park Place': 318.4,
}

type Building = { name?: string; points: number[][]; door?: number[] }

// how high a building's ground floor is. one you can walk into is level with what's outside
// its door (a deck right outside counts, the courtland st buildings open onto the viaduct),
// the rest stand on the middle of the ground under them
const floors = new WeakMap<Building, number>()
export function floorOf(b: Building) {
  let floor = floors.get(b)
  if (floor === undefined) floors.set(b, (floor = findFloor(b)))
  return floor
}
function findFloor(b: Building) {
  const datum = b.name ? DATUMS[b.name] : undefined
  if (datum !== undefined) return fromElevation(datum)
  if (b.door) {
    const [x, z] = b.door as [number, number]
    return Math.max(heightAt(x, z), ...decksAt(x, z, 3))
  }
  const hs = b.points.map(([x, z]) => heightAt(x!, z!)).sort((a, c) => a - c)
  return hs[Math.floor(hs.length / 2)]!
}

// and how low the ground gets along its walls, for the bottom of its walls
export function lowestUnder(points: number[][]) {
  let low = Infinity
  points.forEach(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length] as [number, number]
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax!, bz - az!) / 2))
    for (let k = 0; k <= steps; k++)
      low = Math.min(low, heightAt(ax! + ((bx - ax!) * k) / steps, az! + ((bz - az!) * k) / steps))
  })
  return low
}

// the floor of the building a spot is in, or what's under it outside (furniture, doors)
export function floorAt(x: number, z: number) {
  const room = interiorAt({ x, z })
  return room ? floorOf(campus.buildings[room.index]!) : surfaceAt(x, z)
}

// a line on the ground (a route, the fence) every step meters, each point with the height of
// what's under it, carrying on from from (so a route along the viaduct stays up on it)
export function alongGround(points: { x: number; z: number }[], step: number, from = Infinity) {
  const out: [x: number, z: number, y: number][] = []
  let y = from
  points.forEach((a, i) => {
    const b = points[i + 1]
    if (!b) {
      out.push([a.x, a.z, (y = surfaceAt(a.x, a.z, y))])
      return
    }
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step))
    for (let k = 0; k < n; k++) {
      const [x, z] = [a.x + ((b.x - a.x) * k) / n, a.z + ((b.z - a.z) * k) / n]
      out.push([x, z, (y = surfaceAt(x, z, y))])
    }
  })
  return out
}
