import { describe, expect, it } from 'vitest'
import { pointInPolygon, type World } from './collision'
import { footprint, furnish } from './furniture'
import { interiors } from './interiors'
import { walk } from './movement'
import { world, worldFor } from './world'

const library = interiors.find((r) => r.name === 'Library North')!

describe('furnish', () => {
  it('keeps everything inside the building', () => {
    for (const room of interiors) {
      for (const item of furnish(room)) {
        for (const s of footprint(item)) {
          expect(pointInPolygon({ x: s.ax, z: s.az }, room.points)).toBe(true)
        }
      }
    }
  })

  it('gives the same room every time', () => {
    expect(furnish(library)).toEqual(furnish(library))
  })

  it('puts bookshelves in the library but not everywhere', () => {
    expect(furnish(library).some((i) => i.kind === 'shelf')).toBe(true)
    const others = interiors.filter((r) => !r.name.includes('Library'))
    expect(others.flatMap(furnish).some((i) => i.kind === 'shelf')).toBe(false)
  })

  it('leaves parking decks empty', () => {
    const deck = interiors.find((r) => r.name === 'G Deck')!
    expect(furnish(deck)).toEqual([])
  })

  it('furnishes most buildings', () => {
    const empty = interiors.filter((r) => furnish(r).length <= 2)
    expect(empty.length).toBeLessThan(interiors.length / 4)
  })

  it('leaves the way in from the door clear', () => {
    for (const room of interiors) {
      // some buildings get narrow, so compare with the same walk in an empty building
      expect(walkIn(room, worldFor(room.index)), room.name).toBeCloseTo(walkIn(room, world), 1)
    }
  })
})

describe('footprint', () => {
  it('is a closed box around the item', () => {
    const box = footprint({ kind: 'table', x: 10, z: 5, rot: Math.PI / 2 })
    expect(box).toHaveLength(4)
    // turned 90 degrees, so the 1.8m long table now runs along z
    const zs = box.map((s) => s.az)
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(1.8)
    expect(box[3]!.bx).toBeCloseTo(box[0]!.ax)
  })
})

// how far you get walking straight in from the door for 5 seconds
function walkIn(room: (typeof interiors)[number], w: World) {
  const { x, z, nx, nz } = room.door
  let p = { x: x + nx * 2, z: z + nz * 2 }
  for (let i = 0; i < 150; i++) p = walk(p, { x: -nx, z: -nz }, 1.6, 1 / 30, 0.3, w)
  return (p.x - x) * -nx + (p.z - z) * -nz
}
