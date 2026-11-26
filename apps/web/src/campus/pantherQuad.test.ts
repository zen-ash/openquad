import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { heightAt } from '../game/terrain'
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

  it('keeps to about sixteen thousand triangles', () => {
    const tris = Object.values(geos).reduce((s, g) => s + g.getAttribute('position').count / 3, 0)
    expect(tris).toBeLessThan(17000)
  })

  it('stands the column on the raised plaza', () => {
    const [x, z] = campus.quad.column as [number, number]
    expect(heightAt(x, z)).toBeCloseTo(313.8 - 308.65, 1)
  })
})
