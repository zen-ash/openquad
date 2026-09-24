import { beforeEach, describe, expect, it } from 'vitest'
import { minutes, navigateTo, stopNavigating, updateNav, useNav } from './nav'
import { places } from './places'

const library = places.find((p) => p.label === 'Library North')!

beforeEach(() => stopNavigating())

describe('nav', () => {
  it('plans a route from hurt park to the library', () => {
    navigateTo('Library North', library.spot, { x: 0, z: 0 })
    const { path, meters } = useNav.getState()
    expect(path.length).toBeGreaterThan(2)
    expect(meters).toBeGreaterThan(Math.hypot(library.spot.x, library.spot.z))
  })

  it('gets shorter as you walk along it', () => {
    navigateTo('Library North', library.spot, { x: 0, z: 0 })
    const { path, meters } = useNav.getState()
    updateNav(path[Math.floor(path.length / 2)]!)
    expect(useNav.getState().meters).toBeLessThan(meters)
  })

  it('works out a new route if you wander off', () => {
    navigateTo('Library North', library.spot, { x: 0, z: 0 })
    const before = useNav.getState().path
    updateNav({ x: 150, z: 150 })
    const after = useNav.getState().path
    expect(after).not.toBe(before)
    expect(after[0]).toEqual({ x: 150, z: 150 })
  })

  it('notices when you get there', () => {
    navigateTo('Library North', library.spot, { x: 0, z: 0 })
    updateNav({ x: library.spot.x + 1, z: library.spot.z })
    expect(useNav.getState()).toMatchObject({ goal: null, arrived: 'Library North' })
  })

  it('rounds walking time to whole minutes', () => {
    expect(minutes(30)).toBe(1)
    expect(minutes(780)).toBe(10)
  })
})
