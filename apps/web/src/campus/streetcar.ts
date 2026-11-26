import * as THREE from 'three'
import { attribute, float, mix, uniform, vec3 } from 'three/tsl'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { lamps } from './carMaterial'
import { raisedSides } from './decks'
import { night } from './facade'
import type { LineData } from './geometry'
import { pointAt } from '../game/lanes'
import { RAISED } from '../game/raised'
import {
  frame,
  GAUGE,
  HEIGHT,
  SECTIONS,
  STOPS,
  streetcarPoles,
  streetcarRuns,
  WIDTH,
} from '../game/streetcar'
import { fromElevation, heightAt } from '../game/terrain'

// the streetcar's model (game/streetcar.ts says where it is, scene/Streetcar.tsx draws it):
// a siemens s70 in marta's blue, built from the photos (commons and mapillary, 2016-2022).
// no logos or the swooshes of the livery, plain blue where they are

// the contact wire's height over the rails, and the pantograph reaches it
export const WIRE = 5.6

type V = [number, number, number]

// colors (srgb, from the photos) and how each part shines: roughness, metalness
const PAINT = {
  blue: ['#24369a', 0.35, 0.15],
  lower: ['#2d2a80', 0.35, 0.15],
  skirt: ['#1a1f45', 0.5, 0.2],
  glass: ['#080a10', 0.06, 0.35],
  // the windshield: the same glass, the cab's dark behind it at night
  shield: ['#080a10', 0.06, 0.35],
  black: ['#0d0f14', 0.6, 0],
  roof: ['#8e949d', 0.6, 0.2],
  dark: ['#1d1f23', 0.8, 0],
  lamp: ['#fff6e8', 0.2, 0],
  tail: ['#ff1a0a', 0.3, 0],
  sign: ['#ff9b2a', 0.4, 0],
} as const
type Paint = keyof typeof PAINT
// what lights up: head lamps (when its end leads), tail lamps (when it trails), the windows at
// night (it's lit inside) and the destination sign
const GLOW: Partial<Record<Paint, [number, number, number, number]>> = {
  lamp: [1, 0, 0, 0],
  tail: [0, 1, 0, 0],
  glass: [0, 0, 1, 0],
  sign: [0, 0, 0, 1],
}

