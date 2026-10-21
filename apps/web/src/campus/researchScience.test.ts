import { describe, expect, it } from 'vitest'
import { closestOnSegment, pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { BRIDGE } from './petitScience'
import {
  BLOCK,
  BRIDGE_IN,
  COPING,
  NOTCH,
  OUTLINE,
  STORE,
  TOWER,
  researchScienceGeometry,
  rscFrame,
  rscObstacles,
  type RscData,
} from './researchScience'

const rsc = campus.buildings.find((b) => b.name === 'Research Science Center') as RscData
const { parts, signs } = researchScienceGeometry(rsc)
const { uvOf } = rscFrame(rsc)
const pts = rsc.points.map(([x, z]) => ({ x: x!, z: z! }))
// petit's bridge, it lands on the grey block and the glass box at the back
const bridge = campus.buildings.find(
  (b) => b.landmark?.with === 'Petit Science Center' && b.minHeight,
)!

describe('research science center', () => {
  it('has the outline build-campus wrote, on the lidar walls', () => {
    expect(rsc.points).toHaveLength(OUTLINE.length)
    rsc.points.forEach(([x, z], i) => {
      const [u, v] = uvOf({ x: x!, z: z! })
      expect(u).toBeCloseTo(OUTLINE[i]![0], 1)
      expect(v).toBeCloseTo(OUTLINE[i]![1], 1)
    })
  })

  it('is 32.75m to the charcoal tower, the coping and the grey block lower', () => {
    expect(rsc.height).toBe(TOWER.top)
    expect(COPING).toBeLessThan(BLOCK.top)
    expect(BLOCK.top).toBeLessThan(rsc.height)
  })

  it('has its doors under "157" in the recess, facing decatur st', () => {
    const [x, z, nx, nz] = rsc.door!
    const [u, v] = uvOf({ x: x!, z: z! })
    expect(u).toBeGreaterThan(NOTCH.u[0])
    expect(u).toBeLessThan(NOTCH.u[1])
    expect(v).toBeCloseTo(STORE.v, 1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    expect(signs.map((s) => s.text)).toContain('157')
  })

  it('leaves the walls out where petit draws its bridge', () => {
    expect(bridge.minHeight).toBe(BRIDGE.under)
    expect(bridge.height).toBe(BRIDGE.top)
    // the bridge's end is against the box, its side along the grey block
    const ends = bridge.points.map(([x, z]) => uvOf({ x: x!, z: z! }))
    expect(
      ends.some(([u, v]) => Math.abs(u - BRIDGE_IN.u) < 0.1 && Math.abs(v - BRIDGE_IN.to) < 0.1),
    ).toBe(true)
    expect(
      ends.some(([u, v]) => Math.abs(u - BRIDGE_IN.u) < 0.1 && Math.abs(v - BLOCK.v[1]) < 0.1),
    ).toBe(true)
    // nothing of the research science center on the bridge's walls between its floor and roof
    const walls = bridge.points.map(([x, z], i) => {
      const [x1, z1] = bridge.points[(i + 1) % bridge.points.length]!
      return [
        { x: x!, z: z! },
        { x: x1!, z: z1! },
      ] as const
    })
    for (const geo of Object.values(parts)) {
      const pos = geo.getAttribute('position')
      for (let i = 0; i < pos.count; i += 3) {
        const c = { x: 0, y: 0, z: 0 }
        for (let k = 0; k < 3; k++) {
          c.x += pos.getX(i + k) / 3
          c.y += pos.getY(i + k) / 3
          c.z += pos.getZ(i + k) / 3
        }
        if (c.y < BRIDGE.under + 0.05 || c.y > BRIDGE.top - 0.05) continue
        for (const [p, q] of walls) {
          const o = closestOnSegment(c, p, q)
          expect(Math.hypot(o.x - c.x, o.z - c.z)).toBeGreaterThan(0.1)
        }
      }
    }
  })

  it('keeps its columns and posts off the sidewalks and out of other buildings', () => {
    // the one under petit's bridge stands under it, that's up off the ground
    const { circles } = rscObstacles(rsc)
    for (const c of circles) {
      for (const l of campus.paths)
        for (let i = 1; i < l.points.length; i++) {
          const [a, b] = [l.points[i - 1]!, l.points[i]!]
          const o = closestOnSegment(c, { x: a[0]!, z: a[1]! }, { x: b[0]!, z: b[1]! })
          expect(Math.hypot(o.x - c.x, o.z - c.z)).toBeGreaterThan(l.width / 2)
        }
      for (const b of campus.buildings.filter((b) => !b.minHeight))
        expect(
          pointInPolygon(
            c,
            b.points.map(([x, z]) => ({ x: x!, z: z! })),
          ),
        ).toBe(false)
    }
  })

  it('has the name on the grey block by the doors', () => {
    expect(signs.map((s) => s.text)).toContain('RESEARCH SCIENCE\nCENTER')
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 15k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(15_000)
  })
})
