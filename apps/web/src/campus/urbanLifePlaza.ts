import * as THREE from 'three'
import { pointInPolygon, type Point } from '../game/collision'
import { RAISED, type Raised } from '../game/raised'
import { fromElevation } from '../game/terrain'
import { raisedSides, type Side } from './decks'
import { flat, wallQuad } from './landmark'
import type { Part } from './urbanLife'

// what urban life draws of its plaza (game/raised.ts has the plaza itself): its sides, the
// brick red pavers in fields between light concrete bands, the brick planters and the round
// black picnic tables in front of the wing (gsu's 2026 photo IMG_3448), the steps' treads,
// and the wide steps from decatur st up into 140 decatur st, set back under it, with the b
// lot's driveway next to them (mapillary 2018 and 2021, osm's steps way)

type Add = (part: Part, geo: THREE.BufferGeometry) => void
// the building's frame: a along the slab from the north tower, v in toward the plaza
type At = (a: number, v: number) => Point

// in the frame: the planters (brick a bit over knee high with a precast cap, flowers on
// top) and the tables
export const PLANTERS: [number, number, number, number][] = [
  [-24.5, -17.5, 26.8, 28.6],
  [-8.5, -3, 23.4, 25.2],
]
const PLANTER_TOP = 0.62
const CAP = 0.08
export const TABLES: [number, number][] = [
  [-20.5, 31.8],
  [-12, 30.6],
  [-6.2, 31.4],
  [-1.8, 34.2],
]
// the pavers: fields 2.4m square on a 3.2m grid, the rest light concrete
const FIELD = 2.4
const GRID = 3.2
// the sides: a band along the top and a base step at the bottom, the decatur st side has the
// garage's grilles between piers in bays
const BAND = 1.2
const OUT = 0.05
const BASE = 0.45
const BAY = 6.4
const PIER = 0.8
const COPING = 0.3

// 140 decatur st's side on decatur st, from its east corner: the way in under it with the
// steps (along it, and how deep), the driveway down into the b lot
export const RECESS = { from: 12, to: 21.4, depth: 5.05 }
export const DRIVEWAY = { from: 4.9, to: 10.9, depth: 1.5, top: 3 }

const box = (add: Add, part: Part, c: Point[], y0: number, y1: number, lid = true) => {
  const mx = c.reduce((s, p) => s + p.x, 0) / c.length
  const mz = c.reduce((s, p) => s + p.z, 0) / c.length
  c.forEach((p, i) => {
    const q = c[(i + 1) % c.length]!
    const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
    let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
    if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = { x: -o.x, z: -o.z }
    add(part, wallQuad(p, q, y0, y1, o))
  })
  if (lid) add(part, flat(c, y1))
}

// a wall piece from p to q facing out, its bottom and top at each end (they slope on steps)
function skin(add: Add, part: Part, s: Side, b: [number, number], t: [number, number], off = 0) {
  const [p, q] = [s.p, s.q].map((c) => ({ x: c.x + s.out.x * off, z: c.z + s.out.z * off }))
  const geo = wallQuad(p!, q!, 0, 1, s.out, s.u[0])
  const pos = geo.getAttribute('position')
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < pos.count; i++) {
    const atP = Math.hypot(pos.getX(i) - p!.x, pos.getZ(i) - p!.z) < 0.01
    const y = pos.getY(i) > 0.5 ? (atP ? t[0] : t[1]) : atP ? b[0] : b[1]
    pos.setY(i, y)
    uv.setY(i, y)
  }
  add(part, geo)
}

// a flat strip along a side from `from` to `to` meters out (negative is in), its height at
// each end
function strip(
  add: Add,
  part: Part,
  s: Side,
  from: number,
  to: number,
  y: [number, number],
  up = true,
) {
  const at = (c: Point, k: number) => ({ x: c.x + s.out.x * k, z: c.z + s.out.z * k })
  const c = [at(s.p, from), at(s.q, from), at(s.q, to), at(s.p, to)]
  const geo = flat(c, 0, up)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const nearP =
      Math.hypot(pos.getX(i) - s.p.x, pos.getZ(i) - s.p.z) <
      Math.hypot(pos.getX(i) - s.q.x, pos.getZ(i) - s.q.z)
    pos.setY(i, nearP ? y[0] : y[1])
  }
  add(part, geo)
}