class Builder {
  pos: number[] = []
  col: number[] = []
  surf: number[] = []
  glow: number[] = []
  private c = new THREE.Color()
  // a quad (or triangle when d is left out), turned to face away from `inside`
  quad(a: V, b: V, c: V, d: V | null, paint: Paint, inside: V) {
    const tris = d
      ? [
          [a, b, c],
          [a, c, d],
        ]
      : [[a, b, c]]
    const [hex, rough, metal] = PAINT[paint]
    this.c.set(hex)
    const g = GLOW[paint] ?? [0, 0, 0, 0]
    for (const tri of tris as V[][]) {
      const p = tri[0]
      let [q, r] = [tri[1], tri[2]]
      const n = cross(sub(q!, p!), sub(r!, p!))
      const mid = [0, 1, 2].map((i) => (p![i]! + q![i]! + r![i]!) / 3)
      if (
        n[0] * (mid[0]! - inside[0]) + n[1] * (mid[1]! - inside[1]) + n[2] * (mid[2]! - inside[2]) <
        0
      )
        [q, r] = [r, q]
      for (const v of [p!, q!, r!]) {
        this.pos.push(...v)
        this.col.push(this.c.r, this.c.g, this.c.b)
        this.surf.push(rough, metal)
        this.glow.push(...g)
      }
    }
  }
  box(min: V, max: V, paint: Paint) {
    const c: V = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
    const p = (i: number): V => [
      i & 1 ? max[0] : min[0],
      i & 2 ? max[1] : min[1],
      i & 4 ? max[2] : min[2],
    ]
    for (const [a, b, cc, d] of [
      [0, 1, 3, 2],
      [4, 5, 7, 6],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 3, 7, 5],
    ])
      this.quad(p(a!), p(b!), p(cc!), p(d!), paint, c)
  }
  // a beam from a to b, w across
  beam(a: V, b: V, w: number, paint: Paint) {
    const d = sub(b, a)
    const l = Math.hypot(...d)
    const up: V = Math.abs(d[1]) / l > 0.9 ? [1, 0, 0] : [0, 1, 0]
    const s = norm(cross(d, up))
    const t = norm(cross(s, d))
    const c: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    const corner = (e: V, i: number, j: number): V => [
      e[0] + (s[0] * i + t[0] * j) * (w / 2),
      e[1] + (s[1] * i + t[1] * j) * (w / 2),
      e[2] + (s[2] * i + t[2] * j) * (w / 2),
    ]
    const ring = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ]
    ring.forEach(([i, j], k) => {
      const [i2, j2] = ring[(k + 1) % 4]!
      this.quad(
        corner(a, i!, j!),
        corner(a, i2!, j2!),
        corner(b, i2!, j2!),
        corner(b, i!, j!),
        paint,
        c,
      )
    })
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3))
    g.setAttribute('aSurf', new THREE.Float32BufferAttribute(this.surf, 2))
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.glow, 4))
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }
}
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a: V): V => {
  const l = Math.hypot(...a) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

// half the body's cross section, bottom middle round to the roof's middle (x out, y up)
const HALF = WIDTH / 2
const PROFILE: [number, number][] = [
  [0, 0.32],
  [HALF - 0.12, 0.32],
  [HALF, 0.42],
  [HALF, 2.62],
  [HALF - 0.02, 2.95],
  [HALF - 0.09, 3.2],
  [HALF - 0.25, 3.35],
  [0.7, 3.42],
  [0, 3.44],
]
const halfAt = (y: number) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [x0, y0] = PROFILE[i - 1]!
    const [x1, y1] = PROFILE[i]!
    if (y <= y1) return y1 === y0 ? Math.max(x0, x1) : x0 + ((x1 - x0) * (y - y0)) / (y1 - y0)
  }
  return 0
}
// heights where the paint changes on the sides
const SILL = 1.0
const HEAD = 2.45
const LOWER = 0.62
const BAND = 2.95

// what's on the side at height y, z along, given the doors and the cab
function sideAt(y: number, z: number, doors: [number, number][], cab: number) {
  const door = doors.some(([a, b]) => z > a && z < b)
  // the seam down the middle of a door
  if (doors.some(([a, b]) => Math.abs(z - (a + b) / 2) < 0.03) && y > 0.38 && y < 2.3)
    return 'black'
  if (y < LOWER && !door) return 'skirt'
  if (door)
    return y > 0.38 && y < 2.3 ? (y > 1.0 ? 'glass' : 'black') : y < LOWER ? 'skirt' : 'blue'
  if (y < SILL) return 'lower'
  if (y < HEAD) {
    if (z > cab) return y > 1.25 ? 'glass' : 'blue'
    // windows 1.35m with black pillars between: the window band reads as one dark stripe
    const f = (((z + 100) % 1.55) + 1.55) % 1.55
    return f < 0.2 ? 'black' : 'glass'
  }
  return 'blue'
}

