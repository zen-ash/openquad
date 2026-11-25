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

// gsu's college of law, 85 park place at john wesley dobbs ave (2015). beige limestone on park
// place, the east side and part of the south, with a terrace on top of it on park place; the
// law library's glass (floors 5 and 6) set back over the terrace under a big flat roof that
// hangs out over it on louvres; a lower all glass box on the corner of jwd with the entrance;
// the jwd side glass under the roof; grey metal panels with narrow windows on the south east.
// from usgs's lidar (2018), the 2015 commons photo, gsu's photos (2019-2026) and mapillary
// (2017-2022). sources: docs/reference/college-of-law.md
//
// nothing is square to the game's x/z: park place's stone face and the roof's edge on jwd are
// both at an angle. the ground is the park place sidewalk at the entrance (323.6m), the drive
// on the east side is 2-4m lower

export type CollegeOfLawData = {
  points: number[][]
  height: number
  door?: number[]
}

// stone the limestone, tan its darker courses under and over the windows, base the grey precast (the service floor on the drive, the roofs, the
// terrace), metal the dark grey panels, bands, frames and the roof, glass the curtain walls and
// windows, store the ground floor's glass
export type Part = 'stone' | 'tan' | 'base' | 'metal' | 'glass' | 'store'

type Range = readonly [number, number]
const P = (x: number, z: number): Point => ({ x, z })

// the outline (build-campus.mjs): the box's corner on jwd, the roof's edge, the north wall 3m
// in under it, the drive, the south side, park place's storefronts, the box's south side
export const BOX_NW = P(-193.4, -318.6)
export const C = P(-181.4, -315.1)
export const CN = P(-182.14, -312.2)
export const NE = P(-140.6, -300.2)
export const SE = P(-140.6, -252.8)
export const SW = P(-198.5, -252.8)
export const J = P(-186.8, -295.3)
export const BOX_SW = P(-193.4, -295.3)
// the roof's edge on jwd at the east end (lidar)
export const NE_ROOF = P(-140.6, -303.3)

// floors over the sidewalk: a tall ground floor, three of stone, the library's two. the
// terrace is 346.1m, the roof 358.9, the glass box 351.6 (lidar)
export const FLOORS = [0, 6.5, 11.83, 17.17, 22.5, 28.05, 33.6]
export const TERRACE = 22.5
const PARAPET = 23.6
export const BOX_TOP = 28
export const ROOF = 35.3
const SOFFIT = FLOORS[6]!
// the library's glass is 5m in from the stone face (the terrace, lidar)
export const SETBACK = 5
// the stone stands out of the storefronts' glass (the outline)
const PROUD = 0.3
const STORE_TOP = 4.7
// the service floor on the drive, grey precast with roll up doors, up to the second floor's
// windows (mapillary 2019: no windows in it, the lobby on that side is behind it)
const BASE_TOP = 6.9
// the drive is 5m under park place by the loading doors (lidar)
const DRIVE = -5
// windows in the stone, one per 3.6m bay (3.3m on the drive), 3.7m tall in each floor
const BAY = 3.6
const WINDOW = 1.9
const SILL = 0.9
const HEAD = 4.6

// the south side from park place: the terrace's end, stone, the glass box out 0.6m from the
// third floor up, then grey metal with narrow windows (gsu 2019, mapillary 2019)
const SOUTH_GRID = 12
const SOUTH_BOX_OUT = 0.3
const SOUTH_BOX_FROM = 11.83
// how far it reaches back over the terrace (lidar)
const GRID_DEEP = 2.2
// a glass bay on the drive near jwd (mapillary 2019), from-to along it from jwd
const EAST_GLASS: Range = [4, 18]

// meet of the line a-b with c-d
function meet(a: Point, b: Point, c: Point, d: Point) {
  const r = { x: b.x - a.x, z: b.z - a.z }
  const s = { x: d.x - c.x, z: d.z - c.z }
  const t = ((c.x - a.x) * s.z - (c.z - a.z) * s.x) / (r.x * s.z - r.z * s.x)
  return P(a.x + r.x * t, a.z + r.z * t)
}

