import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
  edges,
  flat,
  frame,
  glassQuad,
  insideWalls,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// the university bookstore (66 courtland st) on unity plaza. a box of smooth light sand
// stucco with small dark punched windows, two brown half round bands round it and a metal
// coping. a two floor glass bay on the north corner (the top half has gsu's blue film on
// it), the sliding doors in a notch next to student center west under a salmon stepped
// gable, and a salmon clock tower with a metal gable roof at the back. from gsu's photos
// (2024 plaza, 2024 aerial, 2026 doors), commons (2019, courtland st), mapillary (2017-2019)
// and esri's satellite images. nothing shows the southeast side, it's copied from the plaza
// side. sources: docs/reference/university-bookstore.md
//
// courtland st is a bridge 5.2m over unity plaza and the game is flat, so it's drawn from
// the plaza: from courtland st it's 5.2m too tall, and its back stands that much over
// student center west's roof. on a wall, "u" is meters along it and "d" meters out

export type UniversityBookstoreData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][]; tower: number[][]; notch: number[][] }
}

// few parts, each is a draw call in every pass. the bands are a darker brown than the
// salmon stucco, but they're round, their underside is in shade and they read darker
export type Part = 'stucco' | 'salmon' | 'glass' | 'blue' | 'metal'

// meters above unity plaza, from gsu's 2024 photo (anchored on the parapet, the band and
// the door) and commons' 2019 one from courtland st. the bands are about 0.42m round (the
// 2015 close up and the 2019 photo, the 2024 one is too far to tell)
export const BANDS: [number, number][] = [
  [3.5, 3.92],
  [9, 9.42],
]
// the rows of windows: bottom, middle (the upper band runs across its heads) and top
export const ROWS: [number, number][] = [
  [3.95, 5.65],
  [7.9, 9.45],
  [14.6, 16],
]
export const WINDOW = 1.15
// window columns on the plaza side, meters from the north corner. the first four are in
// the 2024 photo, the rest in mapillary's 2019 one (trees hide them in 2024)
export const COLUMNS = [2.2, 4.9, 7.6, 11.9, 14.5, 20.5, 23]
// the glass bay on the north corner, meters from that corner. the film is on the top two
// rows of panes
export const BAY = { from: 1.7, to: 10.9, y0: 7.9, film: 11.7, y1: 16 }
export const ROOF = 16.6
const COPING = 17.8
// how far in the bay is, and the windows
const SET = 0.15
const DEEP = 0.3
// the parapet's thickness
const WALL = 0.34
// the stepped gable over the notch, from commons' 2019 photo (its left half is hidden, so
// it's the right half mirrored): the peak, where it steps down 0.35, and its ends
export const GABLE = { peak: 19.05, step: 0.85, drop: 0.35, end: 17.1 }
// the notch's back wall, meters from its courtland st side: the sliding doors, the glass
// over them up to CURTAIN, a salmon moulding at the head of the door
export const DOORS: [number, number] = [0.6, 3.65]
const HEAD = 3
export const CURTAIN = 15.3
// the clock tower: walls up to the eave, a metal gable roof over the southeast end of it
// (the aerial photo), and a clock on two sides. mapillary's 2019 photo from gilmer st sees
// its wall and roof over the plaza side's parapet 15m in front of it (eave 21-21.5 going by
// that), the aerial looks more like 19.5-20.5: in between. the clocks are 2.6m under the eave
export const TOWER = { eave: 20.8, ridge: 22.1, roof: 4.5 }
const CLOCK = { y: TOWER.eave - 2.6, ring: 0.95, dial: 0.42 }
// the party wall with student center west starts just under its roof. it's only as high as
// the gable's ends: commons' 2019 photo has nothing over them, the parapet behind is lower
const PARTY = 11.5

type Wall = {
  p: Point
  len: number
  dir: Point
  o: Point
  at: (u: number, d?: number) => Point
}

function wallOf(p: Point, q: Point, o: Point): Wall {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  return {
    p,
    len,
    dir,
    o,
    at: (u, d = 0) => ({ x: p.x + dir.x * u + o.x * d, z: p.z + dir.z * u + o.z * d }),
  }
}

const flip = (o: Point) => ({ x: -o.x, z: -o.z })
const v3 = (p: Point, y: number) => new THREE.Vector3(p.x, y, p.z)
const UP = new THREE.Vector3(0, 1, 0)

/**
 * A flat polygon in 3d, turned to face `want`. uvs in meters on its own plane (height up
 * a wall). pane gives it glass's aPane too, with the uvs from its corner
 */
