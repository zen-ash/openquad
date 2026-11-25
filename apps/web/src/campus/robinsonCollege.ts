import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  flat,
  glassQuad,
  inset,
  insideWalls,
  parts as collect,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// gsu's robinson college of business, 35 broad st at marietta st: the empire building (1901),
// the citizens and southern bank's from 1929 (they redid the base) to 1993. 14 floors: three of
// white rusticated limestone with arches, ten of cream terra cotta with a pair of windows in
// each bay between plain piers and orange-tan sills, and an orange-tan top floor under the
// cornice. from usgs's lidar (2018), commons photos (2012, 2013, 2019) and gsu's (2022-2026).
// sources: docs/reference/robinson-college.md
//
// broad st on the north west (62.4m), marietta st on the south west and walton st on the north
// east (24.4m each), the back stands against the william-oliver building and 34 peachtree.
// the ground is broad st's sidewalk in the middle (320.6m), 0.8m lower at marietta st

export type RobinsonData = {
  points: number[][]
  height: number
  door?: number[]
}

// stone the limestone base and the penthouse, tc the cream terra cotta, trim the orange-tan
// sills, heads and top floor, glass the windows, dark the arches' fanlights, the doors' frames
// and the clock
export type Part = 'stone' | 'tc' | 'trim' | 'glass' | 'dark'

type Range = readonly [number, number]
const P = (x: number, z: number): Point => ({ x, z })

// the corners (build-campus.mjs): broad at marietta, broad at walton, the back, marietta
export const W = P(-454.1, -85.7)
export const N = P(-406.62, -126.19)
export const E = P(-390.79, -107.62)
export const S = P(-438.27, -67.13)

// the base: a tall ground floor and a mezzanine behind the arches, the third floor, the
// cornice. ten floors of terra cotta, the top floor, the main cornice (lidar 376.2m) and the
// roof behind it (375.0)
export const BASE_TOP = 14.4
const BASE_CORNICE = 13.4
export const FLOOR = 3.6
export const SHAFT = Array.from({ length: 10 }, (_, i) => BASE_TOP + i * FLOOR)
export const TOP = BASE_TOP + 10 * FLOOR
export const CORNICE = 55.6
export const ROOF = 54.4
// the stone and terra cotta stand this far out of the outline, the windows' glass is on it
const PROUD = 0.3
// the bays sit back from the piers
const RECESS = 0.2
// piers on the corners, the rest of each side in equal bays (17 on broad, 6 on the ends)
const CORNER = 1.8
const PIER = 0.45
// arches: where they are in each side's bays (the middle one on broad is the doors), their top
const ARCHES: Record<string, number[]> = { broad: [1, 8, 15], walton: [1, 4], marietta: [1, 4] }
const CROWN = 9.4
// the arched windows start over the ground floor's, the doorways go to the ground: the "35"
// doors on broad and the bank's on walton (gsu 2026, commons 2019)
const ARCH_SILL = 5.9
const DOORS: Record<string, number> = { broad: 8, walton: 4 }
// how deep the ring of stones round each arch is
const VOUSSOIR = 0.7

// a straight face from p to q, o the side facing away from the middle
function sideOf(p: Point, q: Point, inner: Point) {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  let o = { x: dir.z, z: -dir.x }
  if ((inner.x - p.x) * o.x + (inner.z - p.z) * o.z > 0) o = { x: -o.x, z: -o.z }
  const at = (u: number, d = 0) => P(p.x + dir.x * u + o.x * d, p.z + dir.z * u + o.z * d)
  return { p, q, len, dir, o, at }
}
type Side = ReturnType<typeof sideOf>

const MIDDLE = P((W.x + E.x) / 2, (W.z + E.z) / 2)

// p-q made longer by a at p and b at q
function longer(p: Point, q: Point, a: number, b: number): [Point, Point] {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const d = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  return [P(p.x - d.x * a, p.z - d.z * a), P(q.x + d.x * b, q.z + d.z * b)]
}

