export type Point = { x: number; z: number }
export type Circle = { x: number; z: number; radius: number }
export type Polygon = {
  points: Point[]
  // bounding box so we can skip most buildings without checking every wall
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export function polygon(points: [number, number][]): Polygon {
  const pts = points.map(([x, z]) => ({ x, z }))
  const xs = pts.map((p) => p.x)
  const zs = pts.map((p) => p.z)
  return {
    points: pts,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  }
}

export function pointInPolygon(p: Point, points: Point[]) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!
    const b = points[j]!
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside
    }
  }
  return inside
}

export function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)),
  )
  return { x: a.x + t * dx, z: a.z + t * dz }
}

// pushes a circle (the player) out of a building if they overlap
function outOfPolygon(p: Point, radius: number, poly: Polygon): Point {
  if (
    p.x < poly.minX - radius ||
    p.x > poly.maxX + radius ||
    p.z < poly.minZ - radius ||
    p.z > poly.maxZ + radius
  ) {
    return p
  }

  let closest = p
  let best = Infinity
  const pts = poly.points
  for (let i = 0; i < pts.length; i++) {
    const c = closestOnSegment(p, pts[i]!, pts[(i + 1) % pts.length]!)
    const d = Math.hypot(p.x - c.x, p.z - c.z)
    if (d < best) {
      best = d
      closest = c
    }
  }

  const inside = pointInPolygon(p, pts)
  if (!inside && best >= radius) return p
  if (best === 0) return p // exactly on a wall, next frame sorts it out

  // push away from the nearest wall, or through it if we ended up inside
  const dir = inside ? -1 : 1
  return {
    x: closest.x + ((p.x - closest.x) / best) * radius * dir,
    z: closest.z + ((p.z - closest.z) / best) * radius * dir,
  }
}

function outOfCircle(p: Point, radius: number, c: Circle): Point {
  const dx = p.x - c.x
  const dz = p.z - c.z
  const dist = Math.hypot(dx, dz)
  const min = radius + c.radius
  if (dist >= min) return p
  if (dist === 0) return { x: c.x + min, z: c.z }
  return { x: c.x + (dx / dist) * min, z: c.z + (dz / dist) * min }
}

// a thin wall, like the outside wall of a building you can walk into
export type Segment = { ax: number; az: number; bx: number; bz: number }

function outOfSegment(p: Point, radius: number, s: Segment): Point {
  const c = closestOnSegment(p, { x: s.ax, z: s.az }, { x: s.bx, z: s.bz })
  const d = Math.hypot(p.x - c.x, p.z - c.z)
  if (d >= radius) return p
  if (d === 0) return p // right on the line, next frame sorts it out
  return { x: c.x + ((p.x - c.x) / d) * radius, z: c.z + ((p.z - c.z) / d) * radius }
}

export type World = {
  buildings: Polygon[]
  walls: Segment[]
  circles: Circle[]
  halfSize: number
}

export function resolveCollisions(p: Point, radius: number, world: World): Point {
  let out = p
  // twice, since getting pushed out of one building can push you into the one next to it
  for (let pass = 0; pass < 2; pass++) {
    for (const b of world.buildings) out = outOfPolygon(out, radius, b)
    for (const w of world.walls) out = outOfSegment(out, radius, w)
    for (const c of world.circles) out = outOfCircle(out, radius, c)
  }

  const edge = world.halfSize - radius
  return {
    x: Math.max(-edge, Math.min(edge, out.x)),
    z: Math.max(-edge, Math.min(edge, out.z)),
  }
}