// one section, its middle at the origin, front +z. `cab`: the end at +z is a cab. the other
// end(s) have the rubber bellows to the next section
function section(
  len: number,
  cab: boolean,
  doors: [number, number][],
  roof: 'pantograph' | 'boxes',
) {
  const b = new Builder()
  const back = -len / 2 + 0.12
  const tip = len / 2 - (cab ? 0 : 0.12)
  const cabFrom = cab ? tip - 1.9 : Infinity
  // stations along it: wherever the paint changes, plus the cab's taper
  const zs = new Set<number>([back, tip])
  for (const [a, c] of doors)
    [a, (a + c) / 2 - 0.03, (a + c) / 2 + 0.03, c].forEach((z) => zs.add(z))
  for (let z = Math.ceil((back + 100) / 1.55) * 1.55 - 100; z < tip; z += 1.55) {
    zs.add(z)
    zs.add(z + 0.2)
  }
  if (cab) [cabFrom, tip - 1.4, tip - 0.6].forEach((z) => zs.add(z))
  const stations = [...zs].filter((z) => z >= back && z <= tip).sort((p, q) => p - q)
  // the nose: narrower toward the tip, the windshield leaning back
  const taper = (z: number) => (cab ? 1 - 0.1 * Math.max(0, (z - (tip - 1.4)) / 1.4) ** 2 : 1)
  const rake = (z: number, y: number) => {
    if (!cab || z < tip - 0.6) return 0
    const k = (z - (tip - 0.6)) / 0.6
    const lean = y < 1.1 ? -0.06 * (1.1 - y) : -0.55 * ((y - 1.1) / 1.9) ** 1.2
    return k * Math.max(lean, -0.75)
  }
  const at = (x: number, y: number, z: number): V => [x * taper(z), y, z + rake(z, y)]
  // rows on the side: the profile's own points plus the paint lines
  const ys = [
    ...new Set([...PROFILE.map((p) => p[1]), LOWER, SILL, 1.25, 0.38, 1.0, 2.3, HEAD, BAND]),
  ]
    .filter((y) => y <= 3.44)
    .sort((p, q) => p - q)
  for (let i = 1; i < stations.length; i++) {
    const [z0, z1] = [stations[i - 1]!, stations[i]!]
    for (let j = 1; j < ys.length; j++) {
      const [y0, y1] = [ys[j - 1]!, ys[j]!]
      const paint =
        y0 >= BAND
          ? y0 >= 3.35
            ? 'roof'
            : 'blue'
          : sideAt((y0 + y1) / 2, (z0 + z1) / 2, doors, cabFrom)
      for (const s of [1, -1]) {
        const x0 = halfAt(y0) * s
        const x1 = halfAt(y1) * s
        b.quad(at(x0, y0, z0), at(x0, y0, z1), at(x1, y1, z1), at(x1, y1, z0), paint as Paint, [
          0,
          1.8,
          (z0 + z1) / 2,
        ])
      }
    }
    // the floor
    b.quad(
      at(HALF - 0.12, 0.32, z0),
      at(HALF - 0.12, 0.32, z1),
      at(-HALF + 0.12, 0.32, z1),
      at(-HALF + 0.12, 0.32, z0),
      'dark',
      [0, 1.8, (z0 + z1) / 2],
    )
  }
  // the cab's front: rows and columns so the lamps, the windshield and the sign get their paint
  const endRows = (z: number, front: boolean) => {
    const rows = front ? [0.32, LOWER, 0.78, 0.98, 1.1, 2.9, 3.02, 3.18, 3.35, 3.44] : [0.32, 3.44]
    const cols = front ? [-1, -0.92, -0.78, -0.55, 0.55, 0.78, 0.92, 1] : [-1, 1]
    const inside: V = [0, 1.8, z - (front ? 1 : -1)]
    for (let j = 1; j < rows.length; j++) {
      const [y0, y1] = [rows[j - 1]!, rows[j]!]
      for (let i = 1; i < cols.length; i++) {
        const [u0, u1] = [cols[i - 1]!, cols[i]!]
        const u = Math.abs((u0 + u1) / 2)
        const y = (y0 + y1) / 2
        let paint: Paint = 'blue'
        if (!front) paint = 'dark'
        else if (y < LOWER) paint = 'skirt'
        else if (y > 0.78 && y < 0.98 && u > 0.55 && u < 0.92) paint = u < 0.78 ? 'lamp' : 'tail'
        else if (y > 1.1 && y < 2.9) paint = u > 0.92 ? 'black' : 'shield'
        else if (y > 3.02 && y < 3.18) paint = u < 0.55 ? 'sign' : 'black'
        else if (y > 2.9 && y < 3.35) paint = 'black'
        b.quad(
          at(u0 * halfAt(y0), y0, z),
          at(u1 * halfAt(y0), y0, z),
          at(u1 * halfAt(y1), y1, z),
          at(u0 * halfAt(y1), y1, z),
          paint,
          inside,
        )
      }
    }
  }
  endRows(tip, cab)
  endRows(back, false)
  // bellows to the next section
  const bellows = (z0: number, z1: number) => {
    const w = HALF * 0.88
    b.box([-w, 0.4, Math.min(z0, z1)], [w, 3.15, Math.max(z0, z1)], 'dark')
  }
  bellows(back, back - 0.13)
  if (!cab) bellows(tip, tip + 0.13)
  // under it: the trucks behind the skirt
  b.box([-HALF + 0.3, 0.08, back + 0.4], [HALF - 0.3, 0.32, tip - 0.6], 'dark')
  // on the roof: the equipment under covers, or the pantograph on the middle one
  if (roof === 'boxes') {
    b.box([-0.95, 3.42, back + 0.9], [0.95, HEIGHT - 0.05, tip - 2.2], 'blue')
    b.box([-0.9, HEIGHT - 0.05, back + 1.0], [0.9, HEIGHT, tip - 2.3], 'roof')
  } else {
    b.box([-0.7, 3.42, -1.0], [0.7, 3.62, 1.0], 'roof')
    b.beam([0, 3.62, -0.6], [0, 4.65, 0.45], 0.07, 'dark')
    b.beam([0, 4.65, 0.45], [0, WIRE - 0.05, -0.15], 0.05, 'dark')
    b.box([-0.85, WIRE - 0.07, -0.25], [0.85, WIRE, -0.05], 'dark')
  }
  return b.geometry()
}

