import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BAND,
  ENTRANCE,
  GROUND,
  langdaleHallGeometry,
  langdaleWalls,
  level,
  LEDGE,
  OUT,
  RECESS,
  ROOF,
  WINDOWS,
  type LangdaleData,
} from './langdaleHall'

const lh = campus.buildings.find((b) => b.name === 'Langdale Hall') as LangdaleData
const { parts, signs, inside } = langdaleHallGeometry(lh)
const pts = lh.points.map(([x, z]) => ({ x: x!, z: z! }))
const { of } = langdaleWalls(lh)

describe('langdale hall', () => {
  it('is 11 floors, the top three in the band', () => {
    expect(level(12)).toBeCloseTo(ROOF)
    expect(lh.height).toBeCloseTo(44, 0)
    expect(ROOF).toBeLessThan(lh.height)
    // the band starts under floor 9 and each floor in it has a row of windows
    expect(BAND).toBeGreaterThan(level(8))
    expect(BAND).toBeLessThan(level(9))
    WINDOWS.forEach(([y0, y1], i) => {
      expect(y0).toBeGreaterThan(level(9 + i) - 1)
      expect(y1).toBeLessThan(level(10 + i) + 1)
    })
    expect(GROUND).toBeGreaterThan(3.5)
  })

  it('is about 56 by 36m, like on the satellite', () => {
    expect(of('nw').len).toBeCloseTo(55.9, 0)
    expect(of('sw').len).toBeCloseTo(35.9, 0)
    expect(of('se').len).toBeCloseTo(56.3, 0)
  })

  it('has the band sticking out over the walls under it', () => {
    const nw = of('nw')
    const pos = parts.precast.getAttribute('position')
    const normal = parts.precast.getAttribute('normal')
    let furthest = 0
    for (let i = 0; i < pos.count; i++) {
      if (normal.getX(i) * nw.o.x + normal.getZ(i) * nw.o.z < 0.99) continue
      if (pos.getY(i) < BAND) continue
      const d = (pos.getX(i) - nw.p.x) * nw.o.x + (pos.getZ(i) - nw.p.z) * nw.o.z
      furthest = Math.max(furthest, d)
    }
    // the piers stand RECESS out from the outline, the brick is on it
    expect(furthest).toBeGreaterThan(OUT)
    expect(furthest).toBeCloseTo(RECESS + LEDGE)
  })

  it('has its front door under the canopy on peachtree center ave', () => {
    const [x, z, nx, nz] = lh.door!
    const nw = of('nw')
    // facing the street, north west
    expect(nx! * nw.o.x + nz! * nw.o.z).toBeGreaterThan(0.99)
    // in the glass under the canopy, u from the north corner
    const u = (x! - nw.p.x) * nw.dir.x + (z! - nw.p.z) * nw.dir.z
    expect(ENTRANCE.glass.some(([u0, u1]) => u > u0! + 1.2 && u < u1! - 1.2)).toBe(true)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    expect(signs.filter((s) => s.text === 'LANGDALE HALL')).toHaveLength(2)
  })

  it('has every outside wall facing out', () => {
    let checked = 0
    for (const part of ['precast', 'brick', 'glass'] as const) {
      const pos = parts[part].getAttribute('position')
      const normal = parts[part].getAttribute('normal')
      for (let i = 0; i < pos.count; i += 6) {
        if (Math.abs(normal.getY(i)) > 0.5) continue
        const p = { x: (pos.getX(i) + pos.getX(i + 1)) / 2, z: (pos.getZ(i) + pos.getZ(i + 1)) / 2 }
        // only walls lying along the outline
        const along = pts.some((a, k) => {
          const b = pts[(k + 1) % pts.length]!
          const l = Math.hypot(b.x - a.x, b.z - a.z)
          const t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / (l * l)
          const d = Math.abs((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / l
          return t > 0.01 && t < 0.99 && d < 0.01
        })
        if (!along) continue
        checked++
        const n = { x: normal.getX(i), z: normal.getZ(i) }
        expect(pointInPolygon({ x: p.x + n.x * 0.3, z: p.z + n.z * 0.3 }, pts)).toBe(false)
      }
    }
    expect(checked).toBeGreaterThan(50)
  })

  it('closes the ground floor from the inside, right along the outline', () => {
    for (const g of [...inside.solid, ...inside.glass]) {
      const pos = g.getAttribute('position')
      const n = g.getAttribute('normal')
      const p = { x: (pos.getX(0) + pos.getX(1)) / 2, z: (pos.getZ(0) + pos.getZ(1)) / 2 }
      const onEdge = pts.some((a, k) => {
        const b = pts[(k + 1) % pts.length]!
        const l = Math.hypot(b.x - a.x, b.z - a.z)
        return Math.abs((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / l < 0.02
      })
      expect(onEdge).toBe(true)
      // and facing in
      const into = { x: p.x + n.getX(0) * 0.3, z: p.z + n.getZ(0) * 0.3 }
      expect(pointInPolygon(into, pts)).toBe(true)
    }
    expect(inside.glass.length).toBeGreaterThan(0)
  })

  it('has a roof under the fascia, the penthouse sticking up over it', () => {
    parts.roof.computeBoundingBox()
    expect(parts.roof.boundingBox!.min.y).toBeCloseTo(ROOF)
    expect(parts.roof.boundingBox!.max.y).toBeGreaterThan(lh.height)
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays under 60k triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(60_000)
  })
})