function polygon(points: THREE.Vector3[], want: THREE.Vector3, pane = false) {
  const n = new THREE.Vector3()
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]!
    n.x += (p.y - q.y) * (p.z + q.z)
    n.y += (p.z - q.z) * (p.x + q.x)
    n.z += (p.x - q.x) * (p.y + q.y)
  })
  n.normalize()
  const pts = n.dot(want) < 0 ? [...points].reverse() : points
  if (n.dot(want) < 0) n.negate()
  const e1 = new THREE.Vector3().crossVectors(UP, n)
  if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0)
  else e1.normalize()
  const e2 = new THREE.Vector3().crossVectors(n, e1)
  const uvs = pts.map((p) => [p.dot(e1), p.dot(e2)] as const)
  const lowest = Math.min(...uvs.map((u) => u[1]))
  // v starts at the polygon's lowest point's height: the library's grime reads v as meters
  // off the ground, and a sloping face's v going far below 0 came out black
  const min = pane
    ? [Math.min(...uvs.map((u) => u[0])), lowest]
    : [0, lowest - Math.min(...pts.map((p) => p.y))]
  const pos: number[] = []
  const uv: number[] = []
  const e = new THREE.Vector3()
  for (let i = 1; i < pts.length - 1; i++) {
    // a fan over corners in a straight line gives slivers with no area
    e.subVectors(pts[i]!, pts[0]!).cross(new THREE.Vector3().subVectors(pts[i + 1]!, pts[0]!))
    if (e.dot(n) < 1e-6) continue
    for (const k of [0, i, i + 1]) {
      pos.push(pts[k]!.x, pts[k]!.y, pts[k]!.z)
      uv.push(uvs[k]![0] - min[0]!, uvs[k]![1] - min[1]!)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, i) => n.getComponent(i % 3)),
      3,
    ),
  )
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  if (pane) {
    const w = Math.max(...uvs.map((u) => u[0])) - min[0]!
    const h = Math.max(...uvs.map((u) => u[1])) - min[1]!
    const r = Math.abs(Math.sin(pos[0]! * 12.9898 + pos[2]! * 78.233) * 43758.5453) % 1
    geo.setAttribute(
      'aPane',
      new THREE.Float32BufferAttribute(
        pos.flatMap((_, i) => (i % 3 ? [] : [w, h, r])),
        3,
      ),
    )
  }
  return geo
}

// metal's ribs run along u every 0.45m (the tower roof's standing seams). squash or turn
// the uvs on everything else: copings get a joint every few meters, louvres slats
function stretch(geo: THREE.BufferGeometry, su: number, slats = false) {
  const uv = geo.getAttribute('uv')
  const pos = geo.getAttribute('position')
  for (let i = 0; i < uv.count; i++)
    if (slats) uv.setXY(i, pos.getY(i) * 4.5, uv.getX(i))
    else uv.setX(i, uv.getX(i) * su)
  return geo
}

export function bookstoreCorners(b: UniversityBookstoreData) {
  const outline = b.points.map(pt)
  const same = (p: Point, c: number[]) => Math.hypot(p.x - c[0]!, p.z - c[1]!) < 0.01
  const find = (c: number[]) => outline.findIndex((p) => same(p, c))
  const [N, E] = b.landmark!.front.map(find) as [number, number]
  const tower = b.landmark!.tower.map(find)
  const [k0, k1] = b.landmark!.notch.map(find) as [number, number]
  const count = outline.length
  // the outline goes round one way or the other
  const step = (N + 1) % count === E ? 1 : count - 1
  const next = (i: number) => (i + step) % count
  const prev = (i: number) => (i - step + count) % count
  // walking round from one corner to another
  const run = (from: number, to: number) => {
    const out = [from]
    for (let i = from; i !== to;) out.push((i = next(i)))
    return out
  }
  const f = frame(outline[N]!, outline[E]!)
  // student center west's corner: the party wall is the straight bit before the notch
  const back = f.dOf(outline[k1]!)
  let scw = prev(k1)
  while (Math.abs(f.dOf(outline[prev(scw)]!) - back) < 0.3) scw = prev(scw)
  return {
    outline,
    f,
    N,
    E,
    // the corner where courtland st meets the north side, and the notch's corner on
    // courtland st
    W: prev(N),
    C: next(k0),
    tower,
    k0,
    k1,
    scw,
    run,
  }
}

