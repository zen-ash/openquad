import * as THREE from 'three'
import type { Point } from '../game/collision'
import { RAISED } from '../game/raised'
import { lowestUnder } from '../game/surface'
import { fromElevation, heightAt, terrainAt } from '../game/terrain'
import campus from './campus.json'
import { raisedSides } from './decks'
import { flat, frame, parts as collect, wallQuad } from './landmark'

// the panther quad's own things, from gsu's opening photos (nov 2026): the sparks column on
// the raised plaza, the steps and terraces, the planting along courtland and bronzie.
// docs/reference/panther-quad.md

export type Part =
  | 'concrete'
  | 'marble'
  | 'metal'
  | 'blue'
  | 'bronze'
  | 'soil'
  | 'shrub'
  | 'grass'
  | 'paving'
  | 'lamp'
  | 'glow'

const { quad } = campus
const pt = ([x, z]: number[]) => ({ x: x!, z: z! })
const lerp = (a: Point, b: Point, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
})

// the column: marble shaft with steel in its cut corners, on three concrete steps
export const COLUMN = { half: 0.8, cut: 0.16, base: 0.8, top: 5.8, steps: [2.2, 1.85, 1.5] }
const RISE = 0.17
// the first step of a terrace stands this far over the ground in front of it
const SEAT = 0.3
const BED = 0.12

// a quad from four corners going round it, turned to face `toward`. uvs in meters along
// the bottom edge and up (or across, for flat ones)
function face(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
  toward: { x: number; y?: number; z: number },
): THREE.BufferGeometry {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a))
  if (n.x * toward.x + n.y * (toward.y ?? 0) + n.z * toward.z < 0) return face(b, a, d, c, toward)
  n.normalize()
  const along = new THREE.Vector3().subVectors(b, a)
  along.y = 0
  if (along.lengthSq() < 1e-6) along.set(1, 0, 0)
  along.normalize()
  const up = new THREE.Vector3().crossVectors(n, along)
  if (up.y < 0) up.negate()
  const corners = [a, b, c, a, c, d]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      corners.flatMap((p) => p.toArray()),
      3,
    ),
  )
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      corners.flatMap(() => n.toArray()),
      3,
    ),
  )
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      corners.flatMap((p) => [p.dot(along), Math.abs(up.y) > 0.5 ? p.y : p.dot(up)]),
      2,
    ),
  )
  return geo
}

const v3 = (p: Point, y: number) => new THREE.Vector3(p.x, y, p.z)

// a round bar from a to b (poles, rails, legs)
function bar(a: THREE.Vector3, b: THREE.Vector3, r: number, sides = 6) {
  const len = a.distanceTo(b)
  const geo = new THREE.CylinderGeometry(r, r, len, sides, 1, true).toNonIndexed()
  const dir = new THREE.Vector3().subVectors(b, a).normalize()
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir))
  geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
  return geo
}

// a copy of a shared shape moved into place
function lump(geo: THREE.BufferGeometry, m: THREE.Matrix4) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  return g.applyMatrix4(m)
}

