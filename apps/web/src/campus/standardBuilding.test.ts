import { describe, expect, it } from 'vitest'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { placer } from './haasHowell'
import { frame } from './landmark'
import {
  ALLEY_CORNER,
  ATTIC,
  BACK,
  DOOR_BAY,
  ENTRANCE,
  FAIRLIE,
  LUCKIE_CORNER,
  PENTHOUSE,
  ROOF,
  ROWS,
  SECOND,
  TOP,
  VESTIBULE,
  standardGeometry,
  type StandardData,
} from './standardBuilding'

const sb = campus.buildings.find((b) => b.name === 'Standard Building') as StandardData
const f = frame(ALLEY_CORNER, LUCKIE_CORNER)
const place = placer(f, ALLEY_CORNER)
const local = sb.points.map(([x, z]) => place.local({ x: x!, z: z! }))
const { parts, signs } = standardGeometry(sb)

describe('standard building', () => {
  it('keeps its index and osm outline but for a notch at the entrance', () => {
    expect(campus.buildings[81]).toBe(sb)
    const notch = local.filter((p) => Math.abs(p.z - VESTIBULE) < 0.05).map((p) => p.x)
    expect(notch).toHaveLength(2)
    expect(Math.min(...notch)).toBeCloseTo(ENTRANCE[0], 1)
    expect(Math.max(...notch)).toBeCloseTo(ENTRANCE[1], 1)
    const door = place.local({ x: sb.door![0]!, z: sb.door![1]! })
    expect(door.x).toBeCloseTo(DOOR_BAY, 1)
    expect(door.z).toBeCloseTo(VESTIBULE, 1)
  })

  it('reaches back to where the lidar has its back wall, past osm line', () => {
    const deepest = Math.max(...local.map((p) => p.z))
    expect(deepest).toBeLessThan(11.4)
    expect(BACK).toBeCloseTo(12.5, 1)
  })

  it('stands on fairlie st, the roof and penthouse where the lidar has them', () => {
    expect(baseOf(sb)).toBeCloseTo(fromElevation(320.5))
    expect(floorOf(sb)).toBeCloseTo(baseOf(sb))
    expect(320.5 + ROOF).toBeCloseTo(360.5, 0)
    expect(320.5 + TOP).toBeCloseTo(362.2, 0)
    expect(320.5 + PENTHOUSE.top).toBeCloseTo(365.1, 1)
    expect(sb.height).toBe(PENTHOUSE.top)
  })

  it('has eleven floors: two of stone, eight of brick and the attic', () => {
    expect(SECOND[1]).toBeLessThan(ROWS[0]![0])
    expect(ROWS).toHaveLength(8)
    expect(ATTIC[1]).toBeLessThan(ROOF - 1)
  })

  it('has one, two, one, two, one windows on fairlie st, symmetric', () => {
    expect(FAIRLIE).toHaveLength(7)
    const mids = FAIRLIE.map(([a, b]) => (a + b) / 2)
    mids.forEach((m, i) => expect(m + mids[mids.length - 1 - i]!).toBeCloseTo(2 * DOOR_BAY, 1))
  })

  it('is a few parts and not too many triangles', () => {
    expect(Object.keys(parts).length).toBeLessThanOrEqual(6)
    const tris = Object.values(parts).reduce((n, g) => n + g.getAttribute('position').count / 3, 0)
    expect(tris).toBeLessThan(8000)
  })

  it('has school of music over the doors', () => {
    const sign = signs.find((s) => s.text === 'SCHOOL OF MUSIC')!
    expect(sign.y).toBeGreaterThan(2.7)
  })
})
