import { describe, expect, it } from 'vitest'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import {
  ALLEY_CORNER,
  ATTIC,
  CORNER,
  DEEP,
  ENTRANCE,
  PENTHOUSE,
  POPLAR_WINDOWS,
  ROOF,
  ROWS,
  SECOND,
  TOP,
  VESTIBULE,
  haasHowellGeometry,
  placer,
  type HaasHowellData,
} from './haasHowell'
import { frame } from './landmark'

const hh = campus.buildings.find((b) => b.name === 'Haas-Howell Building') as HaasHowellData
const f = frame(CORNER, ALLEY_CORNER)
const place = placer(f, CORNER)
const local = hh.points.map(([x, z]) => place.local({ x: x!, z: z! }))
const { parts, signs } = haasHowellGeometry(hh)

describe('haas-howell building', () => {
  it('keeps its index and the rialto side of osm outline', () => {
    expect(campus.buildings[62]).toBe(hh)
    const rialto = campus.buildings.find((b) => b.name === 'Rialto Center for the Arts')!
    // the two shared corners are still there, so nothing opens up between them
    for (const p of [
      [-387.9, -263.2],
      [-406.1, -284.5],
    ])
      expect(hh.points).toContainEqual(p)
    expect(rialto.points).toContainEqual([-387.9, -263.2])
  })

  it('is a box on the lidar walls with a notch for the entrance', () => {
    expect(f.len).toBeCloseTo(28.03, 1)
    for (const p of local) {
      expect(p.x).toBeGreaterThan(-0.1)
      expect(p.x).toBeLessThan(f.len + 0.1)
      expect(p.z).toBeGreaterThan(-0.1)
      expect(p.z).toBeLessThan(DEEP + 0.1)
    }
    const notch = local.filter((p) => Math.abs(p.z - VESTIBULE) < 0.05).map((p) => p.x)
    expect(notch).toHaveLength(2)
    expect(Math.min(...notch)).toBeCloseTo(ENTRANCE[0], 1)
    expect(Math.max(...notch)).toBeCloseTo(ENTRANCE[1], 1)
    // the door at the back of it, facing poplar st
    const door = place.local({ x: hh.door![0]!, z: hh.door![1]! })
    expect(door.z).toBeCloseTo(VESTIBULE, 1)
    expect((door.x - ENTRANCE[0]) * (door.x - ENTRANCE[1])).toBeLessThan(0)
  })

  it('stands on poplar st, the roof and penthouse where the lidar has them', () => {
    expect(baseOf(hh)).toBeCloseTo(fromElevation(322))
    expect(floorOf(hh)).toBeCloseTo(baseOf(hh))
    expect(322 + ROOF).toBeCloseTo(353, 0)
    expect(322 + TOP).toBeCloseTo(353.4, 0)
    expect(322 + PENTHOUSE.top).toBeCloseTo(358.1, 1)
    expect(hh.height).toBe(PENTHOUSE.top)
  })

  it('has eight floors: two of stone, five of brick and the attic', () => {
    expect(SECOND[1]).toBeLessThan(ROWS[0]![0])
    expect(ROWS).toHaveLength(5)
    ROWS.forEach((r, i) => i && expect(r[0] - ROWS[i - 1]![0]).toBeCloseTo(3.36))
    expect(ATTIC[1]).toBeLessThan(ROOF - 1)
  })

  it('has two singles and five pairs on poplar st, none over the entrance', () => {
    expect(POPLAR_WINDOWS).toHaveLength(12)
    const mid = (ENTRANCE[0] + ENTRANCE[1]) / 2
    expect(POPLAR_WINDOWS.some(([a, b]) => a < mid && b > mid)).toBe(false)
  })

  it('is a few parts and not too many triangles', () => {
    expect(Object.keys(parts).length).toBeLessThanOrEqual(6)
    const tris = Object.values(parts).reduce((n, g) => n + g.getAttribute('position').count / 3, 0)
    expect(tris).toBeLessThan(8000)
  })

  it('has its name carved over the entrance and no logo', () => {
    expect(signs.find((s) => s.text.startsWith('HAAS'))!.y).toBeGreaterThan(5)
    expect(signs.every((s) => s.text)).toBe(true)
  })
})
