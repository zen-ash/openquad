import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import {
  circle,
  flat,
  glassQuad,
  parts as collect,
  wallQuad,
  type Hole,
  type Opening,
} from './landmark'

// gsu's patton hall (2008), a six storey dorm for 325 with the patton dining hall in its base,
// at edgewood ave and piedmont ave. a U open to the west round a court, a one storey block
// in the court's east half with a terrace on it. two floors of tan stucco at the bottom on a
// split face block base (all block on piedmont ave), red brick over that with white sunshades
// over the windows, tan stucco at the west end and on the top floor's east half, silver round
// columns along the base and the corner open two floors up round the entrance, on two slanted
// blue columns. from gsu's photos (2019), mapillary (2019, 2022) and usgs's lidar (2018).
// sources: docs/reference/patton-hall.md
//
// heights over the edgewood ave sidewalk at the door (303.3m), the ground falls 3m to the
// north side

export type PattonHallData = {
  points: number[][]
  height: number
  door?: number[]
}

// brick the red brick, stucco the tan stucco (and the roofs), block the split face base, glass
// the windows, metal the silver columns, the white sunshades and the corner's white panels,
// blue the slanted columns and the blue panels by some windows
export type Part = 'brick' | 'stucco' | 'block' | 'glass' | 'metal' | 'blue'

const P = (x: number, z: number): Point => ({ x, z })

// floors: a tall ground floor, then 3m (gsu's 2019 photo, six rows of windows)
const GROUND = 4.4
const SECOND = 7.4
const STORY = 3
// the roof 323.0m, the parapet 324.2 (lidar)
export const ROOF = 19.7
export const PARAPET = 20.9
// the north bar's west end and a screened plant area by it (326.6), the lift penthouse on
// the edgewood bar (327.8)
const TOWER = 23.3
const PENTHOUSE = 24.5
// the split face base under the stucco
const PLINTH = 0.9
const REVEAL = 0.2
const WIN: [number, number] = [1.3, 1.6]

// the corners (lidar), x east and z south
const W = 240.8
const E = 280.6
const S = -39.8
const N = -96.6
const COURT_N = -81
const COURT_S = -55
const COURT_E = 267.5
const PODIUM_W = 254
const SOUTH_W = 252.5
// the open corner round the entrance
const NOTCH_X = 275
const NOTCH_Z = -43.5

type Face = {
  p: Point
  q: Point
  len: number
  dir: Point
  out: Point
  at: (u: number, d?: number) => Point
}

function face(p: Point, q: Point, out: Point): Face {
  const len = Math.hypot(q.x - p.x, q.z - p.z)
  const dir = { x: (q.x - p.x) / len, z: (q.z - p.z) / len }
  return {
    p,
    q,
    len,
    dir,
    out,
    at: (u, d = 0) => P(p.x + dir.x * u + out.x * d, p.z + dir.z * u + out.z * d),
  }
}

