import { describe, expect, it } from 'vitest'
import { closestOnSegment, pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  arenaFrame,
  arenaObstacles,
  BRIDGE,
  BRIDGES,
  END,
  HALL,
  LOUVRE,
  OUTLINE,
  PRACTICE_ROOF,
  signJoints,
  sportsArenaGeometry,
  TERRACE,
  TOWER,
  type ArenaData,
} from './sportsArena'

const arena = campus.buildings.find((b) => b.name === 'GSU Sports Arena') as ArenaData
const { parts, signs } = sportsArenaGeometry(arena)
const { A, uvOf } = arenaFrame(arena)
const pts = arena.points.map(([x, z]) => ({ x: x!, z: z! }))
const grounded = campus.buildings
  .filter((b) => !b.minHeight)
  .map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))

describe('gsu sports arena', () => {
  it('has the outline build-campus wrote, on the lidar walls', () => {
    expect(arena.points).toHaveLength(OUTLINE.length)
    arena.points.forEach(([x, z], i) => {
      const [u, v] = uvOf({ x: x!, z: z! })
      expect(u).toBeCloseTo(OUTLINE[i]![0], 1)
      expect(v).toBeCloseTo(OUTLINE[i]![1], 1)
    })
  })

  it('is 30.7m to the louvre boxes, with the towers, end walls and hall under that', () => {
    expect(arena.height).toBe(LOUVRE)
    expect(TOWER).toBeLessThan(LOUVRE)
    expect(END.top).toBeLessThan(TOWER)
    expect(HALL.top).toBeLessThan(END.top)
  })

  it('has its doors at the end of the passage, facing courtland st', () => {
    const [x, z, nx, nz] = arena.door!
    const [u, v] = uvOf({ x: x!, z: z! })
    expect(u).toBeCloseTo(94, 1)
    expect(v).toBeGreaterThan(247.7)
    expect(v).toBeLessThan(252.3)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('meets the practice facility on its party wall, the end walls over its roof', () => {
    const party = OUTLINE.filter(([u]) => u === HALL.se)
    expect(party).toHaveLength(2)
    expect(END.to - HALL.se).toBeCloseTo(2.25)
    // its roof is 10.3m up, the arena's walls start just under it
    expect(PRACTICE_ROOF).toBeLessThan(10.3)
  })

  it('lets you walk under the terrace and both bridges', () => {
    const spots = [
      A(122, TERRACE.v + 3),
      ...BRIDGES.map(({ u }) => A((u[0] + u[1]) / 2, 225)),
      ...BRIDGES.map(({ u }) => A((u[0] + u[1]) / 2, BRIDGE.end + 6)),
    ]
    for (const p of spots) expect(grounded.some((g) => pointInPolygon(p, g))).toBe(false)
  })

  it('keeps the sidewalks and the street clear of its columns and piers', () => {
    const { circles } = arenaObstacles(arena)
    const lines = [...campus.paths, ...campus.roads, ...campus.crossings]
    for (const c of circles)
      for (const l of lines)
        for (let i = 1; i < l.points.length; i++) {
          const [a, b] = [l.points[i - 1]!, l.points[i]!]
          const p = closestOnSegment(c, { x: a[0]!, z: a[1]! }, { x: b[0]!, z: b[1]! })
          expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeGreaterThan(c.radius + l.width / 2)
        }
  })

  it('draws the loading dock well at the back and keeps it solid', () => {
    const well = campus.buildings.find(
      (b) => (b.landmark as { with?: string } | undefined)?.with === 'GSU Sports Arena',
    )!
    expect(well.minHeight).toBeUndefined()
    expect(well.height).toBeLessThan(2)
    expect(arena.landmark!.well).toEqual(well.points)
  })

  it('has narrow and wide panels in turn on the sign wall', () => {
    const joints = signJoints(106.8, 138.8)
    const widths = joints.slice(2, -1).map((u, i) => u - joints[i + 1]!)
    for (let i = 1; i < widths.length; i++)
      expect(Math.abs(widths[i]! - widths[i - 1]!)).toBeGreaterThan(0.5)
    expect(joints[0]).toBe(106.8)
    expect(joints.at(-1)).toBe(138.8)
  })

  it('has the name on the sign wall', () => {
    expect(signs.some((s) => s.text === 'GEORGIA STATE UNIVERSITY')).toBe(true)
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
