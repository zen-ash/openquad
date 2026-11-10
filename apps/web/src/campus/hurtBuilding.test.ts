import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BASE_ROOF,
  BASE_TOP,
  baysOf,
  COURT_FLOOR,
  FLOOR,
  FLOORS,
  HEAD,
  hurtBuildingGeometry,
  hurtSides,
  LAYOUT,
  offset,
  PAIR,
  piersOf,
  polygon,
  ROOF,
  ROTUNDA,
  SHAFT,
  TOP,
  type HurtData,
} from './hurtBuilding'

const hurt = campus.buildings.find((b) => b.name === 'Hurt Building') as HurtData
const { parts, signs, inside } = hurtBuildingGeometry(hurt)
const sides = hurtSides(hurt)
const pts = hurt.points.map(([x, z]) => ({ x: x!, z: z! }))

describe('hurt building', () => {
  it('is building 0, not gsu, with no door and no inside', () => {
    expect(campus.buildings[0]!.name).toBe('Hurt Building')
    expect('gsu' in hurt).toBe(false)
    expect('door' in hurt).toBe(false)
    expect(inside.solid.length + inside.glass.length).toBe(0)
  })

  it('stands on the peachtree center ave sidewalk, the street climbing to the apex', () => {
    expect(baseOf(hurt)).toBeCloseTo(fromElevation(311.3))
    expect(floorOf(hurt)).toBeCloseTo(fromElevation(311.3))
    // nowhere round it is the ground more than a bit under that
    expect(lowestUnder(hurt.points) - baseOf(hurt)).toBeGreaterThan(-0.5)
  })

  it('has 13 floors over the base and its cornice where the lidar has it', () => {
    expect(HEAD).toBeCloseTo(SHAFT + FLOORS * FLOOR)
    // 381.4m crown, 380m roof, the base across the court 329m and 330.9m
    expect(311.3 + TOP).toBeCloseTo(381.4)
    expect(311.3 + ROOF).toBeCloseTo(380)
    expect(311.3 + BASE_ROOF).toBeCloseTo(329)
    expect(311.3 + BASE_TOP).toBeCloseTo(330.9)
    expect(HEAD).toBeLessThan(ROOF)
    expect(COURT_FLOOR).toBeLessThan(BASE_ROOF)
    expect(hurt.height).toBeCloseTo(77.4)
  })

  it('fits its windows on every side, wider piers at the ends', () => {
    for (const [side, layout] of Object.entries(LAYOUT)) {
      const f = sides[side as keyof typeof LAYOUT]
      const bays = baysOf(f.len, layout)
      expect(bays.length).toBe(layout.bays.length)
      expect(bays[0]![0]).toBeGreaterThan(0.5)
      expect(bays.at(-1)![1]).toBeLessThan(f.len - 0.5)
      for (let i = 1; i < bays.length; i++) {
        const pier = bays[i]![0] - bays[i - 1]![1]
        expect(pier).toBeGreaterThan(1.3)
        expect(pier).toBeLessThan(2.2)
      }
    }
    // 13 pairs on hurt plaza (2020 photo), and the edgewood wing's end has 3. the long sides'
    // piers are about half a pair, like in the photos
    expect(LAYOUT.plaza.bays.filter((n) => n === 2)).toHaveLength(13)
    for (const side of ['edgewood', 'plaza'] as const) {
      const bays = baysOf(sides[side].len, LAYOUT[side])
      const piers = piersOf(sides[side].len, bays)
      expect(piers).toHaveLength(bays.length + 1)
      const pier = piers[2]![1] - piers[2]![0]
      expect(pier / PAIR).toBeGreaterThan(0.45)
      expect(pier / PAIR).toBeLessThan(0.65)
    }
    expect(baysOf(sides.edgewoodEnd.len, LAYOUT.edgewoodEnd)[0]![1] - PAIR).toBeCloseTo(
      LAYOUT.edgewoodEnd.end,
    )
  })

  it('has its court between the wings and the rotunda out in front of the apex', () => {
    const [eS, backN, backS, bS] = sides.court
    const mid = { x: (eS!.x + backN!.x + backS!.x + bS!.x) / 4, z: 0 }
    mid.z = (eS!.z + backN!.z + backS!.z + bS!.z) / 4
    // the court is inside the base's outline (over the base), not part of the wings' roof
    expect(pointInPolygon(mid, pts)).toBe(true)
    expect(sides.apex.dOf(sides.rotunda)).toBeCloseTo(3.9, 1)
    // the outline goes round the rotunda's columns, the cornice and balustrade a bit further
    const far = Math.max(...pts.map((p) => sides.apex.dOf(p)))
    expect(far).toBeCloseTo(3.9 + ROTUNDA.columns + ROTUNDA.column, 1)
    expect(ROTUNDA.cornice).toBeGreaterThan(ROTUNDA.columns + ROTUNDA.column)
    expect(ROTUNDA.wall).toBeGreaterThan(sides.apex.dOf(sides.rotunda))
  })

  it('moves lines out with mitred corners', () => {
    const square = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
    ]
    // going round this way out is to the left: -z on the first side
    const out = offset(square, 1, true)
    expect(out[0]!.x).toBeCloseTo(-1)
    expect(out[0]!.z).toBeCloseTo(-1)
    expect(out[2]!.x).toBeCloseTo(11)
    expect(out[2]!.z).toBeCloseTo(11)
  })

  it('turns a polygon to face the way it is told', () => {
    const square: [number, number, number][] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ]
    for (const z of [1, -1]) {
      const n = polygon(square, [0, 0, z]).getAttribute('normal')
      expect(n.count).toBe(6)
      expect(n.getZ(0)).toBeCloseTo(z)
    }
  })

  it('has its name on a red plate by the rotunda', () => {
    expect(signs.map((s) => s.text)).toContain('HURT\nBUILDING')
    expect(signs.some((s) => s.plate === '#b3262b')).toBe(true)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 40k triangles in 6 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(6)
    expect(triangles).toBeLessThan(40_000)
  })
})
