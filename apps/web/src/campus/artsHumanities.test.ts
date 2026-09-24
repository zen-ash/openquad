import { describe, expect, it } from 'vitest'
import { artsHumanitiesGeometry, LOW, type ArtsData } from './artsHumanities'
import campus from './campus.json'

const arts = campus.buildings.find((b) => b.name === 'Arts & Humanities') as ArtsData
const { parts, signs } = artsHumanitiesGeometry(arts)

describe('arts & humanities', () => {
  it('has a taller marble block and a lower part toward the quad', () => {
    parts.marble.computeBoundingBox()
    expect(parts.marble.boundingBox!.max.y).toBeCloseTo(arts.height)
    parts.panels.computeBoundingBox()
    expect(parts.panels.boundingBox!.max.y).toBeCloseTo(LOW)
  })

  it('has its doors at the gilmer street corner, facing the quad', () => {
    const [x, z, nx, nz] = arts.door!
    // northeast. east is +x, north is -z
    expect(nx).toBeGreaterThan(0.5)
    expect(nz).toBeLessThan(-0.5)
    // the north end of the building, by peachtree center
    const north = Math.min(...arts.points.map((p) => p[1]!))
    expect(z! - north).toBeLessThan(5)
    expect(x).toBeLessThan(-95)
  })

  it('has three bands of windows on peachtree center', () => {
    const pane = parts.bandGlass.getAttribute('aPane')
    expect(pane.count / 6).toBe(3)
  })

  it('names the recital hall by the door', () => {
    expect(signs.map((s) => s.text)).toContain('FLORENCE KOPLEFF\nRECITAL HALL')
  })
})
