import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import { fromElevation, heightAt } from '../game/terrain'
import type { LandmarkGeometry, Sign } from './landmarks'
import {
  circle,
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

// 25 park place (1969, the trust company of georgia's tower, gsu's since 2007) across park place
// from woodruff park, and the four storey banking hall of 1973 on its edgewood ave end (now
// gsu's creative media industries institute). white georgia marble all over: on the tower a
// ledge at every floor and deep fins between the windows, a crown of thin fins at the top, a
// colonnade round the lobby on the plaza. the banking hall is a marble box over glass with a
// row of short fins, its top floor set back behind deep openings. from usgs's lidar (2018),
// the 2025 aerial from the south west, lemay's 2019 photos and gsu's (2019-2023). sources:
// docs/reference/25-park-place.md
//
// square to the game's x/z: park place is west (-x), edgewood ave south (+z). heights over the
// plaza at the main doors (318.8m). the tower is osm's tower part (drawn with this one), the
// outline is the ground floor's glass

export type ParkPlace25Data = {
  points: number[][]
  height: number
  door?: number[]
  landmark?: { planters?: number[][] }
}

// marble is every stone face, glass the windows and the lobby glass, louvre the dark grilles
// (behind the crown's fins), roof the flat roofs (and the planters' white rims), blue the planters
// on the plaza
export type Part = 'marble' | 'glass' | 'louvre' | 'roof' | 'blue'

type Pair = [number, number]

export const DATUM = 318.8

// the tower on the lidar's walls (the fins' and ledges' fronts)
export const TOWER = { w: -232.45, e: -205.95, n: -142.85, s: -84.45 }
// the colonnade's piers up to the soffit, the plain fascia over them, then 25 floors 3.76m apart
// (lidar: roof 431.8, coping 433.0)
export const SOFFIT = 8.6
export const FASCIA = 12.2
export const FLOORS = 25
export const PITCH = 3.76
// each floor's ledge, how deep the windows are set in and how far the ledges stand out
const LEDGE = 1.05
const DEPTH = 0.5
const PROUD = 0.08
// the crown: a ledge, thin fins in front of a dark grille, the coping
const GRILLE = -0.3
export const CROWN = FASCIA + FLOORS * PITCH
export const COPING = 112.1
export const ROOF = 113
export const TOP = 114.2
// windows a face (5ft apart), the corner piers, the fins between the windows
const WINDOWS = { short: 16, long: 37 }
const CORNER = 1.3
const FIN = 0.42
// the fins' fronts are a bit behind the ledges', the ledges make the lines across in the photos
const SET = -0.15
const CROWN_FINS = 2
// the lobby glass behind the colonnade on the plaza and the north side
const LOBBY = 2
const PIER = 1.5
// the east face's middle: plain marble with one column of paired windows (the lifts and
// stairs), as wide as 15 windows, and gsu's name in the crown over it
const CORE = 15

// the link to the banking hall, the banking hall's box, its ground floor's glass under the
// overhang, the short fins' band and the top floor set back (lidar: 331.0 and 336.6)
export const LINK = { x: [-228, -211] as Pair, top: 12.2 }
export const HALL = { w: -258, e: -207.2, n: -73, s: -46 }
export const GROUND = { w: -255.5, e: -208.4, n: -71.8, s: -47.2 }
export const OVERHANG = 5.5
// a marble curb under the glass (it carries on down where edgewood ave falls away)
const SILL = 0.45
const FINS: Pair = [9.6, 12]
export const BOX = 12.2
export const UPPER = { w: -249, e: HALL.e, n: -71.5, s: -47.5, top: 17.8 }
// the top floor's openings: posts every 6.15m, the glass 1.5m in
const OPENINGS: Pair = [12.7, 15.6]
const POST = 1.2
const BAY = 6.15
// the planters on the plaza, about 2m across (gsu's 2021 and 2023 photos)
const PLANTER = { r: 1, h: 0.8 }
// the plant room on the roof (lidar 340.5)
const PLANT = { x: [-239, -222] as Pair, z: [-68, -64] as Pair, top: 21.7 }

export function parkPlace25Geometry(b: ParkPlace25Data): LandmarkGeometry {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []

  const quad = (part: Part, f: Frame, a0: number, a1: number, d: number, y0: number, y1: number) =>
    add(part, wallQuad(f.at(a0, d), f.at(a1, d), y0, y1, f.out, a0))
  // a side across the face at a, facing along (+1) or back (-1)
  const side = (
    part: Part,
    f: Frame,
    a: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
    dir: number,
  ) =>
    add(
      part,
      wallQuad(f.at(a, d0), f.at(a, d1), y0, y1, { x: f.along.x * dir, z: f.along.z * dir }),
    )
  const slab = (part: Part, c: Point[], y: number, up: boolean) => add(part, flat(c, y, up))
  // a box standing out of the face from d0 to d1, a0 to a1 along it: front, sides and bottom
  const fin = (
    part: Part,
    f: Frame,
    a0: number,
    a1: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
    ends = false,
  ) => {
    quad(part, f, a0, a1, d1, y0, y1)
    side(part, f, a0, d0, d1, y0, y1, -1)
    side(part, f, a1, d0, d1, y0, y1, 1)
    if (!ends) return
    const c = [f.at(a0, d0), f.at(a1, d0), f.at(a1, d1), f.at(a0, d1)]
    slab(part, c, y0, false)
    slab(part, c, y1, true)
  }

  // the tower, a face at a time going round: east, south, west, north
  const { w, e, n, s } = TOWER
  const corners = [pt([e, n]), pt([e, s]), pt([w, s]), pt([w, n])]
  const faces = corners.map((p, i) => frame(p, corners[(i + 1) % 4]!))
  const [east, south, west, north] = faces as [Frame, Frame, Frame, Frame]
  faces.forEach((f) => {
    const L = f.len
    const count = L > 40 ? WINDOWS.long : WINDOWS.short
    const m = (L - 2 * (CORNER - FIN / 2)) / count
    // where window k starts and ends (the corner piers are a half fin wider than the module)
    const win = (k: number): Pair => [CORNER + k * m, CORNER + (k + 1) * m - FIN]
    // the east face's plain middle
    const plain: Pair = f === east ? [(count - CORE) / 2, (count + CORE) / 2] : [count, count]
    const solid: Pair | null =
      f === east ? [win(plain[0])[0] - FIN / 2, win(plain[1] - 1)[1] + FIN / 2] : null
    const colonnade = f === west || f === north

    // the corner piers, the whole way up
    quad('marble', f, 0, CORNER, 0, 0, COPING)
    quad('marble', f, L - CORNER, L, 0, 0, COPING)
    side('marble', f, CORNER, -(colonnade ? CORNER : DEPTH), 0, colonnade ? 0 : FASCIA, CROWN, 1)
    side(
      'marble',
      f,
      L - CORNER,
      -(colonnade ? CORNER : DEPTH),
      0,
      colonnade ? 0 : FASCIA,
      CROWN,
      -1,
    )

    // the bottom: a colonnade in front of the lobby glass, or plain marble (the back, and
    // the south face either side of the link)
    if (colonnade) {
      const glassTo = f === west ? L - LOBBY : L
      const glassFrom = f === north ? LOBBY : 0
      for (let a = glassFrom; a < glassTo - 0.01; a += 4.6) {
        const to = Math.min(a + 4.6, glassTo)
        add('glass', glassQuad(f.at(a, -LOBBY), f.at(to, -LOBBY), 0, SOFFIT, f.out))
      }
      const bays = f === west ? 9 : 4
      for (let k = 1; k < bays; k++) {
        const c = CORNER + ((L - 2 * CORNER) * k) / bays
        fin('marble', f, c - PIER / 2, c + PIER / 2, -LOBBY, 0, 0, SOFFIT)
      }
      // the soffit (the north one takes the corner)
      const s0 = f === north ? 0 : CORNER
      const s1 = f === west ? L - LOBBY : L - CORNER
      slab('marble', [f.at(s0, -LOBBY), f.at(s1, -LOBBY), f.at(s1, 0), f.at(s0, 0)], SOFFIT, false)
      quad('marble', f, CORNER, L - CORNER, 0, SOFFIT, FASCIA)
    } else if (f === south) {
      // the link stands against the middle
      const a0 = f.aOf(pt([LINK.x[1], s]))
      const a1 = f.aOf(pt([LINK.x[0], s]))
      quad('marble', f, CORNER, a0, 0, 0, FASCIA)
      quad('marble', f, a1, L - CORNER, 0, 0, FASCIA)
    } else {
      quad('marble', f, CORNER, L - CORNER, 0, 0, FASCIA)
      // the grille up the back, by the loading door
      quad('louvre', f, 30, 33, 0.02, 1, 7.5)
    }

    // the floors: a ledge at the bottom of each, windows set in between fins
    const fins: number[] = []
    for (let k = 1; k < count; k++)
      if (k <= plain[0] || k >= plain[1]) fins.push(win(k)[0] - FIN / 2)
    for (const c of fins)
      fin('marble', f, c - FIN / 2, c + FIN / 2, -DEPTH, SET, FASCIA, CROWN + LEDGE)
    for (let j = 0; j < FLOORS; j++) {
      const y0 = FASCIA + j * PITCH + LEDGE
      const y1 = FASCIA + (j + 1) * PITCH
      for (let k = 0; k < count; k++) {
        if (k >= plain[0] && k < plain[1]) continue
        const [a0, a1] = win(k)
        add('glass', glassQuad(f.at(a0, -DEPTH), f.at(a1, -DEPTH), y0, y1, f.out))
      }
    }
    // the plain middle on the east, flush with the ledges, with a pair of narrow windows up
    // the middle on every floor
    if (solid) {
      const [a0, a1] = solid
      const mid = (a0 + a1) / 2
      const holes: Hole[] = []
      for (let j = 0; j < FLOORS; j++) {
        const y0 = FASCIA + j * PITCH + LEDGE + 0.3
        const y1 = FASCIA + (j + 1) * PITCH - 0.2
        holes.push(
          [mid - a0 - 1.1, mid - a0 - 0.15, y0, y1],
          [mid - a0 + 0.15, mid - a0 + 1.1, y0, y1],
        )
      }
      for (const [u0, u1, v0, v1] of solidPieces(a1 - a0, FASCIA, COPING, holes))
        quad('marble', f, a0 + u0, a0 + u1, PROUD, v0, v1)
      for (const [u0, u1, v0, v1] of holes) {
        add(
          'glass',
          glassQuad(f.at(a0 + u0, PROUD - 0.25), f.at(a0 + u1, PROUD - 0.25), v0, v1, f.out),
        )
        side('marble', f, a0 + u0, PROUD - 0.25, PROUD, v0, v1, 1)
        side('marble', f, a0 + u1, PROUD - 0.25, PROUD, v0, v1, -1)
        const c = [0, 1, 1, 0].map((k, i) => f.at(a0 + (k ? u1 : u0), PROUD - (i > 1 ? 0.25 : 0)))
        slab('marble', c, v1, false)
        slab('marble', c, v0, true)
      }
      side('marble', f, a0, -DEPTH, PROUD, FASCIA, COPING, -1)
      side('marble', f, a1, -DEPTH, PROUD, FASCIA, COPING, 1)
    }
    // the ledges stand out a bit and wrap round the corners
    const ring = (y: number, up: boolean, d0: number) => {
      const spans: Pair[] = solid
        ? [
            [-PROUD, solid[0]],
            [solid[1], L + PROUD],
          ]
        : [[-PROUD, L + PROUD]]
      for (const [a0, a1] of spans) {
        const i0 = Math.max(a0, -d0)
        const i1 = Math.min(a1, L + d0)
        slab('marble', [f.at(a0, PROUD), f.at(a1, PROUD), f.at(i1, d0), f.at(i0, d0)], y, up)
      }
    }
    for (let j = 0; j <= FLOORS; j++) {
      const y0 = FASCIA + j * PITCH
      if (solid) {
        quad('marble', f, -PROUD, solid[0], PROUD, y0, y0 + LEDGE)
        quad('marble', f, solid[1], L + PROUD, PROUD, y0, y0 + LEDGE)
      } else quad('marble', f, -PROUD, L + PROUD, PROUD, y0, y0 + LEDGE)
      ring(y0, false, -DEPTH)
      ring(y0 + LEDGE, true, -DEPTH)
    }

    // the crown: thin fins close together in front of the grille, plain over the east's middle
    const c0 = CROWN + LEDGE
    const spans: Pair[] = solid
      ? [
          [CORNER, solid[0]],
          [solid[1], L - CORNER],
        ]
      : [[CORNER, L - CORNER]]
    for (const [a0, a1] of spans) {
      quad('louvre', f, a0, a1, GRILLE, c0, COPING)
      const k = Math.round(((a1 - a0) / m) * CROWN_FINS)
      for (let j = 1; j < k; j++) {
        const c = a0 + ((a1 - a0) * j) / k
        fin('marble', f, c - 0.08, c + 0.08, GRILLE, -0.03, c0, COPING)
      }
    }
    side('marble', f, CORNER, GRILLE, 0, c0, COPING, 1)
    side('marble', f, L - CORNER, GRILLE, 0, c0, COPING, -1)
    // the coping, its underside and top, and the parapet's inside over the roof
    quad('marble', f, -PROUD, L + PROUD, PROUD, COPING, TOP)
    slab(
      'marble',
      [
        f.at(-PROUD, PROUD),
        f.at(L + PROUD, PROUD),
        f.at(L + GRILLE, GRILLE),
        f.at(-GRILLE, GRILLE),
      ],
      COPING,
      false,
    )
    slab(
      'marble',
      [f.at(-PROUD, PROUD), f.at(L + PROUD, PROUD), f.at(L - 0.5, -0.5), f.at(0.5, -0.5)],
      TOP,
      true,
    )
    add(
      'marble',
      wallQuad(f.at(L - 0.5, -0.5), f.at(0.5, -0.5), ROOF, TOP, { x: -f.out.x, z: -f.out.z }),
    )
  })
  slab(
    'roof',
    [
      pt([w + 0.5, n + 0.5]),
      pt([e - 0.5, n + 0.5]),
      pt([e - 0.5, s - 0.5]),
      pt([w + 0.5, s - 0.5]),
    ],
    ROOF,
    true,
  )

  // the link: plain marble, glass on the patio at the bottom
  {
    const [x0, x1] = LINK.x
    const f = frame(pt([x0, GROUND.n]), pt([x0, s]))
    quad('marble', f, 0, f.len, 0, 3.6, LINK.top)
    add('glass', glassQuad(f.at(1.3, 0), f.at(f.len, 0), 0, 3.6, f.out))
    quad('marble', f, 0, 1.3, 0, 0, 3.6)
    const g = frame(pt([x1, s]), pt([x1, GROUND.n]))
    quad('marble', g, 0, g.len, 0, 0, LINK.top)
    slab('roof', [pt([x0, s]), pt([x1, s]), pt([x1, HALL.n]), pt([x0, HALL.n])], LINK.top, true)
  }

  // the banking hall. its box from the overhang up, faces going round: south, west, north, east
  const hall = [
    pt([HALL.e, HALL.s]),
    pt([HALL.w, HALL.s]),
    pt([HALL.w, HALL.n]),
    pt([HALL.e, HALL.n]),
  ]
  const hallFaces = hall.map((p, i) => frame(p, hall[(i + 1) % 4]!))
  const [hs, , hn, he] = hallFaces as [Frame, Frame, Frame, Frame]
  for (const f of hallFaces) {
    const L = f.len
    // the north face is behind the link from here to there
    const behind: Pair | null =
      f === hn
        ? ([f.aOf(pt([LINK.x[0], 0])), f.aOf(pt([LINK.x[1], 0]))].sort((p, q) => p - q) as Pair)
        : null
    const spans: Pair[] = behind
      ? [
          [0, behind[0]],
          [behind[1], L],
        ]
      : [[0, L]]
    for (const [a0, a1] of spans) {
      quad('marble', f, a0, a1, 0, OVERHANG, FINS[0])
      quad('marble', f, a0, a1, 0, FINS[1], BOX)
      if (f === he) {
        quad('marble', f, a0, a1, 0, FINS[0], FINS[1])
        continue
      }
      // the band: dark windows between short fins standing out 0.5m
      add('glass', glassQuad(f.at(a0, -0.15), f.at(a1, -0.15), FINS[0], FINS[1], f.out))
      slab('marble', [f.at(a0, 0), f.at(a1, 0), f.at(a1, -0.15), f.at(a0, -0.15)], FINS[0], true)
      slab('marble', [f.at(a0, 0), f.at(a1, 0), f.at(a1, -0.15), f.at(a0, -0.15)], FINS[1], false)
      const k = Math.round((a1 - a0) / 1.6)
      for (let j = 0; j <= k; j++) {
        const c = a0 + 0.5 + ((a1 - a0 - 1) * j) / k
        fin('marble', f, c - 0.47, c + 0.47, -0.15, 0.5, FINS[0], FINS[1], true)
      }
    }
  }
  // its overhang's soffit round the ground floor's glass
  slab(
    'marble',
    [pt([HALL.e, HALL.s]), pt([HALL.w, HALL.s]), pt([HALL.w, GROUND.s]), pt([HALL.e, GROUND.s])],
    OVERHANG,
    false,
  )
  slab(
    'marble',
    [pt([HALL.w, GROUND.n]), pt([HALL.e, GROUND.n]), pt([HALL.e, HALL.n]), pt([HALL.w, HALL.n])],
    OVERHANG,
    false,
  )
  slab(
    'marble',
    [
      pt([HALL.w, GROUND.s]),
      pt([GROUND.w, GROUND.s]),
      pt([GROUND.w, GROUND.n]),
      pt([HALL.w, GROUND.n]),
    ],
    OVERHANG,
    false,
  )
  slab(
    'marble',
    [
      pt([GROUND.e, GROUND.s]),
      pt([HALL.e, GROUND.s]),
      pt([HALL.e, GROUND.n]),
      pt([GROUND.e, GROUND.n]),
    ],
    OVERHANG,
    false,
  )
  // the ground floor: glass all round in under the overhang, square piers along edgewood ave
  // (none at the corner on equitable pl, that's a glass bay)
  const ground = [
    pt([GROUND.e, GROUND.s]),
    pt([GROUND.w, GROUND.s]),
    pt([GROUND.w, GROUND.n]),
    pt([LINK.x[0], GROUND.n]),
  ]
  for (let i = 0; i < 3; i++) {
    const f = frame(ground[i]!, ground[i + 1]!)
    const k = Math.max(1, Math.round(f.len / 3.1))
    for (let j = 0; j < k; j++)
      add(
        'glass',
        glassQuad(f.at((f.len * j) / k, 0), f.at((f.len * (j + 1)) / k, 0), SILL, OVERHANG, f.out),
      )
    quad('marble', f, 0, f.len, 0, 0, SILL)
  }
  {
    const f = frame(pt([GROUND.e, GROUND.n]), pt([GROUND.e, GROUND.s]))
    add('glass', glassQuad(f.at(0, 0), f.at(f.len, 0), SILL, OVERHANG, f.out))
    quad('marble', f, 0, f.len, 0, 0, SILL)
    const g = frame(pt([LINK.x[1], GROUND.n]), pt([GROUND.e, GROUND.n]))
    quad('marble', g, 0, g.len, 0, 0, OVERHANG)
  }
  for (let j = 0; j < 8; j++) {
    const c = hs.aOf(pt([HALL.w, 0])) - 1.25 - j * BAY
    fin('marble', hs, c - 0.65, c + 0.65, -1.2, 0, 0, OVERHANG)
  }

  // the box's top: a terrace on the park place end, the top floor set back round the rest
  {
    const { w: uw, e: ue, n: un, s: us, top } = UPPER
    slab(
      'roof',
      [pt([HALL.w, HALL.s]), pt([HALL.e, HALL.s]), pt([HALL.e, us]), pt([HALL.w, us])],
      BOX,
      true,
    )
    slab(
      'roof',
      [pt([HALL.w, un]), pt([HALL.e, un]), pt([HALL.e, HALL.n]), pt([HALL.w, HALL.n])],
      BOX,
      true,
    )
    slab('roof', [pt([HALL.w, us]), pt([uw, us]), pt([uw, un]), pt([HALL.w, un])], BOX, true)
    // a low parapet round the terrace
    const t = frame(pt([HALL.w, HALL.s]), pt([HALL.w, HALL.n]))
    quad('marble', t, 0, t.len, 0, BOX, BOX + 1)
    add(
      'marble',
      wallQuad(pt([HALL.w + 0.3, HALL.s]), pt([HALL.w + 0.3, HALL.n]), BOX, BOX + 1, {
        x: 1,
        z: 0,
      }),
    )
    slab(
      'marble',
      [
        pt([HALL.w, HALL.s]),
        pt([HALL.w + 0.3, HALL.s]),
        pt([HALL.w + 0.3, HALL.n]),
        pt([HALL.w, HALL.n]),
      ],
      BOX + 1,
      true,
    )
    const up = [pt([ue, us]), pt([uw, us]), pt([uw, un]), pt([ue, un])]
    up.forEach((p, i) => {
      const f = frame(p, up[(i + 1) % 4]!)
      const open = i === 0 || i === 2
      if (!open) {
        quad('marble', f, 0, f.len, 0, BOX, top)
        return
      }
      // deep openings between posts, plain at the park place end
      const holes: Hole[] = []
      const from = i === 0 ? 0 : 7
      const to = i === 0 ? f.len - 7 : f.len
      const k = Math.floor((to - from) / BAY)
      for (let j = 0; j < k; j++) {
        const a = from + j * BAY + POST / 2
        holes.push([a, a + BAY - POST, OPENINGS[0], OPENINGS[1]])
      }
      for (const [u0, u1, v0, v1] of solidPieces(f.len, BOX, top, holes))
        quad('marble', f, u0, u1, 0, v0, v1)
      for (const [u0, u1, v0, v1] of holes) {
        add('glass', glassQuad(f.at(u0, -1.5), f.at(u1, -1.5), v0, v1, f.out))
        side('marble', f, u0, -1.5, 0, v0, v1, 1)
        side('marble', f, u1, -1.5, 0, v0, v1, -1)
        const c = [f.at(u0, 0), f.at(u1, 0), f.at(u1, -1.5), f.at(u0, -1.5)]
        slab('marble', c, v1, false)
        slab('marble', c, v0, true)
      }
    })
    slab('roof', up, top, true)
    const plant = [
      pt([PLANT.x[0], PLANT.z[0]]),
      pt([PLANT.x[1], PLANT.z[0]]),
      pt([PLANT.x[1], PLANT.z[1]]),
      pt([PLANT.x[0], PLANT.z[1]]),
    ]
    plant.forEach((p, i) => {
      const f = frame(p, plant[(i + 1) % 4]!)
      add('roof', wallQuad(p, plant[(i + 1) % 4]!, top, PLANT.top, f.out))
    })
    slab('roof', plant, PLANT.top, true)
  }

  // the planters on the plaza: blue steel drums with a white rim, a tree in each (build-campus
  // puts the trees in campus.json's), standing on the plaza wherever it's higher or lower
  for (const [x, z] of b.landmark?.planters ?? []) {
    const g = heightAt(x!, z!) - fromElevation(DATUM)
    const ring = circle(pt([x!, z!]), PLANTER.r, 16)
    const inner = circle(pt([x!, z!]), PLANTER.r - 0.15, 16)
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length]!
      const o = { x: (p.x + q.x) / 2 - x!, z: (p.z + q.z) / 2 - z! }
      const l = Math.hypot(o.x, o.z)
      add('blue', wallQuad(p, q, g - 0.2, g + PLANTER.h - 0.12, { x: o.x / l, z: o.z / l }))
      add('roof', wallQuad(p, q, g + PLANTER.h - 0.12, g + PLANTER.h, { x: o.x / l, z: o.z / l }))
      const [pi, qi] = [inner[i]!, inner[(i + 1) % inner.length]!]
      slab('roof', [p, q, qi, pi], g + PLANTER.h, true)
    })
    slab('louvre', inner, g + PLANTER.h - 0.1, true)
  }

  // signs: gsu's name on the fascia over the plaza (the logo's a plain blue square) and the
  // address over the doors, and gsu's name in the crown on the east face, toward campus
  signs.push(
    {
      x: w - 0.02,
      y: 10.4,
      z: -118,
      rot: -Math.PI / 2,
      text: '',
      plate: '#1f4aa8',
      width: 1.5,
      height: 1.5,
    },
    {
      x: w - 0.02,
      y: 10.2,
      z: -112.6,
      rot: -Math.PI / 2,
      text: 'GEORGIA STATE UNIVERSITY',
      letters: true,
      size: 0.42,
      color: '#3b4250',
      weight: 500,
    },
    {
      x: w + LOBBY - 0.03,
      y: 3.3,
      z: b.door?.[1] ?? -113.6,
      rot: -Math.PI / 2,
      text: '25 Park Place',
      letters: true,
      size: 0.28,
      color: '#f2f2f2',
      weight: 500,
    },
  )
  {
    const f = east
    const a = f.len / 2
    const at = f.at(a, PROUD + 0.02)
    const sign = (text: string, y: number, size: number, dx = 0) => {
      const p = f.at(a + dx, PROUD + 0.02)
      signs.push({
        x: p.x,
        y,
        z: p.z,
        rot: Math.PI / 2,
        text,
        letters: true,
        size,
        color: '#1f4aa8',
        weight: 600,
      })
    }
    signs.push({
      x: at.x,
      y: COPING - 1.4,
      z: at.z,
      rot: Math.PI / 2,
      text: '',
      plate: '#1f4aa8',
      width: 2.4,
      height: 2.4,
    })
    sign('Georgia State', COPING - 4.1, 1.9)
    sign('University', COPING - 6.4, 1.9)
  }

  // blocks just inside the walls, for the shadows: the window glass doesn't cast and it's
  // empty over the ground floor (landmark.ts core)
  core(
    'marble',
    [
      pt([w + DEPTH + 0.1, n + DEPTH + 0.1]),
      pt([e - DEPTH - 0.1, n + DEPTH + 0.1]),
      pt([e - DEPTH - 0.1, s - DEPTH - 0.1]),
      pt([w + DEPTH + 0.1, s - DEPTH - 0.1]),
    ],
    FASCIA - 0.1,
    ROOF - 0.05,
  )
  core(
    'marble',
    [
      pt([w + LOBBY + 0.3, n + LOBBY + 0.3]),
      pt([e - 0.3, n + LOBBY + 0.3]),
      pt([e - 0.3, s - 0.3]),
      pt([w + LOBBY + 0.3, s - 0.3]),
    ],
    CEILING,
    SOFFIT,
  )
  core(
    'marble',
    [
      pt([GROUND.w + 0.3, GROUND.n + 0.3]),
      pt([GROUND.e - 0.3, GROUND.n + 0.3]),
      pt([GROUND.e - 0.3, GROUND.s - 0.3]),
      pt([GROUND.w + 0.3, GROUND.s - 0.3]),
    ],
    CEILING,
    BOX - 0.1,
  )
  core(
    'marble',
    [
      pt([UPPER.w + 1.8, UPPER.n + 1.8]),
      pt([UPPER.e - 0.3, UPPER.n + 1.8]),
      pt([UPPER.e - 0.3, UPPER.s - 1.8]),
      pt([UPPER.w + 1.8, UPPER.s - 1.8]),
    ],
    BOX,
    UPPER.top - 0.1,
  )

  // inside the ground floor: glass on the plaza and round the banking hall
  const outline = b.points.map(pt)
  const near = (a: number, c: number) => Math.abs(a - c) < 0.01
  const onGlass = (p: Point, q: Point) =>
    (near(p.x, w + LOBBY) && near(q.x, w + LOBBY)) ||
    (near(p.z, n + LOBBY) && near(q.z, n + LOBBY)) ||
    (near(p.z, GROUND.s) && near(q.z, GROUND.s)) ||
    (near(p.x, GROUND.w) && near(q.x, GROUND.w)) ||
    (near(p.x, GROUND.e) && near(q.x, GROUND.e)) ||
    (near(p.z, GROUND.n) && near(q.z, GROUND.n) && Math.min(p.x, q.x) < LINK.x[0] - 1)
  insideWalls(inside, outline, b.door ? pt(b.door) : null, onGlass)

  return {
    parts: merged(),
    inside,
    signs,
    noShadow: ['glass', 'louvre', 'blue'],
    // the planters are a few pixels from across the street
    near: ['blue'],
  }
}
