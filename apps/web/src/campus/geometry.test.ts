import { describe, expect, it } from 'vitest'
import { areasGeometry, buildingsGeometry, linesGeometry } from './geometry'

const square = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
]

describe('buildingsGeometry', () => {
  it('extrudes up to the building height in the right spot', () => {
    const geo = buildingsGeometry([{ points: square, height: 10 }])
    geo.computeBoundingBox()
    const { min, max } = geo.boundingBox!
    const box = [min.x, min.y, min.z, max.x, max.y, max.z]
    ;[0, 0, 0, 4, 10, 4].forEach((v, i) => expect(box[i]).toBeCloseTo(v))
  })

  it('gives gsu buildings a blue roof', () => {
    const geo = buildingsGeometry([{ points: square, height: 10, gsu: true }])
    const pos = geo.getAttribute('position')
    const color = geo.getAttribute('color')
    // find a vertex on the roof
    let i = 0
    while (pos.getY(i) !== 10 || Math.abs(geo.getAttribute('normal').getY(i)) < 0.9) i++
    expect(color.getZ(i)).toBeGreaterThan(color.getX(i)) // more blue than red
  })
})

describe('linesGeometry', () => {
  it('makes a strip as wide as the road', () => {
    const geo = linesGeometry(
      [
        {
          width: 2,
          points: [
            [0, 0],
            [10, 0],
          ],
        },
      ],
      0.1,
    )
    geo.computeBoundingBox()
    const { min, max } = geo.boundingBox!
    expect(min.z).toBeCloseTo(-1)
    expect(max.z).toBeCloseTo(1)
    expect(min.y).toBeCloseTo(0.1)
  })
})

describe('areasGeometry', () => {
  it('lays parks flat on the ground', () => {
    const geo = areasGeometry([square], 0.05)
    geo.computeBoundingBox()
    const { min, max } = geo.boundingBox!
    expect(min.y).toBeCloseTo(0.05)
    expect(max.y).toBeCloseTo(0.05)
    expect(max.z).toBeCloseTo(4)
  })
})
