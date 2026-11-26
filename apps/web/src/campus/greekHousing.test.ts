import { describe, expect, it } from 'vitest'
import { floorOf } from '../game/surface'
import { fromElevation } from '../game/terrain'
import campus from './campus.json'
import { greekHousingGeometry, type GreekHousingData } from './greekHousing'

const blocks = [39, 40, 61].map((i) => campus.buildings[i] as GreekHousingData & { name?: string })

describe('greek housing', () => {
  it('keeps all three blocks in their places, named the same', () => {
    for (const b of blocks) expect(b.name).toBe('Greek Housing')
  })

  it('draws each block from its own outline', () => {
    const boxes = blocks.map((b) => {
      const pos = greekHousingGeometry(b).parts.brick!.getAttribute('position')
      let minX = Infinity
      for (let i = 0; i < pos.count; i++) minX = Math.min(minX, pos.getX(i))
      return minX
    })
    expect(new Set(boxes.map((x) => Math.round(x))).size).toBe(3)
  })

  it('has its roofs where the lidar has them over each floor', () => {
    // 39 311.3m, 40 307.1, 61 311.4 (the stucco bays' cornices, the brick ones 0.5m higher)
    const roofs = [311.3, 307.1, 311.4]
    blocks.forEach((b, i) => {
      const floor = floorOf(campus.buildings[[39, 40, 61][i]!]!)
      expect(floor + b.height - 0.5 - fromElevation(roofs[i]!)).toBeLessThan(0.6)
      expect(floor + b.height - 0.5 - fromElevation(roofs[i]!)).toBeGreaterThan(-0.6)
    })
  })

  it('has two storeys at the back and three elsewhere', () => {
    expect(blocks.map((b) => b.landmark?.floors)).toEqual([3, 2, 3])
  })

  it('puts the chapters from the lawn photo on the edgewood block, on plates with no logo', () => {
    const signs = blocks.flatMap((b) => greekHousingGeometry(b).signs)
    const zta = signs.find((s) => s.text === 'ΖΤΑ')!
    // the east wing's lawn side
    expect(zta.x).toBeCloseTo(227.2, 0)
    expect(zta.z).toBeGreaterThan(-65)
    expect(zta.z).toBeLessThan(-61.4)
    expect(greekHousingGeometry(blocks[0]!).signs.some((s) => s.text === 'ΖΤΑ')).toBe(false)
    // letters only, the plate is its own sign
    for (const s of signs) expect(s.text === '' || s.letters).toBe(true)
  })

  it('moves the edgewood block door to the community room on edgewood ave', () => {
    expect(blocks[2]!.door).toEqual([236, -39.63, 0, 1])
  })
})