const [END, MIDDLE] = SECTIONS as [number, number]
let made: { end: THREE.BufferGeometry; middle: THREE.BufferGeometry } | null = null
/** the two kinds of section: an end with a cab at +z, and the short middle one */
export function streetcarGeometry() {
  return (made ??= {
    // one double door near the joint, in the low floor part
    end: section(END, true, [[-END / 2 + 1.3, -END / 2 + 2.6]], 'boxes'),
    middle: section(
      MIDDLE,
      false,
      [
        [-2.2, -1.25],
        [1.25, 2.2],
      ],
      'pantograph',
    ),
  })
}

// 1 on a section whose cab leads (head lamps), 0 where it trails (tail lamps)
const leads = uniform(0).onObjectUpdate(({ object }) => (object?.userData.leads as number) ?? 0)

/** one material for every bit of it: paint, glass, rubber, lamps from the vertex colors */
export const streetcarMaterial = new MeshStandardNodeMaterial()
streetcarMaterial.name = 'streetcar'
{
  const color = attribute('aColor', 'vec3')
  const surf = attribute('aSurf', 'vec2')
  const glow = attribute('aGlow', 'vec4')
  streetcarMaterial.colorNode = color
  streetcarMaterial.roughnessNode = surf.x
  streetcarMaterial.metalnessNode = surf.y
  // head lamps a lot brighter at night (like the cars'), the tail lamps and the sign always on,
  // the inside lit warm behind the glass after dark
  const head = glow.x.mul(leads).mul(mix(float(4), float(24), night))
  const tail = glow.y.mul(float(1).sub(leads)).mul(mix(float(1.5), float(8), night))
  const sign = glow.w.mul(mix(float(1.2), float(3), night))
  const inside = vec3(1, 0.82, 0.6).mul(glow.z).mul(night).mul(0.12)
  streetcarMaterial.emissiveNode = color.mul(head.add(tail).add(sign)).mul(lamps).add(inside)
}

// the rest is on the map: the stops' platforms and shelters, the poles and the wire, the rails

