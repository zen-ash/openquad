import { describe, expect, it } from 'vitest'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { libraryNorthGeometry, LOBBY, type LibraryNorthData } from './libraryNorth'

const lib = campus.buildings.find((b) => b.name === 'Library North') as LibraryNorthData
const box = lib.landmark!.box
const mid = {
  x: box.reduce((s, p) => s + p[0]!, 0) / 4,
  z: box.reduce((s, p) => s + p[1]!, 0) / 4,
}
const { parts, signs } = libraryNorthGeometry(lib)
const sign = signs[0]

describe('library north', () => {
  it('is the real size, a box about 53m on each side and 26m tall', () => {
    box.forEach(([x, z], i) => {
      const [nx, nz] = box[(i + 1) % 4]!
      const side = Math.hypot(nx! - x!, nz! - z!)
      expect(side).toBeGreaterThan(51)
      expect(side).toBeLessThan(55)
    })
    expect(lib.height).toBe(26)
  })

  it('has its front door on the lobby, facing the greenway to the northeast', () => {
    const [x, z, nx, nz] = lib.door!
    // east is +x, north is -z
    expect(nx).toBeGreaterThan(0.5)
    expect(nz).toBeLessThan(-0.5)
    // out in front of the brick box, not on it
    expect(Math.hypot(x! - mid.x, z! - mid.z)).toBeGreaterThan(30)
  })

  it('has all its outside brick walls facing out', () => {
    const pos = parts.brick.getAttribute('position')
    const normal = parts.brick.getAttribute('normal')
    for (let i = 0; i < pos.count; i += 6) {
      const out = (pos.getX(i) - mid.x) * normal.getX(i) + (pos.getZ(i) - mid.z) * normal.getZ(i)
      expect(out).toBeGreaterThan(0)
    }
  })

  it('puts the wavy panel above the lobby', () => {
    parts.panel.computeBoundingBox()
    expect(parts.panel.boundingBox!.min.y).toBeGreaterThan(LOBBY)
    expect(parts.panel.boundingBox!.max.y).toBeLessThan(lib.height)
  })

  it('hangs the sign over the front door', () => {
    const [x, z] = lib.door!
    expect(Math.hypot(sign!.x - x!, sign!.z - z!)).toBeLessThan(1)
    expect(sign!.y).toBeGreaterThan(3.8) // above the canopy
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })
})
