import { describe, expect, it } from 'vitest'
import { pointInPolygon, type Point } from '../game/collision'
import campus from './campus.json'
import {
  BACK,
  GLASS,
  PARAPET,
  PIERS,
  TOWER,
  VIADUCT,
  courtlandFrame,
  courtlandNorthGeometry,
  courtlandObstacles,
  type CourtlandNorthData,
} from './courtlandNorth'
import { buildingsGeometry } from './geometry'

const cn = campus.buildings.find((b) => b.name === 'Courtland North') as CourtlandNorthData
const arena = campus.buildings.find((b) => b.name === 'GSU Sports Arena')!
const { parts, signs } = courtlandNorthGeometry(cn)
const { uvOf } = courtlandFrame(cn)
const pts = cn.points.map(([x, z]) => ({ x: x!, z: z! }))

// do segments ab and cd cross
function crosses(a: Point, b: Point, c: Point, d: Point) {
  const side = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x)
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0
}

describe('courtland north', () => {
  it('has the tower square to north with its round corner, the rest along the street', () => {
    const has = (x: number, z: number) =>
      pts.some((p) => Math.abs(p.x - x) < 0.01 && Math.abs(p.z - z) < 0.01)
    expect(has(TOWER.x[0], TOWER.z[0])).toBe(true)
    expect(has(TOWER.x[1], TOWER.z[1])).toBe(true)
    const c = { x: TOWER.x[1] - TOWER.round, z: TOWER.z[0] + TOWER.round }
    const round = pts.filter((p) => p.x > c.x - 0.01 && p.z < c.z + 0.01)
    expect(round.length).toBeGreaterThan(3)
    for (const p of round) expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeCloseTo(TOWER.round, 1)
    // the cream block's front is on the ground floor's glass
    const front = pts.filter((p) => Math.abs(uvOf(p)[0] - GLASS) < 0.02)
    expect(front).toHaveLength(2)
  })

  it('is 10.55m to the top of the tower, the parapet lower', () => {
    expect(cn.height).toBe(10.55)
    expect(PARAPET).toBeLessThan(cn.height)
  })

  it('has its door in the middle bay under the awning, facing courtland st', () => {
    const [x, z, nx, nz] = cn.door!
    const [u, v] = uvOf({ x: x!, z: z! })
    expect(u).toBeCloseTo(GLASS, 1)
    expect(v).toBeGreaterThan(PIERS[2]![1])
    expect(v).toBeLessThan(PIERS[3]![0])
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stops just short of the arena behind it', () => {
    for (const p of pts) expect(uvOf(p)[0]).toBeLessThanOrEqual(BACK + 0.01)
    for (const [x, z] of arena.points) expect(pointInPolygon({ x: x!, z: z! }, pts)).toBe(false)
  })

  it('puts the parapet along the sidewalk without cutting a path or a building', () => {
    const walls = courtlandObstacles(cn)
    expect(walls).toHaveLength(VIADUCT.pieces.length)
    for (const w of walls) {
      const a = { x: w.ax, z: w.az }
      const b = { x: w.bx, z: w.bz }
      for (const l of [...campus.paths, ...campus.crossings])
        for (let i = 1; i < l.points.length; i++) {
          const [p, q] = [l.points[i - 1]!, l.points[i]!]
          expect(crosses(a, b, { x: p[0]!, z: p[1]! }, { x: q[0]!, z: q[1]! })).toBe(false)
        }
      for (const bd of campus.buildings) {
        const shape = bd.points.map(([x, z]) => ({ x: x!, z: z! }))
        for (const t of [0.1, 0.5, 0.9])
          expect(
            pointInPolygon({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, shape),
          ).toBe(false)
      }
    }
  })

  it('has the name on the tower', () => {
    expect(signs.map((s) => s.text)).toContain('COURTLAND NORTH')
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 3k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(3000)
  })
})