type P3 = [number, number, number]
// flat shaded quads with uvs in meters (the material library reads them as meters)
class Solid {
  pos: number[] = []
  uv: number[] = []
  quad(a: P3, b: P3, c: P3, d: P3, inside: P3) {
    const n = cross(sub(b, a), sub(d, a))
    const mid = [0, 1, 2].map((i) => (a[i]! + c[i]!) / 2)
    const flip =
      n[0] * (mid[0]! - inside[0]) + n[1] * (mid[1]! - inside[1]) + n[2] * (mid[2]! - inside[2]) < 0
    const [w, h] = [Math.hypot(...sub(b, a)), Math.hypot(...sub(d, a))]
    const corners: [P3, number, number][] = [
      [a, 0, 0],
      [b, w, 0],
      [c, w, h],
      [d, 0, h],
    ]
    const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]
    for (const k of order) {
      const [p, u, v] = corners[k]!
      this.pos.push(...p)
      this.uv.push(u, v)
    }
  }
  box(c: P3, along: [number, number], half: [number, number, number]) {
    // a box at c, turned to face `along` (x, z), half sizes along, up, across
    const [ax, az] = along
    const [sx, sz] = [-az, ax]
    const p = (i: number, j: number, k: number): P3 => [
      c[0] + ax * half[0] * i + sx * half[2] * k,
      c[1] + half[1] * j,
      c[2] + az * half[0] * i + sz * half[2] * k,
    ]
    const faces: [number, number, number][][] = [
      [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
      ],
      [
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1],
      ],
      [
        [-1, -1, -1],
        [-1, -1, 1],
        [-1, 1, 1],
        [-1, 1, -1],
      ],
      [
        [1, -1, -1],
        [1, -1, 1],
        [1, 1, 1],
        [1, 1, -1],
      ],
      [
        [-1, 1, -1],
        [1, 1, -1],
        [1, 1, 1],
        [-1, 1, 1],
      ],
      [
        [-1, -1, -1],
        [1, -1, -1],
        [1, -1, 1],
        [-1, -1, 1],
      ],
    ]
    for (const f of faces) this.quad(p(...f[0]!), p(...f[1]!), p(...f[2]!), p(...f[3]!), c)
  }
  // a square tube from a to b, w across
  tube(a: P3, b: P3, w: number) {
    const d = sub(b, a)
    const flat = Math.hypot(d[0], d[2])
    const side: P3 = flat > 1e-6 ? [-d[2] / flat, 0, d[0] / flat] : [1, 0, 0]
    const up = norm(cross(side, d))
    const at = (e: P3, i: number, j: number): P3 => [
      e[0] + (side[0] * i + up[0] * j) * (w / 2),
      e[1] + (side[1] * i + up[1] * j) * (w / 2),
      e[2] + (side[2] * i + up[2] * j) * (w / 2),
    ]
    const mid: P3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    const ring = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ]
    ring.forEach(([i, j], k) => {
      const [i2, j2] = ring[(k + 1) % 4]!
      this.quad(at(a, i!, j!), at(b, i!, j!), at(b, i2!, j2!), at(a, i2!, j2!), mid)
    })
  }
  geometry() {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2))
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }
}

// the platform's edge is this far from the middle of the track, and it's this wide
const EDGE = 1.62
const DEEP = 3

/** the platforms' sides (their tops are the ground lifted, game/raised.ts), the shelters'
 * steel and roofs, and their glass */
export function stopsGeometry() {
  const platform = new Solid()
  for (const side of raisedSides('streetcar')) {
    const [p, q] = [side.p, side.q]
    const inside: P3 = [(p.x + q.x) / 2 - side.out.x, side.top[0], (p.z + q.z) / 2 - side.out.z]
    platform.quad(
      [p.x, side.ground[0] - 0.15, p.z],
      [q.x, side.ground[1] - 0.15, q.z],
      [q.x, side.top[1], q.z],
      [p.x, side.top[0], p.z],
      inside,
    )
  }
  // and their concrete tops, a bit over the ground lifted onto them (where the street is narrower
  // than the real one that's the park's lawn)
  for (const r of RAISED.filter((p) => p.by === 'streetcar')) {
    const [a, b, c, d] = r.outline.map((p): P3 => [
      p.x,
      fromElevation(r.elevation(p.x, p.z)) + 0.02,
      p.z,
    ]) as [P3, P3, P3, P3]
    platform.quad(a, b, c, d, [(a[0] + c[0]) / 2, a[1] - 1, (a[2] + c[2]) / 2])
  }
  const steel = new Solid()
  const glass = new Solid()
  const runs = streetcarRuns()
  for (const stop of STOPS) {
    const r = runs[stop.on === 'east' ? 0 : 1]!
    const s = r.stops.find((t) => t.leaves === stop.leaves * 60)!.s
    const plaza = RAISED.find((p) => p.name === `Streetcar stop ${stop.name}`)
    if (!plaza) continue
    const { dir } = frame(r.line, s)
    // a glass box open to the track, 4.6m long and 1.6 deep, near the back of the platform
    const deep = stop.deep ?? DEEP
    const [d0, d1] = [EDGE + deep - 1.8, EDGE + deep - 0.2]
    const at = (u: number, d: number, y: number): P3 => {
      const f = frame(r.line, s + u)
      const [x, z] = f.right(d)
      return [x, fromElevation(plaza.elevation(x, z)) + y, z]
    }
    const posts = [
      [-2.3, d0],
      [2.3, d0],
      [-2.3, d1],
      [2.3, d1],
    ]
    for (const [u, d] of posts) {
      const base = at(u!, d!, 0)
      steel.box([base[0], base[1] + 1.3, base[2]], dir, [0.05, 1.3, 0.05])
    }
    const roof = at(0, (d0 + d1) / 2, 2.66)
    steel.box(roof, dir, [2.55, 0.07, (d1 - d0) / 2 + 0.25])
    // glass: the back and both ends
    const pane = (a: P3, b: P3) => {
      const inside: P3 = at(0, (d0 + d1) / 2, 1.3)
      glass.quad(a, b, [b[0], b[1] + 2.15, b[2]], [a[0], a[1] + 2.15, a[2]], inside)
    }
    pane(at(-2.25, d1, 0.3), at(2.25, d1, 0.3))
    pane(at(-2.3, d0 + 0.05, 0.3), at(-2.3, d1 - 0.05, 0.3))
    pane(at(2.3, d0 + 0.05, 0.3), at(2.3, d1 - 0.05, 0.3))
    // a bench along the back
    const bench = at(0, d1 - 0.35, 0.45)
    steel.box(bench, dir, [1.4, 0.03, 0.2])
  }
  return { platform: platform.geometry(), steel: steel.geometry(), glass: glass.geometry() }
}

