import type * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import {
  flat,
  frame,
  glassQuad,
  insideWalls,
  parts as collect,
  pt,
  solidPieces,
  wallQuad,
  type Frame,
  type Hole,
} from './landmark'
import type { LandmarkGeometry, Sign } from './landmarks'

// one park place (1 park place / 18 decatur st), gsu police headquarters. a white marble
// office block from the 60s on the five points wedge: nine floors of window strips between
// marble piers (the panes in each strip with veined marble between them) over a ground floor
// of glass set back 2m under the marble on edgewood ave and the north end of park place, round
// a curved corner, and warm grey granite with a strip of windows on the rest of park place and
// on decatur st. from mapillary (2019, 2021, 2022), gsu's 2014 photo from woodruff park and
// usgs's lidar (2018). sources: docs/reference/one-park-place.md
//
// the sides of the marble floors are frames between their corners going round (landmark.ts
// frame(): a along, d out): park place from edgewood ave, decatur st from park place, the west
// wall over the olympia building from decatur st, edgewood ave from the olympia building

export type OneParkData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { upper: number[][] }
}

// each part is a draw call in every pass. veined is the marble between the panes in the
// window strips, grey the roof, the penthouse and the light grey bits
export type Part = 'marble' | 'veined' | 'glass' | 'clear' | 'granite' | 'dark' | 'grey' | 'blue'

// heights over the edgewood ave sidewalk at the police door (318.4m, surface.ts DATUMS). the
// sills, floor to floor and glass are fitted on gsu's 2014 photo (3 px) and the 2019 one
export const SOFFIT = 4.75
export const SILL = 7.38
export const PITCH = 3.361
export const GLASS = 1.68
export const ROWS = 8
export const STRIP_TOP = SILL + (ROWS - 1) * PITCH + GLASS
// the roof and the top of the parapet (lidar)
export const ROOF = 34.1
export const TOP = 35.15
const PARAPET = 0.4
// how far the window strips are set into the marble
const REVEAL = 0.15
// the strip of windows over the granite on park place and decatur st, up to the marble
export const CLERESTORY = 3.5
// the walls go down this far, under the ground everywhere: the corner of park place and
// decatur st is 1.5m under the floor
export const BOTTOM = -2.2
// the west wall starts just under the olympia building's roof (10.4m over its own ground)
export const WEST_FROM = 10.2
// build-campus.mjs draws the outline with these: the glass this far back under the marble,
// the radius of the curved glass on the corner, where the glass ends on park place (meters
// along from edgewood ave) and the side door's recess there
export const SETBACK = 2
export const RADIUS = 2
export const STOREFRONT = 35
export const PORTAL = { from: 40, to: 42.7, depth: 2.5, top: 3 }
// the window strips on each side: where the first one starts, how wide, how far apart, how
// many, panes in each and the first row. edgewood ave and park place from the rectified 2019
// photo (5cm), decatur st rough (only its east half is in a photo), the west wall's north
// half is behind trees in the only photo of it and its first two rows behind the olympia
export const STRIPS: Record<'park' | 'decatur' | 'west' | 'edgewood', Strips> = {
  park: { first: 5.43, width: 5.92, module: 7.48, count: 6, panes: 4, from: 0 },
  decatur: { first: 1.4, width: 3.62, module: 5.12, count: 5, panes: 3, from: 0 },
  west: { first: 3.2, width: 5.5, module: 7.35, count: 5, panes: 4, from: 2 },
  edgewood: { first: 2.05, width: 5.63, module: 7.495, count: 4, panes: 4, from: 0 },
}
type Strips = {
  first: number
  width: number
  module: number
  count: number
  panes: number
  from: number
}
// how wide glass() thinks a pane is (oneParkMaterials.ts), and the storefront's clearGlass
export const PANE = 1.42
export const STORE_PANE = 1.5
// the marble's slabs: a row to each window and each spandrel
export const SLAB: [number, number] = [1.5, PITCH / 2]

