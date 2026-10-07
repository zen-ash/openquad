import { describe, expect, it } from 'vitest'
import { closestOnSegment, pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BRICK,
  COPING,
  EAST,
  OUTLINE,
  PYLONS,
  RECESS,
  naturalScienceGeometry,
  nscFrame,
  nscObstacles,
  type NscData,
} from './naturalScience'

const nsc = campus.buildings.find((b) => b.name === 'Natural Science Center') as NscData
const { parts, signs } = naturalScienceGeometry(nsc)
const { uvOf } = nscFrame(nsc)
const pts = nsc.points.map(([x, z]) => ({ x: x!, z: z! }))

describe('natural science center', () => {
  it('has the outline build-campus wrote, on the lidar walls', () => {
    expect(nsc.points).toHaveLength(OUTLINE.length)
    nsc.points.forEach(([x, z], i) => {
      const [u, v] = uvOf({ x: x!, z: z! })
      expect(u).toBeCloseTo(OUTLINE[i]![0], 1)
      expect(v).toBeCloseTo(OUTLINE[i]![1], 1)
    })
  })

  it('is 26.5m to the top floor, the coping on decatur st lower', () => {
    expect(nsc.height).toBe(26.5)
    expect(COPING).toBeLessThan(nsc.height)
  })

  it('has its doors at the back of the recess under the east pylon, facing decatur st', () => {
    const [x, z, nx, nz] = nsc.door!
    const [u, v] = uvOf({ x: x!, z: z! })
    expect(u).toBeGreaterThan(PYLONS[2]!.glass[0])
    expect(u).toBeLessThan(PYLONS[2]!.glass[1])
    expect(v).toBeCloseTo(RECESS.v, 1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('cuts the shops and the annex back to its east wall, the shops one storey', () => {
    const shops = campus.buildings[150]!
    const annex = campus.buildings.find((b) => b.name === 'Science Annex')!
    expect(shops.height).toBe(4)
    for (const b of [shops, annex])
      for (const [x, z] of b.points) expect(uvOf({ x: x!, z: z! })[0]).toBeGreaterThan(EAST - 0.02)
  })

  it('keeps the alley gate off the sidewalk and the planters against the front', () => {
    const { planters, gate } = nscObstacles(nsc)
    for (const l of [...campus.paths, ...campus.roads, ...campus.crossings])
      for (let i = 1; i < l.points.length; i++) {
        const [a, b] = [l.points[i - 1]!, l.points[i]!]
        const p = { x: a[0]!, z: a[1]! }
        const q = { x: b[0]!, z: b[1]! }
        for (const e of [
          { x: gate.ax, z: gate.az },
          { x: gate.bx, z: gate.bz },
        ]) {
          const o = closestOnSegment(e, p, q)
          expect(Math.hypot(o.x - e.x, o.z - e.z)).toBeGreaterThan(l.width / 2)
        }
      }
    for (const w of planters) {
      const [, v] = uvOf({ x: (w.ax + w.bx) / 2, z: (w.az + w.bz) / 2 })
      expect(v).toBeLessThan(BRICK)
      expect(v).toBeGreaterThan(BRICK - 1.1)
    }
  })

  it('has the name on the end bay by the doors', () => {
    expect(signs.map((s) => s.text)).toContain('NATURAL SCIENCE\nCENTER')
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
