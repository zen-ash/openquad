import { beforeEach, describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { steer, stuck } from './autowalk'
import { glide, GLIDE_SPEED } from './glide'
import { navigateTo, stopNavigating, updateNav, useNav } from './nav'
import { routeLength } from './navgraph'
import { placeNamed } from './places'
import { TOURS } from './tours'
import { world } from './world'

describe('steer', () => {
  const open = { buildings: [], walls: [], circles: [], halfSize: 1000 }
  const path = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 10, z: 10 },
  ]

  it('walks along the route', () => {
    const dir = steer({ x: 2, z: 0 }, path, open)!
    expect(dir.x).toBeCloseTo(1)
    expect(dir.z).toBeCloseTo(0)
  })

  it('starts turning before a corner', () => {
    const dir = steer({ x: 9, z: 0 }, path, open)!
    expect(dir.z).toBeGreaterThan(0.3)
  })

  it('heads back to the route if you are off to the side', () => {
    const dir = steer({ x: 3, z: -4 }, path, open)!
    expect(dir.z).toBeGreaterThan(0.5)
  })

  it('goes round a pole in the way', () => {
    const pole = { ...open, circles: [{ x: 1.5, z: 0.05, radius: 0.15 }] }
    const dir = steer({ x: 0, z: 0 }, path, pole)!
    expect(dir.z).toBeLessThan(-0.2)
  })

  it("doesn't cut a corner through a wall", () => {
    // a building's corner on the inside of the turn
    const corner = { ...open, walls: [{ ax: 9.6, az: 0.4, bx: 9.6, bz: 3 }] }
    const dir = steer({ x: 9, z: 0 }, path, corner)!
    // aims closer, along the route, instead of across the corner
    expect(dir.z).toBeLessThan(0.3)
  })

  it('keeps a body width off a corner the route runs right past', () => {
    // a shop front 10cm off the route, sticking out toward it at x = 3
    const front = { ...open, walls: [{ ax: 3, az: -5, bx: 3, bz: -0.1 }] }
    const dir = steer({ x: 2, z: -0.2 }, path, front)!
    expect(dir.z).toBeGreaterThan(0.1)
  })

  it('stops at the end', () => {
    expect(steer({ x: 10, z: 9.8 }, path, open)).toBeNull()
    expect(steer({ x: 0, z: 0 }, [], open)).toBeNull()
  })
})

describe('stuck', () => {
  it('gives up after a few seconds without getting anywhere', () => {
    const me = { x: 50, z: 50 }
    // the first check measures from wherever it was before
    for (let i = 0; i < 100; i++) stuck(me, 0.1)
    let gave = false
    for (let i = 0; i < 40 && !gave; i++) gave = stuck(me, 0.1)
    expect(gave).toBe(true)
  })

  it('keeps going while you move', () => {
    const me = { x: 0, z: 0 }
    for (let i = 0; i < 100; i++) {
      me.x += 0.7
      expect(stuck(me, 0.1)).toBe(false)
    }
  })
})

describe('walking the real campus', () => {
  // no traffic: it's on the real clock and would make the test different every run
  const still = { ...world, moving: undefined }
  const doors = campus.buildings
    .filter((b) => b.gsu && b.door)
    .map((b) => {
      const [x, z, nx, nz] = b.door as [number, number, number, number]
      return { name: b.name!, point: { x: x + nx * 2.5, z: z + nz * 2.5 } }
    })

  beforeEach(() => stopNavigating())

  it('has every gsu door to try', () => {
    expect(doors.length).toBeGreaterThan(50)
  })

  it.each(doors.map((d) => [d.name, d]))('walks from hurt park to %s by itself', (_, door) => {
    let me = { x: 0, z: 0, heading: 0 }
    navigateTo(door.name, door.point, me, true)
    const meters = useNav.getState().meters
    const dt = 1 / 30
    // twice as long as the route needs, and no more
    const frames = Math.ceil(((meters * 2) / GLIDE_SPEED + 5) / dt)
    for (let f = 0; f < frames; f++) {
      // the nav bar updates the route a couple of times a second
      if (f % 12 === 0) updateNav(me)
      const dir = steer(me, useNav.getState().path, still)
      if (!dir) break
      me = glide(me, dir, GLIDE_SPEED, dt, 0.4, still)
    }
    const left = Math.hypot(door.point.x - me.x, door.point.z - me.z)
    expect(left, `stuck at ${me.x.toFixed(1)}, ${me.z.toFixed(1)}`).toBeLessThan(1)
    expect(routeLength([{ x: 0, z: 0 }, door.point])).toBeLessThan(meters + 1)
  })
})

describe('the first week tour', () => {
  const still = { ...world, moving: undefined }
  beforeEach(() => stopNavigating())

  // start to end without touching the stick: from hurt park, each stop walked to by itself
  it('can be walked stop to stop by itself', () => {
    const stops = TOURS.find((t) => t.id === 'essentials')!.stops
    let me = { x: 0, z: 0, heading: 0 }
    for (const stop of stops) {
      const goal = placeNamed(stop.place)!.spot
      navigateTo(stop.place, goal, me, true)
      const frames = Math.ceil(((useNav.getState().meters * 2) / GLIDE_SPEED + 5) * 30)
      for (let f = 0; f < frames; f++) {
        if (f % 12 === 0) updateNav(me)
        const dir = steer(me, useNav.getState().path, still)
        if (!dir) break
        me = glide(me, dir, GLIDE_SPEED, 1 / 30, 0.4, still)
      }
      const left = Math.hypot(goal.x - me.x, goal.z - me.z)
      expect(left, `${stop.place}: stuck at ${me.x.toFixed(1)}, ${me.z.toFixed(1)}`).toBeLessThan(1)
    }
  })
})
