import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { RAISED } from '../game/raised'
import { heightAt, ORIGIN } from '../game/terrain'
import campus from './campus.json'
import { pantherQuadGeometry } from './pantherQuad'

const geos = pantherQuadGeometry()

describe('panther quad', () => {
  it('winds every triangle the way its normal faces', () => {
    for (const [part, geo] of Object.entries(geos)) {
      const pos = geo.getAttribute('position')
      const nor = geo.getAttribute('normal')
      const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
      let wrong = 0
      for (let i = 0; i < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i)
        b.fromBufferAttribute(pos, i + 1)
        c.fromBufferAttribute(pos, i + 2)
        const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a))
        if (n.lengthSq() < 1e-10) continue
        const m = new THREE.Vector3().fromBufferAttribute(nor, i)
        if (n.dot(m) < 0) wrong++
      }
      expect(wrong, part).toBe(0)
    }
  })

  // (the shrubs are 15 triangle mounds since round 4, they were 8 triangle diamonds)
  it('keeps to about nineteen thousand triangles', () => {
    const tris = Object.values(geos).reduce((s, g) => s + g.getAttribute('position').count / 3, 0)
    expect(tris).toBeLessThan(20000)
  })

  it('stands the column on the raised plaza', () => {
    const [x, z] = campus.quad.column as [number, number]
    expect(heightAt(x, z)).toBeCloseTo(313.8 - 308.65, 1)
  })

  it('steps out of library north onto the level plaza', () => {
    const [x, z, nx, nz] = campus.buildings.find((b) => b.name === 'Library North')!.door!
    // its floor is 314.4 (surface.ts), the bare ground out front was 0.2 lower and sloping
    expect(heightAt(x! + nx! * 1.5, z! + nz! * 1.5) + ORIGIN).toBeCloseTo(314.3, 2)
    const plaza = RAISED.find((r) => r.name === 'Panther Quad library plaza')!
    for (const name of ['Panther Quad library flight 3', 'Panther Quad wide steps']) {
      const s = RAISED.find((r) => r.name === name)!
      // the corners it shares with the plaza, at least one edge of them at the plaza's height
      const level = s.outline.filter(
        (p) =>
          plaza.outline.some((q) => Math.hypot(p.x - q.x, p.z - q.z) < 0.01) &&
          Math.abs(s.elevation(p.x, p.z) - 314.3) < 0.005,
      )
      expect(level.length, name).toBeGreaterThanOrEqual(2)
    }
  })

  it('climbs the wide steps to the chair plaza and the lawn at its height', () => {
    const at = (name: string) => RAISED.find((r) => r.name === name)!
    const steps = at('Panther Quad wide steps')
    const chairs = at('Panther Quad chair plaza')
    const lawn = at('Panther Quad lawn')
    const [top, , bottom] = [0, 1, 2].map((i) => steps.outline[i]!)
    // a meter or so up from the library end, like the high photo's seven risers
    expect(steps.elevation(top!.x, top!.z) - steps.elevation(bottom!.x, bottom!.z)).toBeCloseTo(
      1.2,
      1,
    )
    expect(chairs.elevation(top!.x, top!.z)).toBeCloseTo(steps.elevation(top!.x, top!.z), 2)
    // the lawn meets the chair plaza, and the column plaza's steps at its other end
    for (const p of lawn.outline.filter((p) =>
      chairs.outline.some((q) => Math.hypot(p.x - q.x, p.z - q.z) < 0.01),
    ))
      expect(lawn.elevation(p.x, p.z)).toBeCloseTo(315.5, 2)
    const column = at('Panther Quad steps')
    const foot = column.outline[2]!
    expect(lawn.elevation(foot.x, foot.z)).toBeCloseTo(column.elevation(foot.x, foot.z), 1)
  })
})