export function urbanLifePlaza(add: Add, A: At, base: number) {
  const local = (y: number) => y - base
  const street = { x: -0.665, z: 0.747 }

  for (const s of raisedSides('Urban Life Building')) {
    const top = s.top.map(local) as [number, number]
    const ground = s.ground.map(local) as [number, number]
    const foot: [number, number] = [ground[0] - 0.3, ground[1] - 0.3]
    const h = s.parapet
    const planter = s.plaza === 'Urban Life planter'
    if (planter) {
      // brick, a precast cap over it
      skin(add, 'brick', s, foot, [top[0] - CAP, top[1] - CAP])
      skin(add, 'precast', s, [top[0] - CAP, top[1] - CAP], top, 0.03)
      strip(add, 'precast', s, 0.03, -0.25, top)
      continue
    }
    const tall = Math.min(top[0] - ground[0], top[1] - ground[1]) > BAND + BASE + 0.4
    const band: [number, number] = tall ? [top[0] - BAND, top[1] - BAND] : foot
    if (tall) {
      // the garage's grilles in bays on the decatur st side, piers between them
      const middle = (s.u[0] + s.u[1]) / 2
      const facesStreet = s.out.x * street.x + s.out.z * street.z > 0.7
      const grille = facesStreet && s.plaza === 'Urban Life plaza' && middle % BAY > PIER && h > 0
      if (grille) {
        const g: [number, number] = [ground[0] + 0.9, ground[1] + 0.9]
        skin(add, 'precast', s, foot, g)
        skin(add, 'metal', s, g, band, -0.18)
        strip(add, 'precast', s, 0, -0.18, g)
        strip(add, 'precast', s, 0, -0.18, band, false)
      } else skin(add, 'precast', s, foot, band)
      // the base, a step out at the bottom
      skin(add, 'precast', s, foot, [ground[0] + BASE, ground[1] + BASE], OUT)
      strip(add, 'precast', s, OUT, 0, [ground[0] + BASE, ground[1] + BASE])
    }
    // the band along the top (and the parapet over it) a little out from the wall
    const out = tall ? OUT : 0
    skin(add, 'precast', s, band, [top[0] + h, top[1] + h], out)
    if (tall) strip(add, 'precast', s, out, 0, band, false)
    if (h <= 0) continue
    // the parapet's inside and its coping, and its ends
    const inner = -COPING + out
    const sIn = { ...s, out: { x: -s.out.x, z: -s.out.z } }
    skin(add, 'precast', sIn, top, [top[0] + h, top[1] + h], COPING - out)
    strip(add, 'precast', s, out, inner, [top[0] + h, top[1] + h])
    for (const [end, c, y] of [
      [s.first, s.p, top[0]],
      [s.last, s.q, top[1]],
    ] as const) {
      if (!end) continue
      const dir =
        c === s.p ? { x: s.p.x - s.q.x, z: s.p.z - s.q.z } : { x: s.q.x - s.p.x, z: s.q.z - s.p.z }
      const l = Math.hypot(dir.x, dir.z)
      add(
        'precast',
        wallQuad(
          { x: c.x + s.out.x * out, z: c.z + s.out.z * out },
          { x: c.x + s.out.x * inner, z: c.z + s.out.z * inner },
          y,
          y + h,
          { x: dir.x / l, z: dir.z / l },
        ),
      )
    }
  }

  // a raised plaza's height at p, in the building's numbers
  const yOn = (r: Raised, p: Point) => local(fromElevation(r.elevation(p.x, p.z)))
  const ul = RAISED.find((r) => r.name === 'Urban Life plaza')!
  const y0 = yOn(ul, A(0, 40))

  // the pavers: a field wherever one fits on the plaza clear of the planters
  const rect = (a0: number, a1: number, v0: number, v1: number) => [
    A(a0, v0),
    A(a1, v0),
    A(a1, v1),
    A(a0, v1),
  ]
  const blocked = [
    ...PLANTERS.map(([a0, a1, v0, v1]) => rect(a0 - 0.2, a1 + 0.2, v0 - 0.2, v1 + 0.2)),
    RAISED.find((r) => r.name === 'Urban Life planter')!.outline,
  ]
  const fields: THREE.BufferGeometry[] = []
  for (let a = -32.4; a < 14; a += GRID)
    for (let v = 21.3 + (GRID - FIELD) / 2; v + FIELD < 57.3; v += GRID) {
      const c = rect(a, a + FIELD, v, v + FIELD)
      if (!c.every((p) => pointInPolygon(p, ul.outline))) continue
      if (blocked.some((o) => c.some((p) => pointInPolygon(p, o)))) continue
      fields.push(flat(c, yOn(ul, c[0]!) + 0.006))
    }
  for (const f of fields) add('pavers', f)

  // the brick planters: brick walls, a precast cap, the flowers in them
  for (const [a0, a1, v0, v1] of PLANTERS) {
    const c = rect(a0, a1, v0, v1)
    box(add, 'brick', c, y0 - 0.2, y0 + PLANTER_TOP - CAP, false)
    const lip = rect(a0 - 0.04, a1 + 0.04, v0 - 0.04, v1 + 0.04)
    box(add, 'precast', lip, y0 + PLANTER_TOP - CAP, y0 + PLANTER_TOP, false)
    const inner = rect(a0 + 0.2, a1 - 0.2, v0 + 0.2, v1 - 0.2)
    add('precast', flat(lip, y0 + PLANTER_TOP))
    add('plants', flat(inner, y0 + PLANTER_TOP + 0.005))
    // low mounds of flowers and leaves
    let k = 0
    for (let a = a0 + 0.55; a < a1 - 0.4; a += 0.75)
      for (let v = v0 + 0.5; v < v1 - 0.35; v += 0.7) {
        const r = 0.32 + 0.08 * Math.sin(++k * 2.1)
        const m = new THREE.SphereGeometry(r, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2)
        m.scale(1, 0.55, 1)
        const p = A(a + 0.12 * Math.sin(k), v + 0.1 * Math.cos(k * 1.3))
        m.translate(p.x, y0 + PLANTER_TOP, p.z)
        add('plants', m.toNonIndexed())
      }
  }

  // round black picnic tables with four seats on arms, perforated steel (drawn solid)
  for (const [a, v] of TABLES) {
    const c = A(a, v)
    const part = (g: THREE.BufferGeometry) => add('metal', g.toNonIndexed())
    part(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 14).translate(c.x, y0 + 0.74, c.z))
    part(new THREE.CylinderGeometry(0.07, 0.09, 0.72, 8).translate(c.x, y0 + 0.36, c.z))
    for (let i = 0; i < 4; i++) {
      const t = Math.PI / 4 + (i * Math.PI) / 2
      const [sx, sz] = [c.x + Math.cos(t) * 0.82, c.z + Math.sin(t) * 0.82]
      part(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 8).translate(sx, y0 + 0.45, sz))
      const arm = new THREE.BoxGeometry(0.82, 0.05, 0.06)
      arm.rotateY(-t).translate(c.x + Math.cos(t) * 0.41, y0 + 0.12, c.z + Math.sin(t) * 0.41)
      part(arm)
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.33, 6).translate(sx, y0 + 0.28, sz))
    }
  }

  // the treads and risers of the steps (you walk up the slope under them)
  for (const r of RAISED.filter((x) => x.stairs)) {
    const [p0, p1, p2, p3] = r.outline as [Point, Point, Point, Point]
    const hTop = yOn(r, p0)
    const hBottom = yOn(r, p3)
    const n = Math.max(2, Math.round((hTop - hBottom) / 0.17))
    const rise = (hTop - hBottom) / n
    const lerp = (a: Point, b: Point, t: number) => ({
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
    })
    // the line across the steps at t (0 at the top, 1 at the bottom)
    const across = (t: number) => [lerp(p0, p3, t), lerp(p1, p2, t)] as const
    const down = { x: p3.x - p0.x, z: p3.z - p0.z }
    const dl = Math.hypot(down.x, down.z)
    const toward = { x: down.x / dl, z: down.z / dl }
    for (let i = 0; i < n; i++) {
      const [ta, tb] = [i / n, (i + 1) / n]
      const y = hTop - (i + 0.5) * rise
      const [a0, b0] = across(ta)
      const [a1, b1] = across(tb)
      add('precast', flat([a0, b0, b1, a1], y))
      // the riser at the top of this tread, and the half one at the bottom
      add('precast', wallQuad(a0, b0, y, i === 0 ? hTop : y + rise, toward))
      if (i === n - 1) add('precast', wallQuad(a1, b1, hBottom - 0.2, y, toward))
    }
  }
}

