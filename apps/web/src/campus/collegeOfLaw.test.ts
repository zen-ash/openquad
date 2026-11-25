import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import {
  BOX_NW,
  BOX_SW,
  BOX_TOP,
  C,
  FLOORS,
  J,
  LS,
  NE_ROOF,
  ROOF,
  SETBACK,
  SW,
  TERRACE,
  collegeOfLawGeometry,
  type CollegeOfLawData,
} from './collegeOfLaw'
import { buildingsGeometry } from './geometry'

const law = campus.buildings.find((b) => b.name === 'College of Law') as CollegeOfLawData
const pts = law.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = collegeOfLawGeometry(law)

// how far p is off the line a-b
const off = (p: { x: number; z: number }, a = SW, b = C) =>
  Math.abs((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)) / Math.hypot(b.x - a.x, b.z - a.z)

describe('college of law', () => {
  it('has park place on one straight line from the roof to the south corner', () => {
    expect(off(J)).toBeLessThan(0.05)
    for (const p of [SW, J, C]) expect(pts.some((q) => q.x === p.x && q.z === p.z)).toBe(true)
    // the box's corner is on the roof's edge on jwd
    expect(off(C, BOX_NW, NE_ROOF)).toBeLessThan(0.05)
    // the library's glass is 5m in
    expect(off(LS)).toBeCloseTo(SETBACK, 1)
  })

  it('is as tall as the lidar says', () => {
    expect(law.height).toBe(ROOF)
    expect(323.6 + ROOF).toBeCloseTo(358.9, 1)
    expect(323.6 + TERRACE).toBeCloseTo(346.1, 1)
    expect(323.6 + BOX_TOP).toBeCloseTo(351.6, 1)
    expect(FLOORS).toContain(TERRACE)
    expect(BOX_TOP).toBeGreaterThan(TERRACE)
  })

  it('has its door on park place in the glass box', () => {
    const [x, z, nx, nz] = law.door!
    expect(x).toBe(BOX_SW.x)
    expect(z).toBeGreaterThan(BOX_NW.z)
    expect(z).toBeLessThan(BOX_SW.z)
    expect([nx, nz]).toEqual([-1, 0])
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the park place sidewalk, the drive lower behind it', () => {
    expect(floorOf(law)).toBeCloseTo(fromElevation(323.6))
    expect(baseOf(law)).toBeCloseTo(floorOf(law))
    expect(lowestUnder(law.points) - floorOf(law)).toBeLessThan(-3)
  })

  it('has the sign over the doors and a blue square where the logo is', () => {
    expect(signs.map((s) => s.text)).toContain('COLLEGE OF LAW')
    expect(signs.some((s) => s.text === '' && s.plate)).toBe(true)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 6 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(6)
    expect(triangles).toBeLessThan(8000)
  })
})