// the ground floor under the marble. edgewood ave in meters from park place along the glass,
// park place from edgewood ave (2019 and 2022 photos): dark granite piers on the column lines,
// the entrance with the city map in front of it, the police door, granite against the olympia
const PIER = 0.7
const EDGEWOOD_PIERS = [8.63, 16.12, 23.62, 31.1]
const ENTRANCE = [10.3, 14.3]
const PARK_PIERS = [12.13, 19.61, 27.09]
// the storefront: a dark granite base and clear glass up to the inside's ceiling. over that
// the transom's glass is dark in every photo: it's drawn dark, see-through glass higher up let
// the sun (and the view) through the empty building
const PLINTH = 0.1
// the small windows in the granite on park place (meters along) and decatur st (from park
// place), the louvre, and decatur st's blue door with its sidelight. the doors on decatur st
// stand on the sidewalk, 1.2m under the floor there
const PARK_WINDOWS = [44, 46.6, 49.2, 53.8]
const DECATUR_WINDOWS = [2.6, 9.2, 11.8, 14.4]
const LOUVRE = 51.5
const BLUE_DOOR = { at: 17.2, width: 1, light: 0.6, bottom: -1.2, top: 1.1 }
const PORTAL_DOOR = { at: 40.85, width: 1, bottom: -1.32, top: 0.9 }
// gsu's blue banners on brackets off the marble, on the column lines
const BANNERS = { edgewood: [8.63, 16.12, 23.62], park: [19.61, 42.05, 49.5] }
const BANNER = { y: [6, 8.4], d: [0.15, 0.75] }
// the penthouse and the box on it (lidar), in the lidar's frame from osm's corner of edgewood
// ave and park place: a along park place, v in from it
const ROOF_FRAME = { at: { x: -306.48, z: -25.81 }, a: { x: -0.56356, z: 0.82608 } }
type Pair = [number, number]
export const PENTHOUSE = { a: [19.7, 52.2] as Pair, v: [4.9, 18.7] as Pair, top: 39.4 }
export const MACHINE = { a: [31.4, 43.6] as Pair, v: [4.9, 15.3] as Pair, top: 41.5 }
// "GEORGIA STATE UNIVERSITY" on a light grey box at the top of edgewood ave's face, gsu's logo
// at its east end (a plain blue square here) and red under STATE. in gsu's 2014 photo and the
// 2018 lidar (it sticks out 0.8-1.1m), no newer photo has the top of that side
export const BAND = { from: 7.9, to: 25.9, y: [32.65, 34.3], out: 0.8 }

const flip = (o: Point) => ({ x: -o.x, z: -o.z })
// where a line through p along d crosses one through q along e
function meet(p: Point, d: Point, q: Point, e: Point) {
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / (d.x * e.z - d.z * e.x)
  return { x: p.x + d.x * t, z: p.z + d.z * t }
}

export function oppSides(b: OneParkData) {
  const [ne, se, sw, nw] = b.landmark!.upper.map(pt) as [Point, Point, Point, Point]
  const park = frame(ne, se)
  const decatur = frame(se, sw)
  const west = frame(sw, nw)
  const edgewood = frame(nw, ne)
  // the curved glass on the corner, round a center that's SETBACK + RADIUS in from both
  const r = SETBACK + RADIUS
  const center = meet(edgewood.at(0, -r), edgewood.along, park.at(0, -r), park.along)
  const from = Math.atan2(edgewood.out.z, edgewood.out.x)
  const to = Math.atan2(park.out.z, park.out.x)
  const curve = Array.from({ length: 7 }, (_, i) => {
    const t = from + ((to - from) * i) / 6
    return { x: center.x + Math.cos(t) * RADIUS, z: center.z + Math.sin(t) * RADIUS }
  })
  // where the glass on edgewood ave meets the wall against the olympia building
  const party = meet(sw, west.along, edgewood.at(0, -SETBACK), edgewood.along)
  return { corners: [ne, se, sw, nw], park, decatur, west, edgewood, center, curve, party }
}