// a straight face from p to q, o the side facing away from `inner`
function sideOf(p: Point, q: Point, inner: Point) {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  let o = { x: dir.z, z: -dir.x }
  if ((inner.x - p.x) * o.x + (inner.z - p.z) * o.z > 0) o = { x: -o.x, z: -o.z }
  const at = (u: number, d = 0) => P(p.x + dir.x * u + o.x * d, p.z + dir.z * u + o.z * d)
  return { p, q, len, dir, o, at }
}
type Side = ReturnType<typeof sideOf>

const MIDDLE = P(-165, -280)
// park place's stone face (the lidar's edge of the roof) and the library's glass behind it
const west = sideOf(SW, C, MIDDLE)
export const LS = meet(west.at(0, -SETBACK), west.at(10, -SETBACK), SW, SE)
export const LN = meet(west.at(0, -SETBACK), west.at(10, -SETBACK), CN, NE)
const JL = meet(west.at(0, -SETBACK), west.at(10, -SETBACK), J, BOX_SW)
const CL = meet(west.at(0, -SETBACK), west.at(10, -SETBACK), BOX_NW, NE_ROOF)

// bays of `w` wide holes every BAY along a side from u0 to u1, centered
function bays(u0: number, u1: number, w: number, rows: Range[], pitch = BAY) {
  const n = Math.floor((u1 - u0) / pitch)
  const first = u0 + (u1 - u0 - n * pitch) / 2
  return Array.from({ length: n }, (_, i) => first + i * pitch + (pitch - w) / 2).flatMap((a) =>
    rows.map(([y0, y1]): Hole => [a, a + w, y0, y1]),
  )
}
const rowsFrom = (floors: number[]) => floors.map((f): Range => [f + SILL, f + HEAD])

