import { describe, expect, it } from 'vitest'
import { closestOnSegment, pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BAND,
  COLUMN,
  COLUMNS,
  GYM_TOP,
  MAIN,
  OUTLINE,
  recCenterGeometry,
  recFrame,
  recObstacles,
  SHOP,
  WING,
  type RecData,
} from './recCenter'

const rec = campus.buildings.find((b) => b.name === 'Student Recreation Center') as RecData
const { parts, signs } = recCenterGeometry(rec)
const { A, uvOf } = recFrame(rec)
const pts = rec.points.map(([x, z]) => ({ x: x!, z: z! }))
const grounded = campus.buildings
  .filter((b) => !b.minHeight)
  .map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))

describe('student recreation center', () => {
  it('has the outline build-campus wrote, on the lidar walls', () => {
    expect(rec.points).toHaveLength(OUTLINE.length)
    rec.points.forEach(([x, z], i) => {
      const [u, v] = uvOf({ x: x!, z: z! })
      expect(u).toBeCloseTo(OUTLINE[i]![0], 1)
      expect(v).toBeCloseTo(OUTLINE[i]![1], 1)
    })
  })

  it('is 18.6m to the gym box corners, the main box level with student center east', () => {
    expect(rec.height).toBe(18.6)
    expect(GYM_TOP).toBeLessThan(rec.height)
    const sce = campus.buildings.find((b) => b.name === 'Student Center East')!
    expect(Math.abs(MAIN.roof - sce.height)).toBeLessThan(0.3)
  })

  it('has its doors in the atrium glass under the band, facing piedmont ave', () => {
    const [x, z, nx, nz] = rec.door!
    const [u, v] = uvOf({ x: x!, z: z! })
    expect(u).toBeGreaterThan(BAND.u[0])
    expect(u).toBeLessThan(WING.u[0])
    expect(v).toBeCloseTo(220.9, 1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('lets you walk along the colonnade and into the court under the wing', () => {
    const spots = [
      ...COLUMNS.slice(1).map((u) => A(u - 3.6, (COLUMN.v + SHOP) / 2 + 0.5)),
      A(-75, 218),
      A(-90.7, 215),
    ]
    for (const p of spots) expect(grounded.some((g) => pointInPolygon(p, g))).toBe(false)
  })

  it('keeps the sidewalks and the streets clear of its columns, walls and the sign', () => {
    const { circles, walls } = recObstacles(rec)
    const lines = [...campus.paths, ...campus.roads, ...campus.crossings]
    for (const l of lines)
      for (let i = 1; i < l.points.length; i++) {
        const [a, b] = [l.points[i - 1]!, l.points[i]!]
        const p = { x: a[0]!, z: a[1]! }
        const q = { x: b[0]!, z: b[1]! }
        for (const c of circles) {
          const o = closestOnSegment(c, p, q)
          expect(Math.hypot(o.x - c.x, o.z - c.z)).toBeGreaterThan(c.radius + l.width / 2)
        }
        // the walls' ends are enough here, they're short or run along the paths
        for (const w of walls)
          for (const e of [
            { x: w.ax, z: w.az },
            { x: w.bx, z: w.bz },
          ]) {
            const o = closestOnSegment(e, p, q)
            expect(Math.hypot(o.x - e.x, o.z - e.z)).toBeGreaterThan(l.width / 2)
          }
      }
  })

  it('has the name on the band and on the corner sign', () => {
    const names = signs.map((s) => s.text)
    expect(names).toContain('GEORGIA STATE UNIVERSITY')
    expect(names).toContain('GEORGIA\nSTATE\nUNIVERSITY')
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
