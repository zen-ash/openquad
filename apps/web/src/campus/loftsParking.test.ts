import { describe, expect, it } from 'vitest'
import { closestOnSegment, pointInPolygon } from '../game/collision'
import { furnish } from '../game/furniture'
import { CEILING, interiors } from '../game/interiors'
import { floorOf } from '../game/surface'
import campus from './campus.json'
import {
  DOCK,
  EDGE,
  LEVELS,
  RAIL,
  SE,
  SHARED,
  STAIR,
  loftsParkingGeometry,
  parkingColumns,
  parkingFrame,
  parkingObstacles,
  type ParkingData,
} from './loftsParking'
import type { LoftsData } from './universityLofts'

const deck = campus.buildings.find((b) => b.name === 'University Lofts Parking') as ParkingData
const lofts = campus.buildings.find((b) => b.name === 'University Lofts') as LoftsData
const { parts, inside } = loftsParkingGeometry(deck)
const { S, ab, outline } = parkingFrame(deck)
const pts = deck.points.map(([x, z]) => ({ x: x!, z: z! }))
const loftsPts = lofts.points.map(([x, z]) => ({ x: x!, z: z! }))

describe('university lofts parking', () => {
  it('has the outline build-campus wrote, on the lidar walls', () => {
    expect(pts).toHaveLength(outline.length)
    pts.forEach((p, i) => {
      expect(p.x).toBeCloseTo(outline[i]!.x, 1)
      expect(p.z).toBeCloseTo(outline[i]!.z, 1)
    })
  })

  it('shares its north west side with the lofts, and the lofts draw it', () => {
    const near = (p: { x: number; z: number }) =>
      loftsPts.some((q, i) => {
        const o = closestOnSegment(p, q, loftsPts[(i + 1) % loftsPts.length]!)
        return Math.hypot(o.x - p.x, o.z - p.z) < 0.02
      })
    for (const i of SHARED) {
      const [p, q] = [pts[i]!, pts[(i + 1) % pts.length]!]
      expect(near(p) && near(q)).toBe(true)
      // nothing of the deck stands on that line
      for (const geo of Object.values(parts)) {
        const pos = geo.getAttribute('position')
        for (let k = 0; k < pos.count; k += 3) {
          const c = { x: 0, z: 0 }
          for (let j = 0; j < 3; j++) {
            c.x += pos.getX(k + j) / 3
            c.z += pos.getZ(k + j) / 3
          }
          const o = closestOnSegment(c, p, q)
          const ends = [p, q].some((e) => Math.hypot(e.x - c.x, e.z - c.z) < 0.2)
          if (Math.hypot(o.x - c.x, o.z - c.z) < 0.01 && !ends)
            expect(geo.getAttribute('normal').getY(k)).not.toBe(0)
        }
      }
    }
    // and the two don't overlap
    for (const p of pts.slice(0, 5)) expect(pointInPolygon(p, loftsPts)).toBe(false)
  })

  it('stands on the lofts ground, its second level hiding the inside ceiling', () => {
    expect(floorOf(deck)).toBeCloseTo(floorOf(lofts), 3)
    expect(LEVELS[0] - EDGE).toBeLessThan(CEILING)
    expect(LEVELS[0]).toBeGreaterThan(CEILING)
    expect(deck.height).toBeCloseTo(LEVELS[2] + RAIL, 2)
  })

  it('has its door in the stair lobby on piedmont ave', () => {
    const [x, z, nx, nz] = deck.door!
    const [a, b] = ab({ x: x!, z: z! })
    expect(a).toBeCloseTo(SE, 1)
    expect(b).toBeGreaterThan(STAIR.b[0])
    expect(b).toBeLessThan(STAIR.b[1])
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
  })

  it('leaves the loading dock drive out, behind a gate', () => {
    const drive = S((DOCK.a[0] + DOCK.a[1]) / 2, DOCK.b / 2)
    expect(pointInPolygon(drive, pts)).toBe(false)
    expect(pointInPolygon(drive, loftsPts)).toBe(false)
    const gate = parkingObstacles(deck).walls[0]!
    expect(Math.hypot(gate.bx - gate.ax, gate.bz - gate.az)).toBeCloseTo(DOCK.a[1] - DOCK.a[0], 1)
  })

  it('has its columns on the deck, clear of the stair', () => {
    const columns = parkingColumns(deck)
    expect(columns.length).toBeGreaterThan(12)
    for (const c of columns) {
      expect(pointInPolygon(c, pts)).toBe(true)
      expect(ab(c)[0] < STAIR.a[0] || ab(c)[1] > STAIR.b[1]).toBe(true)
    }
  })

  it('is see through all round on the ground floor', () => {
    expect(inside.solid).toHaveLength(0)
    expect(inside.glass.length).toBeGreaterThan(10)
  })

  it('stays empty inside, it is a garage', () => {
    const room = interiors.find((r) => r.name === 'University Lofts Parking')!
    expect(furnish(room)).toHaveLength(0)
  })

  it('stays under 4k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(4000)
  })
})
