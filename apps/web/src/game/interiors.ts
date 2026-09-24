import campus from '../campus/campus.json'
import { pointInPolygon, type Point, type Segment } from './collision'

export const DOOR_WIDTH = 2.4
export const DOOR_HEIGHT = 2.7
// one floor. the ceiling is a bit under the real 3.5m floor height, like a real ceiling
export const CEILING = 3.3

export type Interior = {
  name: string
  // index into campus.buildings
  index: number
  points: Point[]
  door: { x: number; z: number; nx: number; nz: number }
  // the outside walls, with a gap where the door is
  walls: Segment[]
}

// the sliding doors open when someone's this close
export const DOOR_SENSOR = 3

export function doorOpens(door: Point, people: Iterable<Point>) {
  for (const p of people) {
    if (Math.hypot(p.x - door.x, p.z - door.z) < DOOR_SENSOR) return true
  }
  return false
}

/**
 * Where the two panels of a sliding door are, open from 0 (shut) to 1. They sit just
 * inside the doorway and slide sideways along the wall. rot is rotation.y for a panel
 * that's wide along x
 */
export function doorPanels(door: Interior['door'], open: number) {
  const along = { x: -door.nz, z: door.nx }
  const w = DOOR_WIDTH / 2
  const inset = 0.1
  const rot = Math.atan2(-door.nx, -door.nz)
  return [-1, 1].map((side) => {
    const out = side * (w / 2 + w * open * 0.95)
    return {
      x: door.x - door.nx * inset + along.x * out,
      z: door.z - door.nz * inset + along.z * out,
      rot,
    }
  })
}

/** splits the building outline into wall segments, leaving a doorway at the door */
export function wallsWithDoorway(points: Point[], door: Point, width = DOOR_WIDTH): Segment[] {
  const walls: Segment[] = []
  const add = (a: Point, b: Point) => {
    if (Math.hypot(b.x - a.x, b.z - a.z) > 0.05) walls.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z })
  }

  // the edge the door is on is the one it's closest to
  let doorEdge = -1
  let best = Infinity
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length]!
    const dx = b.x - a.x
    const dz = b.z - a.z
    const t = Math.max(
      0,
      Math.min(1, ((door.x - a.x) * dx + (door.z - a.z) * dz) / (dx * dx + dz * dz || 1)),
    )
    const d = Math.hypot(door.x - a.x - t * dx, door.z - a.z - t * dz)
    if (d < best) {
      best = d
      doorEdge = i
    }
  })

  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length]!
    if (i !== doorEdge) return add(a, b)
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1
    const dx = (b.x - a.x) / len
    const dz = (b.z - a.z) / len
    // how far along the edge the door is
    const along = (door.x - a.x) * dx + (door.z - a.z) * dz
    add(a, { x: a.x + dx * (along - width / 2), z: a.z + dz * (along - width / 2) })
    add({ x: a.x + dx * (along + width / 2), z: a.z + dz * (along + width / 2) }, b)
  })
  return walls
}

export const interiors: Interior[] = campus.buildings.flatMap((b, index) => {
  if (!b.door) return []
  const [x, z, nx, nz] = b.door as [number, number, number, number]
  const points = b.points.map(([px, pz]) => ({ x: px!, z: pz! }))
  return [
    {
      // one gsu building has no name on osm
      name: b.name ?? 'Georgia State University',
      index,
      points,
      door: { x, z, nx, nz },
      walls: wallsWithDoorway(points, { x, z }),
    },
  ]
})

export const enterable = new Set(interiors.map((i) => i.index))

const boxes = interiors.map((r) => {
  const xs = r.points.map((p) => p.x)
  const zs = r.points.map((p) => p.z)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  }
})

/** which building you're inside, if any */
export function interiorAt(p: Point) {
  return interiors.find((r, i) => {
    const b = boxes[i]!
    return (
      p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ && pointInPolygon(p, r.points)
    )
  })
}
