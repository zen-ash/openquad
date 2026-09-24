import { describe, expect, it } from 'vitest'
import { BRICK, CONCRETE, GLASS } from './facade'
import { facadeOf } from './facades'
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

  it('makes tall buildings glass towers', () => {
    expect(facadeOf({ height: 80 }, 3).style).toBe(GLASS)
    expect([BRICK, CONCRETE]).toContain(facadeOf({ height: 8 }, 3).style)
  })

  it('gives gsu buildings the look they have in photos', () => {
    const aderhold = facadeOf({ name: 'Helen M. Aderhold Learning Center', height: 21.9 }, 0)
    expect(aderhold.style).toBe(BRICK)
    expect(aderhold.color).toBe('#dcc8a3')
    // strips of windows all along each floor
    expect(facadeOf({ name: 'Science Annex', height: 18 }, 0).window[2]).toBe(1)
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

  it('has every triangle facing up, whichever way the road was drawn', () => {
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
        {
          width: 2,
          points: [
            [10, 5],
            [10, 0],
            [0, 0],
          ],
        },
      ],
      0,
    )
    const p = geo.getAttribute('position')
    for (let i = 0; i < p.count; i += 3) {
      const [ax, az, bx, bz, cx, cz] = [
        p.getX(i),
        p.getZ(i),
        p.getX(i + 1),
        p.getZ(i + 1),
        p.getX(i + 2),
        p.getZ(i + 2),
      ]
      // y part of the triangle's normal, three draws counter-clockwise as the front
      const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az)
      expect(ny).toBeGreaterThanOrEqual(0)
    }
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
