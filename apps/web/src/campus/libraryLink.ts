import type * as THREE from 'three'
import type { Point } from '../game/collision'
import { fromElevation } from '../game/terrain'
import { clip, edges, flat, frame, glassQuad, pt, wallQuad } from './landmark'
import type { Sign } from './landmarks'
import type { Part } from './librarySouth'

// the library link: a glass building over decatur street, wall to wall between library
// north and library south, the street running under it. a lower part two floors tall
// along its classroom south side and the main part four floors tall. clear glass with thin
// horizontal bars and a lit library inside, grey bands at the floors and a grey soffit
// under it. the outline and both roofs from usgs lidar (2018), the floors from two 2019
// mapillary photos on decatur st (fitted on the courtland st bridge) and a 2018 one from
// the courtland st end. sources: docs/reference/library-south.md

// heights (m over sea level): the soffit over the street, the low part's roof and the
// main roof (lidar 328.56 and 337.5)
export const SOFFIT = 318.65
export const LOW_TOP = 328.55
export const TOP = 337.5
// the low part is this deep from the classroom south side (lidar)
export const STEP = 5.9
// up from the soffit: a grey fascia, then glass and grey bands. the thick band is at the low
// part's roof, the trusses that carry it over the street are behind the bottom two floors
// (2018 photo from the courtland st end, its width as the scale)
type Row = [number, number, 'link' | 'metal']
const ROWS: Row[] = [
  [0, 1.6, 'metal'],
  [1.6, 4.5, 'link'],
  [4.5, 5.2, 'metal'],
  [5.2, 9.65, 'link'],
  [9.65, 11.25, 'metal'],
  [11.25, 14.75, 'link'],
  [14.75, 15.25, 'metal'],
  [15.25, 18.4, 'link'],
  [18.4, TOP - SOFFIT, 'metal'],
]
// the low part's front is one tall window a floor (mapillary 2019), the coping over it
const LOW_ROWS: Row[] = [
  [0, 1.6, 'metal'],
  [1.6, 5.2, 'link'],
  [5.2, 9.4, 'link'],
  [9.4, LOW_TOP - SOFFIT, 'metal'],
]
// how far the bands stand out of the glass
const PROUD = 0.08
// the walkway over decatur street: meters back along the street from the link's classroom
// south end, its two sides (lidar)
const WALK: [number, number] = [-36.3, -26.8]

/**
 * points: its two corners on library north's wall, the one on library south's front, then
 * library south's own nodes along the glass side. base is where library south is drawn from
 */
export function libraryLink(
  add: (part: Part, geo: THREE.BufferGeometry) => void,
  points: number[][],
  base: number,
): Sign[] {
  const outline = points.map(pt)
  const [a, b] = outline as [Point, Point]
  // along decatur street toward courtland street, out is toward library north
  const f = frame(a, b)
  const y = (elevation: number) => fromElevation(elevation) - base
  const bottom = y(SOFFIT)
  const low = clip(outline, (p) => STEP - f.aOf(p))
  const main = clip(outline, (p) => f.aOf(p) - STEP)

  // the walls across the street: only the ends facing along it (the others are against
  // the two libraries). from a little into library north's wall so there's no crack
  const ends = (shape: Point[], rows: Row[]) => {
    for (const e of edges(shape)) {
      const s = e.out.x * f.along.x + e.out.z * f.along.z
      if (Math.abs(s) < 0.9) continue
      // the low part's back is inside, the main part's front only shows over the low roof
      if (shape === low && s > 0) continue
      const lift = shape === main && s < 0 ? y(LOW_TOP) - bottom : 0
      const [p, q] = [e.p, e.q].map((v) =>
        f.dOf(v) > -0.01 ? { x: v.x + f.out.x * 0.05, z: v.z + f.out.z * 0.05 } : v,
      ) as [Point, Point]
      for (const [r0, r1, part] of rows) {
        const [y0, y1] = [bottom + Math.max(r0, lift), bottom + r1]
        if (y1 - y0 < 0.01) continue
        if (part === 'link') {
          add('link', glassQuad(p, q, y0, y1, e.out))
          continue
        }
        const o = { x: e.out.x * PROUD, z: e.out.z * PROUD }
        const [p1, q1] = [p, q].map((v) => ({ x: v.x + o.x, z: v.z + o.z })) as [Point, Point]
        add('metal', wallQuad(p1, q1, y0, y1, e.out))
        add('metal', flat([p, q, q1, p1], y1))
        add('metal', flat([p, q, q1, p1], y0, false))
      }
    }
  }
  ends(low, LOW_ROWS)
  ends(main, ROWS)

  // the soffit over the street, silver grey panels: the pavers' plain light grey, the grey
  // metal picked up the warm street under it and went beige. the pavers don't cast, so a
  // sheet of the metal just over it does
  add('pavers', flat(outline, bottom, false))
  add('metal', flat(outline, bottom + 0.05, false))
  add('pavers', flat(low, y(LOW_TOP)))
  add('pavers', flat(main, y(TOP)))

  // the walkway over decatur street further toward classroom south, from library north's
  // plaza to library south's (osm way 1467322945, decks.json has its deck): a beige concrete
  // box with "GEORGIA STATE UNIVERSITY" on the side toward classroom south and a parapet
  // each side. lidar: 9.5m wide, the deck at 318m, the parapets 319.3m. its fascia comes down
  // to 316.85m (mapillary 2019, fitted on the parapet), ends on a wall each side
  const [u0, u1] = WALK
  const [d0, d1] = [1.1, -17.4]
  const [under, deck, rail] = [y(316.85), y(317.98), y(319.3)]
  const at = (u: number, d: number) => f.at(u, d)
  const back = { x: -f.along.x, z: -f.along.z }
  const into = { x: -f.out.x, z: -f.out.z }
  const quad = (p: Point, q: Point, v0: number, v1: number, o: Point) =>
    add('stone', wallQuad(p, q, v0, v1, o))
  // its sides along the street, the parapets' insides and tops, the walk between them
  quad(at(u0, d0), at(u0, d1), under, rail, back)
  quad(at(u1, d0), at(u1, d1), under, rail, f.along)
  quad(at(u0 + 0.3, d0), at(u0 + 0.3, d1), deck, rail, f.along)
  quad(at(u1 - 0.3, d0), at(u1 - 0.3, d1), deck, rail, back)
  for (const [a, b] of [
    [u0, u0 + 0.3],
    [u1 - 0.3, u1],
  ])
    add('stone', flat([at(a!, d0), at(b!, d0), at(b!, d1), at(a!, d1)], rail))
  add('stone', flat([at(u0, d0), at(u1, d0), at(u1, d1), at(u0, d1)], deck))
  add('stone', flat([at(u0, d0), at(u1, d0), at(u1, d1), at(u0, d1)], under, false))
  // its ends on a wall down to the ground, each side of the street
  quad(at(u0, d0), at(u1, d0), y(309), rail, f.out)
  quad(at(u0, d1), at(u1, d1), y(309), rail, into)
  // the sign: a light plate with the name, a blue square where the logo is
  const c = at(u0 - 0.03, -6.6)
  return [
    {
      x: c.x,
      y: (under + rail) / 2,
      z: c.z,
      rot: Math.atan2(back.x, back.z),
      text: 'GEORGIA STATE UNIVERSITY',
      plate: '#d9dbdb',
      scale: 1.3,
    },
  ] as Sign[]
}
