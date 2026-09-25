import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'

// shared bits for the buildings drawn by hand from photos (library north, dahlberg hall).
// they're mostly laid out as (a, d): meters along the front wall, and meters out from it

export const pt = ([x, z]: number[]) => ({ x: x!, z: z! })

// lined up with the wall from `from` to `to`. out is to the left walking from -> to
export function frame(from: Point, to: Point) {
  const len = Math.hypot(to.x - from.x, to.z - from.z)
  const along = { x: (to.x - from.x) / len, z: (to.z - from.z) / len }
  const out = { x: along.z, z: -along.x }
  return {
    len,
    along,
    out,
    at: (a: number, d = 0) => ({
      x: from.x + along.x * a + out.x * d,
      z: from.z + along.z * a + out.z * d,
    }),
    aOf: (p: Point) => (p.x - from.x) * along.x + (p.z - from.z) * along.z,
    dOf: (p: Point) => (p.x - from.x) * out.x + (p.z - from.z) * out.z,
  }
}
export type Frame = ReturnType<typeof frame>

// a vertical wall facing `into` (a unit vector on the ground), from y0 to y1. uvs in
// meters, u starting at u0
export function wallQuad(a: Point, b: Point, y0: number, y1: number, into: Point, u0 = 0) {
  let corners = [
    [a.x, y0, a.z],
    [b.x, y0, b.z],
    [b.x, y1, b.z],
    [a.x, y1, a.z],
  ]
  // flip the winding if it would face the wrong way
  const ex = b.x - a.x
  const ez = b.z - a.z
  // the front of (a, b, top) faces (b - a) x up = (-ez, 0, ex)
  const facesInto = -ez * into.x + ex * into.z > 0
  if (!facesInto) corners = [corners[1]!, corners[0]!, corners[3]!, corners[2]!]

  const pos = [0, 1, 2, 0, 2, 3].flatMap((i) => corners[i]!)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      [0, 0, 0, 0, 0, 0].flatMap(() => [into.x, 0, into.z]),
      3,
    ),
  )
  const len = Math.hypot(ex, ez)
  const uv = [0, 1, 2, 0, 2, 3].flatMap((i) => {
    const [x, y, z] = corners[i]!
    return [u0 + ((x! - a.x) * ex + (z! - a.z) * ez) / (len || 1), y!]
  })
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}

// a flat polygon at height y, uvs in meters
export function flat(points: Point[], y: number, up = true) {
  const geo = new THREE.ShapeGeometry(
    new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, -p.z))),
  ).toNonIndexed()
  geo.rotateX(-Math.PI / 2)
  const pos = geo.getAttribute('position')
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i))
  if (!up) {
    // flip each triangle so it faces down
    for (let i = 0; i < pos.count; i += 3) {
      const x = pos.getX(i + 1)
      const z = pos.getZ(i + 1)
      pos.setXYZ(i + 1, pos.getX(i + 2), 0, pos.getZ(i + 2))
      pos.setXYZ(i + 2, x, 0, z)
    }
    geo.computeVertexNormals()
  }
  geo.translate(0, y, 0)
  return geo
}

export function circle(c: Point, r: number, n = 24) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2
    return { x: c.x + Math.cos(t) * r, z: c.z + Math.sin(t) * r }
  })
}

// a hole in a wall, [left, right, bottom, top] in meters along the wall and up
export type Hole = [number, number, number, number]

/** what's left of a wall once the holes (which can't overlap) are cut out, as rectangles */
export function solidPieces(len: number, y0: number, y1: number, holes: Hole[]): Hole[] {
  const cuts = [...new Set([0, len, ...holes.flatMap((h) => [h[0], h[1]])])]
    .filter((u) => u >= 0 && u <= len)
    .sort((a, b) => a - b)
  const pieces: Hole[] = []
  for (let i = 1; i < cuts.length; i++) {
    const u0 = cuts[i - 1]!
    const u1 = cuts[i]!
    if (u1 - u0 < 0.001) continue
    const mid = (u0 + u1) / 2
    const gaps = holes
      .filter((h) => h[0] < mid && h[1] > mid)
      .map((h) => [Math.max(y0, h[2]), Math.min(y1, h[3])] as const)
      .sort((a, b) => a[0] - b[0])
    let y = y0
    for (const [g0, g1] of gaps) {
      if (g0 > y + 0.001) pieces.push([u0, u1, y, g0])
      y = Math.max(y, g1)
    }
    if (y1 > y + 0.001) pieces.push([u0, u1, y, y1])
  }
  return pieces
}

// a window's glass, for glass() in materials.ts. uvs start at its bottom left corner, and
// aPane is its size plus a random number for it, so the shader can draw the mullions and
// light some up at night
export function glassQuad(a: Point, b: Point, y0: number, y1: number, into: Point) {
  const geo = wallQuad(a, b, y0, y1, into)
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) - y0)
  const n = Math.sin((a.x + b.x) * 12.9898 + (a.z + b.z) * 78.233 + y0 * 37.719) * 43758.5453
  const size = [Math.hypot(b.x - a.x, b.z - a.z), y1 - y0, n - Math.floor(n)]
  geo.setAttribute(
    'aPane',
    new THREE.Float32BufferAttribute(
      [0, 1, 2, 3, 4, 5].flatMap(() => size),
      3,
    ),
  )
  return geo
}

export type Opening<P> = { hole: Hole; glass?: P; sides?: P }