// a quad (or any flat polygon of 4) facing n, wound to match
function quad(pts: THREE.Vector3[], n: THREE.Vector3) {
  const [a, b, c] = pts
  const facing = b!.clone().sub(a!).cross(c!.clone().sub(a!)).dot(n) > 0
  const order = facing ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
  const geo = new THREE.BufferGeometry().setFromPoints(order.map((i) => pts[i]!))
  const m = n.clone().normalize()
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      order.flatMap(() => [m.x, m.y, m.z]),
      3,
    ),
  )
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      order.flatMap((i) => [pts[i]!.x + pts[i]!.z, pts[i]!.y]),
      2,
    ),
  )
  return geo
}

// the bays of a side, [from, to] along it
function baysOf(s: Side) {
  const n = Math.round((s.len - 2 * CORNER) / 3.46)
  const w = (s.len - 2 * CORNER) / n
  return Array.from({ length: n }, (_, i): Range => [CORNER + i * w, CORNER + (i + 1) * w])
}

// triangles flat on a side's face at d out, [along, up] corners
function onFace(s: Side, d: number, tris: [number, number][]) {
  const pos: number[] = []
  const uv: number[] = []
  for (const [u, y] of tris) {
    const p = s.at(u, d)
    pos.push(p.x, y, p.z)
    uv.push(u, y)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      tris.flatMap(() => [s.o.x, 0, s.o.z]),
      3,
    ),
  )
  // facing out: flip any triangle wound the other way
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const p = geo.getAttribute('position')
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i)
    b.fromBufferAttribute(p, i + 1)
    c.fromBufferAttribute(p, i + 2)
    const n = b.sub(a).cross(c.sub(a))
    if (n.x * s.o.x + n.z * s.o.z < 0) {
      for (const attr of [p, geo.getAttribute('uv')]) {
        const k = attr.itemSize
        const t = Array.from({ length: k }, (_, j) => attr.getComponent(i + 1, j))
        for (let j = 0; j < k; j++) attr.setComponent(i + 1, j, attr.getComponent(i + 2, j))
        for (let j = 0; j < k; j++) attr.setComponent(i + 2, j, t[j]!)
      }
    }
  }
  return geo
}

