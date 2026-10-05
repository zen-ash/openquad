import * as THREE from 'three'
import type { Point } from '../game/collision'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
  flat,
  frame,
  insideWalls,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Hole,
} from './landmark'

// the practice facility, 145 decatur st: gsu's basketball and volleyball practice gym since
// 2016, the old natatorium next to the sports arena. a windowless box of grey concrete on
// piedmont ave, vertical ribs between flat pilasters over a plain base, a taller flat wall on
// the beach volleyball side with a low wing in front of it, flat panels on decatur st. from
// usgs's lidar (2018), mapillary (2019, 2021), gsu's 2023 photo of the volleyball courts and
// esri's satellite images. sources: docs/reference/practice-facility.md
//
// on the frame, "u" is meters along piedmont ave from osm's south node toward decatur st and
// "v" meters in from the street, toward the arena. y is meters over the piedmont ave sidewalk

export type PracticeFacilityData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { front: number[][] }
}

// the flat walls are concrete in panels, the ribbed faces the same concrete with no joints
// (one shader, two materials). brown is the rusty flue and the mulch in the planter. the
// roof doesn't cast (it faces the sun), the paint is flat on a wall
export type Part = 'concrete' | 'ribbed' | 'metal' | 'roof' | 'brown' | 'paint'

// the outline, same numbers as build-campus.mjs
export const OUTLINE: [number, number][] = [
  [-0.15, -0.2],
  [51.1, -0.2],
  [51.1, 27.8],
  [46, 27.8],
  [46, 26.9],
  [4, 26.9],
  [4, 28],
  [-0.15, 28],
  [-0.15, 25.9],
  [-7, 25.9],
  [-7, 3.9],
  [-0.15, 3.9],
]
// the party wall with the arena. the arena draws everything over it
export const PARTY = 26.9

// up the piedmont ave face (lidar, and the fitted 2019 photos): a plain base, the ribs, a band
// set back under the coping. the flat wall on the volleyball side goes a bit higher
export const BASE = 2.2
export const RIB_TOP = 9.9
const FASCIA = 10.5
export const COPING = 10.6
export const ROOF = 10.3
export const SW_TOP = 10.9
// the wall behind the ribs is the outline, the ribs and pilasters stand out of it to here
const WALL = -0.2
export const FRONT = -0.45
const DEPTH = WALL - FRONT
// the coping sticks out past them, its underside is the dark line along the top in the photos
const LIP = -0.5
// ribs 0.4 wide, 0.25 deep, a gap of about 0.2 between them (0.62 apart in the 2019 photos)
export const RIB = { width: 0.4, gap: 0.22 }
// flat pilasters every 8.7m from the base to the coping, and one at each corner
export const PILASTERS = [5.8, 14.5, 23.2, 31.9, 40.6, 49.3]
export const PILASTER = 0.65
// the wing toward the volleyball courts: ribbed toward piedmont ave like the main face, flat
// board formed concrete on the courts' side
export const WING = { u: -7, v: [3.9, 25.9], roof: 7.15, top: 7.8, ribs: 6.5, fascia: 7.1 } as const
// the slabs on the volleyball sides are thicker walls that end past the ribbed faces
const SLAB = 0.3
// the box on the roof, a low duct along the party wall (lidar), the flue on the wing. the flue
// is where the fitted 2019 photo has it, the lidar had it 1.5m nearer piedmont ave
export const UNIT = { u: [32.5, 36.3], v: [22, 26.3], top: 13.9 }
const DUCT = { u: [16, 38], v: [24.4, 26.4], top: 11.5 }
export const FLUE = { u: -6, v: 8.5, r: 0.3, top: 10.8 }
// small wall lights on the ribs (the fitted 2019 photos have four, the trees hide the rest)
const LAMPS = [2.1, 10.5, 19.2, 26.9, 35.7, 44.2]
const LAMP_Y = 4.3
// the raised planter along decatur st (2021 photos): a low concrete curb out to u, the mulch
// heaped up toward the wall. it's solid to walk into (game/world.ts)
export const PLANTER = { u: 54.5, v: [0.5, 26.5], curb: 0.45, heap: 0.8 } as const
// the floodlights for the volleyball courts on a pole by the wing's corner (lidar, 2019)
export const POLE = { u: -4.1, v: 2.8, r: 0.15, top: 19.8 }

