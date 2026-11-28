import { MAP, onMap } from '@quad/shared'
import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { walk, WALK_SPEED, RUN_SPEED } from './movement'
import { campusGraph } from './nav'
import { route } from './navgraph'
import { world } from './world'

const RADIUS = 0.4
const FRAME = 1 / 60

// a minute of holding one direction, every frame
function hold(from: { x: number; z: number }, dir: { x: number; z: number }, speed = RUN_SPEED) {
  const frames = [from]
  for (let i = 0; i < 60 * 60; i++) {
    frames.push(walk(frames.at(-1)!, dir, speed, FRAME, RADIUS, world))
  }
  return frames
}

// out past the east end of the map there's no city drawn, open ground up to it here
const EAST = { x: 480, z: -200 }

describe('edge of the map', () => {
  it('stops you like a wall when you walk straight into it', () => {
    const frames = hold(EAST, { x: 1, z: 0 })
    for (const p of frames) expect(p.x).toBeLessThanOrEqual(MAP.east - RADIUS + 0.01)
    // right up against it at the end, not pushed back
    expect(frames.at(-1)!.x).toBeGreaterThan(MAP.east - RADIUS - 0.05)
    // and never going backwards on the way (no bounce, no snapping back)
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]!.x).toBeGreaterThanOrEqual(frames[i - 1]!.x - 1e-9)
    }
  })

  it('lets you cross edgewood ave now', () => {
    // north out of hurt park, where the old fence stopped you at the far curb
    const end = hold({ x: 0, z: 0 }, { x: 0, z: -1 }, WALK_SPEED).at(-1)!
    expect(end.z).toBeLessThan(-45)
  })

  it('slides you along it when you walk into it at an angle', () => {
    const end = hold(EAST, { x: 0.8, z: 0.6 }, WALK_SPEED).at(-1)!
    expect(end.x).toBeLessThanOrEqual(MAP.east - RADIUS + 0.01)
    // kept going south along the edge instead of getting stuck
    expect(end.z).toBeGreaterThan(EAST.z + 20)
  })

  it('stops you on long frames too (slow laptops)', () => {
    let p = { x: 530, z: -200 }
    for (let i = 0; i < 20; i++) p = walk(p, { x: 1, z: 0 }, RUN_SPEED, 0.5, RADIUS, world)
    expect(p.x).toBeLessThanOrEqual(MAP.east - RADIUS + 0.01)
  })
})

describe('directions anywhere on the map', () => {
  const doors = campus.buildings
    .filter((b) => b.gsu && b.door)
    .map((b) => {
      const [x, z, nx, nz] = b.door as [number, number, number, number]
      return { name: b.name, point: { x: x + nx * 1.5, z: z + nz * 1.5 } }
    })

  // from spawn and from the far corners of campus, to every door
  const starts = [
    { x: 0, z: 0 },
    { x: -330, z: -10 },
    { x: 20, z: 430 },
    // woodruff park and the housing up piedmont ave, outside where the fence was
    { x: -90, z: -150 },
    { x: 430, z: -420 },
  ]
  it.each(doors.map((d) => [d.name, d]))('finds the way to %s and stays on the map', (_, door) => {
    for (const start of starts) {
      const path = route(campusGraph(), start, door.point)
      expect(path).not.toBeNull()
      for (const p of path!) expect(onMap(p.x, p.z)).toBe(true)
    }
  })
})