// the overhead: poles (game/streetcar.ts) with an arm out over the track at ARM, the contact
// wire hanging from it at WIRE over the rails (one wire, no catenary, like the photos)
const ARM = 6.7

/** the poles and arms (steel), and the wire on its own (it doesn't cast a shadow) */
export function overheadGeometry() {
  const steel = new Solid()
  const wire = new Solid()
  const runs = streetcarRuns()
  for (const pole of streetcarPoles()) {
    const f = frame(runs[pole.stretch]!.line, pole.s)
    const { x, z } = pole
    const y = heightAt(x, z)
    // a tapered pole (two pieces), the arm, a stay up to the arm's end and the hanger
    steel.tube([x, y - 0.2, z], [x, y + 4, z], 0.24)
    steel.tube([x, y + 4, z], [x, y + ARM + 0.6, z], 0.18)
    const [ex, ez] = f.right(-0.4)
    const top = f.c[1] + ARM
    steel.tube([x, y + ARM, z], [ex, top, ez], 0.07)
    steel.tube([x, y + ARM + 0.55, z], [ex, top, ez], 0.03)
    steel.tube([f.c[0], top, f.c[2]], [f.c[0], f.c[1] + WIRE + 0.02, f.c[2]], 0.03)
  }
  for (const r of runs) {
    // the wire itself, a straight piece every 3m (it sags a little between poles, not drawn)
    const p = [0, 0, 0]
    const q = [0, 0, 0]
    for (let s = 0; s < r.line.length; s += 3) {
      pointAt(r.line, s, p)
      pointAt(r.line, Math.min(s + 3, r.line.length), q)
      wire.tube([p[0]!, p[1]! + WIRE, p[2]!], [q[0]!, q[1]! + WIRE, q[2]!], 0.025)
    }
  }
  return { steel: steel.geometry(), wire: wire.geometry() }
}

/** the rails in the road: two lines a track (their heads, 7cm), and the concrete they're set
 * in, on the ground like the roads (drawn draped, scene/Streetcar.tsx) */
export function trackLines() {
  const slab: LineData[] = []
  const rails: LineData[] = []
  for (const r of streetcarRuns()) {
    const along = (d: number) => {
      const pts: [number, number][] = []
      for (let s = 0; s <= r.line.length; s += 2)
        pts.push(frame(r.line, Math.min(s, r.line.length - 1)).right(d))
      return pts
    }
    slab.push({ width: 2.5, points: along(0) })
    for (const d of [-GAUGE / 2 - 0.035, GAUGE / 2 + 0.035])
      rails.push({ width: 0.1, points: along(d) })
  }
  return { slab, rails }
}
