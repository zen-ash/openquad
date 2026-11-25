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

// gsu's rialto center for the arts, 80 forsyth st at luckie st (the old rialto theatre's site,
// rebuilt by gsu in 1996). a tall buff brick box for the hall, cream pilasters, a band of
// panels and a heavy cornice at the top, the art deco blade sign and the marquee on the corner,
// storefronts between piers under a band on forsyth st and the lobby's two floors of glass on
// luckie st. from usgs's lidar (2018), gsu's photos (2005 night, 2020, 2023), commons (2007,
// 2019). sources: docs/reference/rialto-center.md
//
// the outline is osm's (the lidar's walls are within half a meter of it). heights are over the
// forsyth st sidewalk at the corner (322.6m), luckie st falls 1m along the lobby

export type RialtoData = {
  points: number[][]
  height: number
  door?: number[]
}

// brick the buff brick, stone the cream precast (cornice, panels, pilasters, the marquee's
// light strips), metal the taupe panels of the marquee and the blade, dark the marquee's led
// screens and the tiles under the lobby, glass the lobby and the storefronts
export type Part = 'brick' | 'stone' | 'metal' | 'dark' | 'glass'

type Range = readonly [number, number]
type Side = ReturnType<typeof sideOf>
const P = (x: number, z: number): Point => ({ x, z })

// the cornice's top (lidar: the roof 343.3-343.7m, its edge on luckie st 344.0)
export const ROOF = 21.4
const CORNICE: Range = [20.1, ROOF]
// recessed cream panels under the cornice, between the pilasters' heads
const FRIEZE: Range = [18, 20.1]
// forsyth st: storefronts up to the band, then brick. the marquee's top is 6.0m (lidar)
const STORE_TOP = 4.2
const BAND_TOP = 6
export const MARQUEE: Range = [3.6, 6]
const MARQUEE_OUT = 3
// along forsyth st from the corner (lidar: the marquee's lid ends 13.6m along) and luckie st
export const MARQUEE_F = 13.6
const MARQUEE_L = 8.6
// the stepped box on top of it by the corner
const TOP_BOX: Range = [6, 8.3]
const TOP_OUT = 1.6
const TOP_LEN = 4.5
// the blade sign, from the 2007 photo fitted on the lidar's heights
export const BLADE: Range = [3.2, 15.3]
// the upper wall on forsyth st is half a meter behind osm's line (lidar), the piers stand out
// of the storefronts' glass (on the line)
const SET = -0.5
const PIER = 0.3
// luckie st's brick stands out of the lobby's glass (on the line)
const LUCKIE = 0.15
// six bays between the pilasters on forsyth st
const BAYS = 6
const PILASTER = 1.2
// the lobby on luckie st, two floors of glass from the corner (u along luckie st)
export const LOBBY: Range = [7.6, 24.5]
const LOBBY_BASE = 0.9
const LOBBY_TOP = 9
// the storefronts on forsyth st, from past the corner pier to here (the rest is service doors)
const STORES_TO = 30

// a straight face from p to q, o the side facing away from `inner`, at(u, d) d out from it
function sideOf(p: Point, q: Point, inner: Point) {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  let o = { x: dir.z, z: -dir.x }
  if ((inner.x - p.x) * o.x + (inner.z - p.z) * o.z > 0) o = { x: -o.x, z: -o.z }
  const at = (u: number, d = 0) => P(p.x + dir.x * u + o.x * d, p.z + dir.z * u + o.z * d)
  return { p, q, len, dir, o, at }
}

