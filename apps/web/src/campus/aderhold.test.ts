import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import {
  A,
  ARCADE,
  ARCADE_BACK,
  B,
  HIGH,
  L,
  LUCKIE_COLUMNS,
  OUTLINE,
  PARAPET,
  ROOF,
  ROWS,
  SET,
  SLOT,
  TERRACE,
  aderholdGeometry,
  type AderholdData,
} from './aderhold'
import { buildingsGeometry } from './geometry'

const ald = campus.buildings.find(
  (b) => b.name === 'Helen M. Aderhold Learning Center',
) as AderholdData
const pts = ald.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = aderholdGeometry(ald)

describe('aderhold learning center', () => {
  it('has the outline build-campus wrote, in the frame the drawing uses', () => {
    expect(pts).toHaveLength(OUTLINE.length)
    OUTLINE.forEach(([a, b], i) => {
      const p = L(a, b)
      expect(pts[i]!.x).toBeCloseTo(p.x, 1)
      expect(pts[i]!.z).toBeCloseTo(p.z, 1)
    })
  })

  it('is as tall as the lidar says', () => {
    expect(ald.height).toBe(HIGH.top)
    expect(322.6 + TERRACE).toBeCloseTo(337.5, 1)
    expect(322.6 + ROOF).toBeCloseTo(344.7, 1)
    expect(322.6 + HIGH.top).toBeCloseTo(348.3, 1)
    expect(PARAPET).toBeGreaterThan(TERRACE)
    expect(ROWS.at(-1)![1]).toBeLessThan(TERRACE)
    expect(ROWS[0]![0]).toBeGreaterThan(ARCADE)
  })

  it('fits twelve columns and the slot along luckie st', () => {
    expect(LUCKIE_COLUMNS).toHaveLength(13)
    expect(LUCKIE_COLUMNS).toContainEqual(SLOT)
    for (let i = 1; i < LUCKIE_COLUMNS.length; i++)
      expect(LUCKIE_COLUMNS[i]![0]).toBeCloseTo(LUCKIE_COLUMNS[i - 1]![1])
    expect(LUCKIE_COLUMNS[0]![0]).toBeGreaterThan(0)
    expect(LUCKIE_COLUMNS.at(-1)![1]).toBeLessThan(A - 4.6)
  })

  it('has its door in the slot at the back of the arcade', () => {
    const [x, z, nx, nz] = ald.door!
    const at = { x: x!, z: z! }
    const a = (at.x - L(0, 0).x) * -0.654783 + (at.z - L(0, 0).z) * -0.755817
    const b = (at.x - L(0, 0).x) * -0.755817 + (at.z - L(0, 0).z) * 0.654783
    expect(b).toBeCloseTo(ARCADE_BACK, 1)
    // the slot's columns start 2.3m along from the corner cut
    expect(a - 2.3).toBeGreaterThan(SLOT[0])
    expect(a - 2.3).toBeLessThan(SLOT[1])
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the luckie st sidewalk and reaches under the ground all round', () => {
    expect(floorOf(ald)).toBeCloseTo(fromElevation(322.6))
    expect(baseOf(ald)).toBeCloseTo(floorOf(ald))
    // the plaza side falls toward poplar st
    expect(lowestUnder(ald.points) - floorOf(ald)).toBeLessThan(-1)
  })

  it('stays on its block: the pergola reaches 1.3m past the brick and no more', () => {
    for (const geo of Object.values(parts)) {
      const pos = geo.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const dx = pos.getX(i) - L(0, 0).x
        const dz = pos.getZ(i) - L(0, 0).z
        const a = dx * -0.654783 + dz * -0.755817
        const b = dx * -0.755817 + dz * 0.654783
        expect(a).toBeGreaterThan(-1.45)
        expect(a).toBeLessThan(A + 1.45)
        expect(b).toBeGreaterThan(-1.45)
        expect(b).toBeLessThan(B + 1.45)
      }
    }
  })

  it('sets the fifth floor back behind the terrace', () => {
    expect(SET).toBeGreaterThan(2)
    expect(HIGH.b[1]).toBeLessThan(B - SET + 0.01)
  })

  it('has its name on the parapet', () => {
    expect(signs.map((s) => s.text)).toContain('HELEN M. ADERHOLD LEARNING CENTER')
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 10k triangles in 5 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(5)
    expect(triangles).toBeLessThan(10_000)
  })
})