export function pantherQuadGeometry() {
  const { add, prism, merged } = collect<Part>()

  // the column
  const [cx, cz, yaw] = quad.column as [number, number, number]
  const c = { x: cx, z: cz }
  const f = frame(c, { x: cx + Math.cos(yaw), z: cz - Math.sin(yaw) })
  const square = (h: number) => [f.at(-h, -h), f.at(h, -h), f.at(h, h), f.at(-h, h)]
  const y0 = heightAt(cx, cz)
  // three steps, then a marble plinth (gsu's photos, "1913" is cut in it)
  COLUMN.steps.forEach((h, k) => prism('concrete', square(h), y0 - 0.05, y0 + (k + 1) * RISE))
  prism('marble', square(1.05), y0, y0 + COLUMN.base)
  const { half: H, cut: K } = COLUMN
  const shaft = [
    f.at(-H, -H + K),
    f.at(-H + K, -H),
    f.at(H - K, -H),
    f.at(H, -H + K),
    f.at(H, H - K),
    f.at(H - K, H),
    f.at(-H + K, H),
    f.at(-H, H - K),
  ]
  shaft.forEach((p, i) => {
    const q = shaft[(i + 1) % 8]!
    const mid = lerp(p, q, 0.5)
    const l = Math.hypot(mid.x - cx, mid.z - cz)
    const out = { x: (mid.x - cx) / l, z: (mid.z - cz) / l }
    add(i % 2 ? 'marble' : 'metal', wallQuad(p, q, y0 + COLUMN.base, y0 + COLUMN.top, out))
    // blue light lines down both sides of each steel corner and round the top, lit at night
    // (the dusk photo)
    const lift = { x: out.x * 0.01, z: out.z * 0.01 }
    const off = (e: Point) => ({ x: e.x + lift.x, z: e.z + lift.z })
    const band = (a: Point, b: Point, y: number, h: number) =>
      add('glow', wallQuad(off(a), off(b), y, y + h, out))
    band(p, q, y0 + COLUMN.top - 0.12, 0.06)
    if (i % 2) return
    for (const t of [0.02, 0.86])
      band(
        lerp(p, q, t),
        lerp(p, q, t + 0.12),
        y0 + COLUMN.base + 0.05,
        COLUMN.top - COLUMN.base - 0.2,
      )
  })
  // a plain blue square on two faces where gsu's flame is
  for (const [a, d] of [
    [0, -H - 0.01],
    [H + 0.01, 0],
  ] as const) {
    const s = 0.32
    const [p, q, out] =
      d !== 0
        ? [f.at(a - s, d), f.at(a + s, d), { x: -f.out.x, z: -f.out.z }]
        : [f.at(a, -s), f.at(a, s), f.along]
    add('blue', wallQuad(p, q, y0 + 3.2 - s, y0 + 3.2 + s, out))
  }
  // the cornice, stepped out and back in. its underside too, from below you saw sky through
  // the overhang and it looked like it floated
  prism('marble', square(1.0), y0 + COLUMN.top, y0 + COLUMN.top + 0.22)
  add('marble', flat(square(1.0), y0 + COLUMN.top, false))
  prism('marble', square(0.92), y0 + COLUMN.top + 0.22, y0 + COLUMN.top + 0.36)

  // flagpoles
  for (const [x, z] of quad.flags as [number, number][]) {
    const g = heightAt(x, z)
    add('metal', bar(new THREE.Vector3(x, g, z), new THREE.Vector3(x, g + 11, z), 0.07, 8))
    add('metal', bar(new THREE.Vector3(x, g, z), new THREE.Vector3(x, g + 0.5, z), 0.12, 8))
  }

  plazaSides(add)
  stairs(add)
  terraces(add)
  beds(add)
  bronzie(add)
  porch(add)
  seats(add)
  lights(add)
  return merged()
}

type Add = (part: Part, geo: THREE.BufferGeometry) => void

// the plaza's walls where the ground round it is lower
function plazaSides(add: Add) {
  for (const s of raisedSides('Panther Quad')) {
    const foot = s.ground.map((g) => g - 0.3)
    const [a, b] = [v3(s.p, s.top[0]), v3(s.q, s.top[1])]
    add('concrete', face(v3(s.p, foot[0]!), v3(s.q, foot[1]!), b, a, s.out))
    // a coping along the top
    const o = { x: s.p.x + s.out.x * 0.05, z: s.p.z + s.out.z * 0.05 }
    const q = { x: s.q.x + s.out.x * 0.05, z: s.q.z + s.out.z * 0.05 }
    add(
      'concrete',
      face(
        v3(o, s.top[0] - 0.12),
        v3(q, s.top[1] - 0.12),
        v3(q, s.top[1] + 0.02),
        v3(o, s.top[0] + 0.02),
        s.out,
      ),
    )
    add(
      'concrete',
      face(
        v3(s.p, s.top[0] + 0.02),
        v3(s.q, s.top[1] + 0.02),
        v3(q, s.top[1] + 0.02),
        v3(o, s.top[0] + 0.02),
        UP,
      ),
    )
  }
}

const UP = { x: 0, y: 1, z: 0 }

