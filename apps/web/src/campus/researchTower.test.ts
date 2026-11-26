import { describe, expect, it } from 'vitest'
import { LOBBY, researchTowerGeometry, V_LOW, type TowerData } from './researchTower'
import campus from './campus.json'

const tower = campus.buildings.find((b) => b.name === 'Research Tower') as TowerData
const { parts, signs } = researchTowerGeometry(tower)

const box = (part: keyof typeof parts) => {
  parts[part].computeBoundingBox()
  return parts[part].boundingBox!
}

describe('research tower', () => {
  it('wraps a glass v round the east corner', () => {
    const east = tower.points.reduce((m, p) => (p[0]! > m[0]! ? p : m))
    const pos = parts.blueGlass.getAttribute('position')
    // the lowest glass over the storefronts is right at the corner
    let low = { y: Infinity, d: 0 }
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (y > LOBBY + 0.5 && y < low.y)
        low = { y, d: Math.hypot(pos.getX(i) - east[0]!, pos.getZ(i) - east[1]!) }
    }
    expect(low.y).toBeCloseTo(V_LOW)
    expect(low.d).toBeLessThan(0.2)
  })

  it('has a brick base on the side toward the railroad', () => {
    const b = box('brick')
    expect(b.max.y).toBeLessThan(5)
    // the south west side, between the south and west corners
    expect(b.min.x).toBeLessThan(2)
    expect(b.max.z).toBeGreaterThan(440)
  })

  it('has a grid of narrow windows over the brick', () => {
    const pane = parts.glass.getAttribute('aPane')
    let narrow = 0
    for (let i = 0; i < pane.count; i += 6)
      if (Math.abs(pane.getX(i) - 1) < 0.01 && Math.abs(pane.getY(i) - 2.9) < 0.01) narrow++
    expect(narrow).toBeGreaterThanOrEqual(70)
  })

  it('has a plain square where gsu has its logo', () => {
    const square = signs.find((s) => s.text === '' && s.width === s.height)
    expect(square).toBeDefined()
    expect(square!.plate).toBe('#1f4b99')
  })
})
