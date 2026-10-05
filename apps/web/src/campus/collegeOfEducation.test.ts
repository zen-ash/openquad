import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { DOOR_WIDTH } from '../game/interiors'
import campus from './campus.json'
import {
  CANOPY,
  coeObstacles,
  coeSides,
  collegeOfEducationGeometry,
  PITCH,
  RECESS,
  ROWS,
  SOFFIT,
  type CollegeOfEducationData,
} from './collegeOfEducation'
import { buildingsGeometry } from './geometry'

const coe = campus.buildings.find(
  (b) => b.name === 'College of Education & Human Development',
) as CollegeOfEducationData
const { parts, signs } = collegeOfEducationGeometry(coe)
const sides = coeSides(coe)
const pts = coe.points.map(([x, z]) => ({ x: x!, z: z! }))
// how far a point is out from a side's marble face
const out = (s: (typeof sides)['pryor'], p: { x: number; z: number }) =>
  (p.x - s.p.x) * s.o.x + (p.z - s.p.z) * s.o.z

describe('college of education', () => {
  it('has nine rows of windows 3.3m apart over the ground floor', () => {
    expect(ROWS).toHaveLength(9)
    for (let i = 1; i < ROWS.length; i++) expect(ROWS[i]![0] - ROWS[i - 1]![0]).toBeCloseTo(PITCH)
    // the first sill 1.75 over the soffit, a band of marble about 2m over the top row
    expect(ROWS[0]![0] - SOFFIT).toBeCloseTo(1.75)
    expect(coe.height).toBeCloseTo(36.05)
    expect(coe.height - ROWS.at(-1)![1]).toBeGreaterThan(1.8)
  })

  it('has seven bays on pryor st and kimball way, five on the short sides', () => {
    expect([sides.pryor.bays, sides.kimball.bays, sides.decatur.bays, sides.south.bays]).toEqual([
      7, 7, 5, 5,
    ])
    for (const s of [sides.pryor, sides.kimball, sides.decatur, sides.south]) {
      expect(s.bay).toBeGreaterThan(6.1)
      expect(s.bay).toBeLessThan(6.25)
    }
  })

  it('sets the ground floor back under the overhang on the three streets', () => {
    // every corner of the outline is a meter in from the street sides, or on the wall against
    // 40-42 pryor st
    for (const s of [sides.pryor, sides.kimball, sides.decatur]) {
      const near = pts.filter((p) => Math.abs(out(s, p) + RECESS) < 0.03)
      expect(near).toHaveLength(2)
    }
    expect(pts.filter((p) => Math.abs(out(sides.south, p)) < 0.03)).toHaveLength(2)
  })

  it('has its door under the canopy on pryor st', () => {
    const [x, z, nx, nz] = coe.door!
    const door = { x: x!, z: z! }
    expect(out(sides.pryor, door)).toBeCloseTo(-RECESS, 1)
    const u = sides.pryor.uOf(door)
    expect(u).toBeGreaterThan(CANOPY.from + DOOR_WIDTH)
    expect(u).toBeLessThan(CANOPY.to - DOOR_WIDTH)
    expect(nx! * sides.pryor.o.x + nz! * sides.pryor.o.z).toBeGreaterThan(0.99)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands its piers out on the sidewalk, none in front of the doors', () => {
    const { circles, walls } = coeObstacles(coe)
    // 4 + 6 + 5 piers (none at the doors) and the four corners
    expect(circles).toHaveLength(19)
    const [x, z] = coe.door!
    for (const c of circles) {
      expect(pointInPolygon(c, pts)).toBe(false)
      expect(Math.hypot(c.x - x!, c.z - z!)).toBeGreaterThan(DOOR_WIDTH)
    }
    // the screens stay clear of the doors too
    for (const w of walls)
      for (const p of [
        { x: w.ax, z: w.az },
        { x: w.bx, z: w.bz },
      ])
        expect(Math.abs(sides.pryor.uOf(p) - sides.pryor.uOf({ x: x!, z: z! }))).toBeGreaterThan(5)
  })

  it('has its name over the doors and on kimball way', () => {
    expect(signs.filter((s) => s.text.startsWith('COLLEGE OF EDUCATION'))).toHaveLength(2)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 15k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(15_000)
  })
})