// the steps down from the plaza to the lawn, with rails at the sides and in the middle. the
// library stair is in pieces (flights, landings, a deck), each one drawn here
function stairs(add: Add) {
  for (const r of RAISED.filter((x) => x.stairs && x.by === 'Panther Quad')) {
    const [p0, p1, p2, p3] = r.outline as [Point, Point, Point, Point]
    const yOn = (p: Point) => fromElevation(r.elevation(p.x, p.z))
    const hTop = yOn(p0)
    const hBottom = yOn(p3)
    const level = hTop - hBottom < 0.05
    const n = level ? 1 : Math.max(2, Math.round((hTop - hBottom) / RISE))
    const rise = (hTop - hBottom) / n
    const across = (t: number) => [lerp(p0, p3, t), lerp(p1, p2, t)] as const
    const dl = Math.hypot(p3.x - p0.x, p3.z - p0.z)
    const toward = { x: (p3.x - p0.x) / dl, z: (p3.z - p0.z) / dl }
    for (let i = 0; i < n; i++) {
      const yt = hTop - (i + 1) * rise
      const [a0, b0] = across(i / n)
      const [a1, b1] = across((i + 1) / n)
      add('concrete', face(v3(a0, yt), v3(b0, yt), v3(b1, yt), v3(a1, yt), UP))
      if (!level) add('concrete', wallQuad(a0, b0, yt, yt + rise, toward))
      // the library stair's treads have dark perforated steel nosings
      if (level || i === n - 1 || !r.name.includes('library')) continue
      const [c0, c1] = across((i + 1) / n - 0.06 / dl)
      add(
        'bronze',
        face(v3(c0, yt + 0.004), v3(c1, yt + 0.004), v3(b1, yt + 0.004), v3(a1, yt + 0.004), UP),
      )
    }
    // the cheeks at the ends, down to the ground
    for (const [a, b] of [
      [p0, p3],
      [p1, p2],
    ] as const) {
      const side = lowestUnder([
        [a.x, a.z],
        [b.x, b.z],
      ])
      const other = a === p0 ? p1 : p0
      const out = { x: a.x - other.x, z: a.z - other.z }
      add('concrete', face(v3(a, side - 0.3), v3(b, side - 0.3), v3(b, hBottom), v3(a, hTop), out))
    }
    const library = r.name.includes('library')
    // handrails up the flights: both sides and the middle
    if (!level)
      for (const t of library ? [0.5, 0.96] : [0.04, 0.5, 0.96]) {
        const a = lerp(p0, p1, t)
        const b = lerp(p3, p2, t)
        const top = v3(a, hTop + 0.9)
        const bottom = v3(b, hBottom + 0.9)
        add('metal', bar(top, bottom, 0.025))
        add('metal', bar(v3(a, hTop), top, 0.025))
        add('metal', bar(v3(b, hBottom), bottom, 0.025))
      }
    // the library stair's open side has a guard: steel posts with thin cables between them,
    // and along library north's wall there's a planter full of shrubs
    if (library) {
      guard(add, p0, p3, hTop, hBottom)
      wallPlanter(add, p1, p2, { x: p1.x - p0.x, z: p1.z - p0.z }, hTop, hBottom)
    }
  }
}

// a strip of planting between the stair and the wall, its rim a bit over the treads
function wallPlanter(add: Add, a: Point, b: Point, toWall: Point, ya: number, yb: number) {
  const l = Math.hypot(toWall.x, toWall.z)
  const e = { x: (toWall.x / l) * 0.85, z: (toWall.z / l) * 0.85 }
  const [a1, b1] = [
    { x: a.x + e.x, z: a.z + e.z },
    { x: b.x + e.x, z: b.z + e.z },
  ]
  const into = { x: -e.x, z: -e.z }
  add('concrete', face(v3(a, ya), v3(b, yb), v3(b, yb + 0.45), v3(a, ya + 0.45), into))
  const rim = { x: (toWall.x / l) * 0.12, z: (toWall.z / l) * 0.12 }
  const [a2, b2] = [
    { x: a.x + rim.x, z: a.z + rim.z },
    { x: b.x + rim.x, z: b.z + rim.z },
  ]
  add(
    'concrete',
    face(v3(a, ya + 0.45), v3(b, yb + 0.45), v3(b2, yb + 0.45), v3(a2, ya + 0.45), UP),
  )
  // its end at the bottom of the stair, down to the porch
  if (yb < ya) {
    const g = heightAt(b.x, b.z) - 0.1
    const out = { x: b.x - a.x, z: b.z - a.z }
    add('concrete', face(v3(b, g), v3(b1, g), v3(b1, yb + 0.45), v3(b, yb + 0.45), out))
  }
  add('soil', face(v3(a, ya + 0.38), v3(b, yb + 0.38), v3(b1, yb + 0.38), v3(a1, ya + 0.38), UP))
  const len = Math.hypot(b.x - a.x, b.z - a.z)
  for (let s = 0.25; s < len; s += 0.5) {
    const t = s / len
    const r = rand(a.x * 3 + s)
    const p = lerp(lerp(a, b, t), lerp(a1, b1, t), 0.35 + r * 0.3)
    const y = ya + (yb - ya) * t + 0.38
    if (r > 0.7) tuft(add, v3(p, y), r)
    else shrub(add, new THREE.Vector3(p.x, y + 0.12, p.z), [0.3, 0.38, 0.3], r)
  }
}

