import { fenceDistance, insideFence, lineInsideFence } from '@quad/shared'
import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { walk, WALK_SPEED, RUN_SPEED } from './movement'
import { campusGraph } from './nav'
import { route } from './navgraph'
import { places } from './places'
import { world } from './world'

const RADIUS = 0.4
const FRAME = 1 / 60
const byName = (name: string) => campus.buildings.find((b) => b.name === name)!

// a minute of holding one direction, every frame
function hold(from: { x: number; z: number }, dir: { x: number; z: number }, speed = RUN_SPEED) {
  const frames = [from]
  for (let i = 0; i < 60 * 60; i++) {
    frames.push(walk(frames.at(-1)!, dir, speed, FRAME, RADIUS, world))
  }
  return frames
}

describe('fence', () => {
  it('stops you like a wall when you walk straight into it', () => {
    // north out of hurt park, across edgewood ave
    const frames = hold({ x: 0, z: 0 }, { x: 0, z: -1 })
    for (const p of frames) expect(fenceDistance(p.x, p.z)).toBeGreaterThanOrEqual(RADIUS - 0.01)
    // right up against it at the end, not pushed back
    expect(fenceDistance(frames.at(-1)!.x, frames.at(-1)!.z)).toBeLessThan(RADIUS + 0.05)
    // and never going backwards on the way (no bounce, no snapping back)
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]!.z).toBeLessThanOrEqual(frames[i - 1]!.z + 1e-9)
    }
  })

  it('lets you cross the whole street, up to the far curb', () => {
    // edgewood ave: the middle is about z = -32 here, the far curb -39.6
    const end = hold({ x: 0, z: 0 }, { x: 0, z: -1 }).at(-1)!
    expect(end.z).toBeLessThan(-38.5)
  })

  it('slides you along it when you walk into it at an angle', () => {
    const frames = hold({ x: 0, z: -25 }, { x: 0.6, z: -0.8 }, WALK_SPEED)
    const end = frames.at(-1)!
    expect(insideFence(end.x, end.z)).toBe(true)
    // kept going east along edgewood ave instead of getting stuck
    expect(end.x).toBeGreaterThan(40)
  })

  it('stops you on long frames too (slow laptops)', () => {
    let p = { x: 0, z: -20 }
    for (let i = 0; i < 20; i++) p = walk(p, { x: 0, z: -1 }, RUN_SPEED, 0.5, RADIUS, world)
    expect(fenceDistance(p.x, p.z)).toBeGreaterThanOrEqual(RADIUS - 0.01)
  })

  it('has every building either all the way in or all the way out', () => {
    for (const b of campus.buildings) {
      const inside = b.points.filter(([x, z]) => insideFence(x!, z!)).length
      expect([0, b.points.length], b.name ?? 'unnamed building').toContain(inside)
    }
  })

  it.each([
    'Library North',
    'Library South',
    'Langdale Hall',
    'Classroom South',
    'Student Center East',
    'Student Center West',
    'GSU Sports Arena',
    'Dahlberg Hall',
    'Arts & Humanities',
    'Research Tower',
  ])('has %s inside', (name) => {
    for (const [x, z] of byName(name).points) expect(insideFence(x!, z!)).toBe(true)
  })

  it.each(['University Commons', 'Piedmont North A', 'Piedmont North B'])(
    'leaves out %s (housing across piedmont ave)',
    (name) => {
      for (const [x, z] of byName(name).points) expect(insideFence(x!, z!)).toBe(false)
    },
  )

  it.each(places.map((p) => [p.label, p]))('keeps %s in the places menu inside', (_, place) => {
    expect(fenceDistance(place.spot.x, place.spot.z)).toBeGreaterThan(2)
  })
})

describe('directions inside the fence', () => {
  const doors = campus.buildings
    .filter((b) => b.door && insideFence(b.door[0]!, b.door[1]!))
    .map((b) => {
      const [x, z, nx, nz] = b.door as [number, number, number, number]
      return { name: b.name, point: { x: x + nx * 1.5, z: z + nz * 1.5 } }
    })

  it('covers every gsu building inside', () => {
    expect(doors.length).toBe(
      campus.buildings.filter(
        (b) => b.gsu && !b.part && insideFence(b.points[0]![0]!, b.points[0]![1]!),
      ).length,
    )
  })

  // from spawn and from the far corners of campus, to every door
  const starts = [
    { x: 0, z: 0 },
    { x: -330, z: -10 },
    { x: 150, z: 250 },
    { x: 20, z: 430 },
  ]
  it.each(doors.map((d) => [d.name, d]))(
    'never leads past the fence on the way to %s',
    (_, door) => {
      for (const start of starts) {
        const path = route(campusGraph(), start, door.point)
        expect(path).not.toBeNull()
        for (let i = 1; i < path!.length; i++) {
          const [a, b] = [path![i - 1]!, path![i]!]
          expect(lineInsideFence(a.x, a.z, b.x, b.z, RADIUS)).toBe(true)
        }
      }
    },
  )
})
