import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BOTTOM,
  GLASS,
  oneParkGeometry,
  oppOutline,
  oppSides,
  PITCH,
  ROOF,
  ROWS,
  SETBACK,
  SILL,
  SOFFIT,
  STOREFRONT,
  STRIP_TOP,
  STRIPS,
  TOP,
  WEST_FROM,
  type OneParkData,
} from './onePark'

const opp = campus.buildings.find((b) => b.name === 'One Park Place') as OneParkData
const olympia = campus.buildings.find((b) => b.name === 'Olympia Building')!
const { parts, signs } = oneParkGeometry(opp)
const sides = oppSides(opp)
const pts = opp.points.map(([x, z]) => ({ x: x!, z: z! }))

describe('one park place', () => {
  it('has the outline build-campus wrote', () => {
    const outline = oppOutline(opp)
    expect(opp.points).toHaveLength(outline.length)
    opp.points.forEach(([x, z], i) => {
      expect(x).toBeCloseTo(outline[i]!.x, 1)
      expect(z).toBeCloseTo(outline[i]!.z, 1)
    })
  })

  it('sets the glass back under the marble on edgewood ave and park place', () => {
    const { edgewood, park } = sides
    // the door, on the glass 2m in from edgewood ave's marble
    const [x, z, nx, nz] = opp.door!
    const door = { x: x!, z: z! }
    expect(edgewood.dOf(door)).toBeCloseTo(-SETBACK, 1)
    expect(nx! * edgewood.out.x + nz! * edgewood.out.z).toBeGreaterThan(0.99)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    // nothing of the ground floor sticks out past the marble, and on park place the glass ends
    // where the granite comes out to the face
    for (const p of pts) {
      expect(edgewood.dOf(p)).toBeLessThan(-SETBACK + 0.01)
      expect(park.dOf(p)).toBeLessThan(0.01)
    }
    expect(pts.filter((p) => Math.abs(park.aOf(p) - STOREFRONT) < 0.01)).toHaveLength(2)
  })

  it('has eight rows of windows 3.36m apart, a marble band over them to the parapet', () => {
    expect(STRIP_TOP).toBeCloseTo(SILL + 7 * PITCH + GLASS)
    // 325.78m to the first sill, 350.99m the last head, the parapet at 353.55m (lidar)
    expect(318.4 + SILL).toBeCloseTo(325.78)
    expect(318.4 + STRIP_TOP).toBeCloseTo(350.99, 1)
    expect(318.4 + TOP).toBeCloseTo(353.55)
    expect(ROOF).toBeLessThan(TOP)
    expect(opp.height).toBeCloseTo(41.5)
    expect(ROWS * PITCH).toBeLessThan(TOP - SOFFIT)
  })

  it('fits its window strips on every side', () => {
    for (const [name, st] of Object.entries(STRIPS)) {
      const f = sides[name as keyof typeof STRIPS]
      const last = st.first + (st.count - 1) * st.module + st.width
      expect(st.first).toBeGreaterThan(0.5)
      expect(last).toBeLessThan(f.len - 0.5)
      expect(st.module - st.width).toBeGreaterThan(1.3)
    }
    expect(sides.park.len).toBeCloseTo(56.46, 1)
    expect(sides.edgewood.len).toBeCloseTo(32.23, 1)
  })

  it('stands on the police door sidewalk and reaches under the ground all round', () => {
    expect(floorOf(opp)).toBeCloseTo(fromElevation(318.4))
    // park place at decatur st is 1.5m lower, its granite has to get down there
    expect(lowestUnder(opp.points) - floorOf(opp)).toBeGreaterThan(BOTTOM + 0.3)
    expect(lowestUnder(opp.points) - floorOf(opp)).toBeLessThan(-1)
  })

  it('shares its west wall with the olympia building, which is under its windows', () => {
    const { sw, nw } = { sw: sides.corners[2]!, nw: sides.corners[3]! }
    for (const c of [sw, nw])
      expect(olympia.points.some(([x, z]) => Math.hypot(x! - c.x, z! - c.z) < 0.01)).toBe(true)
    // its roof is just over where the west wall starts, under the first row of windows there
    const roof = floorOf(olympia) + olympia.height - floorOf(opp)
    expect(roof).toBeGreaterThan(WEST_FROM)
    expect(roof).toBeLessThan(SILL + STRIPS.west.from * PITCH)
  })

  it('has its name three times, POLICE over the door and gsu on top', () => {
    expect(signs.filter((s) => s.text === 'ONE PARK PLACE')).toHaveLength(3)
    expect(signs.map((s) => s.text)).toContain('POLICE')
    expect(signs.map((s) => s.text)).toContain('GEORGIA STATE UNIVERSITY')
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 12k triangles in 8 parts', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(Object.keys(parts)).toHaveLength(8)
    expect(triangles).toBeLessThan(12_000)
  })
})