function guard(add: Add, a: Point, b: Point, ya: number, yb: number) {
  const len = Math.hypot(b.x - a.x, b.z - a.z)
  const k = Math.max(1, Math.round(len / 1.4))
  for (let i = 0; i <= k; i++) {
    const p = lerp(a, b, i / k)
    const y = ya + ((yb - ya) * i) / k
    add('metal', bar(v3(p, y), v3(p, y + 1.07), 0.03, 4))
  }
  add('metal', bar(v3(a, ya + 1.07), v3(b, yb + 1.07), 0.03))
  for (const h of [0.25, 0.5, 0.75]) add('metal', bar(v3(a, ya + h), v3(b, yb + h), 0.006, 3))
}

// seat steps up the bank, each tread level across and following the ground along it
function terraces(add: Add) {
  for (const { steps, rise, points } of quad.terraces) {
    const [a0, b0, b1, a1] = points.map(pt) as [Point, Point, Point, Point]
    const len = Math.hypot(b0.x - a0.x, b0.z - a0.z)
    const m = Math.ceil(len / 2)
    const line = (t: number, s: number) => lerp(lerp(a0, a1, t), lerp(b0, b1, t), s)
    let prev = Array.from({ length: m + 1 }, (_, k) => {
      const p = line(0, k / m)
      return terrainAt(p.x, p.z)
    })
    const front = { x: a0.x - a1.x, z: a0.z - a1.z }
    const end = { x: b0.x - a0.x, z: b0.z - a0.z }
    for (let i = 0; i < steps; i++) {
      const [t0, t1] = [i / steps, (i + 1) / steps]
      const tops = Array.from({ length: m + 1 }, (_, k) => {
        const [p, q] = [line(t0, k / m), line(t1, k / m)]
        return Math.max(heightAt(q.x, q.z), heightAt(p.x, p.z), prev[k]! + (i ? rise : SEAT)) + 0.02
      })
      for (let k = 0; k < m; k++) {
        const [pa, pb, qa, qb] = [
          line(t0, k / m),
          line(t0, (k + 1) / m),
          line(t1, k / m),
          line(t1, (k + 1) / m),
        ]
        add(
          'concrete',
          face(v3(pa, tops[k]!), v3(pb, tops[k + 1]!), v3(qb, tops[k + 1]!), v3(qa, tops[k]!), UP),
        )
        // the first riser goes on down into the ground
        const drop = i ? 0 : 0.3
        add(
          'concrete',
          face(
            v3(pa, prev[k]! - drop),
            v3(pb, prev[k + 1]! - drop),
            v3(pb, tops[k + 1]!),
            v3(pa, tops[k]!),
            front,
          ),
        )
      }
      // ends
      for (const k of [0, m]) {
        const [p, q] = [line(t0, k / m), line(t1, k / m)]
        const g = Math.min(terrainAt(p.x, p.z), terrainAt(q.x, q.z)) - 0.3
        const out = k === 0 ? { x: -end.x, z: -end.z } : end
        add('concrete', face(v3(p, g), v3(q, g), v3(q, tops[k]!), v3(p, tops[k]!), out))
      }
      prev = tops
    }
    // rails up both sides of a stair, and one down the middle of a wide one
    if (rise < 0.2)
      for (const s of len > 3 ? [0.03, 0.5, 0.97] : [0.03, 0.97]) {
        const p = line(0, s)
        const q = line(1, s)
        const [yp, yq] = [heightAt(p.x, p.z) + 0.9, prev[Math.round(s * m)]! + 0.9]
        add('metal', bar(v3(p, yp), v3(q, yq), 0.025))
        add('metal', bar(v3(p, yp - 0.9), v3(p, yp), 0.025))
        add('metal', bar(v3(q, yq - 0.9), v3(q, yq), 0.025))
      }
    // the back of the top step, down to the planting behind it
    for (let k = 0; k < m; k++) {
      const [qa, qb] = [line(1, k / m), line(1, (k + 1) / m)]
      const ga = heightAt(qa.x, qa.z) - 0.3
      const gb = heightAt(qb.x, qb.z) - 0.3
      add(
        'concrete',
        face(v3(qa, ga), v3(qb, gb), v3(qb, prev[k + 1]!), v3(qa, prev[k]!), {
          x: -front.x,
          z: -front.z,
        }),
      )
    }
  }
}

