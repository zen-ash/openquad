import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  COPING,
  FLUE,
  FRONT,
  OUTLINE,
  PARTY,
  PILASTER,
  PILASTERS,
  practiceFacilityGeometry,
  practiceFrame,
  practiceObstacles,
  RIB,
  ribRun,
  ROOF,
  SW_TOP,
  UNIT,
  WING,
  type PracticeFacilityData,
} from './practiceFacility'

const gym = campus.buildings.find((b) => b.name === 'Practice Facility') as PracticeFacilityData
const { parts, inside, signs } = practiceFacilityGeometry(gym)
const { uv } = practiceFrame(gym)
const pts = gym.points.map(([x, z]) => ({ x: x!, z: z! }))

describe('practice facility', () => {
  it('has the outline build-campus wrote, on the lidar walls', () => {
    expect(gym.points).toHaveLength(OUTLINE.length)
    gym.points.forEach(([x, z], i) => {
      const [u, v] = uv({ x: x!, z: z! })
      expect(u).toBeCloseTo(OUTLINE[i]![0], 1)
      expect(v).toBeCloseTo(OUTLINE[i]![1], 1)
    })
  })

  it('is 10.6m to the coping, with a lower wing and a taller wall on the volleyball side', () => {
    expect(gym.height).toBe(COPING)
    expect(COPING).toBe(10.6)
    expect(ROOF).toBeLessThan(COPING)
    expect(SW_TOP).toBeGreaterThan(COPING)
    expect(WING.top).toBeLessThan(ROOF)
    expect(WING.roof).toBeLessThan(WING.top)
    expect(UNIT.top).toBeGreaterThan(SW_TOP)
    expect(FLUE.top).toBeGreaterThan(WING.top)
  })

  it('has whole ribs about 0.62m apart between the pilasters', () => {
    for (let i = 1; i < PILASTERS.length; i++) {
      const { n, gap } = ribRun(PILASTERS[i]! - PILASTERS[i - 1]! - PILASTER)
      expect(n).toBe(13)
      expect(RIB.width + gap).toBeGreaterThan(0.58)
      expect(RIB.width + gap).toBeLessThan(0.66)
    }
  })

  it('keeps everything on piedmont ave close to the wall', () => {
    // the sidewalk runs right along it. the wall lights stick out furthest
    for (const [part, geo] of Object.entries(parts)) {
      const pos = geo.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const v = uv({ x: pos.getX(i), z: pos.getZ(i) })[1]
        expect(v, part).toBeGreaterThan(-0.66)
      }
    }
    expect(FRONT).toBeCloseTo(-0.45)
  })

  it('leaves the party wall to the arena', () => {
    // nothing faces the arena on the party wall's line
    const pos = parts.concrete.getAttribute('position')
    const normal = parts.concrete.getAttribute('normal')
    for (let i = 0; i < pos.count; i++) {
      const [u, v] = uv({ x: pos.getX(i), z: pos.getZ(i) })
      if (u > 4.1 && u < 45.9 && Math.abs(v - PARTY) < 0.01)
        expect(Math.abs(normal.getY(i))).toBeGreaterThan(0.9)
    }
    // the inside walls there are moved in a bit, the arena's are on the line facing the other way
    const middle = (g: (typeof inside.solid)[number]) => {
      const pos = g.getAttribute('position')
      return uv({ x: (pos.getX(0) + pos.getX(1)) / 2, z: (pos.getZ(0) + pos.getZ(1)) / 2 })
    }
    const party = inside.solid.filter((g) => {
      const [u, v] = middle(g)
      return u > 4.1 && u < 45.9 && v > 25
    })
    expect(party.length).toBeGreaterThan(0)
    for (const g of party) expect(middle(g)[1]).toBeCloseTo(PARTY - 0.05)
  })

  it('has its door on the short wall in the court off decatur st', () => {
    const [x, z, nx, nz] = gym.door!
    const [u, v] = uv({ x: x!, z: z! })
    expect(v).toBeCloseTo(27.8, 1)
    expect(u).toBeGreaterThan(46 + 1.2)
    expect(u).toBeLessThan(51.1 - 1.2)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    // the spot in front of it is out in the court, not in the arena next door
    const out = { x: x! + nx! * 1.5, z: z! + nz! * 1.5 }
    const all = campus.buildings.map((b) => b.points.map(([px, pz]) => ({ x: px!, z: pz! })))
    expect(all.some((points) => pointInPolygon(out, points))).toBe(false)
  })

  it('puts the planter on decatur st outside the wall', () => {
    const { planter } = practiceObstacles(gym)
    for (const p of planter) expect(uv(p)[0]).toBeGreaterThanOrEqual(51.1 - 0.01)
    const middle = {
      x: planter.reduce((sum, p) => sum + p.x, 0) / 4,
      z: planter.reduce((sum, p) => sum + p.z, 0) / 4,
    }
    expect(pointInPolygon(middle, pts)).toBe(false)
  })

  it('has the painted sign on the volleyball side, letters only', () => {
    expect(signs.map((s) => s.text)).toEqual(['GEORGIA', 'STATE', 'BEACH VOLLEYBALL'])
    for (const s of signs) {
      expect(s.letters).toBe(true)
      expect(uv(s)[0]).toBeLessThan(WING.u)
    }
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 5k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(5_000)
  })
})