/** the ground floor's outline, the same one build-campus.mjs writes */
export function oppOutline(b: OneParkData) {
  const { park, curve, party, corners } = oppSides(b)
  const { from, to, depth } = PORTAL
  return [
    ...curve,
    park.at(STOREFRONT, -SETBACK),
    park.at(STOREFRONT, 0),
    park.at(from, 0),
    park.at(from, -depth),
    park.at(to, -depth),
    park.at(to, 0),
    corners[1]!,
    corners[2]!,
    party,
  ]
}

export function oneParkGeometry(b: OneParkData): LandmarkGeometry {
  const { add, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const sides = oppSides(b)
  const { park, decatur, west, edgewood, center, curve, party } = sides
  const [ne, se, sw, nw] = sides.corners as [Point, Point, Point, Point]
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : edgewood.at(5, -SETBACK)
  const rot = (o: Point) => Math.atan2(o.x, o.z)
  const uv = (geo: THREE.BufferGeometry, f: (u: number, v: number) => [number, number]) => {
    const t = geo.getAttribute('uv')
    for (let i = 0; i < t.count; i++) t.setXY(i, ...f(t.getX(i), t.getY(i)))
    return geo
  }
  // flat bits: their uvs are the world's x and z, and the grime in the library darkens toward
  // uv y 0 and below (the ground). this block is at z -25..22, so they're moved up out of it
  const lid = (part: Part, c: Point[], y: number, up = true) =>
    add(
      part,
      uv(flat(c, y, up), (u, v) => [u, v + 200]),
    )
  // a box out from a side: its front, ends, top, and bottom if it's off the ground
  const box = (
    part: Part,
    f: Frame,
    a0: number,
    a1: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
  ) => {
    add(part, wallQuad(f.at(a0, d1), f.at(a1, d1), y0, y1, f.out, a0))
    add(part, wallQuad(f.at(a0, d0), f.at(a0, d1), y0, y1, flip(f.along)))
    add(part, wallQuad(f.at(a1, d0), f.at(a1, d1), y0, y1, f.along))
    const cell = [f.at(a0, d0), f.at(a1, d0), f.at(a1, d1), f.at(a0, d1)]
    lid(part, cell, y1)
    if (y0 > BOTTOM) lid(part, cell, y0, false)
  }
  // glass() with n panes across, whatever width it is: its uvs and size are stretched so the
  // shader's PANE wide panes come out n to the window
  const panes = (p: Point, q: Point, y0: number, y1: number, into: Point, n: number) => {
    const geo = glassQuad(p, q, y0, y1, into)
    const k = (PANE * n) / Math.hypot(q.x - p.x, q.z - p.z)
    const size = geo.getAttribute('aPane')
    for (let i = 0; i < size.count; i++) size.setX(i, size.getX(i) * k)
    add(
      'glass',
      uv(geo, (u, v) => [u * k, v]),
    )
  }
  // storefront glass from p to q with n panes, its mullions at the ends and between them
  const clear = (p: Point, q: Point, into: Point, n: number, holes: Hole[] = []) => {
    const len = Math.hypot(q.x - p.x, q.z - p.z)
    const k = (STORE_PANE * n) / len
    const at = (u: number) => ({
      x: p.x + ((q.x - p.x) * u) / len,
      z: p.z + ((q.z - p.z) * u) / len,
    })
    for (const [u0, u1, v0, v1] of solidPieces(len, PLINTH, CEILING, holes))
      add(
        'clear',
        uv(wallQuad(at(u0), at(u1), v0, v1, into, u0), (u, v) => [u * k, v]),
      )
    add('dark', wallQuad(p, q, CEILING, SOFFIT, into))
  }

  // the marble floors: each side from the soffit (the west wall from the olympia building's
  // roof) to the top of the parapet, with the window strips set into it
  const faces: [Frame, Strips][] = [
    [park, STRIPS.park],
    [decatur, STRIPS.decatur],
    [west, STRIPS.west],
    [edgewood, STRIPS.edgewood],
  ]
  // slabs a window or a spandrel tall, lined up with the sills. well up from 0 so the grime's
  // ground band stays off them
  const up = (y: number) => y - SILL + 10 * SLAB[1]
  faces.forEach(([f, st], side) => {
    const y0 = f === west ? WEST_FROM : SOFFIT
    const sill = SILL + st.from * PITCH
    const starts = Array.from({ length: st.count }, (_, k) => st.first + k * st.module)
    const holes: Hole[] = starts.map((a) => [a, a + st.width, sill, STRIP_TOP])
    for (const [a0, a1, v0, v1] of solidPieces(f.len, y0, TOP, holes))
      add(
        'marble',
        uv(wallQuad(f.at(a0), f.at(a1), v0, v1, f.out, a0), (u, v) => [u, up(v)]),
      )
    // the veined marble's slab joints are the thin light mullions running up the strip
    const k = SLAB[0] / (st.width / st.panes)
    starts.forEach((l, s) => {
      const r = l + st.width
      add('marble', wallQuad(f.at(l), f.at(l, -REVEAL), sill, STRIP_TOP, f.along))
      add('marble', wallQuad(f.at(r), f.at(r, -REVEAL), sill, STRIP_TOP, flip(f.along)))
      const rim = [f.at(l), f.at(r), f.at(r, -REVEAL), f.at(l, -REVEAL)]
      lid('marble', rim, sill)
      lid('marble', rim, STRIP_TOP, false)
      for (let row = st.from; row < ROWS; row++) {
        const y = SILL + row * PITCH
        panes(f.at(l, -REVEAL), f.at(r, -REVEAL), y, y + GLASS, f.out, st.panes)
        if (row === ROWS - 1) continue
        const geo = wallQuad(f.at(l, -REVEAL), f.at(r, -REVEAL), y + GLASS, y + PITCH, f.out)
        // each spandrel its own slabs
        const off = (side * 10 + s) * st.panes * SLAB[0]
        add(
          'veined',
          uv(geo, (u, v) => [off + u * k, v - y - GLASS + (row + 10) * SLAB[1]]),
        )
      }
    })
  })

  // the parapet: the coping, its inside and the roof. the corners are where the sides moved in
  // by its thickness cross
  const ring = faces.map(([f]) => f)
  const inner = ring.map((f, i) => {
    const prev = ring[(i + ring.length - 1) % ring.length]!
    return meet(prev.at(0, -PARAPET), prev.along, f.at(0, -PARAPET), f.along)
  })
  const outer = [ne, se, sw, nw]
  ring.forEach((f, i) => {
    const [p, q] = [outer[i]!, outer[(i + 1) % 4]!]
    const [ip, iq] = [inner[i]!, inner[(i + 1) % 4]!]
    lid('marble', [p, q, iq, ip], TOP)
    add('marble', wallQuad(ip, iq, ROOF, TOP, flip(f.out)))
  })
  lid('grey', inner, ROOF)

  // the penthouse and the machine room on it, light grey
  const roofAt = (a: number, v: number) => {
    const { at, a: d } = ROOF_FRAME
    return { x: at.x + d.x * a - d.z * v, z: at.z + d.z * a + d.x * v }
  }
  for (const [{ a, v }, y0, y1] of [
    [PENTHOUSE, ROOF, PENTHOUSE.top],
    [MACHINE, PENTHOUSE.top, MACHINE.top],
  ] as const) {
    const c = [roofAt(a[0], v[0]), roofAt(a[1], v[0]), roofAt(a[1], v[1]), roofAt(a[0], v[1])]
    const mx = (c[0]!.x + c[2]!.x) / 2
    const mz = (c[0]!.z + c[2]!.z) / 2
    c.forEach((p, i) => {
      const q = c[(i + 1) % 4]!
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = flip(o)
      add('grey', wallQuad(p, q, y0, y1, o))
    })
    lid('grey', c, y1)
  }

  // the sign band on edgewood ave
  {
    const { from, to, y, out } = BAND
    box('grey', edgewood, from, to, 0, out, y[0]!, y[1]!)
    const face = (a: number) => edgewood.at(a, out + 0.02)
    signs.push({
      ...face(15.3),
      y: 33.35,
      rot: rot(edgewood.out),
      text: 'GEORGIA STATE UNIVERSITY',
      letters: true,
      size: 0.95,
      color: '#3b3e42',
      weight: 600,
    })
    signs.push({
      ...face(23.8),
      y: 33.6,
      rot: rot(edgewood.out),
      text: '',
      width: 1.4,
      height: 1.6,
      plate: '#1f4b99',
    })
    signs.push({
      ...face(16),
      y: 32.85,
      rot: rot(edgewood.out),
      text: '',
      width: 2.7,
      height: 0.12,
      plate: '#c8202f',
    })
  }

  // the soffit under the marble, from the corner round to the granite on park place. and the
  // same 0.8m up inside, only for the shadows: the shadow lookup's normal bias reaches past a
  // single sheet and the glass just under it came out sunlit (part 27)
  const soffit = [
    nw,
    ne,
    park.at(STOREFRONT, 0),
    park.at(STOREFRONT, -SETBACK),
    ...[...curve].reverse(),
    party,
  ]
  lid('dark', soffit, SOFFIT, false)
  lid('dark', soffit, SOFFIT + 0.8, false)

  // the ground floor glass. edgewood ave's in meters from park place, its frame is the other way
  const E = (s: number) => edgewood.len - s
  const tanE = edgewood.len - edgewood.aOf(curve[0]!)
  const tanP = park.aOf(curve.at(-1)!)
  const at = (f: Frame, a: number, d = 0) => f.at(a, d - SETBACK)
  // a stretch of the storefront from a0 to a1 along a side's glass line
  const bay = (f: Frame, a0: number, a1: number, n: number, holes: Hole[] = []) => {
    add('dark', wallQuad(at(f, a0, 0.02), at(f, a1, 0.02), BOTTOM, PLINTH, f.out, a0))
    const cut = holes.map(([h0, h1, v0, v1]): Hole => [h0 - a0, h1 - a0, v0, v1])
    clear(at(f, a0), at(f, a1), f.out, n, cut)
  }
  // dark polished granite up the whole storefront, a bit proud of the glass
  const pier = (f: Frame, a0: number, a1: number) => {
    const [d0, d1] = [-SETBACK, -SETBACK + 0.15]
    add('dark', wallQuad(f.at(a0, d1), f.at(a1, d1), BOTTOM, SOFFIT, f.out, a0))
    add('dark', wallQuad(f.at(a0, d0), f.at(a0, d1), BOTTOM, SOFFIT, flip(f.along)))
    add('dark', wallQuad(f.at(a1, d0), f.at(a1, d1), BOTTOM, SOFFIT, f.along))
  }
  const lightBar = (f: Frame, a: number) =>
    add('blue', wallQuad(at(f, a - 0.06, 0.16), at(f, a + 0.06, 0.16), 0.8, 2.8, f.out))

  // the curved glass, its mullions carrying on round it
  {
    let u = 0
    const len = curve
      .slice(1)
      .reduce((s, p, i) => s + Math.hypot(p.x - curve[i]!.x, p.z - curve[i]!.z), 0)
    const n = Math.round(len / 1.45)
    curve.slice(1).forEach((q, i) => {
      const p = curve[i]!
      const l = Math.hypot(q.x - p.x, q.z - p.z)
      const m = { x: (p.x + q.x) / 2 - center.x, z: (p.z + q.z) / 2 - center.z }
      const ml = Math.hypot(m.x, m.z)
      const o = { x: m.x / ml, z: m.z / ml }
      const out = (c: Point, d: number) => ({ x: c.x + o.x * d, z: c.z + o.z * d })
      add('dark', wallQuad(out(p, 0.02), out(q, 0.02), BOTTOM, PLINTH, o, u))
      const k = (STORE_PANE * n) / len
      add(
        'clear',
        uv(wallQuad(p, q, PLINTH, CEILING, o, u), (x, y) => [x * k, y]),
      )
      add('dark', wallQuad(p, q, CEILING, SOFFIT, o))
      u += l
    })
  }

  // edgewood ave: piers, the entrance between the first two, the bays, the police door
  {
    const f = edgewood
    const p0 = EDGEWOOD_PIERS.map((s) => [E(s + PIER / 2), E(s - PIER / 2)] as const)
    // the end of the curve to the first pier is granite like the pier
    pier(f, p0[0]![1], E(tanE))
    p0.forEach(([a0, a1]) => pier(f, a0, a1))
    // the entrance: a dark granite wall with the doors in it
    {
      const [a0, a1] = [p0[1]![1], p0[0]![0]]
      const [e0, e1] = [E(ENTRANCE[1]!), E(ENTRANCE[0]!)]
      const holes: Hole[] = [[e0 - a0, e1 - a0, 0, 3.4]]
      for (const [u0, u1, v0, v1] of solidPieces(a1 - a0, BOTTOM, SOFFIT, holes))
        add('dark', wallQuad(at(f, a0 + u0, 0.05), at(f, a0 + u1, 0.05), v0, v1, f.out, u0))
      add('dark', wallQuad(at(f, e0, 0.05), at(f, e0), 0, 3.4, f.along))
      add('dark', wallQuad(at(f, e1, 0.05), at(f, e1), 0, 3.4, flip(f.along)))
      lid('dark', [at(f, e0, 0.05), at(f, e1, 0.05), at(f, e1), at(f, e0)], 3.4, false)
      // two glass doors
      const k = (STORE_PANE * 2) / (e1 - e0)
      add(
        'clear',
        uv(wallQuad(at(f, e0), at(f, e1), 0, 3.4, f.out), (u, v) => [u * k, v]),
      )
    }
    bay(f, p0[2]![1], p0[1]![0], 4)
    // the police: the door in the middle of its bay, a light bar on the piers either side
    const doorA = f.aOf(door)
    bay(f, p0[3]![1], p0[2]![0], 4, [
      [doorA - DOOR_WIDTH / 2, doorA + DOOR_WIDTH / 2, 0, DOOR_HEIGHT],
    ])
    lightBar(f, (p0[2]![0] + p0[2]![1]) / 2)
    lightBar(f, (p0[3]![0] + p0[3]![1]) / 2)
    // granite from the last pier to the olympia building
    pier(f, f.aOf(party), p0[3]![0])
    signs.push({
      ...at(f, doorA, 0.06),
      y: 3.05,
      rot: rot(f.out),
      text: 'POLICE',
      plate: '#1f4b99',
      color: '#ffffff',
      scale: 0.75,
    })
  }

  // park place's glass, up to the granite
  {
    const f = park
    const ps = PARK_PIERS.map((a) => [a - PIER / 2, a + PIER / 2] as const)
    const ends = [tanP, ...ps.flatMap(([a0, a1]) => [a0, a1]), STOREFRONT - PIER]
    for (let i = 0; i < ends.length; i += 2) bay(f, ends[i]!, ends[i + 1]!, 4)
    for (const [a0, a1] of ps) pier(f, a0, a1)
    pier(f, STOREFRONT - PIER, STOREFRONT)
  }

  // the granite: park place from the end of the glass, decatur st, with the strip of windows
  // over it. 2cm out from the outline, where Landmarks.tsx puts its plinth
  const granite = (f: Frame, a0: number, a1: number, holes: Hole[]) => {
    const cut = holes.map(([h0, h1, v0, v1]): Hole => [h0 - a0, h1 - a0, v0, v1])
    for (const [u0, u1, v0, v1] of solidPieces(a1 - a0, BOTTOM, CLERESTORY, cut)) {
      const geo = wallQuad(f.at(a0 + u0, 0.02), f.at(a0 + u1, 0.02), v0, v1, f.out, a0 + u0)
      add(
        'granite',
        uv(geo, (u, v) => [u, v - BOTTOM]),
      )
    }
  }
  // a window in the granite, set in a bit
  const hole = (f: Frame, [a0, a1, y0, y1]: Hole, part: Part | null) => {
    const d = -0.1
    add('granite', wallQuad(f.at(a0, 0.02), f.at(a0, d), y0, y1, f.along))
    add('granite', wallQuad(f.at(a1, 0.02), f.at(a1, d), y0, y1, flip(f.along)))
    const rim = [f.at(a0, 0.02), f.at(a1, 0.02), f.at(a1, d), f.at(a0, d)]
    lid('granite', rim, y0)
    lid('granite', rim, y1, false)
    if (part === 'glass') panes(f.at(a0, d), f.at(a1, d), y0, y1, f.out, 1)
    else if (part) add(part, wallQuad(f.at(a0, d), f.at(a1, d), y0, y1, f.out))
  }
  // and the clerestory, from a0 to a1
  const clerestory = (f: Frame, a0: number, a1: number) => {
    const d = -0.08
    panes(f.at(a0, d), f.at(a1, d), CLERESTORY, SOFFIT, f.out, Math.round((a1 - a0) / 1.6))
    const rim = [f.at(a0, 0.02), f.at(a1, 0.02), f.at(a1, d), f.at(a0, d)]
    lid('granite', rim, CLERESTORY)
    lid('marble', rim, SOFFIT, false)
    for (const [a, o] of [
      [a0, f.along],
      [a1, flip(f.along)],
    ] as const)
      add('granite', wallQuad(f.at(a, 0.02), f.at(a, d), CLERESTORY, SOFFIT, o))
  }
  {
    const f = park
    const { from, to, depth, top } = PORTAL
    const win = PARK_WINDOWS.map((a): Hole => [a - 0.5, a + 0.5, 0.1, 1.1])
    const louvre: Hole = [LOUVRE - 0.4, LOUVRE + 0.4, 0.2, 1]
    granite(f, STOREFRONT, f.len, [[from, to, BOTTOM, top], ...win, louvre])
    for (const w of win) hole(f, w, 'glass')
    hole(f, louvre, 'dark')
    // the corner: solid from the sidewalk to the marble, the clerestory stops short of it
    add('granite', wallQuad(f.at(f.len - 0.6, 0.02), f.at(f.len, 0.02), CLERESTORY, SOFFIT, f.out))
    clerestory(f, STOREFRONT, f.len - 0.6)
    // the end of the glass: granite back to it under the soffit
    add(
      'granite',
      uv(
        wallQuad(
          f.at(STOREFRONT - 0.02, -SETBACK),
          f.at(STOREFRONT - 0.02, 0),
          BOTTOM,
          SOFFIT,
          flip(f.along),
        ),
        (u, v) => [u, v - BOTTOM],
      ),
    )
    // the side door's recess: granite inside, a dark ceiling, a light granite surround
    const a = (x: number, d: number) => f.at(x, d)
    add('granite', wallQuad(a(from + 0.02, 0), a(from + 0.02, -depth), BOTTOM, top, f.along))
    add('granite', wallQuad(a(to - 0.02, 0), a(to - 0.02, -depth), BOTTOM, top, flip(f.along)))
    add('granite', wallQuad(a(from, -depth + 0.02), a(to, -depth + 0.02), BOTTOM, top, f.out))
    lid('dark', [a(from, 0.02), a(to, 0.02), a(to, -depth), a(from, -depth)], top, false)
    const { at: da, width, bottom, top: dt } = PORTAL_DOOR
    add('dark', wallQuad(a(da, -depth + 0.04), a(da + width, -depth + 0.04), bottom, dt, f.out))
    box('grey', f, from - 0.25, from, 0.02, 0.08, BOTTOM, top + 0.25)
    box('grey', f, to, to + 0.25, 0.02, 0.08, BOTTOM, top + 0.25)
    box('grey', f, from, to, 0.02, 0.08, top, top + 0.25)
    signs.push({
      ...f.at(55, 0.05),
      y: 2.05,
      rot: rot(f.out),
      text: 'ONE PARK PLACE',
      color: '#45484c',
      scale: 0.7,
    })
  }
  {
    const f = decatur
    const win = DECATUR_WINDOWS.map((a): Hole => [a - 0.6, a + 0.6, -0.9, 0.6])
    const { at: da, width, light, bottom, top } = BLUE_DOOR
    const doors: Hole[] = [
      [da, da + width, bottom, top],
      [da + width + 0.1, da + width + 0.1 + light, bottom, top],
    ]
    granite(f, 0, f.len, [...win, ...doors])
    for (const w of win) hole(f, w, 'glass')
    hole(f, doors[0]!, 'blue')
    hole(f, doors[1]!, 'glass')
    add('granite', wallQuad(f.at(0, 0.02), f.at(0.6, 0.02), CLERESTORY, SOFFIT, f.out))
    add('granite', wallQuad(f.at(f.len - 0.4, 0.02), f.at(f.len, 0.02), CLERESTORY, SOFFIT, f.out))
    clerestory(f, 0.6, f.len - 0.4)
    signs.push({
      ...f.at(5.95, 0.05),
      y: 1.85,
      rot: rot(f.out),
      text: 'ONE PARK PLACE',
      color: '#45484c',
      scale: 0.7,
    })
  }
  // dark polished granite down the corner of park place and decatur st
  add(
    'dark',
    wallQuad(
      park.at(park.len - 0.5, 0.035),
      park.at(park.len, 0.035),
      BOTTOM,
      CLERESTORY,
      park.out,
    ),
  )
  add(
    'dark',
    wallQuad(decatur.at(0, 0.035), decatur.at(0.5, 0.035), BOTTOM, CLERESTORY, decatur.out),
  )

  // the name on edgewood ave's marble by the corner, and the banners
  signs.push({
    ...edgewood.at(E(4), 0.03),
    y: 5.7,
    rot: rot(edgewood.out),
    text: 'ONE PARK PLACE',
    color: '#45484c',
    scale: 0.7,
  })
  for (const [f, list] of [
    [edgewood, BANNERS.edgewood.map(E)],
    [park, BANNERS.park],
  ] as const)
    for (const a of list) {
      const [d0, d1] = BANNER.d as [number, number]
      for (const o of [f.along, flip(f.along)])
        add('blue', wallQuad(f.at(a, d0), f.at(a, d1), BANNER.y[0]!, BANNER.y[1]!, o))
    }

  // inside the ground floor: glass where the storefront is (the curve, and 2m in on edgewood ave
  // and park place up to the granite)
  const glassy = (p: Point, q: Point) => {
    const m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 }
    if (Math.hypot(m.x - center.x, m.z - center.z) < RADIUS) return true
    if (Math.abs(edgewood.dOf(m) + SETBACK) < 0.05) return true
    return Math.abs(park.dOf(m) + SETBACK) < 0.05 && park.aOf(m) < STOREFRONT
  }
  insideWalls(inside, oppOutline(b), door, glassy)

  return {
    parts: merged(),
    inside,
    signs,
    first: ['marble'],
    noShadow: ['blue'],
  }
}
