import { describe, expect, it } from 'vitest'
import { closestOnSegment, pointInPolygon } from '../game/collision'
import { furnish } from '../game/furniture'
import { interiors } from '../game/interiors'
import { floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  COURT,
  ENTRANCE,
  LOW,
  SIX,
  TEN,
  TOP,
  floorY,
  loftsFrames,
  loftsObstacles,
  universityLoftsGeometry,
  type LoftsData,
} from './universityLofts'

const lofts = campus.buildings.find((b) => b.name === 'University Lofts') as LoftsData
const { parts, signs } = universityLoftsGeometry(lofts)
const { N, S, outline } = loftsFrames(lofts)
const pts = lofts.points.map(([x, z]) => ({ x: x!, z: z! }))

describe('university lofts', () => {
  it('has the outline build-campus wrote, on the lidar walls', () => {
    expect(pts).toHaveLength(outline.length)
    pts.forEach((p, i) => {
      expect(p.x).toBeCloseTo(outline[i]!.x, 1)
      expect(p.z).toBeCloseTo(outline[i]!.z, 1)
    })
  })

  it('leaves the courtyard open to the sky, through a slot too thin to walk in', () => {
    // the middle of the courtyard and right by its walls is outside the building
    expect(pointInPolygon(S(15, 30), pts)).toBe(false)
    expect(pointInPolygon(S(20, 18), pts)).toBe(false)
    expect(pointInPolygon(N(25, 18.5), pts)).toBe(false)
    // the tower, the arm, the north bar and the low wing round it are in
    for (const p of [S(20, 8), S(28, 30), N(25, 8), N(45, 25), S(2, 25)])
      expect(pointInPolygon(p, pts)).toBe(true)
    // the slot through the low wing is 10cm
    const [a, b] = [outline[14]!, outline[32]!]
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeCloseTo(0.1, 2)
    expect(COURT[1]! - COURT[0]!).toBeGreaterThan(10)
  })

  it('steps up 6, 10 and 14 floors with the roofs on the floor lines', () => {
    expect(lofts.height).toBe(TOP)
    // each roof is a floor and a parapet over its top floor
    expect(SIX).toBeGreaterThan(floorY(7))
    expect(SIX).toBeLessThan(floorY(7) + 1)
    expect(TEN).toBeGreaterThan(floorY(11))
    expect(TEN).toBeLessThan(floorY(11) + 1)
    expect(TOP).toBeCloseTo(floorY(15), 1)
    expect(LOW).toBeGreaterThan(floorY(3))
  })

  it('stands on the edgewood ave sidewalk at the doors', () => {
    expect(floorOf(lofts)).toBeCloseTo(fromElevation(304.3), 2)
  })

  it('has its doors in the recess under the name, facing edgewood ave', () => {
    const [x, z, nx, nz] = lofts.door!
    const door = N(ENTRANCE.door, ENTRANCE.deep)
    expect(x).toBeCloseTo(door.x, 1)
    expect(z).toBeCloseTo(door.z, 1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    expect(signs.map((s) => s.text)).toContain('UNIVERSITY LOFTS')
    expect(signs.map((s) => s.text)).toContain('1 3 5')
  })

  it('faces out of the outline wherever a wall stands on it', () => {
    const edges = pts.map((p, i) => [p, pts[(i + 1) % pts.length]!] as const)
    // the slot's mouths have the wall drawn across them
    const slot = [outline[14]!, outline[15]!]
    let checked = 0
    for (const geo of Object.values(parts)) {
      const pos = geo.getAttribute('position')
      const normal = geo.getAttribute('normal')
      for (let i = 0; i < pos.count; i += 3) {
        const n = { x: normal.getX(i), z: normal.getZ(i) }
        if (Math.abs(normal.getY(i)) > 0.1) continue
        const c = { x: 0, z: 0 }
        for (let k = 0; k < 3; k++) {
          c.x += pos.getX(i + k) / 3
          c.z += pos.getZ(i + k) / 3
        }
        // on an edge and along it, not a wall that only ends there
        const on = edges.some(([p, q]) => {
          const o = closestOnSegment(c, p, q)
          const l = Math.hypot(q.x - p.x, q.z - p.z)
          const along = Math.abs((n.x * (q.x - p.x) + n.z * (q.z - p.z)) / l)
          return Math.hypot(o.x - c.x, o.z - c.z) < 0.01 && along < 0.1
        })
        const corner = pts.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 0.1)
        if (!on || corner || slot.some((s) => Math.hypot(s.x - c.x, s.z - c.z) < 1.5)) continue
        checked++
        expect(pointInPolygon({ x: c.x + n.x * 0.05, z: c.z + n.z * 0.05 }, pts)).toBe(false)
      }
    }
    expect(checked).toBeGreaterThan(500)
  })

  it('keeps the entrance columns outside, with room between them for the doors', () => {
    const { circles, walls } = loftsObstacles(lofts)
    expect(circles).toHaveLength(2)
    for (const c of circles) expect(pointInPolygon(c, pts)).toBe(false)
    const gap = Math.hypot(circles[1]!.x - circles[0]!.x, circles[1]!.z - circles[0]!.z)
    expect(gap - 2 * circles[0]!.radius).toBeGreaterThan(3)
    for (const w of walls) {
      expect(pointInPolygon({ x: (w.ax + w.bx) / 2, z: (w.az + w.bz) / 2 }, pts)).toBe(false)
    }
  })

  it('only has seats in the lobby, the rest of the ground floor is shops and flats', () => {
    const room = interiors.find((r) => r.name === 'University Lofts')!
    expect(furnish(room).length).toBeLessThan(60)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 14k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(14_000)
  })
})
