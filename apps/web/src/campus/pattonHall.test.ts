import { describe, expect, it } from 'vitest'
import { floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { PARAPET, ROOF, pattonHallGeometry, type PattonHallData } from './pattonHall'

const patton = campus.buildings[74] as PattonHallData & { name?: string; gsu?: boolean }
const geo = pattonHallGeometry(patton)

describe('patton hall', () => {
  it('keeps its place in the list as a gsu building', () => {
    expect(patton.name).toBe('Patton Hall')
    expect(patton.gsu).toBe(true)
  })

  it('stands on the edgewood ave sidewalk with its roof where the lidar has it', () => {
    expect(floorOf(campus.buildings[74]!)).toBeCloseTo(fromElevation(303.3), 5)
    // roof 323.0m, parapet 324.2, the lift penthouse 327.8
    expect(303.3 + ROOF).toBeCloseTo(323.0, 0)
    expect(303.3 + PARAPET).toBeCloseTo(324.2, 0)
    expect(303.3 + patton.height).toBeCloseTo(327.8, 0)
  })

  it('is a U open to the west, not a solid block over the court', () => {
    const xs = patton.points.map((p) => p[0]!)
    expect(Math.min(...xs)).toBeCloseTo(240.8)
    // the court's west half is open ground
    const inside = (x: number, z: number) => {
      let hit = false
      const p = patton.points
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [ax, az] = p[i]!
        const [bx, bz] = p[j]!
        if (az! > z !== bz! > z && x < ((bx! - ax!) * (z - az!)) / (bz! - az!) + ax!) hit = !hit
      }
      return hit
    }
    expect(inside(247, -68)).toBe(false)
    expect(inside(260, -68)).toBe(true)
    expect(inside(245, -90)).toBe(true)
  })

  it('has its door in the open corner by edgewood ave', () => {
    expect(patton.door).toEqual([278, -43.5, 0, 1])
  })

  it('is drawn by hand, not by the buildings mesh', () => {
    expect(campus.buildings[74]!.landmark).toEqual({})
  })

  it('keeps to six materials and a modest triangle count', () => {
    expect(Object.keys(geo.parts).sort()).toEqual(
      ['block', 'blue', 'brick', 'glass', 'metal', 'stucco'].sort(),
    )
    let tris = 0
    for (const g of Object.values(geo.parts))
      tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3
    expect(tris).toBeLessThan(12000)
  })
})