export function robinsonGeometry(b: RobinsonData) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null

  const face = (part: Part, s: Side, y0: number, y1: number, holes: Hole[] = [], d = PROUD) => {
    for (const [u0, u1, v0, v1] of solidPieces(s.len, y0, y1, holes))
      add(part, wallQuad(s.at(u0, d), s.at(u1, d), v0, v1, s.o, u0))
  }
  // only between u0 and u1
  const strip = (
    part: Part,
    s: Side,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    holes: Hole[],
    d: number,
  ) => face(part, s, y0, y1, [[-1, u0, -99, 99], [u1, s.len + 1, -99, 99], ...holes], d)
  // a hole's sides, sill and head from d back `depth`
  const reveal = (part: Part, s: Side, h: Hole, depth: number, d = PROUD) => {
    const [u0, u1, v0, v1] = h
    add(part, wallQuad(s.at(u0, d), s.at(u0, d - depth), v0, v1, s.dir))
    add(part, wallQuad(s.at(u1, d), s.at(u1, d - depth), v0, v1, { x: -s.dir.x, z: -s.dir.z }))
    const rim = [s.at(u0, d), s.at(u1, d), s.at(u1, d - depth), s.at(u0, d - depth)]
    if (v0 > 0.01) add(part, flat(rim, v0))
    add(part, flat(rim, v1, false))
  }
  const pane = (s: Side, h: Hole, d: number) =>
    add('glass', glassQuad(s.at(h[0], d), s.at(h[1], d), h[2], h[3], s.o))
  // a band standing out of a side to d1 between u0 and u1: front, ends, top and underside
  const ledge = (
    part: Part,
    s: Side,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d1: number,
  ) => {
    const back = { x: -s.dir.x, z: -s.dir.z }
    add(part, wallQuad(s.at(u0, d1), s.at(u1, d1), y0, y1, s.o, u0))
    add(part, wallQuad(s.at(u0, PROUD), s.at(u0, d1), y0, y1, back))
    add(part, wallQuad(s.at(u1, PROUD), s.at(u1, d1), y0, y1, s.dir))
    const rim = [s.at(u0, PROUD), s.at(u1, PROUD), s.at(u1, d1), s.at(u0, d1)]
    add(part, flat(rim, y1))
    add(part, flat(rim, y0, false))
  }

  // the ring of big stones round an arch, standing out of the wall, and its keystone
  const archivolt = (s: Side, mid: number, r: number, spring: number) => {
    const out = PROUD + 0.12
    const at = (k: number, rr: number): [number, number] => {
      const t = Math.PI - (k / 8) * Math.PI
      return [mid + Math.cos(t) * rr, spring + Math.sin(t) * rr]
    }
    const tris: [number, number][] = []
    for (let k = 0; k < 8; k++) {
      const [a, b, c, d] = [at(k, r), at(k + 1, r), at(k + 1, r + VOUSSOIR), at(k, r + VOUSSOIR)]
      tris.push(a, b, c, a, c, d)
      // its inner and outer edges, facing in to the opening and out
      for (const [rr, sign] of [
        [r, -1],
        [r + VOUSSOIR, 1],
      ] as const) {
        const [u0, y0] = at(k, rr)
        const [u1, y1] = at(k + 1, rr)
        const t = Math.PI - ((k + 0.5) / 8) * Math.PI
        const pts = [
          [u0, y0, PROUD],
          [u1, y1, PROUD],
          [u1, y1, out],
          [u0, y0, out],
        ].map(([u, y, d]) => {
          const p = s.at(u!, d!)
          return new THREE.Vector3(p.x, y!, p.z)
        })
        const n = new THREE.Vector3(s.dir.x * Math.cos(t), Math.sin(t), s.dir.z * Math.cos(t))
        add('stone', quad(pts, n.multiplyScalar(sign)))
      }
    }
    add('stone', onFace(s, out, tris))
    ledge('stone', s, mid - 0.35, mid + 0.35, CROWN - 0.3, CROWN + 0.75, out + 0.15)
  }

  // the three street sides. they run past each other's corners by PROUD so the corners close
  const broad = sideOf(...longer(W, N, PROUD, PROUD), MIDDLE)
  const walton = sideOf(...longer(N, E, PROUD, 0), MIDDLE)
  const marietta = sideOf(...longer(S, W, 0, PROUD), MIDDLE)
  const streets = { broad, walton, marietta }

  for (const [name, s] of Object.entries(streets)) {
    const bays = baysOf(s)
    const arches = ARCHES[name]!

    // the base: arches two floors tall, the other bays a tall window with a little pediment over
    // it and plain stone above (the inscription band), every bay a small window in the third
    // floor under the cornice
    const baseHoles: Hole[] = []
    // doorways go down to the ground, the other arches are windows over a ground floor one
    const doorway = (i: number) => DOORS[name] === i
    bays.forEach(([a0, a1], i) => {
      const mid = (a0 + a1) / 2
      const r = (a1 - a0 - 0.5) / 2
      if (doorway(i)) baseHoles.push([mid - r, mid + r, 0, CROWN])
      else {
        baseHoles.push([mid - 0.7, mid + 0.7, 1.2, 4.5])
        if (arches.includes(i)) baseHoles.push([mid - r, mid + r, ARCH_SILL, CROWN])
      }
      baseHoles.push([mid - 0.65, mid + 0.65, 10.2, 12.3])
    })
    // a blind niche in each corner pier on the streets
    const ends = { broad: [CORNER / 2, s.len - CORNER / 2], walton: [CORNER / 2] }
    const niches: Hole[] = (ends[name as keyof typeof ends] ?? [s.len - CORNER / 2]).map((u) => [
      u - 0.5,
      u + 0.5,
      1.0,
      4.4,
    ])
    face('stone', s, 0, BASE_TOP, [...baseHoles, ...niches])
    for (const h of niches) {
      reveal('stone', s, h, 0.26)
      add('stone', wallQuad(s.at(h[0], PROUD - 0.26), s.at(h[1], PROUD - 0.26), h[2], h[3], s.o))
    }
    bays.forEach(([a0, a1], i) => {
      const mid = (a0 + a1) / 2
      if (!doorway(i)) {
        const win: Hole = [mid - 0.7, mid + 0.7, 1.2, 4.5]
        reveal('stone', s, win, PROUD)
        pane(s, win, 0)
        ledge('stone', s, mid - 0.95, mid + 0.95, 4.55, 5.0, PROUD + 0.18)
      }
      if (arches.includes(i)) {
        // round headed: stone fills the corners over the arch, the intrados curves round, a
        // dark fanlight in the half circle and glass (or the doors) under it
        const r = (a1 - a0 - 0.5) / 2
        const spring = CROWN - r
        const sill = doorway(i) ? 0 : ARCH_SILL
        const arc = Array.from({ length: 9 }, (_, k) => {
          const t = Math.PI - (k / 8) * Math.PI
          return [mid + Math.cos(t) * r, spring + Math.sin(t) * r] as [number, number]
        })
        const tris: [number, number][] = []
        for (let k = 0; k < 4; k++) tris.push([mid - r, CROWN], arc[k]!, arc[k + 1]!)
        for (let k = 4; k < 8; k++) tris.push([mid + r, CROWN], arc[k]!, arc[k + 1]!)
        add('stone', onFace(s, PROUD, tris))
        archivolt(s, mid, r, spring)
        const fan: [number, number][] = []
        for (let k = 0; k < 8; k++) fan.push([mid, spring], arc[k]!, arc[k + 1]!)
        add('dark', onFace(s, 0, fan))
        // the intrados, a strip of quads round the arch facing its middle
        for (let k = 0; k < 8; k++) {
          const [u0, y0] = arc[k]!
          const [u1, y1] = arc[k + 1]!
          const t = (Math.PI * (k + 0.5)) / 8
          const n = { u: Math.cos(t), y: -Math.sin(t) }
          const pts = [
            [u0, y0, PROUD],
            [u1, y1, PROUD],
            [u1, y1, 0],
            [u0, y0, 0],
          ].map(([u, y, d]) => {
            const p = s.at(u!, d!)
            return new THREE.Vector3(p.x, y!, p.z)
          })
          add('stone', quad(pts, new THREE.Vector3(s.dir.x * n.u, n.y, s.dir.z * n.u)))
        }
        reveal('stone', s, [mid - r, mid + r, sill, spring], PROUD)
        // a dark frame band at the spring, glass (the doors) under it
        add('dark', wallQuad(s.at(mid - r, 0.02), s.at(mid + r, 0.02), spring - 0.4, spring, s.o))
        pane(s, [mid - r, mid + r, sill, spring - 0.4], 0)
      }
      const third: Hole = [mid - 0.65, mid + 0.65, 10.2, 12.3]
      reveal('stone', s, third, PROUD)
      pane(s, third, 0)
    })
    ledge('stone', s, -PROUD, s.len + PROUD, BASE_CORNICE - 0.4, BASE_CORNICE, PROUD + 0.25)
    ledge('stone', s, -PROUD - 0.7, s.len + PROUD + 0.7, BASE_CORNICE, BASE_TOP, PROUD + 0.7)

    // the terra cotta: piers full height, each bay set back with a pair of windows per floor,
    // orange-tan sills and heads
    const cols: Hole[] = bays.map(([a0, a1]) => [a0 + PIER, a1 - PIER, BASE_TOP, TOP])
    face('tc', s, BASE_TOP, TOP, cols)
    for (const [c0, c1] of cols) {
      const d = PROUD - RECESS
      add('tc', wallQuad(s.at(c0, PROUD), s.at(c0, d), BASE_TOP, TOP, s.dir))
      add('tc', wallQuad(s.at(c1, PROUD), s.at(c1, d), BASE_TOP, TOP, { x: -s.dir.x, z: -s.dir.z }))
      add('tc', flat([s.at(c0, PROUD), s.at(c1, PROUD), s.at(c1, d), s.at(c0, d)], TOP, false))
      // a pair in each bay, a terra cotta mullion between them
      const mid = (c0 + c1) / 2
      const wins: Hole[] = SHAFT.flatMap((f): Hole[] => [
        [c0 + 0.08, mid - 0.14, f + 0.8, f + 3.0],
        [mid + 0.14, c1 - 0.08, f + 0.8, f + 3.0],
      ])
      const sills: Hole[] = SHAFT.map((f) => [c0, c1, f + 0.55, f + 0.8])
      const heads: Hole[] = SHAFT.map((f) => [c0, c1, f + 3.0, f + 3.2])
      strip('tc', s, c0, c1, BASE_TOP, TOP, [...wins, ...sills, ...heads], d)
      for (const h of [...sills, ...heads]) strip('trim', s, h[0], h[1], h[2], h[3], [], d)
      for (const h of wins) pane(s, h, d)
    }

    // the top floor: orange-tan terra cotta with a pair of windows in each bay, a band under it
    const tops: Hole[] = bays.map(([a0, a1]) => [
      a0 + PIER + 0.1,
      a1 - PIER - 0.1,
      TOP + 0.7,
      TOP + 2.7,
    ])
    face('trim', s, TOP, CORNICE - 1.6, tops)
    for (const h of tops) {
      reveal('trim', s, h, 0.2)
      pane(s, h, PROUD - 0.2)
    }
    ledge('tc', s, -PROUD, s.len + PROUD, TOP - 0.15, TOP + 0.25, PROUD + 0.15)
    // the cornice, out about a meter (lidar), orange-tan under it
    ledge('tc', s, -PROUD - 1, s.len + PROUD + 1, CORNICE - 0.6, CORNICE, PROUD + 1)
    ledge('trim', s, -PROUD - 0.6, s.len + PROUD + 0.6, CORNICE - 1.6, CORNICE - 0.6, PROUD + 0.6)
  }
  // the back against the neighbours, plain terra cotta, and the parapet round the roof
  const back = sideOf(E, S, MIDDLE)
  face('tc', back, 0, CORNICE, [], 0)
  add('tc', flat(inset(outline, -PROUD), CORNICE))

  // the penthouse (lidar 380.9 and 385.3m), set back from broad st
  const box = (a: Range, d: Range, y: Range) => {
    const c = [
      broad.at(a[0], -d[0]),
      broad.at(a[1], -d[0]),
      broad.at(a[1], -d[1]),
      broad.at(a[0], -d[1]),
    ]
    c.forEach((p, i) => {
      const s = sideOf(p, c[(i + 1) % 4]!, broad.at((a[0] + a[1]) / 2, -(d[0] + d[1]) / 2))
      add('stone', wallQuad(s.p, s.q, y[0], y[1], s.o))
    })
    add('stone', flat(c, y[1]))
  }
  box([19, 40], [6, 13], [CORNICE, 60.3])
  box([24, 35], [7, 12], [60.3, 64.7])

  // the bank of america clock on the broad/walton corner, a dark box (no logo)
  const clock = sideOf(
    broad.at(broad.len - 1.2, PROUD + 0.2),
    broad.at(broad.len - 0.2, PROUD + 0.2),
    MIDDLE,
  )
  for (const [u0, u1] of [[0, 1]] as const) {
    const c = [clock.at(u0, 0), clock.at(u1, 0), clock.at(u1, 1), clock.at(u0, 1)]
    c.forEach((p, i) => {
      const s = sideOf(p, c[(i + 1) % 4]!, clock.at(0.5, 0.5))
      add('dark', wallQuad(s.p, s.q, 5.6, 8.0, s.o))
    })
    add('dark', flat(c, 8.0))
    add('dark', flat(c, 5.6, false))
  }

  // its two faces, white, on broad st and walton st
  const clockFace = (at: Point, o: Point) => ({
    ...at,
    y: 6.8,
    rot: Math.atan2(o.x, o.z),
    text: '',
    plate: '#e6e2d8',
    width: 0.7,
    height: 0.7,
  })
  signs.push(clockFace(clock.at(0.5, 1.02), broad.o), clockFace(clock.at(1.02, 0.5), broad.dir))

  // the hidden block that keeps a low sun from coming in one side's windows and out another's
  core('tc', inset(outline, 0.8), CEILING, ROOF - 0.1)

  insideWalls(inside, outline, door, () => false)

  // the sign by the doors: dark plate, light letters (gsu 2026), no logo
  const at = broad.at(broad.len / 2 + 2.3, PROUD + 0.03)
  signs.push({
    ...at,
    y: 3.2,
    rot: Math.atan2(broad.o.x, broad.o.z),
    text: 'J. MACK ROBINSON\nCOLLEGE OF BUSINESS',
    plate: '#2e3033',
    color: '#d9d6cf',
    scale: 0.8,
  })
  return {
    parts: merged(),
    inside,
    signs,
    first: ['stone'],
    noShadow: ['glass', 'trim', 'dark'],
  }
}
