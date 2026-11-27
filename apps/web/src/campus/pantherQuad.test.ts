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
})
