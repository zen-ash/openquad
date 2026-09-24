import { describe, expect, it } from 'vitest'
import { pointInPolygon, type World } from './collision'
import { DOOR_WIDTH, interiors, wallsWithDoorway } from './interiors'
import { walk } from './movement'

// a 10x10 room with the door in the middle of the bottom wall (z = 10), facing +z
const room = [
  { x: 0, z: 0 },
  { x: 10, z: 0 },
  { x: 10, z: 10 },
  { x: 0, z: 10 },
]
const walls = wallsWithDoorway(room, { x: 5, z: 10 })
const world: World = { buildings: [], walls, circles: [], halfSize: 100 }

// walk in a straight line for a few seconds, 30fps
function walkFor(from: { x: number; z: number }, dir: { x: number; z: number }, seconds: number) {
  let p = from
  for (let i = 0; i < seconds * 30; i++) p = walk(p, dir, 2, 1 / 30, 0.4, world)
  return p
}

describe('wallsWithDoorway', () => {
  it('leaves a gap the width of a door', () => {
    expect(walls).toHaveLength(5) // 3 whole walls + the door wall in two pieces
    const doorWall = walls.filter((w) => w.az === 10 && w.bz === 10)
    const gap = Math.abs(doorWall[1]!.ax - doorWall[0]!.bx)
    expect(gap).toBeCloseTo(DOOR_WIDTH)
  })

  it('lets you walk in through the door', () => {
    const p = walkFor({ x: 5, z: 14 }, { x: 0, z: -1 }, 4)
    expect(pointInPolygon(p, room)).toBe(true)
  })

  it('does not let you walk through a wall', () => {
    const p = walkFor({ x: 2, z: 14 }, { x: 0, z: -1 }, 4)
    expect(pointInPolygon(p, room)).toBe(false)
    expect(p.z).toBeCloseTo(10.4) // stopped against the wall
  })

  it('keeps you in once you are inside, apart from the door', () => {
    const p = walkFor({ x: 5, z: 5 }, { x: -1, z: 0 }, 4)
    expect(p.x).toBeCloseTo(0.4)
  })
})

describe('campus interiors', () => {
  it('every gsu building can be walked into', () => {
    expect(interiors).toHaveLength(55)
  })

  it.each(interiors.map((i) => [i.name, i]))('%s: walking in through the door works', (_, room) => {
    const w: World = { buildings: [], walls: room.walls, circles: [], halfSize: 1000 }
    const { x, z, nx, nz } = room.door
    // start 3m outside, walk straight in
    let p = { x: x + nx * 3, z: z + nz * 3 }
    for (let i = 0; i < 90; i++) p = walk(p, { x: -nx, z: -nz }, 2, 1 / 30, 0.4, w)
    expect(pointInPolygon(p, room.points)).toBe(true)
  })
})
