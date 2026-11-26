import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import type { Sign } from './landmarks'
import { edges, flat, inset, parts as collect, wallQuad, type Opening } from './landmark'

// gsu's greek housing (2008), off edgewood ave east of 148 edgewood: three blocks of three
// storey town homes for nine fraternities and sororities round a lawn, and a two storey one at
// the back. each town home is a bay, red brick all the way up or tan stucco over a brick ground
// floor, the brick ones standing a bit forward and a bit taller, 2x2 windows in white frames,
// the chapter's letters on a plate up top and blue metal canopies over the doors on the lawn.
// from gsu's photos (2018, 2019, 2026), mapillary (2019, 2022) and usgs's lidar (2018).
// sources: docs/reference/greek-housing.md
//
// osm's outlines are kept (the lidar's walls are within half a meter), every edge is a bay or
// a few. heights over each block's floor (the ground at its door, surface.ts)

export type GreekHousingData = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { floors?: number }
}

// brick the red brick, stucco the tan stucco, trim the cream cornices, sills and roofs, glass
// the windows, blue the canopies over the doors
export type Part = 'brick' | 'stucco' | 'trim' | 'glass' | 'blue'

const P = (x: number, z: number): Point => ({ x, z })

// the brick bays' parapets stand this much over the stucco ones' cornices (gsu's 2018 photo)
const STEP = 0.5
// the roof behind the parapets
const PARAPET = 0.45
// town homes are 5-8m wide: long edges are cut into bays about this wide
const BAY = 6.5
// 2x2 windows, a 0.85m sill
const WINDOW: [number, number] = [1.6, 1.4]
const SILL = 0.85
const REVEAL = 0.12
// the lawn in the middle, the canopies are on the sides facing it
const LAWN = P(222, -62)

export function greekHousingGeometry(b: GreekHousingData) {
  const { add, prism, wall, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => P(x!, z!))
  const door = b.door ? P(b.door[0]!, b.door[1]!) : null
  const floors = b.landmark?.floors ?? 3
  const top = b.height
  const cornice = top - STEP
  const roof = cornice - PARAPET
  const story = (cornice - 0.5) / floors

  // a box standing out of an edge, u along it and d out from it
  const box = (
    part: Part,
    e: Edge,
    u0: number,
    u1: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
  ) => {
    const c = [at(e, u0, d0), at(e, u1, d0), at(e, u1, d1), at(e, u0, d1)]
    prism(part, c, y0, y1)
    if (y0 > 0.01) add(part, flat(c, y0, false))
  }

  let n = 0
  const canopies: { e: Edge; u: number }[] = []
  for (const e of edges(outline)) {
    if (e.len < 0.05) continue
    // jogs between bays are brick, long edges are bays taking turns
    const count = e.len < 2.2 ? 1 : Math.max(1, Math.round(e.len / BAY))
    const w = e.len / count
    for (let i = 0; i < count; i++) {
      const u0 = i * w
      const u1 = u0 + w
      const brick = e.len < 2.2 || n++ % 2 === 1
      const high = brick ? top : cornice
      const openings: Opening<Part>[] = []
      const onEdge =
        door &&
        Math.abs((door.x - e.p.x) * e.out.x + (door.z - e.p.z) * e.out.z) < 0.1 &&
        aOf(e, door) > u0 &&
        aOf(e, door) < u1
      const t = door ? aOf(e, door) : 0
      if (onEdge) openings.push({ hole: [t - DOOR_WIDTH / 2, t + DOOR_WIDTH / 2, 0, DOOR_HEIGHT] })
      // windows on every floor, in the middle of the bay
      const k = w < 2.2 ? 0 : Math.max(1, Math.floor((w - 1) / 3.2))
      for (let f = 0; f < floors; f++)
        for (let j = 0; j < k; j++) {
          const c = u0 + (w * (j + 0.5)) / k
          // upstairs sills stay over the inside's ceiling, its edge showed in the reveals
          const y = f === 0 ? SILL + 0.1 : Math.max(f * story + SILL, CEILING + 0.05)
          const hole: [number, number, number, number] = [
            c - WINDOW[0] / 2,
            c + WINDOW[0] / 2,
            y,
            y + WINDOW[1],
          ]
          if (onEdge && f === 0 && Math.abs(c - t) < DOOR_WIDTH / 2 + WINDOW[0] / 2 + 0.2) continue
          openings.push({ hole, glass: 'glass', sides: 'trim' })
        }
      // the ground floor is brick under every bay, the stucco starts over a brick band
      const ground = openings.filter((o) => o.hole[2] < story)
      const upper = openings.filter((o) => o.hole[2] >= story)
      wallPart(wall, 'brick', e, u0, u1, 0, story, ground)
      wallPart(wall, brick ? 'brick' : 'stucco', e, u0, u1, story, high, upper)
      if (!brick) box('brick', e, u0, u1, 0, 0.05, story - 0.25, story)
      // the coping: a cream cornice on the stucco bays, a cap on the brick ones
      if (brick) box('trim', e, u0 - 0.04, u1 + 0.04, -0.25, 0.08, high - 0.15, high)
      else box('trim', e, u0, u1, -0.25, 0.22, high - 0.35, high)
      // the back of the parapet
      add(
        brick ? 'brick' : 'stucco',
        wallQuad(at(e, u1, -0.25), at(e, u0, -0.25), roof, high, neg(e.out)),
      )
      if (!brick && w > 4 && facesLawn(e)) canopies.push({ e, u: (u0 + u1) / 2 })
    }
  }
  // the roof, white membrane in the satellite pictures
  add('trim', flat(inset(outline, 0.2), roof))

  // blue standing seam canopies over the doors on the lawn side, on two posts
  // and the chapters' letters over two of them (gsu's 2019 lawn photo: zeta tau alpha on the
  // west block, pi kappa phi on edgewood's)
  const letters = outline[0]!.x < 210 ? ['ΖΤΑ'] : floors === 3 ? ['ΠΚΦ'] : []
  canopies.slice(0, letters.length).forEach(({ e, u }, i) =>
    signs.push({
      ...at(e, u, 0.06),
      y: cornice - 0.9,
      rot: Math.atan2(e.out.x, e.out.z),
      text: letters[i]!,
      plate: '#ece6d8',
      color: '#2a2622',
      scale: 0.9,
    }),
  )
  for (const { e, u } of canopies.slice(0, 3)) {
    const y = Math.min(3, story) - 0.05
    hip(add, e, u - 1.6, u + 1.6, 0, 1.8, y, 0.6)
    box('blue', e, u - 1.6, u + 1.6, 0, 1.8, y - 0.2, y)
    for (const s of [-1.45, 1.45]) box('trim', e, u + s - 0.07, u + s + 0.07, 1.6, 1.74, 0, y - 0.2)
  }

  // the chapter's letters on edgewood's block, on the end facing the drive (gsu's 2018 photo:
  // alpha xi delta)
  const end = edges(outline)
    .filter((e) => e.out.x > 0.9 && e.len > 3)
    .sort((a, c) => c.p.z - a.p.z)[0]
  if (end && outline[0]!.x > 230) {
    signs.push({
      ...at(end, end.len / 2, 0.06),
      y: top - 1.2,
      rot: Math.atan2(end.out.x, end.out.z),
      text: 'ΑΞΔ',
      plate: '#d9d1bf',
      color: '#2a2622',
      scale: 0.9,
    })
  }

  // a hidden block for the shadows: the glass doesn't cast and the town homes are empty over
  // the ground floor (landmark.ts core)
  core('stucco', inset(outline, 0.8), CEILING, roof - 0.05)

  return {
    parts: merged(),
    inside,
    signs,
    first: ['brick'],
    noShadow: ['glass', 'trim'],
    near: ['blue'],
  }
}

