import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { AVATARS, BEANS } from '../game/avatars'
import { BEAN_HEIGHT, beanGeometry, beanRadius } from './bean'

describe('beanGeometry', () => {
  const geo = beanGeometry()
  const index = geo.index!
  const pos = geo.attributes.position!
  const part = geo.attributes.aPart!

  it('stays cheap', () => {
    expect(index.count / 3).toBeLessThan(2500)
  })

  it('stands on the ground and is as tall as it says', () => {
    geo.computeBoundingBox()
    expect(geo.boundingBox!.min.y).toBeCloseTo(0)
    // plus the sprout
    expect(geo.boundingBox!.max.y).toBeGreaterThan(BEAN_HEIGHT)
    expect(geo.boundingBox!.max.y).toBeLessThan(BEAN_HEIGHT + 0.25)
  })

  it('has the body facing out, so it is not drawn inside out', () => {
    const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
    const normal = new THREE.Vector3()
    let body = 0
    for (let i = 0; i < index.count; i += 3) {
      const [ia, ib, ic] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
      if (part.getX(ia) !== 0) continue
      a.fromBufferAttribute(pos, ia)
      b.fromBufferAttribute(pos, ib)
      c.fromBufferAttribute(pos, ic)
      normal.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b))
      if (normal.lengthSq() < 1e-12) continue
      const center = a.clone().add(b).add(c).divideScalar(3)
      const out = center.clone().setY(center.y - BEAN_HEIGHT / 2)
      expect(normal.dot(out)).toBeGreaterThan(0)
      body++
    }
    expect(body).toBeGreaterThan(100)
  })

  it('is round at both ends and widest near the bottom', () => {
    expect(beanRadius(0)).toBe(0)
    expect(beanRadius(BEAN_HEIGHT)).toBe(0)
    expect(beanRadius(BEAN_HEIGHT * 0.4)).toBeGreaterThan(beanRadius(BEAN_HEIGHT * 0.6))
  })
})

describe('BEANS', () => {
  it('gives every avatar its own color', () => {
    const colors = AVATARS.map((a) => BEANS[a.id]?.body)
    expect(colors.every(Boolean)).toBe(true)
    expect(new Set(colors).size).toBe(AVATARS.length)
  })
})
