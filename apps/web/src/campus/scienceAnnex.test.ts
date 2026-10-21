import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { furnish } from '../game/furniture'
import { interiors } from '../game/interiors'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  COPING,
  DRUM,
  FACE,
  LEFT,
  LINE,
  PYLON_TOP,
  ROOF,
  SOUTH,
  WING,
  annexFrame,
  annexObstacles,
  scienceAnnexGeometry,
  type AnnexData,
} from './scienceAnnex'

const annex = campus.buildings.find((b) => b.name === 'Science Annex') as AnnexData
const index = campus.buildings.indexOf(annex as (typeof campus.buildings)[number])
const { parts, signs } = scienceAnnexGeometry(annex)
const { avOf } = annexFrame(annex)
const pts = annex.points.map(([x, z]) => ({ x: x!, z: z! }))
const av = pts.map(avOf)

describe('science annex', () => {
  it('keeps its place in the map', () => {
    expect(index).toBe(78)
  })

  it('has its front on peachtree center ave 0.25m behind the face, straight to the shops', () => {
    const front = av.filter(([, v]) => Math.abs(v - LINE) < 0.02)
    expect(front).toHaveLength(2)
    expect(Math.min(...front.map(([a]) => a))).toBeCloseTo(133.9, 1)
    expect(Math.max(...front.map(([a]) => a))).toBeCloseTo(SOUTH, 1)
    expect(LINE - FACE).toBeCloseTo(0.25)
    // the shops are cut back to the same wall
    for (const [x, z] of campus.buildings[150]!.points)
      expect(avOf({ x: x!, z: z! })[0]).toBeGreaterThan(SOUTH - 0.02)
  })

  it('goes round the stair drum on the corner', () => {
    const onDrum = av.filter(
      ([a, v]) => Math.abs(Math.hypot(a - DRUM.a, v - DRUM.v) - DRUM.r) < 0.03,
    )
    expect(onDrum.length).toBeGreaterThan(8)
  })

  it('is 17.1m to the top of the pylon, the front lower', () => {
    expect(annex.height).toBe(17.1)
    expect(PYLON_TOP).toBe(annex.height)
    expect(COPING).toBeLessThan(annex.height)
    expect(ROOF).toBeLessThan(COPING)
  })

  it('has its doors in the bay on peachtree center ave, facing it', () => {
    const [x, z, nx, nz] = annex.door!
    const [a, v] = avOf({ x: x!, z: z! })
    expect(v).toBeCloseTo(LEFT.v, 1)
    expect(a).toBeGreaterThan(LEFT.a[0] + 1.2)
    expect(a).toBeLessThan(LEFT.a[1] - 1.2)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('keeps the colonnade and the planter outside the building', () => {
    for (const w of annexObstacles(annex))
      for (const p of [
        { x: w.ax, z: w.az },
        { x: w.bx, z: w.bz },
        { x: (w.ax + w.bx) / 2, z: (w.az + w.bz) / 2 },
      ])
        expect(pointInPolygon(p, pts)).toBe(false)
    // the piers stand out in front of the colonnade's back wall
    const back = av.filter(([a]) => Math.abs(a - WING.back) < 0.02)
    expect(back.length).toBeGreaterThan(0)
  })

  it('has the name on the pylon', () => {
    expect(signs.map((s) => s.text)).toContain('SCIENCE ANNEX')
  })

  it('only gets a lobby of furniture, it is labs', () => {
    const room = interiors.find((r) => r.index === index)!
    expect(furnish(room).length).toBeLessThan(40)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 10k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(10_000)
  })
})