type Edge = ReturnType<typeof edges>[number]

const at = (e: Edge, u: number, d = 0) =>
  P(e.p.x + e.dir.x * u + e.out.x * d, e.p.z + e.dir.z * u + e.out.z * d)
const aOf = (e: Edge, p: Point) => (p.x - e.p.x) * e.dir.x + (p.z - e.p.z) * e.dir.z
const neg = (p: Point) => P(-p.x, -p.z)
const facesLawn = (e: Edge) => {
  const m = at(e, e.len / 2)
  const dx = LAWN.x - m.x
  const dz = LAWN.z - m.z
  const l = Math.hypot(dx, dz)
  return l < 16 && (dx * e.out.x + dz * e.out.z) / l > 0.6
}

// a stretch of an edge from u0 to u1 between two heights, the holes in edge u
function wallPart(
  wall: ReturnType<typeof collect<Part>>['wall'],
  part: Part,
  e: Edge,
  u0: number,
  u1: number,
  y0: number,
  y1: number,
  openings: Opening<Part>[],
) {
  const shifted = openings.map((o) => ({
    ...o,
    hole: [o.hole[0] - u0, o.hole[1] - u0, o.hole[2], o.hole[3]] as Opening<Part>['hole'],
  }))
  wall(part, at(e, u0), at(e, u1), y0, y1, e.out, shifted, REVEAL)
}

// a hipped roof over a box standing out of an edge, rise high, four sloped faces
function hip(
  add: (part: Part, geo: THREE.BufferGeometry) => void,
  e: Edge,
  u0: number,
  u1: number,
  d0: number,
  d1: number,
  y: number,
  rise: number,
) {
  const inn = Math.min(u1 - u0, d1 - d0) / 2 - 0.05
  const c = [at(e, u0, d0), at(e, u1, d0), at(e, u1, d1), at(e, u0, d1)]
  const r = [
    at(e, u0 + inn, d0 + inn),
    at(e, u1 - inn, d0 + inn),
    at(e, u1 - inn, d1 - inn),
    at(e, u0 + inn, d1 - inn),
  ]
  const mid = at(e, (u0 + u1) / 2, (d0 + d1) / 2)
  const pos: number[] = []
  const tri = (a: Point, ay: number, q: Point, qy: number, s: Point, sy: number) => {
    const v = [
      new THREE.Vector3(a.x, ay, a.z),
      new THREE.Vector3(q.x, qy, q.z),
      new THREE.Vector3(s.x, sy, s.z),
    ]
    const n = v[1]!.clone().sub(v[0]!).cross(v[2]!.clone().sub(v[0]!))
    // face up and away from the middle
    const away = new THREE.Vector3((a.x + q.x + s.x) / 3 - mid.x, 1, (a.z + q.z + s.z) / 3 - mid.z)
    if (n.dot(away) < 0) v.reverse()
    pos.push(...v.flatMap((p) => [p.x, p.y, p.z]))
  }
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    tri(c[i]!, y, c[j]!, y, r[j]!, y + rise)
    tri(c[i]!, y, r[j]!, y + rise, r[i]!, y + rise)
  }
  tri(r[0]!, y + rise, r[1]!, y + rise, r[2]!, y + rise)
  tri(r[0]!, y + rise, r[2]!, y + rise, r[3]!, y + rise)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  const p = geo.getAttribute('position')
  geo.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      Array.from({ length: p.count }, (_, i) => [p.getX(i) + p.getZ(i), p.getY(i)]).flat(),
      2,
    ),
  )
  add('blue', geo)
}