// collects the geometry of a building by material, merged into one mesh each at the end
export function parts<P extends string>() {
  const all = {} as Record<P, THREE.BufferGeometry[]>
  const add = (part: P, geo: THREE.BufferGeometry) => (all[part] ??= []).push(geo)
  // the inside of the ground floor walls, for walking in (see interiorGeometry.ts)
  const inside = { solid: [] as THREE.BufferGeometry[], glass: [] as THREE.BufferGeometry[] }

  // walls around a shape from y0 to y1, all facing away from its middle, and a lid
  const prism = (part: P, c: Point[], y0: number, y1: number, lid = true) => {
    const mx = c.reduce((sum, p) => sum + p.x, 0) / c.length
    const mz = c.reduce((sum, p) => sum + p.z, 0) / c.length
    c.forEach((p, i) => {
      const q = c[(i + 1) % c.length]!
      const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
      let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = { x: -o.x, z: -o.z }
      add(part, wallQuad(p, q, y0, y1, o))
    })
    if (lid) add(part, flat(c, y1))
  }

  // a box lined up with a frame
  const block = (
    part: P,
    f: Frame,
    a0: number,
    a1: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
  ) => prism(part, [f.at(a0, d0), f.at(a1, d0), f.at(a1, d1), f.at(a0, d1)], y0, y1)

  /**
   * An outside wall from p to q facing o, with openings set `depth` back into it: the
   * wall around them, their sides, and the glass (none for a doorway). A wall that
   * starts at the ground also gets its inside, with the same holes
   */
  const wall = (
    part: P,
    p: Point,
    q: Point,
    y0: number,
    y1: number,
    o: Point,
    openings: Opening<P>[] = [],
    depth = 0.3,
  ) => {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
    const at = (u: number, d = 0) => ({
      x: p.x + dir.x * u - o.x * d,
      z: p.z + dir.z * u - o.z * d,
    })
    const holes = openings.map((w) => w.hole)
    for (const [u0, u1, v0, v1] of solidPieces(len, y0, y1, holes))
      add(part, wallQuad(at(u0), at(u1), v0, v1, o, u0))

    for (const { hole, glass, sides = part } of openings) {
      const [u0, u1, v0, v1] = hole
      add(sides, wallQuad(at(u0), at(u0, depth), v0, v1, dir))
      add(sides, wallQuad(at(u1), at(u1, depth), v0, v1, { x: -dir.x, z: -dir.z }))
      const rim = [at(u0), at(u1), at(u1, depth), at(u0, depth)]
      if (v0 > 0.01) add(sides, flat(rim, v0))
      add(sides, flat(rim, v1, false))
      if (glass) add(glass, glassQuad(at(u0, depth), at(u1, depth), v0, v1, o))
    }

    if (y0 > 0.01) return
    const into = { x: -o.x, z: -o.z }
    for (const [u0, u1, v0, v1] of solidPieces(len, 0, CEILING, holes))
      inside.solid.push(wallQuad(at(u0), at(u1), v0, v1, into))
    for (const { hole, glass } of openings) {
      const [u0, u1, v0, v1] = hole
      if (glass && v0 < CEILING)
        inside.glass.push(wallQuad(at(u0), at(u1), v0, Math.min(v1, CEILING), into))
    }
  }

  const merged = () =>
    Object.fromEntries(
      Object.entries<THREE.BufferGeometry[]>(all).map(([k, v]) => [k, mergeGeometries(v)]),
    ) as Record<P, THREE.BufferGeometry>

  return { add, prism, block, wall, inside, merged }
}

/** the part of a shape where side(point) >= 0, for a straight cut through it */
export function clip(points: Point[], side: (p: Point) => number) {
  const kept: Point[] = []
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]!
    const sp = side(p)
    const sq = side(q)
    if (sp >= 0) kept.push(p)
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq)
      kept.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t })
    }
  })
  return kept
}

// each edge of an outline with its direction and the normal pointing out of the shape
export function edges(outline: Point[]) {
  let area = 0
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length]!
    area += p.x * q.z - q.x * p.z
  })
  const flip = area > 0 ? -1 : 1
  return outline.map((p, i) => {
    const q = outline[(i + 1) % outline.length]!
    const len = Math.hypot(q.x - p.x, q.z - p.z) || 1
    const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
    return { p, q, len, dir, out: { x: -dir.z * flip, z: dir.x * flip } }
  })
}

/**
 * Inside walls straight along an outline, for a building whose outside isn't drawn with
 * wall(). glass(p, q) says which edges are windows, the door gets a doorway
 */
export function insideWalls(
  inside: ReturnType<typeof parts>['inside'],
  outline: Point[],
  door: Point | null,
  glass: (p: Point, q: Point) => boolean,
) {
  for (const { p, q, len, dir, out } of edges(outline)) {
    const into = { x: -out.x, z: -out.z }
    const t = door ? (door.x - p.x) * dir.x + (door.z - p.z) * dir.z : -1
    const onEdge =
      door && t > 0 && t < len && Math.abs((door.x - p.x) * out.x + (door.z - p.z) * out.z) < 0.1
    const holes: Hole[] = onEdge ? [[t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]] : []
    const at = (u: number) => ({ x: p.x + dir.x * u, z: p.z + dir.z * u })
    for (const [u0, u1, v0, v1] of solidPieces(len, 0, CEILING, holes))
      (glass(p, q) ? inside.glass : inside.solid).push(wallQuad(at(u0), at(u1), v0, v1, into))
  }
}
