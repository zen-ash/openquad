import * as THREE from 'three'
import type { Point, Segment } from '../game/collision'
import { flat, parts as collect, wallQuad } from './landmark'

// hurt park's fountain, from photos. a raised marble basin with eight stepped blocks round
// it, in a wider pool painted pale blue, then a ring of flower beds. the curved marble wall
// to joel hurt stands round the south side. it hasn't run in years, there's just some
// standing water in the basin

export type Part = 'marble' | 'basin' | 'paint' | 'water' | 'soil' | 'concrete' | 'bronze'

export const BASIN = 3.2
export const POOL = 5
export const BED = 7.05
// the memorial wall: radius, thickness, height, and where it starts and ends (radians,
// 0 is east and it goes round through south)
export const WALL = { r: 7.6, thick: 0.6, height: 2.4, from: 0.35, to: Math.PI - 0.35 }

const around = (c: Point, r: number, t: number) => ({
  x: c.x + Math.cos(t) * r,
  z: c.z + Math.sin(t) * r,
})

/** the memorial wall as line segments, for walking into it */
export function memorialWall(c: Point): Segment[] {
  const n = 16
  const edge = (r: number) =>
    Array.from({ length: n + 1 }, (_, i) =>
      around(c, r, WALL.from + ((WALL.to - WALL.from) * i) / n),
    )
  const inner = edge(WALL.r - WALL.thick / 2)
  const outer = edge(WALL.r + WALL.thick / 2)
  const segs: Segment[] = []
  for (const line of [inner, outer])
    for (let i = 1; i < line.length; i++)
      segs.push({ ax: line[i - 1]!.x, az: line[i - 1]!.z, bx: line[i]!.x, bz: line[i]!.z })
  // the two ends
  for (const i of [0, n])
    segs.push({ ax: inner[i]!.x, az: inner[i]!.z, bx: outer[i]!.x, bz: outer[i]!.z })
  return segs
}

export function fountainGeometry([cx, cz]: number[]) {
  const c = { x: cx!, z: cz! }
  const { add, prism, merged } = collect<Part>()

  // a ring (or part of one) from r0 to r1, with walls both sides and a flat top
  const ring = (
    part: Part,
    r0: number,
    r1: number,
    y0: number,
    y1: number,
    t0 = 0,
    t1 = Math.PI * 2,
  ) => {
    const n = Math.max(8, Math.ceil(((t1 - t0) * r1) / 0.5))
    let u = 0
    for (let i = 0; i < n; i++) {
      const a = t0 + ((t1 - t0) * i) / n
      const b = t0 + ((t1 - t0) * (i + 1)) / n
      const mid = (a + b) / 2
      const out = { x: Math.cos(mid), z: Math.sin(mid) }
      const [p0, p1, q0, q1] = [
        around(c, r1, a),
        around(c, r1, b),
        around(c, r0, a),
        around(c, r0, b),
      ]
      const len = Math.hypot(p1.x - p0.x, p1.z - p0.z)
      add(part, wallQuad(p0, p1, y0, y1, out, u))
      add(part, wallQuad(q0, q1, y0, y1, { x: -out.x, z: -out.z }, u))
      add(part, flat([p0, p1, q1, q0], y1))
      u += len
    }
    // ends, if it doesn't go all the way round
    if (t1 - t0 < Math.PI * 2 - 0.01) {
      for (const [t, side] of [
        [t0, -1],
        [t1, 1],
      ] as const) {
        const cap = { x: -Math.sin(t) * side, z: Math.cos(t) * side }
        add(part, wallQuad(around(c, r0, t), around(c, r1, t), y0, y1, cap))
      }
    }
  }
  const disk = (part: Part, r: number, y: number) =>
    add(
      part,
      flat(
        Array.from({ length: 48 }, (_, i) => around(c, r, (i / 48) * Math.PI * 2)),
        y,
      ),
    )

  // the pool and its curb, the beds and theirs
  disk('paint', POOL, 0.03)
  ring('marble', POOL, POOL + 0.3, 0, 0.4)
  ring('soil', POOL + 0.3, BED - 0.25, 0, 0.3)
  ring('concrete', BED - 0.25, BED, 0, 0.38)

  // the raised basin: veined marble outside with a lip on top, painted inside, and the
  // old water sitting in it
  ring('basin', BASIN - 0.4, BASIN, 0, 0.8)
  ring('basin', BASIN - 0.45, BASIN + 0.1, 0.8, 0.9)
  disk('paint', BASIN - 0.4, 0.25)
  disk('water', BASIN - 0.4, 0.62)
  // stepped blocks round the rim
  for (let k = 0; k < 8; k++) {
    const t = ((k + 0.5) / 8) * Math.PI * 2
    const dir = { x: Math.cos(t), z: Math.sin(t) }
    const side = { x: -dir.z, z: dir.x }
    const box = (w: number, d: number, y0: number, y1: number) => {
      const m = around(c, BASIN + 0.05, t)
      const at = (s: number, r: number) => ({
        x: m.x + side.x * s + dir.x * r,
        z: m.z + side.z * s + dir.z * r,
      })
      prism(
        'basin',
        [at(-w / 2, -d / 2), at(w / 2, -d / 2), at(w / 2, d / 2), at(-w / 2, d / 2)],
        y0,
        y1,
      )
    }
    box(0.8, 0.7, 0, 0.75)
    box(0.7, 0.58, 0.75, 1.02)
    box(0.58, 0.46, 1.02, 1.12)
  }

  // the jets: pipe rings with nozzles on them, gone green
  for (const [r, y, count] of [
    [1.9, 0.78, 16],
    [1.05, 0.74, 10],
    [0.45, 0.7, 6],
  ] as const) {
    const torus = new THREE.TorusGeometry(r, 0.045, 6, 48)
    torus.rotateX(Math.PI / 2)
    torus.translate(c.x, y, c.z)
    add('bronze', torus.toNonIndexed())
    for (let i = 0; i < count; i++) {
      const p = around(c, r, (i / count) * Math.PI * 2)
      const cup = new THREE.CylinderGeometry(0.09, 0.05, 0.12, 8)
      cup.translate(p.x, y + 0.1, p.z)
      add('bronze', cup.toNonIndexed())
    }
  }
  const pipe = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8)
  pipe.translate(c.x, 0.8, c.z)
  add('bronze', pipe.toNonIndexed())

  // the memorial wall and its coping
  const { r, thick, height, from, to } = WALL
  ring('marble', r - thick / 2, r + thick / 2, 0, height, from, to)
  ring(
    'marble',
    r - thick / 2 - 0.05,
    r + thick / 2 + 0.05,
    height,
    height + 0.1,
    from - 0.01,
    to + 0.01,
  )

  return merged()
}

