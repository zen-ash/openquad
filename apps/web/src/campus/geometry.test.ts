import { describe, expect, it } from 'vitest'
import { BRICK, CONCRETE, GLASS } from './facade'
import { areasGeometry, buildingsGeometry, linesGeometry, styleOf } from './geometry'

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

  it('makes tall buildings glass towers', () => {
    expect(styleOf(80, 0.9)).toBe(GLASS)
    expect(styleOf(8, 0.1)).toBe(BRICK)
    expect(styleOf(8, 0.9)).toBe(CONCRETE)
  })

  it('stores the facade info the shader needs on every vertex', () => {
    const geo = buildingsGeometry([{ points: square, height: 80 }])
    const count = geo.getAttribute('position').count
    expect(geo.getAttribute('aStyle').count).toBe(count)
    expect(geo.getAttribute('aHeight').getX(0)).toBe(80)
    expect(geo.getAttribute('aStyle').getX(0)).toBe(GLASS)
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

  it('knows how far along the road each vertex is, for lane lines', () => {
    const geo = linesGeometry(
      [
        {
          width: 2,
          points: [
            [0, 0],
            [10, 0],
            [10, 5],
          ],
        },
      ],
      0,
    )
    const road = geo.getAttribute('aRoad')
    let max = 0
    for (let i = 0; i < road.count; i++) max = Math.max(max, road.getX(i))
    expect(max).toBeCloseTo(15)
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