export function pattonHallGeometry(b: PattonHallData) {
  const { add, prism, wall, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null
  const south = { x: 0, z: 1 }
  const north = { x: 0, z: -1 }
  const east = { x: 1, z: 0 }
  const west = { x: -1, z: 0 }

  // a box standing out of a face, u along it and d out from it
  const box = (
    part: Part,
    f: Face,
    u0: number,
    u1: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
  ) => {
    const c = [f.at(u0, d0), f.at(u1, d0), f.at(u1, d1), f.at(u0, d1)]
    prism(part, c, y0, y1)
    if (y0 > 0.01) add(part, flat(c, y0, false))
  }
  // a stretch of a face from u0 to u1, set-in windows (holes in face u)
  const band = (
    part: Part,
    f: Face,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    holes: Hole[] = [],
    doorway?: Hole,
  ) => {
    // windows down past the inside's ceiling sit nearly flush, or its edge shows in them
    const depth = holes.some((h) => h[2] < CEILING && h[3] > CEILING) ? 0.03 : REVEAL
    const openings: Opening<Part>[] = holes
      .filter(
        (h) => h[0] >= u0 - 0.01 && h[1] <= u1 + 0.01 && h[2] >= y0 - 0.01 && h[3] <= y1 + 0.01,
      )
      .map((h) => ({ hole: [h[0] - u0, h[1] - u0, h[2], h[3]], glass: 'glass', sides: part }))
    if (doorway) openings.push({ hole: [doorway[0] - u0, doorway[1] - u0, doorway[2], doorway[3]] })
    wall(part, f.at(u0), f.at(u1), y0, y1, f.out, openings, depth)
  }
  // windows drawn flat on the wall, for the sides nobody sees from close (the court, the back)
  const flatWindows = (f: Face, holes: Hole[]) => {
    for (const [u0, u1, v0, v1] of holes)
      add('glass', glassQuad(f.at(u0, 0.03), f.at(u1, 0.03), v0, v1, f.out))
  }
  // a row of windows every `step` from u0 to u1 on each floor from y
  const grid = (u0: number, u1: number, step: number, from: number, to: number, w = WIN[0]) => {
    const holes: Hole[] = []
    const n = Math.max(1, Math.floor((u1 - u0) / step))
    const pad = (u1 - u0 - n * step) / 2
    for (let y = from; y + STORY <= to + 0.01; y += STORY)
      for (let i = 0; i < n; i++) {
        const c = u0 + pad + step * (i + 0.5)
        holes.push([c - w / 2, c + w / 2, y + 0.9, y + 0.9 + WIN[1]])
      }
    return holes
  }
  // white sunshades over windows
  const shades = (f: Face, holes: Hole[]) => {
    for (const [u0, u1, , v1] of holes)
      box('metal', f, u0 - 0.15, u1 + 0.15, 0, 0.55, v1 + 0.15, v1 + 0.22)
  }
  // the parapet's back and its cap, along a face whose top is at PARAPET
  const parapet = (f: Face, u0: number, u1: number, top = PARAPET) => {
    add('stucco', wallQuad(f.at(u1, -0.3), f.at(u0, -0.3), ROOF, top, { x: -f.out.x, z: -f.out.z }))
    box('stucco', f, u0, u1, -0.3, 0.06, top - 0.12, top)
  }

  // edgewood ave: the stucco west end, two floors of stucco with the dining hall's big windows,
  // brick over that, the top floor's east half stucco again. the corner over the entrance
  const sf = face(P(SOUTH_W, S), P(E, S), south)
  const notchU = NOTCH_X - SOUTH_W
  const baseHoles: Hole[] = []
  for (const [u0, u1] of [
    [6.6, 14.9],
    [16.1, 21.8],
  ]) {
    baseHoles.push([u0!, u1!, 1.2, 3.9])
    baseHoles.push([u0!, u1!, 5, 6.9])
  }
  band('block', sf, 0, notchU, 0, PLINTH)
  band('stucco', sf, 0, notchU, PLINTH, SECOND, baseHoles)
  // mullions in the big windows
  for (const [u0, u1, v0, v1] of baseHoles)
    for (let u = u0 + 1.4; u < u1 - 0.5; u += 1.4)
      box('metal', sf, u - 0.04, u + 0.04, -0.03, 0.03, v0, v1)
  // the white sunshade band over the second floor, silver columns in front of the base
  box('metal', sf, 5.6, sf.len, 0, 0.6, SECOND - 0.1, SECOND)
  for (const u of [15.5, 22]) column(add, sf.at(u, 0.5), 0.42, 0, SECOND)
  // the west end, stucco all the way up with a brick strip of narrow windows near the corner
  // (gsu's 2018 photo across edgewood ave)
  const strip: Hole[] = []
  for (let y = SECOND; y + STORY <= ROOF; y += STORY) strip.push([2, 2.8, y + 0.8, y + 2.4])
  band('stucco', sf, 0, 1.5, SECOND, PARAPET)
  band('brick', sf, 1.5, 3.3, SECOND, PARAPET, strip)
  band('stucco', sf, 3.3, 5.5, SECOND, PARAPET)
  const upper = grid(5.6, sf.len, 2.8, SECOND, ROOF)
  const bricky = upper.filter((h) => h[2] < 16.4 || h[1] < 15)
  const top = upper.filter((h) => !(h[2] < 16.4 || h[1] < 15))
  band('brick', sf, 5.5, sf.len, SECOND, 16.4, bricky)
  band('brick', sf, 5.5, 15, 16.4, PARAPET, bricky)
  band('stucco', sf, 15, sf.len, 16.4, PARAPET, top)
  shades(sf, upper)
  // blue panels next to every third window (gsu's 2019 photo)
  upper.forEach(([, u1, v0, v1], i) => {
    if (i % 3 === 1 && u1 + 1.2 < sf.len)
      add('blue', wallQuad(sf.at(u1 + 0.1, 0.02), sf.at(u1 + 1.2, 0.02), v0, v1, south))
  })
  parapet(sf, 0, sf.len)

  // the open corner: a white panel wall on its west side, the entrance glass facing edgewood,
  // the soffit over it and the two slanted blue columns at the corner
  const nw = face(P(NOTCH_X, S), P(NOTCH_X, NOTCH_Z), east)
  band('metal', nw, 0, nw.len, 0, SECOND)
  const nn = face(P(NOTCH_X, NOTCH_Z), P(E, NOTCH_Z), south)
  const t = door ? door.x - NOTCH_X : 3
  const entry: Hole = [t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT]
  band('stucco', nn, 0, nn.len, 0, SECOND, [[0.3, nn.len - 0.3, DOOR_HEIGHT + 0.3, 6.9]], entry)
  add('glass', glassQuad(nn.at(0.3, 0.01), nn.at(entry[0], 0.01), 0.1, DOOR_HEIGHT, south))
  add('glass', glassQuad(nn.at(entry[1], 0.01), nn.at(nn.len - 0.3, 0.01), 0.1, DOOR_HEIGHT, south))
  add('stucco', flat([P(NOTCH_X, S), P(E, S), P(E, NOTCH_Z), P(NOTCH_X, NOTCH_Z)], SECOND, false))
  add('blue', flat([P(NOTCH_X, S), P(E, S), P(E, NOTCH_Z), P(NOTCH_X, NOTCH_Z)], 0.02))
  for (const [x0, x1] of [
    [E - 0.6, E - 1.8],
    [E - 2.6, E - 1.9],
  ])
    slanted(add, P(x0!, S + 0.6), P(x1!, NOTCH_Z + 0.4), 0.18, SECOND)
  // the corner's walls over it
  const ec = face(P(E, S), P(E, NOTCH_Z), east)
  band('brick', ec, 0, ec.len, SECOND, PARAPET)

  // piedmont ave: split face block with storefront windows between silver columns, brick over
  // it (the 2022 walk up piedmont)
  const ef = face(P(E, NOTCH_Z), P(E, N), east)
  const store: Hole[] = []
  for (let u = 1.2; u + 5 <= ef.len; u += 6) {
    store.push([u + 0.5, u + 5, 1, 3.9])
    column(add, ef.at(u, 0.5), 0.36, 0, GROUND + 0.4)
  }
  band('block', ef, 0, ef.len, 0, GROUND, store)
  const eUp = grid(0.5, ef.len - 0.5, 2.9, GROUND, ROOF)
  band('brick', ef, 0, ef.len, GROUND, PARAPET, eUp)
  shades(
    ef,
    eUp.filter((h) => h[2] > SECOND),
  )
  box('block', ef, 0, ef.len, 0, 0.05, GROUND - 0.3, GROUND)
  // brick on up past the corner's top
  parapet(ef, 0, ef.len)
  parapet(ec, 0, ec.len)

  // the north side (a parking lot and auburn ave's backs): block, then brick, flat windows.
  // its west end stands a floor higher
  const nf = face(P(E, N), P(W, N), north)
  const towerU = E - 247
  band('block', nf, 0, nf.len, 0, GROUND)
  band('brick', nf, 0, towerU, GROUND, PARAPET)
  band('brick', nf, towerU, nf.len, GROUND, TOWER)
  flatWindows(nf, grid(0.5, towerU, 3.1, GROUND, ROOF))
  flatWindows(nf, grid(0.5, nf.len - 0.5, 4, 0, GROUND).slice(0, 8))
  parapet(nf, 0, towerU)
  parapet(nf, towerU, nf.len, TOWER)
  const wn = face(P(W, N), P(W, COURT_N), west)
  band('block', wn, 0, wn.len, 0, GROUND)
  band('stucco', wn, 0, wn.len, GROUND, TOWER)
  parapet(wn, 0, wn.len, TOWER)
  const te = face(P(247, COURT_N), P(247, N), east)
  add('stucco', wallQuad(te.at(0), te.at(te.len), ROOF, TOWER, east))
  add('stucco', flat([P(W, N), P(247, N), P(247, COURT_N), P(W, COURT_N)], TOWER))
  // a screened plant area on the roof by it
  box('block', face(P(249, -83), P(258, -83), south), 0, 9, 0, 8, ROOF, TOWER - 0.3)

  // the court: stucco two floors up, then brick, flat windows. the one storey block in its
  // east half has a terrace on top at the second floor
  const cn = face(P(W, COURT_N), P(COURT_E, COURT_N), south)
  const podU = PODIUM_W - W
  band('stucco', cn, 0, podU, 0, SECOND)
  band('stucco', cn, podU, cn.len, GROUND, SECOND)
  band('brick', cn, 0, cn.len, SECOND, PARAPET)
  band('brick', cn, 0, 6.2, PARAPET, TOWER)
  flatWindows(cn, grid(6.5, cn.len, 3, SECOND, ROOF))
  flatWindows(cn, grid(0.5, podU, 3.2, 0, SECOND))
  parapet(cn, 6.2, cn.len)
  const ce = face(P(COURT_E, COURT_N), P(COURT_E, COURT_S), west)
  band('stucco', ce, 0, ce.len, GROUND, SECOND)
  band('brick', ce, 0, ce.len, SECOND, PARAPET)
  flatWindows(ce, grid(0.5, ce.len - 0.5, 2.9, GROUND, ROOF))
  parapet(ce, 0, ce.len)
  const cs = face(P(COURT_E, COURT_S), P(SOUTH_W, COURT_S), north)
  const podE = COURT_E - PODIUM_W
  band('stucco', cs, 0, podE, GROUND, SECOND)
  band('stucco', cs, podE, cs.len, 0, SECOND)
  band('brick', cs, 0, cs.len, SECOND, PARAPET)
  flatWindows(cs, grid(0.5, cs.len - 0.5, 3, SECOND, ROOF))
  parapet(cs, 0, cs.len)
  const pw = face(P(PODIUM_W, COURT_N), P(PODIUM_W, COURT_S), west)
  band('stucco', pw, 0, pw.len, 0, GROUND)
  flatWindows(pw, grid(0.5, pw.len - 0.5, 3.2, 0, GROUND))
  box('metal', pw, 0, pw.len, -0.1, 0.05, GROUND, GROUND + 1.1)
  add(
    'stucco',
    flat(
      [P(PODIUM_W, COURT_N), P(COURT_E, COURT_N), P(COURT_E, COURT_S), P(PODIUM_W, COURT_S)],
      GROUND,
    ),
  )
  // the edgewood bar's west end, plain stucco with a few small windows
  const ws = face(P(SOUTH_W, COURT_S), P(SOUTH_W, S), west)
  const small: Hole[] = []
  for (let y = SECOND; y + STORY <= ROOF; y += STORY) small.push([10.5, 11.3, y + 1.2, y + 2])
  band('block', ws, 0, ws.len, 0, PLINTH)
  band('stucco', ws, 0, ws.len, PLINTH, SECOND)
  band('stucco', ws, 0, ws.len, SECOND, PARAPET, small)
  parapet(ws, 0, ws.len)

  // the roof and the lift penthouse on the edgewood bar
  add(
    'stucco',
    flat(
      [
        P(SOUTH_W, S),
        P(E, S),
        P(E, N),
        P(247, N),
        P(247, COURT_N),
        P(COURT_E, COURT_N),
        P(COURT_E, COURT_S),
        P(SOUTH_W, COURT_S),
      ],
      ROOF,
    ),
  )
  prism('stucco', [P(266, -56), P(273, -56), P(273, -46), P(266, -46)], ROOF, PENTHOUSE)

  // the dining hall's name on the stucco by the door, a plain blue square where the logo is
  signs.push({
    ...sf.at(18.9, 0.04),
    y: 4.5,
    rot: 0,
    text: 'PATTON HALL',
    plate: '#f3f3f1',
    color: '#1d2f6b',
    scale: 0.55,
  })
  signs.push({
    ...sf.at(16.9, 0.06),
    y: 4.5,
    rot: 0,
    text: '',
    plate: '#1f4fa0',
    width: 0.35,
    height: 0.35,
  })

  // hidden blocks for the shadows: the bars are empty over the ground floor
  for (const c of [
    [SOUTH_W, E, COURT_S, S],
    [COURT_E, E, N, S],
    [W, E, N, COURT_N],
  ] as const) {
    const [x0, x1, z0, z1] = c
    const c4 = [
      P(x0 + 0.8, z0 + 0.8),
      P(x1 - 0.8, z0 + 0.8),
      P(x1 - 0.8, z1 - 0.8),
      P(x0 + 0.8, z1 - 0.8),
    ]
    core('brick', c4, CEILING, ROOF - 0.05)
    // and a floor: the open corner has no ceiling under it
    add('brick', flat(c4, CEILING + 0.1, false))
  }

  return {
    parts: merged(),
    inside,
    signs,
    first: ['brick'],
    noShadow: ['glass', 'blue'],
  }
}

// a round column, n sided
function column(
  add: (part: Part, geo: THREE.BufferGeometry) => void,
  c: Point,
  r: number,
  y0: number,
  y1: number,
) {
  const ring = circle(c, r, 10)
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]!
    const m = P((p.x + q.x) / 2 - c.x, (p.z + q.z) / 2 - c.z)
    const l = Math.hypot(m.x, m.z)
    add('metal', wallQuad(p, q, y0, y1, P(m.x / l, m.z / l)))
  })
}

