import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import {
  BAND,
  BAYS,
  DEPTH,
  FLOOR,
  FLOORS,
  PARAPET,
  PENTHOUSE,
  PIER,
  RECESS,
  ROOF,
  SILL,
  SOFFIT,
  TOP_GLASS,
  columns,
  edgewood100Geometry,
  rows,
  type Edgewood100Data,
} from './edgewood100'
import { buildingsGeometry } from './geometry'

const e100 = campus.buildings.find((b) => b.name === '100 Edgewood') as Edgewood100Data
const pts = e100.points.map(([x, z]) => ({ x: x!, z: z! }))
const corners = e100.landmark!.corners!
const { parts, signs } = edgewood100Geometry(e100)
const side = (a: number[], b: number[]) => Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!)

describe('100 edgewood', () => {
  it('is the lidar roof turned a little off the game grid, the glass set in under it', () => {
    // 57.45 x 33.75m (lidar 2018)
    expect(side(corners[0]!, corners[1]!)).toBeCloseTo(57.45, 1)
    expect(side(corners[0]!, corners[3]!)).toBeCloseTo(33.75, 1)
    // the north west corner is further north than the north east one
    expect(corners[3]![1]!).toBeLessThan(corners[2]![1]!)
    // the ground floor's glass is all inside the tower's faces
    for (const p of pts)
      expect(
        pointInPolygon(
          p,
          corners.map(([x, z]) => ({ x: x!, z: z! })),
        ),
      ).toBe(true)
    expect(side(e100.points[0]!, e100.points[1]!)).toBeCloseTo(57.45 - 2 * RECESS, 1)
  })

  it('is 67.9m to the parapet with the penthouse over it', () => {
    expect(e100.height).toBe(PARAPET)
    // the lidar: the parapet at 377.55m, the roof 376.3, the penthouse 381.8
    expect(309.65 + PARAPET).toBeCloseTo(377.55, 1)
    expect(309.65 + ROOF).toBeCloseTo(376.3, 1)
    expect(309.65 + PENTHOUSE.top).toBeCloseTo(381.8, 1)
  })

  it('has 15 office floors and a taller top floor between the colonnade and the parapet', () => {
    const r = rows()
    expect(r).toHaveLength(FLOORS + 1)
    expect(r[0]![0]).toBe(SILL)
    expect(SILL).toBeGreaterThan(SOFFIT)
    for (let i = 1; i < r.length; i++) expect(r[i]![0]).toBeGreaterThan(r[i - 1]![1])
    const top = r.at(-1)!
    expect(top[1] - top[0]).toBeGreaterThan(1.4 * (FLOOR - BAND))
    expect(top[1]).toBeLessThan(PARAPET)
    expect(TOP_GLASS[1]).toBeLessThan(top[1])
    expect(ROOF).toBeGreaterThan(TOP_GLASS[1])
  })

  it('fits 21 bays on the long faces and 12 on the ends', () => {
    expect(BAYS).toEqual([21, 12])
    for (const [n, len] of [
      [21, side(corners[0]!, corners[1]!)],
      [12, side(corners[0]!, corners[3]!)],
    ] as const) {
      const cols = columns(len, n)
      expect(cols).toHaveLength(n)
      expect(cols[0]![0]).toBeCloseTo(PIER)
      expect(cols.at(-1)![1]).toBeCloseTo(len - PIER)
      // about 2.75m a bay both ways
      expect(len / n).toBeGreaterThan(2.7)
      expect(len / n).toBeLessThan(2.85)
    }
    expect(DEPTH).toBeLessThan(RECESS)
  })

  it('has its door in the middle of the edgewood ave front, facing the street', () => {
    const [x, z, nx, nz] = e100.door!
    const mid = (corners[0]![0]! + corners[1]![0]!) / 2
    expect(Math.abs(x! - mid)).toBeLessThan(2.5)
    expect(nz).toBeCloseTo(1, 2)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on its plaza, the lot east of it 3.7m lower', () => {
    expect(floorOf(e100)).toBeCloseTo(fromElevation(309.65))
    expect(baseOf(e100)).toBeCloseTo(floorOf(e100))
    expect(lowestUnder(corners) - floorOf(e100)).toBeLessThan(-0.5)
    // the plaza's walls go on down past the lot
    parts.concrete.computeBoundingBox()
    expect(parts.concrete.boundingBox!.min.y).toBeLessThan(-3.7)
  })

  it('has the address on the glass by the doors and no logo', () => {
    expect(signs.map((s) => s.text)).toEqual(['100'])
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
    expect(triangles).toBeLessThan(8_000)
  })
})
