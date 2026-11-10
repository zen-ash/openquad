import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { parkingDeckGeometry, type DeckData } from '../campus/parkingDecks'
import { drape, terrainGeometry } from '../campus/drape'
import { areasGeometry } from '../campus/geometry'
import { arenaFrame, BRIDGE, BRIDGES, type ArenaData } from '../campus/sportsArena'
import { urbanLifeFrame, urbanLifeGeometry, type UrbanLifeData } from '../campus/urbanLife'
import { PLANTERS, TABLES } from '../campus/urbanLifePlaza'
import { pointInPolygon, type Point } from './collision'
import { walk, WALK_SPEED } from './movement'
import { campusGraph } from './nav'
import { route } from './navgraph'
import { RAISED, raisedAt } from './raised'
import { alongGround, baseOf, decksAt, floorOf, surfaceAt } from './surface'
import { fromElevation, heightAt, isNear, terrainAt } from './terrain'
import { world } from './world'

const plaza = (name: string) => RAISED.find((r) => r.name === name)!
const building = (name: string) => campus.buildings.find((b) => b.name === name)!
const RADIUS = 0.35

describe('raised plazas', () => {
  it('puts the toll plaza and the urban life plaza at their real heights', () => {
    for (const [x, z] of [
      [-245, 205],
      [-230, 215],
      [-262, 195],
    ] as const)
      expect(heightAt(x, z)).toBeCloseTo(fromElevation(318.33), 3)
    for (const [x, z] of [
      [-38, 228],
      [-25, 240],
      [-12, 188],
    ] as const)
      expect(heightAt(x, z)).toBeCloseTo(fromElevation(313.27), 3)
  })

  it('leaves the streets round them where they were', () => {
    // the alley along classroom south, the gap by the 90 central ave garage, decatur st
    for (const [x, z] of [
      [-218, 192],
      [-255, 232],
      [-45, 262],
    ] as const) {
      expect(raisedAt(x, z)).toBeUndefined()
      expect(heightAt(x, z)).toBe(terrainAt(x, z))
      expect(heightAt(x, z)).toBeLessThan(fromElevation(313))
    }
  })

  it('stands urban life on its plaza, a floor up from piedmont ave', () => {
    expect(floorOf(building('Urban Life Building'))).toBeCloseTo(fromElevation(313.27), 3)
  })

  it('walks you to the urban life doors up the steps, not up the wall', () => {
    const door = building('Urban Life Building').door!
    const points = route(campusGraph(), { x: 0, z: 0 }, { x: door[0]!, z: door[1]! })!
    expect(points).not.toBeNull()
    const line = alongGround(points, 0.5)
    expect(line.at(-1)![2]).toBeCloseTo(fromElevation(313.27), 1)
    let climb = 0
    for (let i = 1; i < line.length; i++) climb = Math.max(climb, line[i]![2] - line[i - 1]![2])
    expect(climb).toBeLessThan(0.6)
  })

  it("doesn't let you walk off the edges with a parapet", () => {
    // toward decatur st from the urban life plaza, and into the alley from the toll plaza
    const walks: [Point, Point][] = [
      [
        { x: -40, z: 233 },
        { x: -0.66, z: 0.75 },
      ],
      [
        { x: -230, z: 200 },
        { x: 0.75, z: -0.66 },
      ],
    ]
    for (const [from, dir] of walks) {
      const top = heightAt(from.x, from.z)
      let p = { ...from }
      for (let i = 0; i < 120; i++) p = walk(p, dir, WALK_SPEED, 1 / 30, RADIUS, world)
      expect(heightAt(p.x, p.z)).toBeCloseTo(top, 3)
    }
  })

  it('lets you walk off the toll plaza onto central ave', () => {
    let p = { x: -262, z: 190 }
    for (let i = 0; i < 300; i++)
      p = walk(p, { x: -0.75, z: -0.66 }, WALK_SPEED, 1 / 30, RADIUS, world)
    expect(raisedAt(p.x, p.z)).toBeUndefined()
    expect(surfaceAt(p.x, p.z)).toBeLessThan(fromElevation(318.9))
  })

  it('draws the ground on them at their height', () => {
    const solid = campus.buildings.filter((b) => !b.minHeight)
    const ground = terrainGeometry(2000, solid, { keep: isNear, ring: false })
    const pos = ground.getAttribute('position')
    const index = ground.index!
    let off = 0
    let on = 0
    for (let i = 0; i < index.count; i += 3) {
      const vs = [0, 1, 2].map((k) => index.getX(i + k))
      const m = {
        x: vs.reduce((t, v) => t + pos.getX(v), 0) / 3,
        z: vs.reduce((t, v) => t + pos.getZ(v), 0) / 3,
      }
      const r = raisedAt(m.x, m.z)
      if (!r) continue
      on++
      for (const v of vs)
        if (Math.abs(pos.getY(v) - fromElevation(r.elevation(pos.getX(v), pos.getZ(v)))) > 1e-3)
          off++
    }
    expect(on).toBeGreaterThan(100)
    expect(off).toBe(0)
  })

  it('lifts the paving on them too', () => {
    const area = campus.plazas.find((p) => pointInPolygon({ x: -38, z: 228 }, toPoints(p)))!
    const geo = drape(areasGeometry([area], 0), 0.003)
    const pos = geo.getAttribute('position')
    const index = geo.index!
    let on = 0
    let off = 0
    for (let i = 0; i < index.count; i += 3) {
      const vs = [0, 1, 2].map((k) => index.getX(i + k))
      const m = {
        x: vs.reduce((t, v) => t + pos.getX(v), 0) / 3,
        z: vs.reduce((t, v) => t + pos.getZ(v), 0) / 3,
      }
      if (!raisedAt(m.x, m.z)) continue
      on++
      for (const v of vs) if (Math.abs(pos.getY(v) - (heightAt(m.x, m.z) + 0.003)) > 1e-3) off++
    }
    expect(on).toBeGreaterThan(20)
    expect(off).toBe(0)
  })

  it('has walls all the way down wherever the ground outside is lower', () => {
    // drawn by the building each plaza belongs to, from its base
    const drawn = new Map(
      ['G Deck', 'Urban Life Building'].map((name) => {
        const b = building(name)
        const geo =
          name === 'G Deck'
            ? parkingDeckGeometry(b as DeckData)
            : urbanLifeGeometry(b as UrbanLifeData)
        const pos = Object.values(geo.parts).map((g) => g.getAttribute('position'))
        return [name, { pos, base: baseOf(b) }] as const
      }),
    )
    let gaps = 0
    let checked = 0
    for (const r of RAISED)
      r.outline.forEach((a, i) => {
        if (r.edges[i] === null) return
        const b = r.outline[(i + 1) % r.outline.length]!
        const len = Math.hypot(b.x - a.x, b.z - a.z)
        const [dx, dz] = [(b.x - a.x) / len, (b.z - a.z) / len]
        const { pos, base } = drawn.get(r.by)!
        for (let t = 0.5; t < len; t += 1.5) {
          const p = { x: a.x + dx * t, z: a.z + dz * t }
          const top = fromElevation(r.elevation(p.x, p.z))
          const out = [p.x + dz * 0.05, p.z - dx * 0.05, p.x - dz * 0.05, p.z + dx * 0.05]
          const ground = Math.min(heightAt(out[0]!, out[1]!), heightAt(out[2]!, out[3]!))
          if (top - ground < 0.1) continue
          checked++
          // the wall's corners along the edge near here reach from the ground to the top
          let [low, high] = [Infinity, -Infinity]
          for (const at of pos)
            for (let v = 0; v < at.count; v++)
              if (Math.hypot(at.getX(v) - p.x, at.getZ(v) - p.z) < 0.8) {
                low = Math.min(low, at.getY(v) + base)
                high = Math.max(high, at.getY(v) + base)
              }
          if (low > ground || high < top - 0.05) gaps++
        }
      })
    expect(checked).toBeGreaterThan(50)
    expect(gaps).toBe(0)
  })

  it("doesn't draw the ground over the steps' treads", () => {
    const solid = campus.buildings.filter((b) => !b.minHeight)
    const ground = terrainGeometry(2000, solid, { keep: isNear, ring: false })
    const pos = ground.getAttribute('position')
    const index = ground.index!
    let on = 0
    for (let i = 0; i < index.count; i += 3) {
      const vs = [0, 1, 2].map((k) => index.getX(i + k))
      const m = {
        x: vs.reduce((t, v) => t + pos.getX(v), 0) / 3,
        z: vs.reduce((t, v) => t + pos.getZ(v), 0) / 3,
      }
      if (raisedAt(m.x, m.z)?.stairs) on++
    }
    expect(on).toBe(0)
  })

  it('meets central ave level, where the cars come in', () => {
    // just in from the toll plaza's edge, and osm's bridge sidewalk along central ave 1.5m out
    for (const [x, z, sx, sz] of [
      [-276.03, 195.47, -277.16, 194.48],
      [-269.43, 187.96, -270.56, 186.97],
      [-262.84, 180.44, -263.97, 179.45],
    ] as const) {
      const deck = decksAt(sx, sz, 0.5)
      expect(deck.length).toBeGreaterThan(0)
      expect(Math.abs(heightAt(x, z) - deck[0]!)).toBeLessThan(0.3)
    }
  })

  it('walks you up the decatur st steps to the doors under 140 decatur st', () => {
    let p: Point = { x: -24.5, z: 269.9 }
    let y = surfaceAt(p.x, p.z)
    expect(y).toBeLessThan(fromElevation(308.5))
    for (let i = 0; i < 400; i++) {
      p = walk(p, { x: 0.665, z: -0.747 }, WALK_SPEED, 1 / 30, RADIUS, world)
      y = surfaceAt(p.x, p.z, y)
    }
    expect(y).toBeCloseTo(fromElevation(313.27), 2)
    // and stops at the doors, still under the building
    expect(raisedAt(p.x, p.z)?.name).toBe('Urban Life decatur st landing')
  })

  it("doesn't let you walk through the planters and tables on the plaza", () => {
    const ul = building('Urban Life Building') as UrbanLifeData
    const { A } = urbanLifeFrame(ul)
    for (const [a, v] of [
      [...TABLES[1]!],
      [(PLANTERS[0]![0] + PLANTERS[0]![1]) / 2, PLANTERS[0]![3]],
    ]) {
      const target = A(a!, v!)
      let p = { x: target.x - 0.6546 * 4, z: target.z + 0.756 * 4 }
      const dir = { x: 0.6546, z: -0.756 }
      for (let i = 0; i < 120; i++) p = walk(p, dir, WALK_SPEED, 1 / 30, RADIUS, world)
      expect(Math.hypot(p.x - target.x, p.z - target.z)).toBeGreaterThan(0.5)
    }
  })

  it('lands the sports arena bridges on the urban life plaza', () => {
    const arena = building('GSU Sports Arena') as ArenaData
    const { A } = arenaFrame(arena)
    const ul = plaza('Urban Life plaza')
    const under = fromElevation(309) + BRIDGE.under
    for (const { u } of BRIDGES) {
      const mid = (u[0] + u[1]) / 2
      // just past the bridge's end it's the plaza, just before it's not
      const on = A(mid, BRIDGE.end - 0.3)
      const off = A(mid, BRIDGE.end + 0.3)
      expect(raisedAt(on.x, on.z)).toBe(ul)
      expect(raisedAt(off.x, off.z)).toBeUndefined()
      // its underside a little under the pavers, the deck a step over them
      expect(heightAt(on.x, on.z) - under).toBeGreaterThan(0)
      expect(heightAt(on.x, on.z) - under).toBeLessThan(0.5)
    }
  })
})

const toPoints = (p: number[][]) => p.map(([x, z]) => ({ x: x!, z: z! }))
