import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf, floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { BLADE, LOBBY, MARQUEE, ROOF, rialtoGeometry, type RialtoData } from './rialto'

const rialto = campus.buildings.find((b) => b.name === 'Rialto Center for the Arts') as RialtoData
const pts = rialto.points.map(([x, z]) => ({ x: x!, z: z! }))
const { parts, signs } = rialtoGeometry(rialto)

describe('rialto center', () => {
  it('is as tall as the lidar says', () => {
    expect(rialto.height).toBe(ROOF)
    // the roof 343.3-343.7m, its edge on luckie st 344.0, over the corner's sidewalk
    expect(322.6 + ROOF).toBeGreaterThan(343.7)
    expect(322.6 + ROOF).toBeLessThan(344.2)
    // the marquee's lid is 6m up (lidar)
    expect(MARQUEE[1]).toBeCloseTo(6, 1)
    expect(BLADE[1]).toBeLessThan(ROOF)
  })

  it('has its door on forsyth st under the marquee', () => {
    const [x, z, nx, nz] = rialto.door!
    const [corner, haas] = pts
    const along = Math.hypot(x! - corner!.x, z! - corner!.z)
    expect(along).toBeGreaterThan(1)
    expect(along).toBeLessThan(13.6)
    // on the forsyth st edge
    const len = Math.hypot(haas!.x - corner!.x, haas!.z - corner!.z)
    const off =
      ((haas!.x - corner!.x) * (z! - corner!.z) - (haas!.z - corner!.z) * (x! - corner!.x)) / len
    expect(Math.abs(off)).toBeLessThan(0.05)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('stands on the forsyth st sidewalk', () => {
    expect(floorOf(rialto)).toBeCloseTo(fromElevation(322.6))
    expect(baseOf(rialto)).toBeCloseTo(floorOf(rialto))
  })

  it('has the blade sign and gsu panels with a blue square, no logo', () => {
    expect(signs.some((s) => s.letters && s.text.replace(/\n/g, '') === 'RIALTO')).toBe(true)
    expect(signs.filter((s) => s.text.includes('GEORGIA'))).toHaveLength(3)
    // the lobby is the luckie st side, 2 floors
    expect(LOBBY[1] - LOBBY[0]).toBeGreaterThan(15)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 8k triangles in 6 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts).length).toBeLessThanOrEqual(6)
    expect(triangles).toBeLessThan(8000)
  })
})