type Wall = { at: (s: number, d?: number) => Point; o: Point; dir: Point }

// a rib's cross section, [along, out]: flat at the front with the corners taken off. in the
// sunny 2019 photo their edges are sharp, round ones looked like pipes
const CHAMFER = 0.04
const SECTION = [
  [0, 0],
  [0, DEPTH - CHAMFER],
  [CHAMFER, DEPTH],
  [RIB.width - CHAMFER, DEPTH],
  [RIB.width, DEPTH - CHAMFER],
  [RIB.width, 0],
] as const

// how many ribs fit in a run and the gap between them: whole ribs, a full gap at both ends
export function ribRun(len: number) {
  const n = Math.max(1, Math.round((len - RIB.gap) / (RIB.width + RIB.gap)))
  return { n, gap: (len - n * RIB.width) / (n + 1) }
}

export function practiceFrame(b: PracticeFacilityData) {
  const [o, e] = b.landmark!.front.map(pt) as [Point, Point]
  const f = frame(o, e)
  // f's out is in from piedmont ave
  const P = (u: number, v: number) => f.at(u, v)
  const uv = (p: Point): [number, number] => [f.aOf(p), f.dOf(p)]
  return { f, P, uv }
}

// what stands outside the walls, for walking into (game/world.ts): the planter and the pole
export function practiceObstacles(b: PracticeFacilityData) {
  const { P } = practiceFrame(b)
  const [v0, v1] = PLANTER.v
  const planter = [P(51.1, v0), P(PLANTER.u, v0), P(PLANTER.u, v1), P(51.1, v1)]
  return { planter, pole: { ...P(POLE.u, POLE.v), radius: POLE.r + 0.05 } }
}

// a flat polygon facing n (a sloped one too, flat() only does level ones), uvs in meters
function poly(pts: THREE.Vector3[], n: THREE.Vector3) {
  const pos: number[] = []
  const tex: number[] = []
  const side = new THREE.Vector3(0, 1, 0).cross(n)
  if (side.lengthSq() < 0.01) side.set(1, 0, 0)
  side.normalize()
  const up = new THREE.Vector3().crossVectors(n, side)
  for (let i = 1; i < pts.length - 1; i++) {
    let tri = [pts[0]!, pts[i]!, pts[i + 1]!]
    const c = new THREE.Vector3().subVectors(tri[1]!, tri[0]!).cross(tri[2]!.clone().sub(tri[0]!))
    if (c.dot(n) < 0) tri = [tri[0]!, tri[2]!, tri[1]!]
    for (const p of tri) {
      pos.push(p.x, p.y, p.z)
      tex.push(p.dot(side), p.dot(up))
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, i) => [n.x, n.y, n.z][i % 3]!),
      3,
    ),
  )
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2))
  return geo
}