export function universityBookstoreGeometry(b: UniversityBookstoreData) {
  const { add, prism, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const c = bookstoreCorners(b)
  const { outline, f, run } = c
  const P = (i: number) => outline[i]!
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const outs = edges(outline)
  // the outward normal of the outline edge between two corners
  const outOf = (i: number, j: number) =>
    outs.find((e) => (e.p === P(i) && e.q === P(j)) || (e.p === P(j) && e.q === P(i)))!.out
  const wall = (i: number, j: number) => wallOf(P(i), P(j), outOf(i, j))

  // metal's ribs are for the tower roof and the louvres, the rest gets its uvs squashed
  const poly = (part: Part, pts: THREE.Vector3[], want: THREE.Vector3, pane = false) =>
    add(part, part === 'metal' ? stretch(polygon(pts, want), 0.05) : polygon(pts, want, pane))

  // a wall from y0 to y1 with holes in it, filled in separately
  const solid = (w: Wall, y0: number, y1: number, part: Part, holes: Hole[] = []) => {
    for (const [u0, u1, v0, v1] of solidPieces(w.len, y0, y1, holes))
      add(part, wallQuad(w.at(u0), w.at(u1), v0, v1, w.o, u0))
  }

  // glass deep in a wall or in the notch doesn't see the bright sky near the horizon, so its
  // normal leans up a bit, toward the darker sky overhead. one glass material for all of it,
  // and without this the windows came out lighter than the glass bay and the notch's glass
  // light grey (both darker in the photos)
  const shaded = (geo: THREE.BufferGeometry, o: Point) => {
    const normal = geo.getAttribute('normal')
    for (let i = 0; i < normal.count; i++) normal.setXYZ(i, o.x * 0.9, 0.44, o.z * 0.9)
    return geo
  }

  // a window set into a wall: its sides, the glass, and a plain back behind the glass. the
  // glass doesn't cast shadows (each casting part is three more draws), the back does, or
  // the sun shone through the windows onto the plaza
  const recess = (w: Wall, part: Part, glass: Part, [u0, u1, v0, v1]: Hole, depth = SET) => {
    add(glass, shaded(glassQuad(w.at(u0, -depth), w.at(u1, -depth), v0, v1, w.o), w.o))
    add('stucco', wallQuad(w.at(u0, -depth - 0.05), w.at(u1, -depth - 0.05), v0, v1, w.o))
    add(part, wallQuad(w.at(u0, -depth), w.at(u0), v0, v1, w.dir))
    add(part, wallQuad(w.at(u1, -depth), w.at(u1), v0, v1, flip(w.dir)))
    const cell = [w.at(u0, -depth), w.at(u1, -depth), w.at(u1), w.at(u0)]
    add(part, flat(cell, v0))
    add(part, flat(cell, v1, false))
  }

  // a metal box d out from a wall: louvres (with slats), the steel door, a canopy
  const lump = (
    w: Wall,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d: number,
    slats = true,
  ) => {
    const s = slats ? 1 : 0.05
    add('metal', stretch(wallQuad(w.at(u0, d), w.at(u1, d), y0, y1, w.o, u0), s, slats))
    add('metal', stretch(wallQuad(w.at(u0), w.at(u0, d), y0, y1, flip(w.dir)), s, slats))
    add('metal', stretch(wallQuad(w.at(u1), w.at(u1, d), y0, y1, w.dir), s, slats))
    const rim = [w.at(u0), w.at(u1), w.at(u1, d), w.at(u0, d)]
    add('metal', stretch(flat(rim, y1), 0.05))
    add('metal', stretch(flat(rim, y0, false), 0.05))
  }

  /**
   * A moulding along a run of walls: the profile ([d, y] pairs, d out from the wall) swept
   * along the corners, mitred where it turns. outs is the outward normal of each stretch.
   * caps closes the ends. round ones (the bands) get smooth normals
   */
  const sweep = (
    part: Part,
    pts: Point[],
    outs: Point[],
    profile: [number, number][],
    caps = [true, true],
    closed = false,
    smooth = false,
  ) => {
    const n = outs.length
    // the normal at a point of a round profile, out from its middle. the underside's point
    // straight out: the sky dome's bottom half is dark here and they came out black, in the
    // photos they're lit by the pavement
    const yc = (profile[0]![1] + profile.at(-1)![1]) / 2
    const bent = (o: Point, y: number, d: number) => {
      const ny = Math.max(0, y - yc)
      const nd = y < yc ? 1 : d
      return new THREE.Vector3(o.x * nd, ny, o.z * nd).normalize()
    }
    const corner = (i: number, d: number) => {
      const p = pts[i]!
      const a = closed ? outs[(i - 1 + n) % n]! : outs[Math.max(0, i - 1)]!
      const b = closed ? outs[i % n]! : outs[Math.min(n - 1, i)]!
      const k = 1 + a.x * b.x + a.z * b.z
      return { x: p.x + ((a.x + b.x) * d) / k, z: p.z + ((a.z + b.z) * d) / k }
    }
    const cd = profile.reduce((s, q) => s + q[0], 0) / profile.length
    const cy = profile.reduce((s, q) => s + q[1], 0) / profile.length
    for (let i = 0; i < n; i++) {
      const o = outs[i]!
      for (let j = 0; j < profile.length - 1; j++) {
        const [d0, y0] = profile[j]!
        const [d1, y1] = profile[j + 1]!
        const want = new THREE.Vector3(
          o.x * ((d0 + d1) / 2 - cd),
          (y0 + y1) / 2 - cy,
          o.z * ((d0 + d1) / 2 - cd),
        )
        const geo = polygon(
          [
            v3(corner(i, d0), y0),
            v3(corner(i + 1, d0), y0),
            v3(corner(i + 1, d1), y1),
            v3(corner(i, d1), y1),
          ],
          want,
        )
        if (smooth) {
          const pos = geo.getAttribute('position')
          const normal = geo.getAttribute('normal')
          for (let k = 0; k < pos.count; k++) {
            const near = Math.abs(pos.getY(k) - y0) < Math.abs(pos.getY(k) - y1)
            const v = bent(o, near ? y0 : y1, near ? d0 : d1)
            normal.setXYZ(k, v.x, v.y, v.z)
          }
        }
        add(part, part === 'metal' ? stretch(geo, 0.05) : geo)
      }
    }
    if (closed || profile.length < 3) return
    const along = (i: number) => {
      const [p, q] = [pts[i]!, pts[i + 1]!]
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      return new THREE.Vector3((q.x - p.x) / l, 0, (q.z - p.z) / l)
    }
    if (caps[0])
      poly(
        part,
        profile.map(([d, y]) => v3(corner(0, d), y)),
        along(0).negate(),
      )
    if (caps[1])
      poly(
        part,
        profile.map(([d, y]) => v3(corner(n, d), y)),
        along(n - 1),
      )
  }

  // a half round band from y0 to y1
  const round = ([y0, y1]: [number, number]): [number, number][] => {
    const r = (y1 - y0) / 2
    return [-90, -45, 0, 45, 90].map((t) => {
      const a = (t * Math.PI) / 180
      return [Math.cos(a) * r, (y0 + y1) / 2 + Math.sin(a) * r]
    })
  }
  const outsOf = (ids: number[]) => ids.slice(1).map((j, i) => outOf(ids[i]!, j))

  // a disc or a ring on a wall (the clocks, the round vent)
  const disc = (part: Part, w: Wall, u: number, y: number, r0: number, r1: number, d: number) => {
    const at = (r: number, t: number) => v3(w.at(u + Math.cos(t) * r, d), y + Math.sin(t) * r)
    const want = new THREE.Vector3(w.o.x, 0, w.o.z)
    const k = 24
    if (r0 === 0) {
      poly(
        part,
        Array.from({ length: k }, (_, i) => at(r1, (i / k) * Math.PI * 2)),
        want,
        part === 'glass',
      )
      return
    }
    for (let i = 0; i < k; i++) {
      const [t0, t1] = [i, i + 1].map((x) => (x / k) * Math.PI * 2) as [number, number]
      poly(part, [at(r0, t0), at(r1, t0), at(r1, t1), at(r0, t1)], want)
    }
  }
  // a clock: a light ring, a dark dial and the hands at ten past ten
  const clock = (w: Wall, u: number, y: number) => {
    disc('metal', w, u, y, CLOCK.ring - 0.12, CLOCK.ring, 0.03)
    disc('glass', w, u, y, 0, CLOCK.dial, 0.02)
    const want = new THREE.Vector3(w.o.x, 0, w.o.z)
    for (const [t, l, wd] of [
      [150, 0.24, 0.035],
      [30, 0.36, 0.025],
    ] as const) {
      const a = (t * Math.PI) / 180
      const side = [-Math.sin(a) * wd, Math.cos(a) * wd]
      const end = [Math.cos(a) * l, Math.sin(a) * l]
      poly(
        'metal',
        [
          v3(w.at(u + side[0]!, 0.04), y + side[1]!),
          v3(w.at(u + end[0]! + side[0]!, 0.04), y + end[1]! + side[1]!),
          v3(w.at(u + end[0]! - side[0]!, 0.04), y + end[1]! - side[1]!),
          v3(w.at(u - side[0]!, 0.04), y - side[1]!),
        ],
        want,
      )
    }
  }

  // the coping round the top of a run of walls and the inside of the parapet
  const parapet = (pts: Point[], outs: Point[], top = b.height) => {
    const y = top - 0.2
    sweep('metal', pts, outs, [
      [0, y],
      [0.04, y],
      [0.04, top],
      [-WALL, top],
      [-WALL, y],
    ])
    sweep('stucco', pts, outs, [
      [-WALL, ROOF],
      [-WALL, y],
    ])
  }

  // a stucco wall up to the coping, in rows of punched windows, holes left for what's on it
  const facade = (w: Wall, columns: number[], rows = ROWS, holes: Hole[] = []) => {
    const windows = columns.flatMap((u) =>
      rows.map(([v0, v1]): Hole => [u - WINDOW / 2, u + WINDOW / 2, v0, v1]),
    )
    solid(w, 0, COPING, 'stucco', [...windows, ...holes])
    for (const h of windows) recess(w, 'stucco', 'glass', h, DEEP)
  }

  // the unity plaza front: the windows, the sign, a steel door, a louvre and a round vent
  // low down (2024 photo)
  const ne = wall(c.N, c.E)
  facade(ne, COLUMNS)
  lump(ne, 0.1, 1.3, 0, 2.25, 0.05, false)
  lump(ne, 10, 11, 2.1, 2.5, 0.04)
  disc('glass', ne, 15, 1.4, 0, 0.4, 0.03)
  disc('metal', ne, 15, 1.4, 0.4, 0.47, 0.035)
  const plate = ne.at(4.85, 0.1)
  // the real plate is 6 by 1.15m, white with a blue edge, the logo at its left end
  signs.push({
    x: plate.x,
    y: 12.375,
    z: plate.z,
    rot: Math.atan2(ne.o.x, ne.o.z),
    text: 'UNIVERSITY BOOKSTORE',
    scale: 1.1,
    height: 1,
    color: '#2a3550',
  })
  add('blue', glassQuad(ne.at(4.85 - 3.03, 0.07), ne.at(4.85 + 3.03, 0.07), 11.775, 12.975, ne.o))

  // the north corner: the glass bay, two windows and two louvres under it. u is from the
  // courtland st end, the photos measure from the north corner
  const n = wall(c.W, c.N)
  const fromN = (a: number) => n.len - a
  const bay: Hole = [fromN(BAY.to), fromN(BAY.from), BAY.y0, BAY.y1]
  facade(n, [fromN(2.7), fromN(6.8)], [ROWS[0]!], [bay])
  // the dark panes one by one, each its own tone like the reflections in the photo
  const pane = (bay[1] - bay[0]) / 6
  for (const [y0, y1] of [
    [BAY.y0, BANDS[1]![0]],
    [BANDS[1]![0], BAY.film],
  ])
    for (let i = 0; i < 6; i++) {
      const u = bay[0] + i * pane
      add('glass', glassQuad(n.at(u, -SET), n.at(u + pane, -SET), y0!, y1!, n.o))
    }
  add('blue', glassQuad(n.at(bay[0], -SET), n.at(bay[1], -SET), BAY.film, BAY.y1, n.o))
  add('stucco', wallQuad(n.at(bay[0], -SET - 0.05), n.at(bay[1], -SET - 0.05), BAY.y0, BAY.y1, n.o))
  // the bay's sides, its glass is in rows
  add('stucco', wallQuad(n.at(bay[0], -SET), n.at(bay[0]), bay[2], bay[3], n.dir))
  add('stucco', wallQuad(n.at(bay[1], -SET), n.at(bay[1]), bay[2], bay[3], flip(n.dir)))
  const sill = [n.at(bay[0], -SET), n.at(bay[1], -SET), n.at(bay[1]), n.at(bay[0])]
  add('stucco', flat(sill, bay[2]))
  add('stucco', flat(sill, bay[3], false))
  lump(n, fromN(5.05), fromN(3.6), 0.3, 1.7, 0.04)
  lump(n, fromN(9.6), fromN(8.2), 0.3, 1.7, 0.04)

  // courtland st: plain under the bridge (salmon by the notch, the 2026 photos), the top
  // row of windows. commons' 2019 photo has the one by the notch, the other is a guess
  const ct = wall(c.C, c.W)
  const salmon: Hole = [0, 2.4, 0, BANDS[0]![0]]
  facade(ct, [ct.len - 6.675, ct.len - 2.025], [ROWS[2]!], [salmon])
  solid(ct, 0, BANDS[0]![0], 'salmon', [[2.4, ct.len, 0, BANDS[0]![0]]])

  // the southeast side toward urban life: no photo. the plaza side's first three columns
  // and a pair of glass doors by the tower (gsu says there's a door toward urban life)
  const se = wall(c.E, c.tower[0]!)
  const doors: Hole = [8.6, 10.4, 0, 2.4]
  facade(se, [2.2, 4.9, 7.6], ROWS, [doors])
  add('glass', glassQuad(se.at(doors[0]), se.at(doors[1]), doors[2], doors[3], se.o))
  lump(se, doors[0] - 0.2, doors[1] + 0.2, doors[3], doors[3] + 0.2, 0.25, false)

  // the notch: its side wall, salmon at the bottom
  const side = wall(c.k0, c.C)
  solid(side, 0, BANDS[0]![0], 'salmon')
  solid(side, BANDS[0]![0], COPING, 'stucco')
  // over the gable's end the parapet goes on past the corner, the gable's this thick
  const past = side.at(-WALL)
  add('stucco', wallQuad(past, side.at(0), GABLE.end, COPING, side.o))

  // the notch's back wall: salmon jambs either side of the sliding doors, a moulding over
  // them, dark glass up to CURTAIN, salmon over that up to the gable
  const bk = wall(c.k0, c.k1)
  const doorU = door ? (door.x - bk.p.x) * bk.dir.x + (door.z - bk.p.z) * bk.dir.z : bk.len / 2
  const doorway: Hole = [doorU - DOOR_WIDTH / 2, doorU + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]
  const glassAt: Hole = [0.15, bk.len - 0.15, HEAD, CURTAIN]
  solid(bk, 0, CURTAIN, 'salmon', [[DOORS[0], DOORS[1], 0, HEAD], glassAt])
  // the fixed panels either side of the doorway, and the head over it
  for (const [u0, u1, v0, v1] of solidPieces(DOORS[1] - DOORS[0], 0, HEAD, [
    [doorway[0] - DOORS[0], doorway[1] - DOORS[0], 0, DOOR_HEIGHT],
  ]))
    add('glass', shaded(glassQuad(bk.at(DOORS[0] + u0), bk.at(DOORS[0] + u1), v0, v1, bk.o), bk.o))
  // the curtain wall in rows, the panes are about 1.3 by 1.2
  const rowsOf = Math.round((CURTAIN - HEAD) / 1.23)
  for (let i = 0; i < rowsOf; i++) {
    const [v0, v1] = [i, i + 1].map((k) => HEAD + ((CURTAIN - HEAD) * k) / rowsOf) as [
      number,
      number,
    ]
    add('glass', shaded(glassQuad(bk.at(glassAt[0]), bk.at(glassAt[1]), v0, v1, bk.o), bk.o))
  }
  // its back for the shadows, the inside walls do it under the ceiling
  add(
    'stucco',
    wallQuad(bk.at(glassAt[0], -0.05), bk.at(glassAt[1], -0.05), CEILING, CURTAIN, bk.o),
  )
  // the gable
  const g = GABLE
  const mid = bk.len / 2
  const slope = (u: number) => g.peak - Math.abs(u - mid)
  const shoulder = (u: number) => {
    const x = Math.min(u, bk.len - u)
    return g.end + ((slope(g.step) - g.drop - g.end) * x) / g.step
  }
  const top: [number, number][] = [
    [0, g.end],
    [g.step, shoulder(g.step)],
    [g.step, slope(g.step)],
    [mid, g.peak],
    [bk.len - g.step, slope(bk.len - g.step)],
    [bk.len - g.step, shoulder(bk.len - g.step)],
    [bk.len, g.end],
  ]
  // a polygon on the back wall's plane, d out from it: base corners, then the gable's top
  const gable = (d: number, base: [number, number][], want: Point) => {
    const shape = new THREE.Shape(
      [...base, ...top.slice().reverse()].map(([u, y]) => new THREE.Vector2(u, y)),
    )
    const geo = new THREE.ShapeGeometry(shape).toNonIndexed()
    const pos = geo.getAttribute('position')
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < pos.count; i++) {
      const [u, y] = [pos.getX(i), pos.getY(i)]
      const p = bk.at(u, d)
      pos.setXYZ(i, p.x, y, p.z)
      uv.setXY(i, u, y)
    }
    // shape space faces +z, which lands on dir x up
    if (-bk.dir.z * want.x + bk.dir.x * want.z < 0)
      for (let i = 0; i < pos.count; i += 3) {
        const [x, y, z] = [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)]
        const [s, t] = [uv.getX(i + 1), uv.getY(i + 1)]
        pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2))
        uv.setXY(i + 1, uv.getX(i + 2), uv.getY(i + 2))
        pos.setXYZ(i + 2, x, y, z)
        uv.setXY(i + 2, s, t)
      }
    const normal = geo.getAttribute('normal')
    for (let i = 0; i < normal.count; i++) normal.setXYZ(i, want.x, 0, want.z)
    add('salmon', geo)
  }
  gable(
    0,
    [
      [0, CURTAIN],
      [bk.len, CURTAIN],
    ],
    bk.o,
  )
  // and its back over the roof
  gable(
    -WALL,
    [
      [0, ROOF],
      [bk.len, ROOF],
    ],
    flip(bk.o),
  )
  // the coping on top of it and the risers at the steps
  for (let i = 0; i < top.length - 1; i++) {
    const [[u0, y0], [u1, y1]] = [top[i]!, top[i + 1]!]
    if (Math.abs(u1 - u0) < 0.01) {
      const want = new THREE.Vector3(bk.dir.x, 0, bk.dir.z).multiplyScalar(u0 < mid ? -1 : 1)
      poly(
        'salmon',
        [
          v3(bk.at(u0, 0), y0),
          v3(bk.at(u0, 0), y1),
          v3(bk.at(u0, -WALL), y1),
          v3(bk.at(u0, -WALL), y0),
        ],
        want,
      )
      continue
    }
    const lip = 0.12
    const up = new THREE.Vector3(-(y1 - y0), u1 - u0, 0).normalize()
    const wantTop = new THREE.Vector3(bk.dir.x * up.x, up.y, bk.dir.z * up.x)
    poly(
      'metal',
      [
        v3(bk.at(u0, 0.04), y0 + 0.02),
        v3(bk.at(u1, 0.04), y1 + 0.02),
        v3(bk.at(u1, -WALL), y1 + 0.02),
        v3(bk.at(u0, -WALL), y0 + 0.02),
      ],
      wantTop,
    )
    poly(
      'metal',
      [
        v3(bk.at(u0, 0.04), y0 - lip),
        v3(bk.at(u1, 0.04), y1 - lip),
        v3(bk.at(u1, 0.04), y1 + 0.02),
        v3(bk.at(u0, 0.04), y0 + 0.02),
      ],
      new THREE.Vector3(bk.o.x, 0, bk.o.z),
    )
  }
  lump(bk, mid - 0.375, mid + 0.375, 16.3, 17.3, 0.04)
  // the moulding at the head of the doors, on the jambs
  const head: [number, number] = [2.7, HEAD]
  for (const [u0, u1] of [
    [DOORS[0], 0],
    [DOORS[1], bk.len],
  ])
    sweep('salmon', [bk.at(u0!), bk.at(u1!)], [bk.o], round(head), [true, true], false, true)
  // a round column in the corner by the doors (the 2026 photos)
  prism('salmon', circle(bk.at(0.3, 0.4), 0.3, 12), 0, BANDS[0]![1])

  // the party wall over student center west's roof. it's really about as high as that roof,
  // the game's flat ground puts it 5m over it: plain stucco with the coping
  const party = run(c.scw, c.k1)
  for (let i = 0; i < party.length - 1; i++)
    solid(wall(party[i]!, party[i + 1]!), PARTY, GABLE.end - 0.2, 'stucco')

  // the bits between the tower and student center west, and the end of their parapet over
  // the party wall's
  const jogs = run(c.tower[3]!, c.scw)
  for (let i = 0; i < jogs.length - 1; i++) facade(wall(jogs[i]!, jogs[i + 1]!), [])
  const last = wall(jogs.at(-2)!, c.scw)
  add('stucco', wallQuad(last.at(last.len), last.at(last.len, -WALL), GABLE.end, COPING, last.dir))

  // the clock tower: salmon walls to the eave, a clock on the plaza side and the end, a slit
  // window under the end's clock, a metal gable roof over the end (the aerial photo)
  const [t0, t1, t2, t3] = c.tower as [number, number, number, number]
  const eave = TOWER.eave - 0.15
  const tne = wall(t0, t1)
  const tse = wall(t1, t2)
  const tsw = wall(t2, t3)
  const slit: Hole = [tse.len / 2 - 0.13, tse.len / 2 + 0.13, 11.2, 12.5]
  solid(tne, 0, eave, 'salmon')
  solid(tse, 0, eave, 'salmon', [slit])
  recess(tse, 'salmon', 'glass', slit, 0.1)
  solid(tsw, 0, eave, 'salmon')
  // the side over the main roof
  const inner = wallOf(P(t3), P(t0), flip(tne.dir))
  solid(inner, ROOF, eave, 'salmon')
  clock(tne, tne.len - 2.4, CLOCK.y)
  clock(tse, tse.len / 2, CLOCK.y)
  const loop = [P(t0), P(t1), P(t2), P(t3), P(t0)]
  sweep(
    'metal',
    loop,
    [tne.o, tse.o, tsw.o, inner.o],
    [
      [0, eave],
      [0.05, eave],
      [0.05, TOWER.eave],
      [-0.3, TOWER.eave],
    ],
    [false, false],
    true,
  )
  add('metal', stretch(flat([P(t0), P(t1), P(t2), P(t3)], TOWER.eave), 0.05))
  // the roof: ridge along the tower over its middle, from the end back TOWER.roof
  const tf = frame(P(t0), P(t1))
  const width = tse.len
  const at3 = (s: number, d: number, y: number) => v3(tf.at(s, d), y)
  const s0 = tf.len - TOWER.roof
  const s1 = tf.len + 0.15
  const rise = (TOWER.ridge - TOWER.eave) / (width / 2)
  const eaveY = TOWER.eave + 0.02
  for (const [d0, dm] of [
    [0.15, -width / 2],
    [-width - 0.15, -width / 2],
  ] as const) {
    const want = new THREE.Vector3(0, 1, 0).add(
      new THREE.Vector3(tf.out.x, 0, tf.out.z).multiplyScalar(Math.sign(d0) * rise),
    )
    const roof = polygon(
      [at3(s0, d0, eaveY), at3(s1, d0, eaveY), at3(s1, dm, TOWER.ridge), at3(s0, dm, TOWER.ridge)],
      want,
    )
    add('metal', roof)
  }
  // its gable ends, salmon like the walls
  for (const [s, sign] of [
    [tf.len, 1],
    [s0, -1],
  ] as const)
    poly(
      'salmon',
      [at3(s, 0, TOWER.eave), at3(s, -width, TOWER.eave), at3(s, -width / 2, TOWER.ridge - 0.02)],
      new THREE.Vector3(tf.along.x * sign, 0, tf.along.z * sign),
    )
  lump(tse, width / 2 - 0.11, width / 2 + 0.11, TOWER.eave + 0.15, TOWER.eave + 0.6, 0.03)

  // the bands, all the way round from the notch to student center west. the lower one goes
  // round into the notch (it's under the bridge, the 2026 photos), the upper one stops at
  // the corner
  const lower = run(c.k0, c.scw)
  sweep('salmon', lower.map(P), outsOf(lower), round(BANDS[0]!), [false, true], false, true)
  // the upper one sticks out past the corner by the notch a bit (commons' 2019 photo)
  const upper = run(c.C, c.scw)
  const ct0 = ct.at(-0.25)
  add('salmon', wallQuad(ct0, ct.at(0), BANDS[1]![0], BANDS[1]![1], flip(ct.o)))
  const bandPts = [ct0, ...upper.slice(1).map(P)]
  sweep('salmon', bandPts, outsOf(upper), round(BANDS[1]!), [true, true], false, true)

  // the parapet: round the front from the notch to the tower, and from the tower round the
  // back to the notch
  const front = run(c.k0, t0)
  parapet([past, ...front.slice(1).map(P)], outsOf(front))
  const back = run(t3, c.scw)
  parapet(back.map(P), outsOf(back))
  parapet(party.map(P), outsOf(party), GABLE.end)
  add('metal', stretch(flat(outline, ROOF), 0.02))

  // on the roof, by eye from esri's satellite and gsu's aerial photo: a glass skylight, a
  // light glazed gable, a dark glass pyramid, and a long light screen behind the plaza side's
  // parapet (mapillary's 2019 photo sees it over the parapet)
  const fa = (a: number, d: number) => f.at(a, d)
  const roofAt = (x: number, z: number) => ({ a: f.aOf({ x, z }), d: f.dOf({ x, z }) })
  // a gable along d, w wide and l long, h high
  const ridge = (part: Part, x: number, z: number, w: number, l: number, h: number) => {
    const { a, d } = roofAt(x, z)
    for (const sign of [-1, 1]) {
      const want = new THREE.Vector3(f.along.x * sign, 1, f.along.z * sign)
      const pts = [
        v3(fa(a + (sign * w) / 2, d - l / 2), ROOF),
        v3(fa(a + (sign * w) / 2, d + l / 2), ROOF),
        v3(fa(a, d + l / 2), ROOF + h),
        v3(fa(a, d - l / 2), ROOF + h),
      ]
      // metal keeps its ribs here, they're the glazing bars
      add(part, polygon(pts, want, part === 'glass'))
      poly(
        'metal',
        [
          v3(fa(a - w / 2, d + (sign * l) / 2), ROOF),
          v3(fa(a + w / 2, d + (sign * l) / 2), ROOF),
          v3(fa(a, d + (sign * l) / 2), ROOF + h),
        ],
        new THREE.Vector3(f.out.x * sign, 0, f.out.z * sign),
      )
    }
  }
  ridge('glass', -29.7, 155, 2.4, 4, 1.2)
  ridge('metal', -23.9, 151.6, 2.4, 2.8, 1.4)
  const pyramid = roofAt(-21, 157.2)
  const base = [
    [-1.2, -1.2],
    [1.2, -1.2],
    [1.2, 1.2],
    [-1.2, 1.2],
  ].map(([da, dd]) => fa(pyramid.a + da!, pyramid.d + dd!))
  const apex = v3(fa(pyramid.a, pyramid.d), ROOF + 1.4)
  base.forEach((p, i) => {
    const q = base[(i + 1) % 4]!
    const centre = fa(pyramid.a, pyramid.d)
    const want = new THREE.Vector3((p.x + q.x) / 2 - centre.x, 1, (p.z + q.z) / 2 - centre.z)
    poly('glass', [v3(p, ROOF), v3(q, ROOF), apex], want, true)
  })
  // the screen: a box with ribs, its top just shows over the parapet from gilmer st
  const screenTop = 19.2
  const sc = [fa(6, -3), fa(16, -3), fa(16, -4.5), fa(6, -4.5)]
  sc.forEach((p, i) => {
    const q = sc[(i + 1) % 4]!
    const o = [f.out, f.along, flip(f.out), flip(f.along)][i]!
    add('metal', wallQuad(p, q, ROOF, screenTop, o))
  })
  poly(
    'metal',
    sc.map((p) => v3(p, screenTop)),
    UP,
  )

  // inside the ground floor: the notch's back wall is the glass one. along the party wall
  // they're moved in a bit, student center west's marble faces this way on the same line
  insideWalls(inside, outline, door, (p, q) => [p, q].every((x) => x === P(c.k0) || x === P(c.k1)))
  for (let i = 0; i < party.length - 1; i++) {
    const w = wall(party[i]!, party[i + 1]!)
    for (const geo of inside.solid) {
      const pos = geo.getAttribute('position')
      const mid = { x: (pos.getX(0) + pos.getX(1)) / 2, z: (pos.getZ(0) + pos.getZ(1)) / 2 }
      const t = (mid.x - w.p.x) * w.dir.x + (mid.z - w.p.z) * w.dir.z
      const off = (mid.x - w.p.x) * w.o.x + (mid.z - w.p.z) * w.o.z
      if (t > 0 && t < w.len && Math.abs(off) < 0.01) geo.translate(-w.o.x * 0.05, 0, -w.o.z * 0.05)
    }
  }

  return {
    parts: merged(),
    inside,
    signs,
    first: ['stucco'],
    noShadow: ['glass', 'blue'],
  }
}
