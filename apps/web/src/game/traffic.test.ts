import { describe, expect, it } from 'vitest'
import { CAR_KINDS, type Driving } from './cars'
import { laneNetwork, type Lane } from './lanes'
import { boxesTouch, corners } from './parking'
import { lightAt } from './signals'
import { decksAt } from './surface'
import { heightAt } from './terrain'
import { drive, drivingAt, repeats, stats, STEP, traffic } from './traffic'

const trips = traffic()
const PERIOD = repeats()
const copy = (cars: Driving[]) => cars.map((c) => ({ ...c }))

describe('traffic', () => {
  it('starts quickly', () => {
    // ~50ms on the m4 air when it isn't busy, the bound is for slow ci machines
    expect(stats.ms).toBeLessThan(1500)
    expect(stats.steps).toBeLessThan(400_000)
  })

  it('drives the same traffic every time', () => {
    const again = drive()
    expect(again.length).toBe(trips.length)
    again.forEach((t, i) => {
      expect(t.first).toBe(trips[i]!.first)
      expect(t.paint).toBe(trips[i]!.paint)
      expect([...t.along]).toEqual([...trips[i]!.along])
    })
  })

  it('has a normal weekday downtown on the streets', () => {
    const counts = Array.from({ length: PERIOD / 10 }, (_, i) => drivingAt(i * 10).length)
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    expect(mean).toBeGreaterThan(60)
    expect(mean).toBeLessThan(150)
  })

  it('gets every car through, none stuck for good', () => {
    expect(stats.towed).toBe(0)
    for (const t of trips) expect(t.along.length * STEP).toBeLessThan(PERIOD * 0.75)
  })

  it('repeats every period and carries on smoothly across the wrap', () => {
    expect(copy(drivingAt(1234.5))).toEqual(copy(drivingAt(1234.5 + PERIOD)))
    const lanes = laneNetwork().lanes
    // where cars may come and go: the ends of the lanes at the edge of the area
    const edges = lanes.flatMap((l) => {
      const { x, z } = l.line
      const n = x.length - 1
      return [
        ...(l.way.entry ? [{ x: x[0]!, z: z[0]! }] : []),
        ...(l.way.exit ? [{ x: x[n]!, z: z[n]! }] : []),
      ]
    })
    // (a car's gone once its middle's past the end, a step's drive past it at most)
    const atEdge = (c: Driving) => edges.some((e) => Math.hypot(e.x - c.x, e.z - c.z) < 18)
    let before = copy(drivingAt(PERIOD - 20))
    for (let t = PERIOD - 20 + 0.1; t < PERIOD + 20; t += 0.1) {
      const now = copy(drivingAt(t))
      const was = new Map(before.map((c) => [c.paint, c]))
      for (const c of now) {
        const b = was.get(c.paint)
        if (b) expect(Math.hypot(c.x - b.x, c.z - b.z)).toBeLessThan(2.5)
        else expect(atEdge(c)).toBe(true)
      }
      const is = new Set(now.map((c) => c.paint))
      for (const b of before) if (!is.has(b.paint)) expect(atEdge(b)).toBe(true)
      before = now
    }
  })

  it('keeps every car clear of the others', () => {
    let worst = 0
    for (let t = 0; t < PERIOD; t += 0.5) {
      const cars = copy(drivingAt(t))
      for (let i = 0; i < cars.length; i++)
        for (let j = i + 1; j < cars.length; j++) {
          const [a, b] = [cars[i]!, cars[j]!]
          // (one on the viaduct, one under it: decatur st's ground comes up to a meter under
          // courtland st's deck by the abutment, terrain.json)
          if (Math.hypot(a.x - b.x, a.z - b.z) > 7 || Math.abs(a.y - b.y) > 1) continue
          // a bit smaller than the bodies: mirrors and bumpers brush in a tight queue
          if (boxesTouch(corners(a, -0.15), corners(b, -0.15))) worst++
        }
    }
    expect(worst).toBe(0)
  })

  it('never runs a red light', () => {
    let crossed = 0
    for (const trip of trips) {
      const half = CAR_KINDS[trip.kind]!.length / 2
      trip.route.forEach((piece, i) => {
        if ('turn' in piece || i === trip.route.length - 1) return
        const lane = piece as Lane
        if (!lane.light) return
        const line = trip.starts[i]! + lane.line.length - 0.5 + 0.3
        for (let k = 1; k < trip.along.length; k++) {
          const [a, b] = [trip.along[k - 1]! + half, trip.along[k]! + half]
          if (a > line || b <= line) continue
          // when the front went over the stop line
          const t = (trip.first + k - 1 + (line - a) / (b - a)) * STEP
          crossed++
          expect(lightAt(lane.light.offset, lane.light.road, t)).not.toBe('red')
        }
      })
    }
    expect(crossed).toBeGreaterThan(100)
  })

  it('drives on the ground, or the viaduct up on its deck', () => {
    let up = 0
    // (not out by the edge of the area: washington st's deck ends 3m over the street on the
    // way out of it)
    const lanes = laneNetwork().lanes.filter((l) => l.way.exit)
    const ends = lanes.map((l) => ({ x: l.line.x.at(-1)!, z: l.line.z.at(-1)! }))
    for (let t = 0; t < PERIOD; t += 15)
      for (const c of drivingAt(t)) {
        if (ends.some((e) => Math.hypot(e.x - c.x, e.z - c.z) < 45)) continue
        const ground = Math.abs(c.y - heightAt(c.x, c.z)) < 0.6
        const deck = decksAt(c.x, c.z).some((d) => Math.abs(c.y - d) < 0.6)
        expect(ground || deck).toBe(true)
        if (!ground) up++
        // nose up or down with the street (decatur st dips steeply under the viaduct)
        expect(Math.abs(c.pitch)).toBeLessThan(0.4)
      }
    // courtland st's viaduct has cars on it
    expect(up).toBeGreaterThan(10)
  })

  it('looks up a frame in about a tenth of a millisecond', () => {
    const t0 = performance.now()
    for (let i = 0; i < 1000; i++) drivingAt(i * 0.37)
    expect((performance.now() - t0) / 1000).toBeLessThan(0.5)
  })
})