export function practiceFacilityGeometry(b: PracticeFacilityData) {
  const { add, prism, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const { f, P } = practiceFrame(b)
  const outline = b.points.map(pt)
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : P(48.6, 27.8)
  const dir = (du: number, dv: number) => ({
    x: f.along.x * du + f.out.x * dv,
    z: f.along.z * du + f.out.z * dv,
  })

  // a wall along u at v, facing piedmont ave (-1) or the arena (1). uvs start at uvx
  const wallU = (
    part: Part,
    v: number,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    out: number,
    uvx = u0,
  ) => {
    if (u1 - u0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(P(u0, v), P(u1, v), y0, y1, dir(0, out), uvx))
  }
  // a wall along v at u, facing the volleyball courts (-1) or decatur st (1)
  const wallV = (
    part: Part,
    u: number,
    v0: number,
    v1: number,
    y0: number,
    y1: number,
    out: number,
    uvx = v0,
  ) => {
    if (v1 - v0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad(P(u, v0), P(u, v1), y0, y1, dir(out, 0), uvx))
  }
  const lid = (part: Part, pts: number[][], y: number, up = true) =>
    add(
      part,
      flat(
        pts.map(([u, v]) => P(u!, v!)),
        y,
        up,
      ),
    )
  // a box lined up with the frame, leaving out the sides in `skip` (se nw sw ne top bottom)
  const box = (
    part: Part,
    [u0, u1]: number[],
    [v0, v1]: number[],
    [y0, y1]: number[],
    skip = '',
  ) => {
    if (!skip.includes('se')) wallU(part, v0!, u0!, u1!, y0!, y1!, -1)
    if (!skip.includes('nw')) wallU(part, v1!, u0!, u1!, y0!, y1!, 1)
    if (!skip.includes('sw')) wallV(part, u0!, v0!, v1!, y0!, y1!, -1)
    if (!skip.includes('ne')) wallV(part, u1!, v0!, v1!, y0!, y1!, 1)
    const rim = [
      [u0!, v0!],
      [u1!, v0!],
      [u1!, v1!],
      [u0!, v1!],
    ]
    if (!skip.includes('top')) lid(part, rim, y1!)
    if (!skip.includes('bottom') && y0! > 0.01) lid(part, rim, y0!, false)
  }

  // one rib, s0 along the wall
  const rib = (w: Wall, s0: number, y0: number, y1: number) => {
    const pos: number[] = []
    const nor: number[] = []
    const tex: number[] = []
    let arc = s0
    for (let i = 0; i < SECTION.length - 1; i++) {
      const [[a0, a1], [c0, c1]] = [SECTION[i]!, SECTION[i + 1]!]
      const step = Math.hypot(c0 - a0, c1 - a1)
      // flat shaded, each face of it has its own normal
      const [na, no] = [(a1 - c1) / step, (c0 - a0) / step]
      const n = { x: w.dir.x * na + w.o.x * no, z: w.dir.z * na + w.o.z * no }
      const corner = (along: number, out: number, y: number, t: number) => {
        const p = w.at(s0 + along, out)
        pos.push(p.x, y, p.z)
        nor.push(n.x, 0, n.z)
        tex.push(t, y)
      }
      // wound like wallQuad's, the section goes from the left side round to the right
      corner(a0, a1, y0, arc)
      corner(c0, c1, y0, arc + step)
      corner(c0, c1, y1, arc + step)
      corner(a0, a1, y0, arc)
      corner(c0, c1, y1, arc + step)
      corner(a0, a1, y1, arc)
      arc += step
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2))
    add('ribbed', geo)
    const ring = SECTION.map(([along, out]) => w.at(s0 + along, out))
    add('ribbed', flat(ring, y1))
    // its underside is dark: as concrete it caught the bright haze under the horizon and
    // every rib had a light line under it (like petit's canopy)
    add('metal', flat(ring, y0, false))
  }

  // a flat pilaster s0..s1 along the wall from the ground to y1
  const pilaster = (w: Wall, s0: number, s1: number, y1: number, ends = [true, true]) => {
    add('ribbed', wallQuad(w.at(s0, DEPTH), w.at(s1, DEPTH), 0, y1, w.o, s0))
    const back = { x: -w.dir.x, z: -w.dir.z }
    if (ends[0]) add('ribbed', wallQuad(w.at(s0), w.at(s0, DEPTH), 0, y1, back, s0))
    if (ends[1]) add('ribbed', wallQuad(w.at(s1), w.at(s1, DEPTH), 0, y1, w.dir, s1))
  }

  // a ribbed face from s0 to s1: pilasters at `piers` (centers), ribs between them, the wall
  // behind them from the ground to `top`. gives back where the ribs are
  const ribbed = (
    w: Wall,
    s0: number,
    s1: number,
    piers: number[],
    ribTop: number,
    top: number,
  ) => {
    const centers: number[] = []
    const edges = [s0, ...piers.flatMap((c) => [c - PILASTER / 2, c + PILASTER / 2]), s1]
    for (const c of piers) pilaster(w, c - PILASTER / 2, c + PILASTER / 2, top)
    for (let i = 0; i < edges.length; i += 2) {
      const [a, z] = [edges[i]!, edges[i + 1]!]
      add('ribbed', wallQuad(w.at(a), w.at(z), 0, top, w.o, a))
      const { n, gap } = ribRun(z - a)
      for (let k = 0; k < n; k++) {
        const r = a + gap + k * (RIB.width + gap)
        rib(w, r, BASE, ribTop)
        centers.push(r + RIB.width / 2)
      }
    }
    return centers
  }

  // piedmont ave, from the slab on the volleyball side to the decatur st corner
  const piedmont: Wall = { at: (s, d = 0) => P(s, WALL - d), o: dir(0, -1), dir: dir(1, 0) }
  const ends = [-0.15 + SLAB, 51.1 - PILASTER]
  pilaster(piedmont, -0.15, ends[0]! + PILASTER - SLAB, FASCIA, [false, true])
  pilaster(piedmont, ends[1]!, 51.1, FASCIA, [true, false])
  const ribs = ribbed(piedmont, -0.15 + PILASTER, ends[1]!, PILASTERS, RIB_TOP, FASCIA)
  // the coping, and the parapet behind it over the roof
  box('metal', [ends[0]!, 50.8], [LIP, 0.1], [FASCIA, COPING], 'sw ne')
  wallU('concrete', 0.1, ends[0]!, 50.8, ROOF, FASCIA, 1)
  // the wall lights, on the nearest rib
  for (const lamp of LAMPS) {
    const u = ribs.reduce((best, c) => (Math.abs(c - lamp) < Math.abs(best - lamp) ? c : best))
    box('metal', [u - 0.17, u + 0.17], [FRONT - 0.2, FRONT], [LAMP_Y - 0.15, LAMP_Y + 0.15])
  }

  // the flat wall on the volleyball side: panels 1.4m wide with joints 0.42m along from
  // piedmont ave (fitted 2019 photo), two rows. the wing hides its bottom 7m for most of it
  const sw = (v0: number, v1: number, y0: number) =>
    wallV('concrete', -0.15, v0, v1, y0, SW_TOP - 0.1, -1, v0 - 0.42)
  sw(FRONT, WING.v[0], 0)
  sw(WING.v[0], WING.v[1], WING.roof)
  sw(WING.v[1], 28, 0)
  // its end over the piedmont ave coping, its back over the roof, its cap
  wallU('concrete', FRONT, -0.15, ends[0]!, FASCIA, SW_TOP - 0.1, -1)
  wallV('concrete', ends[0]!, FRONT, 0.1, COPING, SW_TOP - 0.1, 1)
  wallV('concrete', ends[0]!, 0.1, 28, ROOF, SW_TOP - 0.1, 1)
  wallU('concrete', 28, -0.15, ends[0]!, 0, SW_TOP - 0.1, 1)
  box('metal', [-0.2, ends[0]!], [LIP, 28.05], [SW_TOP - 0.1, SW_TOP])

  // decatur st: flat panels, one pier sticking out a few meters from the corner (2021)
  wallV('concrete', 51.1, FRONT, 27.8, 0, FASCIA, 1)
  box('concrete', [51.1, 51.4], [3, 4], [0, FASCIA], 'sw top')
  box('metal', [50.8, 51.15], [LIP, 27.85], [FASCIA, COPING], 'sw')
  box('metal', [51.15, 51.45], [2.95, 4.05], [FASCIA, COPING], 'sw')
  wallV('concrete', 50.8, 0.1, 27.5, ROOF, FASCIA, -1)
  wallV('metal', 50.8, 0.1, 27.5, FASCIA, COPING, -1)

  // the short wall in the court off decatur st, with the game's door. no photo shows a door
  // anywhere, it's a plain steel frame here
  const t = f.aOf(door)
  const holes: Hole[] = [[t - 46 - DOOR_WIDTH / 2, t - 46 + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]]
  for (const [s0, s1, y0, y1] of solidPieces(51.1 - 46, 0, FASCIA, holes))
    wallU('concrete', 27.8, 46 + s0, 46 + s1, y0, y1, 1)
  const [d0, d1] = [t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2]
  box('metal', [d0 - 0.1, d0], [27.8, 27.9], [0, DOOR_HEIGHT + 0.1])
  box('metal', [d1, d1 + 0.1], [27.8, 27.9], [0, DOOR_HEIGHT + 0.1])
  box('metal', [d0, d1], [27.8, 27.9], [DOOR_HEIGHT, DOOR_HEIGHT + 0.1], 'sw ne')
  box('metal', [45.95, 50.8], [27.5, 27.85], [FASCIA, COPING], 'sw')
  wallU('concrete', 27.5, 46, 50.8, ROOF, FASCIA, -1)
  // and the short walls at the other end of the party wall
  wallU('concrete', 28, ends[0]!, 4, 0, FASCIA, 1)
  wallV('concrete', 4, PARTY, 28, 0, FASCIA, 1)
  box('metal', [ends[0]!, 4.05], [27.7, 28.05], [FASCIA, COPING], 'sw')
  box('metal', [3.7, 4.05], [PARTY, 27.7], [FASCIA, COPING], 'se nw')
  wallU('concrete', 27.7, ends[0]!, 3.7, ROOF, FASCIA, -1)
  wallV('concrete', 3.7, PARTY, 27.7, ROOF, FASCIA, -1)

  // the roof: a white membrane, the box and the duct on it
  lid('roof', OUTLINE.slice(0, 8), ROOF)
  box('concrete', UNIT.u, UNIT.v, [ROOF, UNIT.top], 'bottom')
  box('concrete', DUCT.u, DUCT.v, [ROOF, DUCT.top], 'bottom')

  // the wing: its flat wall to the courts is board formed, narrow boards and a joint every
  // 1.3m or so (gsu's 2023 photo), so the uvs are squeezed to fit the concrete's 1.4 by 3.6m
  // panels (practiceFacilityMaterials.ts)
  const boards = (geo: THREE.BufferGeometry) => {
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, (uv.getX(i) * 1.4) / 0.42, (uv.getY(i) * 3.6) / 1.3)
    return geo
  }
  const [w0, w1] = WING.v
  const slabIn = WING.u + SLAB
  const [front, lip] = [w0 - DEPTH, w0 - WALL + LIP]
  add('concrete', boards(wallQuad(P(WING.u, w1), P(WING.u, front), 0, WING.top - 0.1, dir(-1, 0))))
  add('concrete', boards(wallQuad(P(WING.u, w1), P(-0.15, w1), 0, WING.top - 0.1, dir(0, 1))))
  // the slab's end past the ribs, and its back over the roof
  wallU('concrete', front, WING.u, slabIn, 0, WING.top - 0.1, -1)
  wallV('concrete', slabIn, front, w0, 0, WING.top - 0.1, 1)
  wallV('concrete', slabIn, w0, w1 - SLAB, WING.roof, WING.top - 0.1, 1)
  wallU('concrete', w1 - SLAB, slabIn, -0.15, WING.roof, WING.top - 0.1, -1)
  box('metal', [WING.u - 0.05, slabIn], [lip, w1 + 0.05], [WING.top - 0.1, WING.top])
  box('metal', [slabIn, -0.15], [w1 - SLAB, w1 + 0.05], [WING.top - 0.1, WING.top], 'sw ne')
  // toward piedmont ave: ribbed like the main face, lower
  const wingFace: Wall = { at: (s, d = 0) => P(s, w0 - d), o: dir(0, -1), dir: dir(1, 0) }
  ribbed(wingFace, slabIn, -0.15, [], WING.ribs, WING.fascia)
  box('metal', [slabIn, -0.15], [lip, w0 + 0.3], [WING.fascia, WING.roof + 0.05], 'sw ne')
  lid(
    'roof',
    [
      [WING.u, w0],
      [-0.15, w0],
      [-0.15, w1],
      [WING.u, w1],
    ],
    WING.roof,
  )
  // a light by the corner (2019) and the rusty flue on the roof
  box('metal', [WING.u - 0.2, WING.u], [5.4, 5.8], [6.75, 7.05])
  const flue = circle(P(FLUE.u, FLUE.v), FLUE.r, 10)
  prism('brown', flue, WING.roof, FLUE.top)
  prism('brown', circle(P(FLUE.u, FLUE.v), FLUE.r + 0.12, 10), FLUE.top, FLUE.top + 0.15)
  // the floodlight pole, four lamps on a bar at the top facing the courts
  prism('metal', circle(P(POLE.u, POLE.v), POLE.r, 8), 0, POLE.top - 0.3)
  box(
    'metal',
    [POLE.u - 0.1, POLE.u + 0.1],
    [POLE.v - 0.9, POLE.v + 0.9],
    [POLE.top - 0.6, POLE.top - 0.45],
  )
  for (const k of [-0.75, -0.25, 0.25, 0.75])
    box(
      'metal',
      [POLE.u - 0.45, POLE.u - 0.05],
      [POLE.v + k - 0.2, POLE.v + k + 0.2],
      [POLE.top - 0.45, POLE.top],
    )

  // the planter on decatur st: the curb, the mulch sloping up to the wall, its ends
  const [p0, p1] = PLANTER.v
  const inner = PLANTER.u - 0.2
  box('concrete', [inner, PLANTER.u], [p0, p1], [0, PLANTER.curb])
  const Q = (u: number, v: number, y: number) => {
    const p = P(u, v)
    return new THREE.Vector3(p.x, y, p.z)
  }
  const rise = (PLANTER.heap - PLANTER.curb) / (inner - 51.1)
  const slope = new THREE.Vector3(-f.along.x * rise, 1, -f.along.z * rise).normalize()
  const mulch = [
    Q(51.1, p0, PLANTER.heap),
    Q(inner, p0, PLANTER.curb - 0.03),
    Q(inner, p1, PLANTER.curb - 0.03),
    Q(51.1, p1, PLANTER.heap),
  ]
  add('brown', poly(mulch, slope))
  for (const [v, out] of [
    [p0, -1],
    [p1, 1],
  ] as const) {
    const end = [Q(51.1, v, 0), Q(inner, v, 0), Q(inner, v, PLANTER.curb), Q(51.1, v, PLANTER.heap)]
    const n = dir(0, out)
    add('concrete', poly(end, new THREE.Vector3(n.x, 0, n.z)))
  }

  // the painted sign on the courts' side (gsu's 2023 photo): GEORGIA STATE over a red bar
  // and BEACH VOLLEYBALL, plain letters. measured on the photo with the wall's height for
  // scale, it's along the wall a few meters from the flue
  const mid = 11.2
  const face = dir(-1, 0)
  const rot = Math.atan2(face.x, face.z)
  // [text, height, size, how condensed, out from the wall]. the lines' quads overlap, at the
  // same distance out they fought over the top of STATE
  for (const [text, y, size, wide, d] of [
    ['GEORGIA', 6.65, 1.4, 0.59, 0.03],
    ['STATE', 5.4, 1.37, 0.69, 0.05],
    ['BEACH VOLLEYBALL', 4.08, 0.62, 0.64, 0.03],
  ] as const) {
    const p = P(WING.u - d, mid)
    signs.push({
      x: p.x,
      y,
      z: p.z,
      rot,
      text,
      letters: true,
      size,
      weight: 700,
      color: '#0a4fa6',
      wide,
    })
  }
  add(
    'paint',
    wallQuad(P(WING.u - 0.02, mid + 1.28), P(WING.u - 0.02, mid - 1.28), 4.47, 4.77, face),
  )

  // inside the ground floor: all walls. along the party wall they're moved in a bit, the
  // arena's are on the same line facing the other way
  insideWalls(inside, outline, door, () => false)
  for (const geo of inside.solid) {
    const pos = geo.getAttribute('position')
    const v = f.dOf({ x: (pos.getX(0) + pos.getX(1)) / 2, z: (pos.getZ(0) + pos.getZ(1)) / 2 })
    if (Math.abs(v - PARTY) < 0.01) geo.translate(-f.out.x * 0.05, 0, -f.out.z * 0.05)
  }

  return {
    parts: merged(),
    inside,
    signs,
    first: ['concrete', 'ribbed'],
    noShadow: ['roof', 'paint'],
  }
}
