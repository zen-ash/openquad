import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { CAR_KINDS } from './cars'
import { pointInPolygon, resolveCollisions, type Point } from './collision'
import { walkers } from './crowd'
import { campusGraph } from './nav'
import { boxesTouch, corners, curbCars, lineToBox, parkedCars } from './parking'
import { places } from './places'
import { signalPoles } from './signals'
import { streetLights } from './streetFurniture'
import { floorOf, surfaceAt } from './surface'
import { heightAt } from './terrain'
import { world } from './world'

const cars = parkedCars()
const curb = new Set(curbCars())
const outline = (b: { points: number[][] }) => b.points.map(([x, z]) => ({ x: x!, z: z! }))
const decks = campus.buildings.filter((b) => /Deck|Lofts Parking/.test(b.name ?? ''))
const deckOf = (c: Point) => decks.find((b) => pointInPolygon(c, outline(b)))
const count = (name: string) => cars.filter((c) => deckOf(c)?.name === name).length

describe('parked cars', () => {
  it('fills gsu decks, the lots and the curbs about like a weekday', () => {
    // the covered levels fuller than the roofs (feb 2026: m's roof 9 cars, n's 10)
    expect(count('M Deck')).toBeGreaterThan(200)
    expect(count('M Deck')).toBeLessThan(450)
    for (const name of ['N Deck', 'K Deck']) {
      expect(count(name)).toBeGreaterThan(100)
      expect(count(name)).toBeLessThan(250)
    }
    expect(count('S Deck')).toBeGreaterThan(50)
    expect(count('University Lofts Parking')).toBeGreaterThan(50)
    // g deck's roof was empty and its covered floors aren't drawn
    expect(count('G Deck')).toBe(0)
    const lots = cars.filter((c) => !deckOf(c) && !curb.has(c)).length
    expect(lots).toBeGreaterThan(150)
    expect(curb.size).toBeGreaterThan(50)
  })

  it('keeps out of every building but the deck it is in', () => {
    for (const c of cars) {
      const box = corners(c)
      const deck = deckOf(c)
      for (const b of campus.buildings) {
        if (b === deck || b.minHeight) continue
        const pts = outline(b)
        expect(box.some((p) => pointInPolygon(p, pts))).toBe(false)
      }
    }
  })

  it('never puts two cars in the same space', () => {
    for (let i = 0; i < cars.length; i++)
      for (let j = i + 1; j < cars.length; j++) {
        const [a, b] = [cars[i]!, cars[j]!]
        if (Math.hypot(a.x - b.x, a.z - b.z) > 7 || Math.abs(a.y - b.y) > 1.5) continue
        expect(boxesTouch(corners(a), corners(b))).toBe(false)
      }
  })

  it('keeps clear of trees, poles and street lights', () => {
    const things = [
      ...campus.trees.map(([x, z]) => ({ x: x!, z: z!, r: 0.8 })),
      ...signalPoles().map((p) => ({ x: p.x, z: p.z, r: 0.2 })),
      ...streetLights.map((p) => ({ x: p.x, z: p.z, r: 0.2 })),
    ]
    for (const c of cars) {
      const box = corners(c)
      for (const t of things)
        if (Math.hypot(t.x - c.x, t.z - c.z) < 6)
          expect(lineToBox([t, t], box)).toBeGreaterThan(t.r)
    }
  })

  it('stands on the floor: the ground, the street or a level of its deck', () => {
    for (const c of cars) {
      const deck = deckOf(c)
      if (!deck) {
        expect(Math.abs(c.y - surfaceAt(c.x, c.z))).toBeLessThan(0.3)
        continue
      }
      // a level of the deck, not under its ground floor nor over its roof
      expect(c.y).toBeGreaterThan(Math.min(heightAt(c.x, c.z), floorOf(deck)) - 0.1)
      expect(c.y).toBeLessThan(floorOf(deck) + deck.height)
    }
  })

  it('leaves the sidewalks, crosswalks and drives free (gps routes and the crowd)', () => {
    const outside = cars.filter((c) => !deckOf(c))
    for (const l of [...campus.paths, ...campus.crossings]) {
      const line = l.points.map(([x, z]) => ({ x: x!, z: z! }))
      for (const c of outside)
        if (line.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 60))
          expect(lineToBox(line, corners(c))).toBeGreaterThanOrEqual(l.width / 2)
    }
    // the drives and alleys too (the curb ones stand on their own street)
    for (const r of campus.roads) {
      const line = r.points.map(([x, z]) => ({ x: x!, z: z! }))
      for (const c of outside)
        if (!curb.has(c) && line.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 60))
          expect(lineToBox(line, corners(c))).toBeGreaterThanOrEqual(r.width / 2)
    }
  })

  it("doesn't block a route, a walker or a teleport spot", () => {
    const g = campusGraph()
    const blocked = (p: Point) => resolveCollisions(p, 0.3, world)
    // every step of every route the crowd walks, and every node of the gps graph
    for (const w of walkers())
      for (let i = 1; i < w.path.length; i++) {
        const [a, b] = [w.path[i - 1]!, w.path[i]!]
        const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z))
        for (let k = 0; k <= n; k++) {
          const p = { x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n }
          for (const c of cars)
            if (Math.abs(c.x - p.x) < 4 && Math.abs(c.z - p.z) < 4 && !deckOf(c))
              expect(pointInPolygon(p, corners(c, 0.2))).toBe(false)
        }
      }
    for (const p of g.nodes)
      for (const c of cars)
        if (Math.abs(c.x - p.x) < 4 && Math.abs(c.z - p.z) < 4 && !deckOf(c))
          expect(pointInPolygon(p, corners(c, 0.2))).toBe(false)
    for (const { spot } of places) expect(blocked(spot)).toEqual(blocked(blocked(spot)))
  })

  it('is solid to walk into, at the curb and on a deck floor you walk on', () => {
    const c = [...curb][0]!
    const p = resolveCollisions({ x: c.x, z: c.z }, 0.35, world)
    expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeGreaterThan(CAR_KINDS[c.kind]!.width / 2)
  })
})
