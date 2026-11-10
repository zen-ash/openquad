import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { pointInPolygon } from './collision'
import { CYCLE, LAMP_ON, lightAt, roundStart, signalJunctions, signalPoles } from './signals'

const poles = signalPoles()
const solid = campus.buildings
  .filter((b) => !b.minHeight)
  .map((b) => b.points.map(([x, z]) => ({ x: x!, z: z! })))

describe('signalPoles', () => {
  it('puts lights at the junctions osm has them at', () => {
    expect(poles.length).toBeGreaterThan(30)
  })

  it('keeps every pole out of the buildings', () => {
    const inside = poles.filter((p) => solid.some((b) => pointInPolygon({ x: p.x, z: p.z }, b)))
    // a few junctions are hard against a wall, most stand on the sidewalk
    expect(inside.length).toBeLessThan(poles.length * 0.1)
  })

  it('has the lights face back along the arm side of the road, two ways at each one', () => {
    for (const p of poles) {
      // the arm goes across the road, the lights face along it
      expect(Math.abs(p.arm[0] * p.face[0] + p.arm[1] * p.face[1])).toBeLessThan(0.01)
      expect(p.reach).toBeGreaterThan(3)
    }
    // the two roads of a junction take turns
    expect(new Set(poles.map((p) => p.road))).toEqual(new Set([0, 1]))
  })
})

describe('lightAt', () => {
  const tally = (offset: number, road: number) => {
    const n = { green: 0, yellow: 0, red: 0 }
    for (let t = 0; t < CYCLE; t += 0.25) n[lightAt(offset, road, t)] += 0.25
    return n
  }

  it('gives each road 25s of green, 3 of yellow and the rest red, every minute', () => {
    for (const offset of [0, 7.3, 51.1])
      for (const road of [0, 1])
        expect(tally(offset, road)).toEqual({ green: 25, yellow: 3, red: 32 })
    // and the same a minute on, or a day on
    expect(lightAt(7.3, 1, 12.5)).toBe(lightAt(7.3, 1, 12.5 + CYCLE * 1440))
  })

  it('never lets both roads of a junction go at once', () => {
    for (const j of signalJunctions())
      for (let t = 0; t < CYCLE; t += 0.25)
        expect(lightAt(j.offset, 0, t) === 'red' || lightAt(j.offset, 1, t) === 'red').toBe(true)
  })

  it('is what the lamps show (Signals.tsx lights each lamp in its LAMP_ON window)', () => {
    for (const p of poles.slice(0, 10))
      for (let t = 0; t < CYCLE; t += 0.5) {
        const phase = (t + roundStart(p.offset, p.road)) % CYCLE
        const lit = (Object.keys(LAMP_ON) as (keyof typeof LAMP_ON)[]).find(
          (k) => phase >= LAMP_ON[k][0] && phase < LAMP_ON[k][1],
        )
        expect(lit).toBe(lightAt(p.offset, p.road, t))
      }
  })
})
