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

  it('has its main doors on the courtyard, with the name right next to them', () => {
    const [x, z, nx, nz] = tower.door as number[]
    // facing the research science center across the courtyard
    const rsc = campus.buildings.find((b) => b.name === 'Research Science Center')!
    const cx = rsc.points.reduce((s, p) => s + p[0]!, 0) / rsc.points.length
    const cz = rsc.points.reduce((s, p) => s + p[1]!, 0) / rsc.points.length
    expect(nx! * (cx - x!) + nz! * (cz - z!)).toBeGreaterThan(10)
    const name = signs.find((s) => s.text === 'RESEARCH TOWER')!
    expect(Math.hypot(name.x - x!, name.z - z!)).toBeLessThan(4)
  })

  it('has no doors or windows toward petit', () => {
    // the north and west corners
    const [w, n] = [tower.points[0]!, tower.points[1]!]
    const len = Math.hypot(n[0]! - w[0]!, n[1]! - w[1]!)
    const [dx, dz] = [(n[0]! - w[0]!) / len, (n[1]! - w[1]!) / len]
    for (const part of ['glass', 'blueGlass'] as const) {
      const pos = parts[part].getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const [px, pz] = [pos.getX(i) - w[0]!, pos.getZ(i) - w[1]!]
        const along = px * dx + pz * dz
        const off = Math.abs(px * dz - pz * dx)
        expect(off < 0.5 && along > 0.5 && along < len - 0.5).toBe(false)
      }
    }
  })
})
