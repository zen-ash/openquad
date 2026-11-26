import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  ARM_TOP,
  B_PENTHOUSE,
  B_TOP,
  BAR_TOP,
  GABLE,
  HALL_ROOF,
  PAVILION_RIDGE,
  piedmontNorthAGeometry,
  piedmontNorthBGeometry,
  piedmontNorthDiningGeometry,
  type PiedmontNorthData,
} from './piedmontNorth'

const byName = (name: string) => campus.buildings.find((b) => b.name === name) as PiedmontNorthData
const a = byName('Piedmont North A')
const b = byName('Piedmont North B')
const hall = byName('Piedmont North Dining Hall')
const all = [
  [a, piedmontNorthAGeometry(a)],
  [b, piedmontNorthBGeometry(b)],
  [hall, piedmontNorthDiningGeometry(hall)],
] as const

describe('piedmont north', () => {
  it('is as tall as the lidar says', () => {
    // over 302.0m: a's bar parapet 316.8, the arm's 319.3, the gable's ridge 323.2
    expect(302 + BAR_TOP).toBeCloseTo(316.8, 0)
    expect(302 + ARM_TOP).toBeCloseTo(319.3, 0)
    expect(302 + GABLE[1]).toBeCloseTo(323.2, 0)
    expect(a.height).toBe(GABLE[1])
    // b's parapet 326.2, the penthouse 330.8
    expect(302 + B_TOP).toBeCloseTo(326.2, 0)
    expect(b.height).toBe(B_PENTHOUSE)
    // the hall's roof 305.8 -> 308.6, the pavilion's ridge 311.0
    expect(302 + HALL_ROOF[0]).toBeCloseTo(305.8, 0)
    expect(302 + HALL_ROOF[1]).toBeCloseTo(308.6, 0)
    expect(hall.height).toBe(PAVILION_RIDGE)
  })

  it('stands on the ground round it', () => {
    for (const [x] of all) {
      expect(floorOf(x)).toBeCloseTo(fromElevation(302))
      expect(baseOf(x)).toBeCloseTo(floorOf(x))
    }
  })

  it('has its doors on its own walls, facing out', () => {
    for (const [x] of all) {
      const pts = x.points.map(([px, pz]) => ({ x: px!, z: pz! }))
      const [dx, dz, nx, nz] = x.door!
      expect(pointInPolygon({ x: dx! + nx! * 0.5, z: dz! + nz! * 0.5 }, pts)).toBe(false)
      expect(pointInPolygon({ x: dx! - nx! * 0.5, z: dz! - nz! * 0.5 }, pts)).toBe(true)
    }
  })

  it('fits the three together without overlapping', () => {
    const inside = (x: PiedmontNorthData, px: number, pz: number) =>
      pointInPolygon(
        { x: px, z: pz },
        x.points.map(([qx, qz]) => ({ x: qx!, z: qz! })),
      )
    for (let px = 335; px < 450; px += 1.3)
      for (let pz = -580; pz < -500; pz += 1.3) {
        const n = [a, b, hall].filter((x) => inside(x, px, pz)).length
        expect(n).toBeLessThanOrEqual(1)
      }
  })

  it('has gsu signs with a blue square, no logo', () => {
    for (const [, geo] of all.slice(0, 2)) {
      expect(geo.signs.some((s) => s.letters && s.text.includes('Georgia State'))).toBe(true)
      expect(geo.signs.some((s) => !s.text && s.plate === '#1d4f9c')).toBe(true)
    }
    expect(all[2][1].signs.some((s) => s.text === 'PIEDMONT NORTH')).toBe(true)
  })

  it('is left out of the regular buildings mesh', () => {
    const every = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((x) => !x.landmark))
    expect(every.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 6 parts each', () => {
    for (const [, geo] of all) {
      let triangles = 0
      for (const g of Object.values(geo.parts)) triangles += g.getAttribute('position').count / 3
      expect(Object.keys(geo.parts).length).toBeLessThanOrEqual(6)
      expect(triangles).toBeLessThan(8000)
    }
  })
})
