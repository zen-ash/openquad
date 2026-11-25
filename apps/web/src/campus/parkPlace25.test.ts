import { describe, expect, it } from 'vitest'
import campus from './campus.json'
import {
  COPING,
  CROWN,
  DATUM,
  FASCIA,
  FLOORS,
  GROUND,
  HALL,
  LINK,
  PITCH,
  ROOF,
  TOP,
  TOWER,
  UPPER,
  parkPlace25Geometry,
  type ParkPlace25Data,
} from './parkPlace25'

const lot = campus.buildings.find((b) => b.name === '25 Park Place') as ParkPlace25Data
const tower = campus.buildings.find((b) => b.landmark?.with === '25 Park Place')!
const { parts, signs } = parkPlace25Geometry(lot)

describe('25 park place', () => {
  it('has the tower on the lidar walls, drawn with the rest', () => {
    const xs = tower.points.map(([x]) => x!)
    const zs = tower.points.map(([, z]) => z!)
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([TOWER.w, TOWER.e])
    expect([Math.min(...zs), Math.max(...zs)]).toEqual([TOWER.n, TOWER.s])
    expect(tower.name).toBeUndefined()
    expect(tower.height).toBe(TOP)
  })

  it('stands at the lidar heights over the plaza', () => {
    expect(DATUM + TOP).toBeCloseTo(433.0, 0)
    expect(DATUM + ROOF).toBeCloseTo(431.8, 0)
    expect(DATUM + LINK.top).toBeCloseTo(331.0, 0)
    expect(DATUM + UPPER.top).toBeCloseTo(336.6, 0)
    expect(lot.height).toBe(UPPER.top)
  })

  it('has 25 floors of windows between the fascia and the crown', () => {
    expect(CROWN).toBeCloseTo(FASCIA + FLOORS * PITCH)
    expect(CROWN).toBeLessThan(COPING)
    expect(COPING).toBeLessThan(ROOF)
  })

  it('has its ground floor in under the tower and the banking hall', () => {
    for (const [x, z] of lot.points) {
      const inTower = x! >= TOWER.w && x! <= TOWER.e && z! >= TOWER.n && z! <= TOWER.s
      const inHall = x! >= HALL.w && x! <= HALL.e && z! >= HALL.n && z! <= HALL.s
      expect(inTower || inHall).toBe(true)
    }
    expect(Math.min(...lot.points.map(([x]) => x!))).toBe(GROUND.w)
    expect(Math.max(...lot.points.map(([, z]) => z!))).toBe(GROUND.s)
  })

  it('has the main door on the plaza', () => {
    expect(lot.door![0]).toBeCloseTo(TOWER.w + 2)
    expect(lot.door![2]).toBe(-1)
  })

  it('has only blue squares where the logos are', () => {
    const squares = signs.filter((s) => !s.text)
    expect(squares).toHaveLength(2)
    for (const s of squares) expect(s.plate).toBe('#1f4aa8')
  })

  it('has a tree in every planter on the plaza', () => {
    const planters = lot.landmark!.planters!
    expect(planters.length).toBeGreaterThan(15)
    for (const [x, z] of planters) {
      expect(campus.trees.some(([tx, tz]) => tx === x && tz === z)).toBe(true)
      // on the plaza, between the tower and park place
      expect(x!).toBeLessThan(TOWER.w - 2)
      expect(z!).toBeGreaterThan(TOWER.n)
      expect(z!).toBeLessThan(HALL.n)
    }
  })

  it('stays under a tower budget of triangles', () => {
    let tris = 0
    for (const g of Object.values(parts)) tris += g.getAttribute('position').count / 3
    expect(tris).toBeLessThan(14000)
  })
})