/**
 * Where the inscription goes: a strip along the top of the wall's inside face.
 * returns the points along it (left to right, reading it) and its heights
 */
export function inscription([cx, cz]: number[]) {
  const c = { x: cx!, z: cz! }
  const r = WALL.r - WALL.thick / 2 - 0.02
  const n = 24
  // the middle part of the arc. you read it facing south, so it runs east to west
  const points = Array.from({ length: n + 1 }, (_, i) =>
    around(c, r, 0.55 + ((Math.PI - 1.1) * i) / n),
  )
  return { points, y0: 1.85, y1: 2.2 }
}

/**
 * The plants in the flower beds, as crossed cards. uvs point at the flower bed corner of
 * the trees' leaf texture (bottom right, and gltf's v goes down)
 */
export function bedPlantsGeometry([cx, cz]: number[]) {
  const c = { x: cx!, z: cz! }
  const r = (POOL + 0.3 + BED - 0.25) / 2
  const count = Math.round((Math.PI * 2 * r) / 0.9)
  const pos: number[] = []
  const uv: number[] = []
  const normal: number[] = []
  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) / count) * Math.PI * 2
    const n = Math.sin(i * 12.9898) * 43758.5453
    const jitter = n - Math.floor(n)
    const m = around(c, r + (jitter - 0.5) * 0.4, t)
    const w = 0.65 + jitter * 0.25
    const h = 0.75 + jitter * 0.35
    for (const turn of [Math.PI / 4, -Math.PI / 4]) {
      const a = t + Math.PI / 2 + turn
      const dx = Math.cos(a) * w
      const dz = Math.sin(a) * w
      const [x0, z0, x1, z1] = [m.x - dx, m.z - dz, m.x + dx, m.z + dz]
      const y0 = 0.28
      pos.push(x0, y0, z0, x1, y0, z1, x1, y0 + h, z1, x0, y0, z0, x1, y0 + h, z1, x0, y0 + h, z0)
      uv.push(0.5, 1, 1, 1, 1, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5)
      // lit like a soft mound, facing out from the middle of the fountain and up
      const out = { x: Math.cos(t) * 0.6, z: Math.sin(t) * 0.6 }
      for (let k = 0; k < 6; k++) normal.push(out.x, 0.8, out.z)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  // the leaf material shades by vertex color (darker inside a tree), these are all lit
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0.9), 3))
  return geo
}