// a square tube from a on the ground to c up at y, for the slanted columns
function slanted(
  add: (part: Part, geo: THREE.BufferGeometry) => void,
  a: Point,
  c: Point,
  r: number,
  y: number,
) {
  const corners = [
    [-r, -r],
    [r, -r],
    [r, r],
    [-r, r],
  ]
  const pos: number[] = []
  const lo = corners.map(([dx, dz]) => new THREE.Vector3(a.x + dx!, 0, a.z + dz!))
  const hi = corners.map(([dx, dz]) => new THREE.Vector3(c.x + dx!, y, c.z + dz!))
  const mid = new THREE.Vector3((a.x + c.x) / 2, y / 2, (a.z + c.z) / 2)
  const tri = (v: THREE.Vector3[]) => {
    const n = v[1]!.clone().sub(v[0]!).cross(v[2]!.clone().sub(v[0]!))
    const centre = v[0]!.clone().add(v[1]!).add(v[2]!).divideScalar(3)
    if (n.dot(centre.sub(mid)) < 0) v.reverse()
    pos.push(...v.flatMap((p) => [p.x, p.y, p.z]))
  }
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    tri([lo[i]!, lo[j]!, hi[j]!])
    tri([lo[i]!, hi[j]!, hi[i]!])
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  const p = geo.getAttribute('position')
  const uv: number[] = []
  for (let i = 0; i < p.count; i++) uv.push(p.getX(i) + p.getZ(i), p.getY(i))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  add('blue', geo)
}