// the planting beds: mulch a bit over the ground with a concrete edge, shrubs in them. the
// raised planters have a level top and rails where they stand high over the ground
function beds(add: Add) {
  quad.beds.forEach((points, b) => bed(add, points.map(pt), b, null))
  quad.planters.forEach((points, b) => {
    const c = points.map(pt)
    bed(add, c, 100 + b, Math.max(...c.map((p) => heightAt(p.x, p.z))) + 0.4)
  })
  for (const [x, z] of quad.saplings as [number, number][]) sapling(add, { x, z })
}

function bed(add: Add, c: Point[], b: number, level: number | null) {
  const [a0, b0, b1, a1] = c as [Point, Point, Point, Point]
  const lenA = Math.hypot(b0.x - a0.x, b0.z - a0.z)
  const lenB = Math.hypot(a1.x - a0.x, a1.z - a0.z)
  const [m, n] = [Math.max(1, Math.ceil(lenA / 2)), Math.max(1, Math.ceil(lenB / 2))]
  const at = (s: number, t: number) => lerp(lerp(a0, b0, s), lerp(a1, b1, s), t)
  const y = (p: Point) => level ?? heightAt(p.x, p.z) + BED
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      const ps = [
        at(i / m, j / n),
        at((i + 1) / m, j / n),
        at((i + 1) / m, (j + 1) / n),
        at(i / m, (j + 1) / n),
      ]
      const [c0, c1, c2, c3] = ps.map((p) => v3(p, y(p))) as THREE.Vector3[]
      add('soil', face(c0!, c1!, c2!, c3!, UP))
    }
  // the edge
  const lip = level === null ? 0.06 : 0.1
  const mid = lerp(a0, b1, 0.5)
  c.forEach((p, i) => {
    const q = c[(i + 1) % 4]!
    const l = Math.hypot(q.x - p.x, q.z - p.z)
    const k = Math.max(1, Math.ceil(l / 2))
    for (let s = 0; s < k; s++) {
      const [u, w] = [lerp(p, q, s / k), lerp(p, q, (s + 1) / k)]
      const [gu, gw] = [terrainAt(u.x, u.z) - 0.2, terrainAt(w.x, w.z) - 0.2]
      const e = lerp(u, w, 0.5)
      const out = { x: e.x - mid.x, z: e.z - mid.z }
      const [yu, yw] = [y(u) + lip, y(w) + lip]
      add('concrete', face(v3(u, gu), v3(w, gw), v3(w, yw), v3(u, yu), out))
      if (level === null) continue
      add('concrete', face(v3(u, yu), v3(w, yw), lerpUp(w, mid, yw), lerpUp(u, mid, yu), UP))
    }
  })
  // a rail along a side where it stands well over the ground
  if (level !== null)
    c.forEach((p, i) => {
      const q = c[(i + 1) % 4]!
      const e = lerp(p, q, 0.5)
      if (level - terrainAt(e.x, e.z) < 0.8) return
      const [a, b] = [v3(p, level + 1.0), v3(q, level + 1.0)]
      add('metal', bar(a, b, 0.025))
      add('metal', bar(v3(p, level), a, 0.025))
    })
  // plants, the same every time: low round shrubs about a meter apart (they went in this fall,
  // there's still a lot of mulch between them) and clumps of grass
  const gap = level === null ? 1.05 : 0.9
  for (let i = 0.5; i < lenA / gap; i++)
    for (let j = 0.5; j < lenB / gap; j++) {
      const r = rand(b * 1000 + i * 37 + j)
      if (r < 0.22) continue
      const p = at(
        (i * gap + (r - 0.5) * 0.5) / lenA,
        (j * gap + (rand(r * 99) - 0.5) * 0.5) / lenB,
      )
      if (Math.hypot(p.x - quad.bronzie[0]!, p.z - quad.bronzie[1]!) < 1.5) continue
      if (r > 0.72) {
        tuft(add, v3(p, y(p)), r)
        continue
      }
      // mostly small ones, a few bigger
      const s = r > 0.62 ? 0.45 + (r - 0.62) * 3 : 0.16 + r * 0.24
      shrub(add, new THREE.Vector3(p.x, y(p) + s * 0.25, p.z), [s, s * 0.75, s], r)
    }
}