export function rialtoGeometry(b: RialtoData) {
  const { add, prism, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null
  const [corner, haas, alley, mid, back] = outline as [Point, Point, Point, Point, Point]
  const middle = P(
    outline.reduce((s, p) => s + p.x, 0) / outline.length,
    outline.reduce((s, p) => s + p.z, 0) / outline.length,
  )
  // both street sides measured from the corner
  const fs = sideOf(corner, haas, middle)
  const ls = sideOf(corner, back, middle)

  // a wall along s from u0 to u1, d out from it, with holes (u from the corner)
  const face = (
    part: Part,
    s: Side,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    holes: Hole[] = [],
    d = 0,
  ) => {
    const cut = holes.map(([a0, a1, v0, v1]): Hole => [a0 - u0, a1 - u0, v0, v1])
    for (const [a0, a1, v0, v1] of solidPieces(u1 - u0, y0, y1, cut))
      add(part, wallQuad(s.at(u0 + a0, d), s.at(u0 + a1, d), v0, v1, s.o, u0 + a0))
  }
  // a hole's sides, sill and head from d back to the glass on the line
  const reveal = (s: Side, [u0, u1, v0, v1]: Hole, d: number) => {
    add('brick', wallQuad(s.at(u0, d), s.at(u0), v0, v1, s.dir))
    add('brick', wallQuad(s.at(u1, d), s.at(u1), v0, v1, { x: -s.dir.x, z: -s.dir.z }))
    const rim = [s.at(u0, d), s.at(u1, d), s.at(u1), s.at(u0)]
    if (v0 > 0.01) add('brick', flat(rim, v0))
    add('brick', flat(rim, v1, false))
    add('glass', glassQuad(s.at(u0), s.at(u1), v0, v1, s.o))
  }
  // a box standing out of a side from d0 to d1, with an underside if it's off the ground
  const box = (part: Part, s: Side, u0: number, u1: number, d0: number, d1: number, y: Range) => {
    const c = [s.at(u0, d0), s.at(u1, d0), s.at(u1, d1), s.at(u0, d1)]
    prism(part, c, y[0], y[1])
    if (y[0] > 0.01) add(part, flat(c, y[0], false))
  }

  // forsyth st: piers and storefronts under a band, service doors past them
  const stores: Hole[] = []
  for (let u = 1.6; u + 2.8 <= STORES_TO; u += 3.8) stores.push([u, u + 2.8, 0, STORE_TOP])
  face('brick', fs, -LUCKIE, fs.len, 0, BAND_TOP, stores, PIER)
  for (const h of stores) reveal(fs, h, PIER)
  for (const [u0, u1] of [
    [33.5, 35.5],
    [40, 42.4],
  ])
    add('dark', wallQuad(fs.at(u0!, PIER + 0.02), fs.at(u1!, PIER + 0.02), 0, 3, fs.o))
  add(
    'stone',
    flat(
      [fs.at(-LUCKIE, SET), fs.at(fs.len, SET), fs.at(fs.len, PIER), fs.at(-LUCKIE, PIER)],
      BAND_TOP,
    ),
  )
  // the brick over it, the panels under the cornice, the pilasters
  face('brick', fs, -LUCKIE, fs.len, BAND_TOP, FRIEZE[0], [], SET)
  face('stone', fs, -LUCKIE, fs.len, FRIEZE[0], CORNICE[0], [], SET)
  // narrow up the brick, wide heads across the panels (2007 photo)
  for (let i = 1; i <= BAYS; i++) {
    const u = Math.min((fs.len * i) / BAYS, fs.len - PILASTER / 2)
    box('stone', fs, u - 0.25, u + 0.25, SET, SET + 0.15, [BAND_TOP, FRIEZE[0]])
    box('stone', fs, u - PILASTER / 2, u + PILASTER / 2, SET, SET + 0.35, FRIEZE)
  }

  // luckie st: the doors under the marquee, the lobby's two floors of glass on dark tiles
  const lobby: Hole = [LOBBY[0], LOBBY[1], LOBBY_BASE, LOBBY_TOP]
  const doors: Hole = [1.6, 5, 0, STORE_TOP]
  face('brick', ls, -PIER, ls.len, 0, FRIEZE[0], [doors, lobby], LUCKIE)
  reveal(ls, doors, LUCKIE)
  reveal(ls, lobby, LUCKIE)
  add('dark', wallQuad(ls.at(LOBBY[0]), ls.at(LOBBY[1]), 0, LOBBY_BASE, ls.o))
  // the mullions between the big lights, the transom between the floors
  for (let u = LOBBY[0] + 2.375; u < LOBBY[1] - 1; u += 2.375)
    box('dark', ls, u - 0.06, u + 0.06, 0, 0.12, [LOBBY_BASE, LOBBY_TOP])
  box('dark', ls, LOBBY[0], LOBBY[1], 0, 0.12, [4.7, 4.95])
  // a soldier course over it
  box('brick', ls, LOBBY[0] - 0.4, LOBBY[1] + 0.4, LUCKIE, LUCKIE + 0.08, [9.3, 9.75])
  face('stone', ls, -PIER, ls.len, FRIEZE[0], CORNICE[0], [], LUCKIE)

  // pilasters on luckie st too, over the lobby
  for (const u of [ls.len / 3, (ls.len * 2) / 3]) {
    box('stone', ls, u - 0.25, u + 0.25, LUCKIE, LUCKIE + 0.15, [10.5, FRIEZE[0]])
    box('stone', ls, u - PILASTER / 2, u + PILASTER / 2, LUCKIE, LUCKIE + 0.35, FRIEZE)
  }
  // the corner: brick round the ends of the walls, a wide head at the top
  box('brick', fs, -LUCKIE - 0.05, 1.2, -1.8, PIER, [BAND_TOP, FRIEZE[0]])
  box('stone', fs, -LUCKIE - 0.3, 1.6, -1.8, PIER + 0.1, FRIEZE)
  // the cornice, out over both street sides
  box('stone', fs, -LUCKIE - 0.35, fs.len, SET, SET + 0.4, CORNICE)
  box('stone', ls, -SET - 0.4, ls.len, LUCKIE, LUCKIE + 0.3, CORNICE)
  box('stone', fs, -LUCKIE - 0.35, fs.len, SET, SET + 0.48, [CORNICE[0] - 0.25, CORNICE[0]])

  // the back, over the theatre next door and the alley: plain brick to a stone coping. the
  // side on haas-howell is against its taller wall, not drawn
  for (const [p, q] of [
    [back, mid],
    [mid, alley],
  ] as const) {
    const s = sideOf(p, q, middle)
    face('brick', s, 0, s.len, 0, ROOF - 0.4)
    box('stone', s, 0, s.len, -0.05, 0.1, [ROOF - 0.4, ROOF])
  }
  add('stone', flat(outline, ROOF - 0.02))

  // the marquee: two arms out of the corner and a chamfer across it where the blade stands,
  // taupe panels with light strips top and bottom, led screens on the fronts, a stepped box on
  // top by the corner
  const arms = [
    { s: fs, u0: -LUCKIE, u1: MARQUEE_F, d: PIER, screen: [1.5, 11] },
    { s: ls, u0: -PIER, u1: MARQUEE_L, d: LUCKIE, screen: [1.2, 6.4] },
  ] as const
  const strips = (a: Point, c: Point, o: Point, y: Range) => {
    for (const h of [y[0] + 0.12, y[1] - 0.3]) add('stone', wallQuad(a, c, h, h + 0.14, o))
  }
  for (const { s, u0, u1, d, screen } of arms) {
    const out = d + MARQUEE_OUT
    box('metal', s, u0, u1, d, out, MARQUEE)
    strips(s.at(u0, out + 0.02), s.at(u1, out + 0.02), s.o, MARQUEE)
    add('dark', wallQuad(s.at(screen[0], out + 0.03), s.at(screen[1], out + 0.03), 4.25, 5.55, s.o))
    box('metal', s, u0, TOP_LEN, d, d + TOP_OUT, TOP_BOX)
    box('stone', s, u0, TOP_LEN + 0.1, d, d + TOP_OUT + 0.12, [TOP_BOX[1] - 0.2, TOP_BOX[1]])
    // gsu's panel on the arm's end: the name, a plain blue square where the logo is
    signs.push({
      ...s.at((screen[1] + u1) / 2, out + 0.05),
      y: 4.9,
      rot: Math.atan2(s.o.x, s.o.z),
      text: 'GEORGIA\nSTATE\nUNIVERSITY',
      plate: '#8c7d64',
      color: '#f1ede4',
      scale: 0.75,
    })
  }
  // and one on the end of the luckie st arm (2023)
  signs.push({
    ...ls.at(MARQUEE_L + 0.05, LUCKIE + MARQUEE_OUT / 2),
    y: 4.9,
    rot: Math.atan2(ls.dir.x, ls.dir.z),
    text: 'GEORGIA\nSTATE\nUNIVERSITY',
    plate: '#8c7d64',
    color: '#f1ede4',
    scale: 0.75,
  })
  // the chamfers between the arms' ends, the marquee's and the box's on top of it
  const n = { x: fs.o.x + ls.o.x, z: fs.o.z + ls.o.z }
  const nl = Math.hypot(n.x, n.z)
  n.x /= nl
  n.z /= nl
  const inner = fs.at(-LUCKIE, PIER)
  for (const [out, y] of [
    [MARQUEE_OUT, MARQUEE],
    [TOP_OUT, TOP_BOX],
  ] as const) {
    const a = fs.at(-LUCKIE, PIER + out)
    const c = ls.at(-PIER, LUCKIE + out)
    prism('metal', [inner, a, c], y[0], y[1])
    add('metal', flat([inner, a, c], y[0], false))
    if (out === MARQUEE_OUT) strips(a, c, n, y)
  }

  // the blade, square to the corner's diagonal on the marquee's chamfer, with a pylon back to
  // the building. blue face, white letters, cream fins up its sides
  const t = { x: -n.z, z: n.x }
  const a = fs.at(-LUCKIE, PIER + MARQUEE_OUT)
  const c = ls.at(-PIER, LUCKIE + MARQUEE_OUT)
  const foot = P((a.x + c.x) / 2 + n.x * 0.8, (a.z + c.z) / 2 + n.z * 0.8)
  const blade = sideOf(
    P(foot.x - t.x * 1.3, foot.z - t.z * 1.3),
    P(foot.x + t.x * 1.3, foot.z + t.z * 1.3),
    corner,
  )
  box('metal', blade, 0.3, 2.3, -0.8, 0, BLADE)
  box('metal', blade, 0.1, 2.5, -1, 0.15, [BLADE[1], BLADE[1] + 0.45])
  for (const u of [0, 2.3])
    box('stone', blade, u, u + 0.3, -0.9, 0.1, [BLADE[0] + 0.3, BLADE[1] + 0.8])
  const pylon = sideOf(corner, foot, middle)
  box('metal', pylon, 0.6, pylon.len - 0.7, -0.6, 0.6, [TOP_BOX[1], BLADE[1] - 0.6])
  const rot = Math.atan2(n.x, n.z)
  const mid0 = (BLADE[0] + 0.5 + BLADE[1] - 0.3) / 2
  signs.push({
    ...blade.at(1.3, 0.02),
    y: mid0,
    rot,
    text: '',
    plate: '#1f3c95',
    width: 1.6,
    height: 10,
  })
  signs.push({
    ...blade.at(1.3, 0.05),
    y: mid0,
    rot,
    text: 'R\nI\nA\nL\nT\nO',
    letters: true,
    size: 1.9,
    line: 0.78,
    weight: 700,
    color: '#f4f1ec',
  })

  // banners on brackets out from the pilasters on forsyth st (music, dance, theater, film),
  // square to the wall, facing the corner (one sided, each one is a draw)
  ;['#e2a72a', '#c8432f', '#56606e', '#3f8d4a'].forEach((plate, i) => {
    const at = fs.at((fs.len * (i + 1)) / BAYS - PILASTER / 2 - 0.1, SET + 1.1)
    const rot = Math.atan2(-fs.dir.x, -fs.dir.z)
    signs.push({ ...at, y: 13, rot, text: '', plate, width: 1.3, height: 7 })
  })

  // a hidden block for the shadows: the hall is empty over the ground floor and a low sun
  // came in the lobby's glass (landmark.ts core)
  core('brick', inset(outline, 0.6), CEILING, ROOF - 0.1)

  // inside the ground floor: the storefronts on forsyth st and the lobby on luckie st
  const near = (a: Point, c: Point) => Math.hypot(a.x - c.x, a.z - c.z) < 0.05
  insideWalls(
    inside,
    outline,
    door,
    (p, q) => (near(p, corner) && near(q, haas)) || (near(p, back) && near(q, corner)),
  )
  return {
    parts: merged(),
    inside,
    signs,
    first: ['brick'],
    noShadow: ['glass', 'dark'],
  }
}