export function collegeOfLawGeometry(b: CollegeOfLawData) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null

  const face = (part: Part, s: Side, y0: number, y1: number, holes: Hole[] = [], d = 0) => {
    for (const [u0, u1, v0, v1] of solidPieces(s.len, y0, y1, holes))
      add(part, wallQuad(s.at(u0, d), s.at(u1, d), v0, v1, s.o, u0))
  }
  // a hole's sides, sill and head from the face at d back `depth`, and its glass there
  const reveal = (part: Part, s: Side, h: Hole, depth: number, pane?: Part, d = 0) => {
    const [u0, u1, v0, v1] = h
    add(part, wallQuad(s.at(u0, d), s.at(u0, d - depth), v0, v1, s.dir))
    add(part, wallQuad(s.at(u1, d), s.at(u1, d - depth), v0, v1, { x: -s.dir.x, z: -s.dir.z }))
    const rim = [s.at(u0, d), s.at(u1, d), s.at(u1, d - depth), s.at(u0, d - depth)]
    if (v0 > 0.01) add(part, flat(rim, v0))
    add(part, flat(rim, v1, false))
    if (pane) add(pane, glassQuad(s.at(u0, d - depth), s.at(u1, d - depth), v0, v1, s.o))
  }
  // the tan courses under and over each floor's windows, a hair out of the stone, from u0 to u1
  const courses = (s: Side, u0: number, u1: number, floors: number[], holes: Hole[] = []) => {
    const cut: Hole[] = [[-1, u0, -99, 99], [u1, s.len + 1, -99, 99], ...holes]
    for (const f of floors)
      for (const [y0, y1] of [
        [f + SILL - 0.45, f + SILL],
        [f + 2.1, f + 2.22],
        [f + 3.3, f + 3.42],
        [f + HEAD, f + HEAD + 0.3],
      ] as const)
        face('tan', s, y0, y1, cut, PROUD + 0.01)
  }
  const pane = (part: Part, s: Side, u0: number, u1: number, y0: number, y1: number, d = 0) =>
    add(part, glassQuad(s.at(u0, d), s.at(u1, d), y0, y1, s.o))
  // curtain wall: one pane per floor so the floors read
  const curtain = (s: Side, u0: number, u1: number, y0: number, y1: number, d = 0) => {
    const cuts = [y0, ...FLOORS.filter((f) => f > y0 + 0.5 && f < y1 - 0.5), y1]
    for (let i = 1; i < cuts.length; i++) pane('glass', s, u0, u1, cuts[i - 1]!, cuts[i]!, d)
  }
  // a box standing out of a side to d1, its ends, lid and underside
  const ledge = (
    part: Part,
    s: Side,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    d1: number,
  ) => {
    const ends = sideOf(s.at(u0, d1), s.at(u1, d1), s.at((u0 + u1) / 2, -1))
    add(part, wallQuad(ends.p, ends.q, y0, y1, s.o, u0))
    add(part, wallQuad(s.at(u0), s.at(u0, d1), y0, y1, { x: -s.dir.x, z: -s.dir.z }))
    add(part, wallQuad(s.at(u1), s.at(u1, d1), y0, y1, s.dir))
    const rim = [s.at(u0), s.at(u1), s.at(u1, d1), s.at(u0, d1)]
    add(part, flat(rim, y1))
    if (y0 > 0.01) add(part, flat(rim, y0, false))
  }
  const box = (part: Part, x: Range, z: Range, y: Range) => {
    const pts = [P(x[0], z[0]), P(x[1], z[0]), P(x[1], z[1]), P(x[0], z[1])]
    const mid = P((x[0] + x[1]) / 2, (z[0] + z[1]) / 2)
    for (let i = 0; i < 4; i++) {
      const s = sideOf(pts[i]!, pts[(i + 1) % 4]!, mid)
      add(part, wallQuad(s.p, s.q, y[0], y[1], s.o))
    }
    add(part, flat(pts, y[1]))
  }

  // park place: storefronts between stone piers, three floors of windows, the terrace's
  // parapet. the stone stands PROUD out of the glass
  const pp = sideOf(SW, J, MIDDLE)
  const stores = bays(0, pp.len, BAY - 0.6, [[0, STORE_TOP]])
  const ppWindows = bays(0, pp.len, WINDOW, rowsFrom(FLOORS.slice(1, 4)))
  face('stone', pp, 0, PARAPET, [...stores, ...ppWindows], PROUD)
  for (const h of stores) reveal('stone', pp, h, PROUD, 'store', PROUD)
  for (const h of ppWindows) reveal('stone', pp, h, 0.35, 'glass', PROUD)
  courses(pp, 0, pp.len, FLOORS.slice(1, 4), ppWindows)
  add('stone', flat([pp.at(0), pp.at(pp.len), pp.at(pp.len, PROUD), pp.at(0, PROUD)], PARAPET))
  face('stone', sideOf(pp.at(pp.len, PROUD), pp.at(pp.len), SW), 0, PARAPET)
  // the parapet's inside, the terrace
  face('stone', sideOf(pp.q, pp.p, pp.at(pp.len / 2, 1)), TERRACE, PARAPET)
  add('base', flat([SW, J, JL, LS], TERRACE))

  // the corner box on jwd: glass all round over a glass ground floor with a grey band and the
  // sign, the doors on park place
  const boxW = sideOf(BOX_SW, BOX_NW, MIDDLE)
  const boxN = sideOf(BOX_NW, C, MIDDLE)
  const boxE = sideOf(C, CN, P(-190, -310))
  const boxS = sideOf(J, BOX_SW, P(-190, -310))
  const BAND: Range = [STORE_TOP, FLOORS[1]!]
  for (const s of [boxW, boxN, boxE, boxS]) {
    // on jwd the bottom is a plain stone wall (commons 2015)
    if (s === boxN) face('stone', s, 0, BAND[1])
    else pane('store', s, 0, s.len, 0, STORE_TOP)
    if (s !== boxN) ledge('metal', s, 0, s.len, BAND[0], BAND[1], 0.15)
    curtain(s, 0, s.len, BAND[1], BOX_TOP - 0.4)
    ledge('metal', s, 0, s.len, BOX_TOP - 0.4, BOX_TOP + 0.3, 0.1)
  }
  // over the terrace the box's south side is glass, the box's roof reaches the library
  const boxUp = sideOf(J, JL, P(-190, -310))
  curtain(boxUp, 0, boxUp.len, TERRACE, BOX_TOP - 0.4)
  ledge('metal', boxUp, 0, boxUp.len, BOX_TOP - 0.4, BOX_TOP + 0.3, 0.1)
  add('base', flat([BOX_NW, C, CN, LN, JL, BOX_SW], BOX_TOP))

  // the library's glass over the terrace and the box, under the roof
  const lib = sideOf(LS, LN, MIDDLE)
  const atJL = lib.len - Math.hypot(LN.x - JL.x, LN.z - JL.z)
  curtain(lib, 0, atJL, TERRACE, SOFFIT)
  curtain(lib, atJL, lib.len, BOX_TOP + 0.3, SOFFIT)

  // jwd: stone ground floor with storefronts, glass over it to the roof (mapillary 2017,
  // 2019: the roof hangs out 3m over it)
  const jwd = sideOf(CN, NE, MIDDLE)
  const jwdStores = bays(0, jwd.len - 4, BAY - 0.6, [[0, STORE_TOP]])
  face('stone', jwd, 0, FLOORS[1]!, jwdStores, PROUD)
  for (const h of jwdStores) reveal('stone', jwd, h, PROUD, 'store', PROUD)
  face('stone', sideOf(jwd.at(0, PROUD), jwd.at(0), NE), 0, FLOORS[1]!)
  face('stone', sideOf(jwd.at(jwd.len), jwd.at(jwd.len, PROUD), CN), 0, FLOORS[1]!)
  add(
    'stone',
    flat([jwd.at(0), jwd.at(jwd.len), jwd.at(jwd.len, PROUD), jwd.at(0, PROUD)], FLOORS[1]!),
  )
  curtain(jwd, 0, jwd.len, FLOORS[1]!, SOFFIT)
  // a shelf out of the glass at the third floor's top on the east part (commons 2015)
  ledge('metal', jwd, 9, jwd.len, FLOORS[3]! - 1.2, FLOORS[3]! + 0.4, 2.4)

  // the drive: the grey service floor down on it, stone with windows over it, a glass bay in a
  // grey frame near jwd
  const drive = sideOf(NE, SE, MIDDLE)
  face('base', drive, 0, BASE_TOP, [], PROUD)
  for (const [u0, u1, h] of [
    [21, 24.5, 3.6],
    [27.5, 28.6, 2.3],
    [31, 34.5, 3.6],
    [38, 41.5, 3.6],
  ])
    add(
      'metal',
      wallQuad(
        drive.at(u0!, PROUD + 0.02),
        drive.at(u1!, PROUD + 0.02),
        DRIVE,
        DRIVE + h!,
        drive.o,
      ),
    )
  const driveWindows = [
    ...bays(EAST_GLASS[1] + 0.4, drive.len, 1.8, rowsFrom(FLOORS.slice(1, 6)), 3.3),
    ...bays(0, EAST_GLASS[0], 1.8, rowsFrom(FLOORS.slice(1, 6)), 3.3),
  ]
  const bay: Hole = [EAST_GLASS[0], EAST_GLASS[1], FLOORS[1]!, SOFFIT]
  face('stone', drive, BASE_TOP, SOFFIT, [bay, ...driveWindows], PROUD)
  for (const h of driveWindows) reveal('stone', drive, h, 0.35, 'glass', PROUD)
  courses(drive, 0, drive.len, FLOORS.slice(1, 6), [bay, ...driveWindows])
  curtain(drive, EAST_GLASS[0] + 0.5, EAST_GLASS[1] - 0.5, FLOORS[1]!, SOFFIT, PROUD - 0.2)
  ledge('metal', drive, EAST_GLASS[0], EAST_GLASS[0] + 0.5, FLOORS[1]!, SOFFIT, PROUD + 0.15)
  ledge('metal', drive, EAST_GLASS[1] - 0.5, EAST_GLASS[1], FLOORS[1]!, SOFFIT, PROUD + 0.15)
  for (const [u0, u1] of [[EAST_GLASS[0] + 0.5, EAST_GLASS[1] - 0.5]])
    add(
      'metal',
      wallQuad(
        drive.at(u0!, PROUD - 0.25),
        drive.at(u1!, PROUD - 0.25),
        FLOORS[1]!,
        SOFFIT,
        drive.o,
      ),
    )
  face('stone', sideOf(drive.at(drive.len, PROUD), drive.at(drive.len), NE), BASE_TOP, SOFFIT)

  // the south side, over the low building next door: stone on the park place end with the
  // library's glass over it in a grey frame, out from the stone and across the terrace's end
  // (gsu 2019, mapillary 2019 from park place: the lidar has the terrace 2.2m behind it), then
  // grey metal with narrow windows to the drive. it runs PROUD past both corners
  const south = sideOf(P(SW.x - 0.32, SW.z), P(SE.x + PROUD, SE.z), MIDDLE)
  const b1 = SOUTH_GRID
  const southWindows = bays(0.6, b1, WINDOW, rowsFrom(FLOORS.slice(1, 2)))
  const slots = bays(b1 + 0.6, south.len, 0.9, rowsFrom(FLOORS.slice(1, 6)))
  const southHoles: Hole[] = [
    [0, b1, SOUTH_BOX_FROM, SOFFIT],
    [b1, south.len, 0, SOFFIT],
    ...southWindows,
  ]
  face('stone', south, 0, SOFFIT, southHoles, PROUD)
  for (const h of southWindows) reveal('stone', south, h, 0.35, 'glass', PROUD)
  courses(south, 0, b1, FLOORS.slice(1, 2), southWindows)
  face('metal', south, 0, SOFFIT, [[0, b1, 0, SOFFIT], ...slots], PROUD)
  for (const h of slots) reveal('metal', south, h, 0.25, 'glass', PROUD)
  const out = PROUD + SOUTH_BOX_OUT
  ledge('metal', south, 0, b1, SOUTH_BOX_FROM, SOUTH_BOX_FROM + 0.4, out)
  ledge('metal', south, 0, 0.4, SOUTH_BOX_FROM, SOFFIT, out)
  ledge('metal', south, b1 - 0.4, b1, SOUTH_BOX_FROM, SOFFIT, out)
  curtain(south, 0.4, b1 - 0.4, SOUTH_BOX_FROM + 0.4, SOFFIT, out - 0.1)
  face('metal', south, SOUTH_BOX_FROM + 0.4, SOFFIT, [[b1, south.len, 0, SOFFIT]], PROUD)
  // its back on the terrace and its end on park place, glass
  const back = meet(
    west.at(0, PROUD),
    west.at(10, PROUD),
    P(0, SW.z - GRID_DEEP),
    P(1, SW.z - GRID_DEEP),
  )
  const corner = P(SW.x - 0.32, SW.z)
  const end = sideOf(back, corner, MIDDLE)
  curtain(end, 0, end.len, TERRACE, SOFFIT)
  const rear = sideOf(back, P(LS.x, back.z), P(-180, -250))
  curtain(rear, 0, rear.len, TERRACE, SOFFIT)
  core(
    'stone',
    [
      P(back.x + 0.5, back.z + 0.3),
      P(LS.x, back.z + 0.3),
      P(LS.x, SW.z - 0.3),
      P(SW.x + 0.3, SW.z - 0.3),
    ],
    TERRACE,
    SOFFIT - 0.1,
  )
  // gsu's logo near the top of the grey metal, a plain blue square
  signs.push({
    ...south.at(SOUTH_GRID + 2.4, PROUD + 0.03),
    y: SOFFIT - 3,
    rot: Math.atan2(south.o.x, south.o.z),
    text: '',
    plate: '#2a5bd7',
    width: 2.4,
    height: 2.4,
  })

  // the hidden blocks that stop a low sun coming in one side's glass and out the other's
  // (landmark.ts core)
  core('stone', inset(outline, 0.6), CEILING, TERRACE - 0.1)
  core('stone', inset([LS, SE, NE, LN], 0.6), TERRACE - 0.1, SOFFIT - 0.1)
  core('stone', inset([BOX_NW, C, CN, LN, JL, BOX_SW], 0.6), TERRACE - 0.1, BOX_TOP - 0.1)

  // the roof: solid over the library and the rest, out to its edge on jwd, louvres over the
  // terrace and the box out to park place's stone (no lid there: it lets the sun through)
  const lb = meet(LS, LN, back, P(back.x + 1, back.z))
  const roof = [
    CL,
    P(NE_ROOF.x + PROUD, NE_ROOF.z),
    P(SE.x + PROUD, SE.z + PROUD),
    P(SW.x - 0.32, SW.z + PROUD),
    back,
    lb,
  ]
  add('base', flat(roof, ROOF))
  add('metal', flat(roof, SOFFIT, false))
  roof.forEach((p, i) => {
    const s = sideOf(p, roof[(i + 1) % roof.length]!, MIDDLE)
    add('metal', wallQuad(s.p, s.q, SOFFIT, ROOF, s.o))
  })
  const strip = sideOf(lb, CL, MIDDLE)
  for (let a = 0.4; a < strip.len - 0.2; a += 0.75) {
    const inner = strip.at(a)
    const outer = meet(inner, strip.at(a, 1), SW, C)
    const fin = sideOf(inner, outer, strip.at(a + 1))
    const back = { x: -fin.o.x, z: -fin.o.z }
    add('metal', wallQuad(fin.p, fin.q, SOFFIT + 0.5, ROOF - 0.05, fin.o))
    add(
      'metal',
      wallQuad(fin.at(0, -0.06), fin.at(fin.len, -0.06), SOFFIT + 0.5, ROOF - 0.05, back),
    )
    add(
      'metal',
      flat([fin.p, fin.q, fin.at(fin.len, -0.06), fin.at(0, -0.06)], SOFFIT + 0.5, false),
    )
  }
  // the roof's edge on park place, a beam on the louvres' ends
  const edge = sideOf(back, C, MIDDLE)
  ledge('metal', edge, 0, edge.len, SOFFIT, ROOF, PROUD)

  // what's on the roof (lidar 360-364m)
  box('base', [-168, -150], [-301, -292], [ROOF, 38.5])
  box('base', [-170, -158], [-287, -272], [ROOF, 39])
  box('base', [-155, -145], [-287, -268], [ROOF, 39.5])

  // inside the ground floor: storefronts on park place, jwd and round the box
  const glassy = [pp, boxW, boxE, boxS, jwd]
  const near = (a: Point, c: Point) => Math.hypot(a.x - c.x, a.z - c.z) < 0.05
  insideWalls(inside, outline, door, (p, q) =>
    glassy.some((s) => (near(s.p, p) && near(s.q, q)) || (near(s.p, q) && near(s.q, p))),
  )

  // the sign over the doors on the box's band: plain blue square where gsu's logo is (2026)
  const signAt = boxW.at(5.5, 0.15 + 0.03)
  const rot = Math.atan2(boxW.o.x, boxW.o.z)
  signs.push({
    ...signAt,
    y: (BAND[0] + BAND[1]) / 2,
    rot,
    text: 'COLLEGE OF LAW',
    plate: '#c9ccce',
    color: '#2b2d31',
    scale: 2,
  })
  return {
    parts: merged(),
    inside,
    signs,
    first: ['stone'],
    noShadow: ['glass', 'store', 'tan'],
  }
}