// what you bump into on the plaza: the planters' outlines and the tables
export function plazaObstacles(A: At) {
  return {
    planters: PLANTERS.map(([a0, a1, v0, v1]) => [A(a0, v0), A(a1, v0), A(a1, v1), A(a0, v1)]),
    tables: TABLES.map(([a, v]) => ({ ...A(a, v), radius: 1.05 })),
  }
}

// 140 decatur st's side on decatur st with the steps' way in cut into it (osm's outline
// otherwise), for walking into it
export function podiumWithRecess(podium: Point[]) {
  const [p, q] = [podium[3]!, podium[4]!]
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const d = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  const inward = { x: -d.z, z: d.x }
  const mid = podium.reduce(
    (m, c) => ({ x: m.x + c.x / podium.length, z: m.z + c.z / podium.length }),
    { x: 0, z: 0 },
  )
  const sign = inward.x * (mid.x - p.x) + inward.z * (mid.z - p.z) > 0 ? 1 : -1
  const at = (u: number, k = 0) => ({
    x: p.x + d.x * u + inward.x * k * sign,
    z: p.z + d.z * u + inward.z * k * sign,
  })
  return [
    ...podium.slice(0, 4),
    at(RECESS.from),
    at(RECESS.from, RECESS.depth),
    at(RECESS.to, RECESS.depth),
    at(RECESS.to),
    ...podium.slice(4),
  ]
}