// a clump of grass: thin blades leaning out, each a triangle seen from both sides
function tuft(add: Add, at: THREE.Vector3, r: number) {
  const h = 0.35 + r * 0.25
  for (let k = 0; k < 3; k++) {
    const t = r * 9 + (k * Math.PI * 2) / 3
    const [dx, dz] = [Math.cos(t), Math.sin(t)]
    const tip = new THREE.Vector3(at.x + dx * h * 0.35, at.y + h, at.z + dz * h * 0.35)
    const a = new THREE.Vector3(at.x - dz * 0.07, at.y, at.z + dx * 0.07)
    const b = new THREE.Vector3(at.x + dz * 0.07, at.y, at.z - dx * 0.07)
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(tip, a))
    add('grass', tri(a, b, tip, n))
    add('grass', tri(b, a, tip, n.negate()))
  }
}

function tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray()], 3),
  )
  const m = n.clone().normalize()
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute([...m.toArray(), ...m.toArray(), ...m.toArray()], 3),
  )
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2))
  return geo
}

// the top of a planter's wall, 0.2m in toward the middle
function lerpUp(p: Point, mid: Point, yy: number) {
  const l = Math.hypot(mid.x - p.x, mid.z - p.z) || 1
  return v3({ x: p.x + ((mid.x - p.x) / l) * 0.2, z: p.z + ((mid.z - p.z) / l) * 0.2 }, yy)
}

// a low lump, 8 triangles with round normals so it reads as soft, not a cut stone
const LUMP = new THREE.OctahedronGeometry(1, 0)
function shrub(add: Add, at: THREE.Vector3, size: number[], r: number) {
  const m4 = new THREE.Matrix4().compose(
    at,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(r * 0.6, r * 6, r * 0.4)),
    new THREE.Vector3(...size),
  )
  const g = lump(LUMP, m4)
  const pos = g.getAttribute('position')
  const nor = g.getAttribute('normal')
  for (let k = 0; k < pos.count; k++) {
    const n = new THREE.Vector3().fromBufferAttribute(pos, k).sub(at).normalize()
    nor.setXYZ(k, n.x, n.y, n.z)
  }
  add('shrub', g)
}

// a young tree: a thin trunk and a few bare branches (the map's trees are all full grown, the
// new ones on the quad are 3-4m whips, bare in the november photos)
function sapling(add: Add, p: Point) {
  const g = heightAt(p.x, p.z)
  const r = rand(p.x * 7 + p.z)
  const h = 3.2 + r * 0.8
  add('bronze', bar(v3(p, g), v3(p, g + h), 0.05, 5))
  for (let k = 0; k < 5; k++) {
    const t = r * 11 + k * 2.4
    const y = g + 1.7 + k * 0.32
    const reach = 0.9 - k * 0.1
    const end = new THREE.Vector3(p.x + Math.cos(t) * reach, y + 0.8, p.z + Math.sin(t) * reach)
    add('bronze', bar(new THREE.Vector3(p.x, y, p.z), end, 0.02, 4))
  }
}

const rand = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// bronzie: a crouching panther stepping down off a rock, on a concrete block. a plain
// shape, not a copy of the sculpture
function bronzie(add: Add) {
  const [x, z, yaw] = quad.bronzie as [number, number, number]
  const g = heightAt(x, z)
  const top = g + 0.75
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, 0, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(1, 1, 1),
  )
  const place = (geo: THREE.BufferGeometry) => {
    geo.applyMatrix4(m)
    add('bronze', geo)
  }
  // the block
  const f = frame({ x, z }, { x: x + Math.cos(yaw), z: z - Math.sin(yaw) })
  const block = [f.at(-1.2, -0.48), f.at(1.2, -0.48), f.at(1.2, 0.48), f.at(-1.2, 0.48)]
  boxOf(add, block, lowestUnder(block.map((p) => [p.x, p.z])) - 0.2, top)

  const v = (a: number, b: number, c: number) => new THREE.Vector3(a, b, c)
  const rock = new THREE.DodecahedronGeometry(1, 0)
  place(
    lump(
      rock,
      new THREE.Matrix4().compose(
        v(-0.5, top + 0.18, 0),
        new THREE.Quaternion(),
        v(0.42, 0.3, 0.3),
      ),
    ),
  )
  place(
    lump(
      rock,
      new THREE.Matrix4().compose(
        v(0.45, top + 0.08, 0.02),
        new THREE.Quaternion(),
        v(0.32, 0.16, 0.26),
      ),
    ),
  )
  // body, chest and head, the nose lower than the hips
  const body = new THREE.CapsuleGeometry(0.15, 1.1, 4, 8)
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2 - 0.2))
  place(lump(body, new THREE.Matrix4().compose(v(-0.05, top + 0.9, 0), tilt, v(1.35, 1, 0.85))))
  // deep chest at the front, haunches at the back, a slim waist between
  const blob = new THREE.SphereGeometry(1, 8, 6)
  const sq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.25))
  place(lump(blob, new THREE.Matrix4().compose(v(0.32, top + 0.8, 0), sq, v(0.32, 0.25, 0.19))))
  place(lump(blob, new THREE.Matrix4().compose(v(-0.45, top + 0.98, 0), sq, v(0.3, 0.24, 0.2))))
  const head = new THREE.SphereGeometry(0.14, 8, 6)
  place(
    lump(
      head,
      new THREE.Matrix4().compose(
        v(0.66, top + 0.7, 0),
        new THREE.Quaternion(),
        v(1.35, 0.9, 0.95),
      ),
    ),
  )
  // legs
  for (const s of [-0.1, 0.1]) {
    place(bar(v(-0.5, top + 0.4, s), v(-0.45, top + 0.95, s * 1.3), 0.08))
    place(bar(v(0.46, top + 0.15, s), v(0.36, top + 0.8, s * 1.2), 0.07))
  }
  // the tail, a long curve back and up
  const tail = new THREE.CatmullRomCurve3([
    v(-0.62, top + 1.0, 0),
    v(-1.0, top + 1.12, 0),
    v(-1.4, top + 1.12, 0),
    v(-1.62, top + 0.95, 0),
    v(-1.7, top + 0.8, 0),
  ])
  place(new THREE.TubeGeometry(tail, 10, 0.035, 5, false).toNonIndexed())
}

