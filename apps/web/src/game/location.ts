import campus from '../campus/campus.json'
import { pointInPolygon, polygon } from './collision'

export type Place = { name: string; sub: string }

const GSU = 'Georgia State University'
const DOWNTOWN = 'Downtown Atlanta'
// counts as being "at" a building within this many meters of its walls
const AT_BUILDING = 15

const buildings = campus.buildings
  .filter((b) => b.name)
  .map((b) => ({ name: b.name!, gsu: !!b.gsu, shape: polygon(b.points as [number, number][]) }))
const parks = campus.areas.map((a) => ({
  name: a.name,
  gsu: !!a.gsu,
  shape: polygon(a.points as [number, number][]),
}))
const streets = campus.roads.filter((r) => r.name) as {
  name: string
  width: number
  points: number[][]
}[]

function distToLine(x: number, z: number, points: number[][]) {
  let best = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i] as [number, number]
    const [bx, bz] = points[i + 1] as [number, number]
    const dx = bx - ax
    const dz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz))
  }
  return best
}

function distToShape(x: number, z: number, shape: ReturnType<typeof polygon>) {
  const ring = [...shape.points, shape.points[0]!].map((p) => [p.x, p.z])
  return distToLine(x, z, ring)
}

/** what to call where you're standing, like a maps app would */
export function whereIs(x: number, z: number): Place {
  const p = { x, z }

  const inside = buildings.find((b) => pointInPolygon(p, b.shape.points))
  if (inside) return { name: inside.name, sub: inside.gsu ? GSU : DOWNTOWN }

  // gsu's own outdoor spaces (the quad) are named even though buildings are right there
  const gsuPlace = parks.find((a) => a.gsu && pointInPolygon(p, a.shape.points))
  if (gsuPlace) return { name: gsuPlace.name, sub: GSU }

  const near = buildings
    .filter((b) => b.gsu)
    .map((b) => ({ b, d: distToShape(x, z, b.shape) }))
    .filter(({ d }) => d < AT_BUILDING)
    .sort((a, b) => a.d - b.d)[0]
  if (near) return { name: near.b.name, sub: GSU }

  const park = parks.find((a) => pointInPolygon(p, a.shape.points))
  if (park) return { name: park.name, sub: DOWNTOWN }

  const street = streets
    .map((s) => ({ s, d: distToLine(x, z, s.points) }))
    .filter(({ s, d }) => d < s.width / 2 + 4)
    .sort((a, b) => a.d - b.d)[0]
  if (street) return { name: street.s.name, sub: DOWNTOWN }

  return { name: DOWNTOWN, sub: 'Atlanta, GA' }
}
