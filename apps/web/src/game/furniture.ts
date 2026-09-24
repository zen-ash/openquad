import { seedOf } from '../campus/geometry'
import { closestOnSegment, pointInPolygon, type Point, type Segment } from './collision'
import type { Interior } from './interiors'

export type Kind = 'table' | 'chair' | 'armchair' | 'coffee_table' | 'shelf' | 'plant'
// rot is the model's rotation.y, the models face +z
export type Item = { kind: Kind; x: number; z: number; rot: number }

// some of the models are the wrong size for a campus, like the table being coffee table height
export const SCALE: Record<Kind, [number, number, number]> = {
  table: [1, 1.35, 1.3],
  chair: [1, 1, 1],
  armchair: [1, 1, 1],
  coffee_table: [1, 1, 1],
  shelf: [1, 1, 1],
  plant: [1.6, 1.6, 1.6],
}

// footprint for bumping into things, before SCALE: width, depth, and how far forward of
// the model's origin the middle is (the shelf's origin is at its back)
const FOOTPRINT: Record<Kind, [number, number, number]> = {
  table: [1.8, 0.66, 0],
  chair: [0.5, 0.5, 0],
  armchair: [0.8, 0.9, 0],
  coffee_table: [0.6, 1.2, 0],
  shelf: [1, 0.26, 0.13],
  plant: [0.5, 0.5, 0],
}

// the room is split into squares this big, each gets one group of furniture
const CELL = 5
// nothing this close to the door, it's the lobby
const LOBBY = 7

type Placed = { kind: Kind; a: number; b: number; rot: number }

// a table with chairs on both long sides. some are pushed out or turned a bit, like
// people just got up
function studyTable(rand: () => number): Placed[] {
  const out: Placed[] = [{ kind: 'table', a: 0, b: 0, rot: 0 }]
  for (const a of [-0.45, 0.45]) {
    for (const side of [-1, 1]) {
      if (rand() < 0.1) continue
      const b = side * (0.72 + rand() * 0.3)
      out.push({ kind: 'chair', a, b, rot: (b > 0 ? Math.PI : 0) + (rand() - 0.5) * 0.5 })
    }
  }
  return out
}

function lounge(rand: () => number): Placed[] {
  const out: Placed[] = [{ kind: 'coffee_table', a: 0, b: 0, rot: 0 }]
  for (const a of [-1.05, 1.05]) out.push({ kind: 'armchair', a, b: 0, rot: Math.atan2(-a, 0) })
  if (rand() < 0.5) out.push({ kind: 'armchair', a: 0, b: 1.3, rot: Math.PI })
  return out
}

// where books go on a shelf: the height of each board and how much room is above it
export const SHELF_LEVELS: [number, number][] = [
  [0.14, 0.21],
  [0.38, 0.25],
  [0.66, 0.25],
  [0.94, 0.25],
  [1.22, 0.25],
  [1.51, 0.25],
  [1.79, 0.23],
]

// two back to back rows of shelves
function shelves(): Placed[] {
  const out: Placed[] = []
  for (const b of [-1.1, 1.1]) {
    for (const a of [-1.5, -0.5, 0.5, 1.5]) {
      out.push({ kind: 'shelf', a, b, rot: 0 }, { kind: 'shelf', a, b, rot: Math.PI })
    }
  }
  return out
}

function distanceToWalls(p: Point, points: Point[]) {
  let best = Infinity
  points.forEach((a, i) => {
    const c = closestOnSegment(p, a, points[(i + 1) % points.length]!)
    best = Math.min(best, Math.hypot(p.x - c.x, p.z - c.z))
  })
  return best
}

/**
 * Fills the ground floor of a building. Works in the building's own directions: a runs
 * along the front wall, b goes in from the door. Same result every time for the same
 * building, so everyone sees the same room.
 */
export function furnish(room: Interior): Item[] {
  const { x, z, nx, nz } = room.door
  const along = { x: -nz, z: nx }
  const into = { x: -nx, z: -nz }
  const toWorld = (a: number, b: number) => ({
    x: x + along.x * a + into.x * b,
    z: z + along.z * a + into.z * b,
  })
  // the models' +x and +z point along and into at this rotation
  const turn = Math.atan2(into.x, into.z)

  // parking decks stay empty
  if (/Deck|Parking/.test(room.name)) return []
  let n = 0
  const rand = () => seedOf(room.index * 1000 + n++)
  const library = room.name.includes('Library')

  const as = room.points.map((p) => (p.x - x) * along.x + (p.z - z) * along.z)
  const bs = room.points.map((p) => (p.x - x) * into.x + (p.z - z) * into.z)
  const items: Item[] = []

  // cells are lined up so one column runs straight in from the door. that one stays
  // empty, it's the main walkway
  for (let ca = Math.ceil(Math.min(...as) / CELL) * CELL; ca < Math.max(...as); ca += CELL) {
    for (let cb = CELL / 2; cb < Math.max(...bs); cb += CELL) {
      if (ca === 0 || Math.hypot(ca, cb) < LOBBY) continue
      // the cell (minus a bit of room to walk around) has to be well inside
      const corners = [
        [-2, -2],
        [2, -2],
        [2, 2],
        [-2, 2],
        [0, 0],
      ].map(([da, db]) => toWorld(ca + da!, cb + db!))
      const fits = corners.every(
        (p) => pointInPolygon(p, room.points) && distanceToWalls(p, room.points) > 0.6,
      )
      if (!fits) continue

      const r = rand()
      let group: Placed[] = []
      if (library) {
        if (r < 0.35) group = shelves()
        else if (r < 0.85) group = studyTable(rand)
      } else if (r < 0.45) group = studyTable(rand)
      else if (r < 0.7) group = lounge(rand)
      else if (r < 0.8) group = [{ kind: 'plant', a: 1.6, b: 1.6, rot: rand() * 6 }]

      for (const g of group) {
        const p = toWorld(ca + g.a, cb + g.b)
        items.push({ kind: g.kind, x: p.x, z: p.z, rot: turn + g.rot })
      }
    }
  }

  // a plant on each side of the door
  for (const a of [-2.5, 2.5]) {
    const p = toWorld(a, 1.2)
    // the pot turned any way reaches about 0.6m out
    if (pointInPolygon(p, room.points) && distanceToWalls(p, room.points) > 0.7) {
      items.push({ kind: 'plant', x: p.x, z: p.z, rot: rand() * 6 })
    }
  }
  return items
}

/** the outline of an item on the ground, as 4 walls to bump into */
export function footprint(item: Item): Segment[] {
  const [w, d, forward] = FOOTPRINT[item.kind]
  const sx = SCALE[item.kind][0]
  const sz = SCALE[item.kind][2]
  // the model's own x and z axes after turning it
  const ax = { x: Math.cos(item.rot), z: -Math.sin(item.rot) }
  const az = { x: Math.sin(item.rot), z: Math.cos(item.rot) }
  const cx = item.x + az.x * forward * sz
  const cz = item.z + az.z * forward * sz
  const hw = (w * sx) / 2
  const hd = (d * sz) / 2
  const corner = (i: number, j: number) => ({
    x: cx + ax.x * hw * i + az.x * hd * j,
    z: cz + ax.z * hw * i + az.z * hd * j,
  })
  const c = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
  return c.map((a, i) => {
    const b = c[(i + 1) % 4]!
    return { ax: a.x, az: a.z, bx: b.x, bz: b.z }
  })
}