// the porch at the foot of the library stair: grey stone pavers a touch over the brick, in
// two pieces round the corner of the lobby. its benches, and the chairs, umbrellas and bins
function porch(add: Add) {
  for (const c of quad.porch) sheet(add, 'paving', c.map(pt), 0.03)

  // long backless benches, black steel
  for (const [x, z, yaw] of quad.benches as [number, number, number][]) {
    const g = heightAt(x, z) + 0.03
    const parts = [
      box(3, 0.07, 0.5, 0, 0.42, 0),
      ...[-1.15, 1.15].map((bx) => box(0.08, 0.39, 0.44, bx, 0.195, 0)),
    ]
    for (const geo of parts) add('bronze', placed(geo, x, g, z, yaw))
  }
  // adirondack chairs: a sloped seat, a tall leaning back and wide flat arms
  for (const [x, z, yaw] of quad.chairs as [number, number, number][]) {
    const g = heightAt(x, z)
    const parts = [
      box(0.62, 0.05, 0.6, 0, 0.34, 0.05, -0.12),
      box(0.6, 0.85, 0.04, 0, 0.72, -0.28, -0.35),
      ...[-0.37, 0.37].flatMap((ax) => [
        box(0.1, 0.03, 0.72, ax, 0.6, 0.08),
        box(0.06, 0.6, 0.06, ax, 0.3, 0.36),
        box(0.06, 0.4, 0.06, ax, 0.2, -0.2),
      ]),
    ]
    for (const geo of parts) add('blue', placed(geo, x, g, z, yaw))
  }
  // market umbrellas, closed: a pole on a black base and the canopy folded down round it
  for (const [x, z] of quad.umbrellas as [number, number][]) {
    const g = heightAt(x, z)
    add('bronze', placed(new THREE.CylinderGeometry(0.28, 0.3, 0.08, 10), x, g + 0.04, z, 0))
    add('metal', bar(v3({ x, z }, g), v3({ x, z }, g + 2.7), 0.022, 5))
    // the folded canopy: narrow at the rib tips, widest a bit under the top
    const canopy = new THREE.ConeGeometry(0.16, 1.1, 8, 1, true).rotateX(Math.PI)
    add('blue', placed(canopy, x, g + 1.7, z, 0))
    add('blue', placed(new THREE.ConeGeometry(0.16, 0.3, 8, 1, true), x, g + 2.4, z, 0))
  }
  for (const [x, z] of quad.bins as [number, number][]) {
    const g = heightAt(x, z)
    add('blue', placed(new THREE.CylinderGeometry(0.29, 0.27, 0.95, 12), x, g + 0.475, z, 0))
  }
}

