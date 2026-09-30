import { fenceDistance } from '@quad/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import campus from '../campus/campus.json'
import { collect, loadStars, pickUp, REACH, STARS, useStars } from './collectibles'
import { pointInPolygon, polygon, resolveCollisions } from './collision'
import { world } from './world'

const outlines = campus.buildings.map((b) => polygon(b.points as [number, number][]))

// node has no localStorage
const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => saved.get(k) ?? null,
  setItem: (k: string, v: string) => saved.set(k, String(v)),
  clear: () => saved.clear(),
})

describe('stars', () => {
  beforeEach(() => {
    localStorage.clear()
    useStars.setState({ got: [] })
  })

  it('has twenty of them', () => {
    expect(STARS).toHaveLength(20)
  })

  it.each(STARS.map((s, i) => [i, s]))('star %i is inside the fence', (_, s) => {
    expect(fenceDistance(s.x, s.z)).toBeGreaterThan(3)
  })

  it.each(STARS.map((s, i) => [i, s]))('star %i is not in a building', (_, s) => {
    for (const b of outlines) expect(pointInPolygon(s, b.points)).toBe(false)
  })

  it.each(STARS.map((s, i) => [i, s]))('star %i has room for the bean to get to it', (_, s) => {
    expect(resolveCollisions(s, 1, world)).toEqual(s)
  })

  it('spreads them out', () => {
    STARS.forEach((a, i) =>
      STARS.slice(i + 1).forEach((b) =>
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(15),
      ),
    )
  })

  it('picks up a star you glide through', () => {
    const s = STARS[3]!
    expect(pickUp(new Set(), { x: s.x + REACH * 0.8, z: s.z })).toEqual([3])
  })

  it('leaves stars that are out of reach or already picked up', () => {
    const s = STARS[3]!
    expect(pickUp(new Set(), { x: s.x + REACH * 1.2, z: s.z })).toEqual([])
    expect(pickUp(new Set([3]), s)).toEqual([])
  })

  it('remembers them between visits', () => {
    collect([2, 5])
    collect([5, 7])
    expect(useStars.getState().got).toEqual([2, 5, 7])
    expect(loadStars()).toEqual([2, 5, 7])
  })

  it('ignores junk in storage', () => {
    localStorage.setItem('stars', '[1, "x", 99, -1, 4]')
    expect(loadStars()).toEqual([1, 4])
    localStorage.setItem('stars', 'not json')
    expect(loadStars()).toEqual([])
  })
})
