import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CAR_KINDS } from '../game/cars'
import { carGeometry, carPieces, FACE_SIZE, faceParams, HOLE, LODS, PART, Places } from './cars'

const box = (pos: number[], keep: (i: number) => boolean = () => true) => {
  const b = new THREE.Box3()
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.length; i += 3) if (keep(i / 3)) b.expandByPoint(v.fromArray(pos, i))
  return b
}

describe.each(CAR_KINDS.map((k, i) => [k.name, i] as const))('%s', (_, kind) => {
  const size = CAR_KINDS[kind]!

  it('is as long, wide and tall as the real one', () => {
    for (const lod of LODS) {
      const { body, wheels } = carPieces(kind, lod)
      const b = box(body.pos).union(box(wheels.pos))
      expect(b.max.z - b.min.z).toBeCloseTo(size.length, 1)
      expect(Math.abs(b.max.z - b.min.z - size.length)).toBeLessThan(0.03)
      expect(Math.abs(b.max.x - b.min.x - size.width)).toBeLessThan(0.03)
      expect(Math.abs(b.max.y - size.height)).toBeLessThan(0.03)
      expect(b.min.y).toBeCloseTo(0, 2)
    }
  })

  it('stands on its wheels in the middle of its footprint', () => {
    const b = box(carPieces(kind, 'near').body.pos)
    expect(Math.abs(b.max.z + b.min.z)).toBeLessThan(0.05)
    expect(Math.abs(b.max.x + b.min.x)).toBeLessThan(1e-6)
    // the body clears the ground
    expect(b.min.y).toBeGreaterThan(0.1)
  })

  // three only draws the side a triangle's corners go counterclockwise from, so the
  // winding has to agree with the normals or a bit of the car goes missing
  it('has every triangle wound the same way as its normals', () => {
    for (const lod of LODS) {
      const g = carGeometry(kind, lod)
      const pos = g.getAttribute('position')
      const nrm = g.getAttribute('normal')
      const idx = g.getIndex()!
      const [a, b, c, n] = [0, 0, 0, 0].map(() => new THREE.Vector3())
      let wrong = 0
      for (let i = 0; i < idx.count; i += 3) {
        const [i0, i1, i2] = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)]
        a!.fromBufferAttribute(pos, i0)
        b!.fromBufferAttribute(pos, i1).sub(a!)
        c!.fromBufferAttribute(pos, i2).sub(a!)
        const face = b!.cross(c!)
        // slivers where a section closes up don't matter
        if (face.length() < 1e-7) continue
        // and slivers lying in the middle, edge on from everywhere
        if ([i0, i1, i2].every((j) => Math.abs(pos.getX(j)) < 1e-6)) continue
        n!.fromBufferAttribute(nrm, i0)
        n!.add(new THREE.Vector3().fromBufferAttribute(nrm, i1))
        n!.add(new THREE.Vector3().fromBufferAttribute(nrm, i2))
        if (face.dot(n!) <= 0) wrong++
      }
      expect(wrong, lod).toBe(0)
    }
  })

  it('has no broken numbers', () => {
    for (const lod of LODS) {
      const g = carGeometry(kind, lod)
      for (const name of ['position', 'normal', 'aPart']) {
        const arr = g.getAttribute(name).array
        expect(arr.every(Number.isFinite), `${lod} ${name}`).toBe(true)
      }
      const n = g.getAttribute('normal')
      for (let i = 0; i < n.count; i++)
        expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 3)
    }
  })

  it('lines up its simpler versions with the full one', () => {
    const near = carPieces(kind, 'near')
    const full = box(near.body.pos).union(box(near.wheels.pos))
    for (const lod of ['mid', 'far'] as const) {
      const p = carPieces(kind, lod)
      const b = box(p.body.pos).union(box(p.wheels.pos))
      expect(b.min.distanceTo(full.min), lod).toBeLessThan(0.03)
      expect(b.max.distanceTo(full.max), lod).toBeLessThan(0.03)
    }
  })

  it('keeps the far version to a few hundred triangles', () => {
    const tris = (lod: 'near' | 'mid' | 'far') => carGeometry(kind, lod).getIndex()!.count / 3
    expect(tris('far')).toBeLessThan(450)
    expect(tris('mid')).toBeLessThan(tris('near') / 2.5)
  })

  it('has its windows above the belt line', () => {
    const { body } = carPieces(kind, 'near')
    const glass = box(body.pos, (i) => body.part[i * 4] === PART.glass)
    expect(glass.min.y).toBeGreaterThan(size.height * 0.5)
    expect(glass.max.y).toBeLessThan(size.height)
  })

  // the lights, grille and plate are drawn by the shader from these (carMaterial.ts)
  it('puts its lights, grille and plate on the body', () => {
    const f = faceParams().slice(kind * FACE_SIZE, (kind + 1) * FACE_SIZE)
    expect(f.every((v) => [v.x, v.y, v.z, v.w].every(Number.isFinite))).toBe(true)
    const [head0, head1, tail0, tail1, grille] = f
    const top = (v: { x: number; y: number }) => Math.max(v.x, v.y)
    for (const [a, b] of [
      [head0!, head1!],
      [tail0!, tail1!],
    ] as const) {
      // from the face round onto the side, under the belt line
      expect(a.x).toBeLessThan(a.y)
      expect(a.y).toBeLessThan(size.width / 2 + 1)
      expect(Math.min(a.z, a.w)).toBeGreaterThan(0.3)
      expect(top(b)).toBeLessThan(size.height * 0.8)
      expect(Math.min(b.x - a.z, b.y - a.w)).toBeGreaterThan(0.03)
    }
    // the grille fits between the head lights
    expect(grille!.x).toBeLessThan(size.width / 2)
    expect(grille!.z).toBeLessThan(grille!.w)
  })
})

describe('Places', () => {
  const drawn = (p: Places) => p.keys.slice(0, p.count).filter((k) => k !== HOLE)

  it('keeps a car in its place while it stays', () => {
    const p = new Places()
    p.step(new Set([1, 2, 3]))
    const before = new Map(p.at)
    const writes = p.step(new Set([1, 3]))
    expect(p.at.get(1)).toBe(before.get(1))
    expect(p.at.get(3)).toBe(before.get(3))
    // only the one that left is written (its place emptied)
    expect(writes).toEqual([[before.get(2)!, HOLE]])
  })

  it('fills holes before it grows', () => {
    const p = new Places()
    p.step(new Set([1, 2, 3]))
    p.step(new Set([1, 3]))
    p.step(new Set([1, 3, 9]))
    expect(p.count).toBe(3)
    expect(drawn(p).sort()).toEqual([1, 3, 9])
  })

  it('draws every car it should once, whatever comes and goes', () => {
    const p = new Places()
    let s = 7
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
    let want = new Set<number>()
    for (let frame = 0; frame < 300; frame++) {
      const next = new Set([...want].filter(() => rand() > 0.08))
      while (next.size < 20 + Math.floor(rand() * 20)) next.add(Math.floor(rand() * 100))
      const before = new Map(p.at)
      p.step(next)
      for (const [k, at] of before) if (next.has(k)) expect(p.at.get(k)).toBe(at)
      expect(new Set(drawn(p))).toEqual(next)
      expect(p.count).toBeLessThan(45)
      want = next
    }
  })
})