// seat walls along the promenade side of the lawn, a concrete block with a thin cap
function seats(add: Add) {
  for (const [a, b] of quad.seats as [number, number][][]) {
    const [p, q] = [pt(a!), pt(b!)]
    const f = frame(p, q)
    const c = [f.at(0, -0.28), f.at(f.len, -0.28), f.at(f.len, 0.28), f.at(0, 0.28)]
    const g = Math.max(...c.map((e) => heightAt(e.x, e.z)))
    boxOf(add, c, lowestUnder(c.map((e) => [e.x, e.z])) - 0.1, g + 0.4)
    const top = [
      f.at(-0.03, -0.31),
      f.at(f.len + 0.03, -0.31),
      f.at(f.len + 0.03, 0.31),
      f.at(-0.03, 0.31),
    ]
    boxOf(add, top, g + 0.4, g + 0.46)
  }
}

// the light poles: slim grey poles with a flat round head, lit from under it at night
function lights(add: Add) {
  for (const [x, z] of quad.lights as [number, number][]) {
    const g = heightAt(x, z)
    const p = { x, z }
    add('metal', bar(v3(p, g), v3(p, g + 0.6), 0.11, 6))
    add('metal', bar(v3(p, g), v3(p, g + 5.4), 0.065, 6))
    add('metal', placed(new THREE.CylinderGeometry(0.08, 0.33, 0.2, 10), x, g + 5.53, z, 0))
    add('lamp', placed(new THREE.CircleGeometry(0.3, 10).rotateX(Math.PI / 2), x, g + 5.43, z, 0))
  }
}

// a sheet on the ground, a few cm over it, in ~1.5m squares that follow it
function sheet(add: Add, part: Part, c: Point[], lift: number) {
  const [a0, b0, b1, a1] = c as [Point, Point, Point, Point]
  const [m, n] = [
    Math.max(1, Math.ceil(Math.hypot(b0.x - a0.x, b0.z - a0.z) / 1.5)),
    Math.max(1, Math.ceil(Math.hypot(a1.x - a0.x, a1.z - a0.z) / 1.5)),
  ]
  const at = (s: number, t: number) => lerp(lerp(a0, b0, s), lerp(a1, b1, s), t)
  const y = (p: Point) => heightAt(p.x, p.z) + lift
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      const ps = [
        at(i / m, j / n),
        at((i + 1) / m, j / n),
        at((i + 1) / m, (j + 1) / n),
        at(i / m, (j + 1) / n),
      ]
      const [q0, q1, q2, q3] = ps.map((p) => v3(p, y(p))) as THREE.Vector3[]
      add(part, face(q0!, q1!, q2!, q3!, UP))
    }
  // its edge, down into the brick
  c.forEach((p, i) => {
    const q = c[(i + 1) % c.length]!
    const mid = lerp(a0, b1, 0.5)
    const e = lerp(p, q, 0.5)
    add(
      part,
      face(v3(p, y(p) - lift - 0.02), v3(q, y(q) - lift - 0.02), v3(q, y(q)), v3(p, y(p)), {
        x: e.x - mid.x,
        z: e.z - mid.z,
      }),
    )
  })
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, tilt = 0) =>
  new THREE.BoxGeometry(w, h, d).rotateX(tilt).translate(x, y, z)

// a shape made round 0, 0 moved to x, y, z and turned by yaw
function placed(geo: THREE.BufferGeometry, x: number, y: number, z: number, yaw: number) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
    new THREE.Vector3(1, 1, 1),
  )
  return lump(geo, m)
}

function boxOf(add: Add, c: Point[], y0: number, y1: number) {
  c.forEach((p, i) => {
    const q = c[(i + 1) % c.length]!
    const mx = (c[0]!.x + c[2]!.x) / 2
    const mz = (c[0]!.z + c[2]!.z) / 2
    const l = Math.hypot(q.x - p.x, q.z - p.z)
    let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
    if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = { x: -o.x, z: -o.z }
    add('concrete', wallQuad(p, q, y0, y1, o))
  })
  add('concrete', flat(c, y1))
}

// what you bump into: bronzie's block, the column (you can stand on its steps) and the poles
export function pantherQuadObstacles() {
  const [x, z, yaw] = quad.bronzie as [number, number, number]
  const f = frame({ x, z }, { x: x + Math.cos(yaw), z: z - Math.sin(yaw) })
  const block = [f.at(-1.2, -0.48), f.at(1.2, -0.48), f.at(1.2, 0.48), f.at(-1.2, 0.48)]
  const [cx, cz] = quad.column as [number, number]
  return {
    blocks: [
      block.map((p) => [p.x, p.z] as [number, number]),
      ...(quad.planters as [number, number][][]),
    ],
    circles: [
      { x: cx, z: cz, radius: 1.2 },
      ...(quad.flags as [number, number][]).map(([fx, fz]) => ({ x: fx, z: fz, radius: 0.2 })),
    ],
  }
}
