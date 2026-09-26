import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { classroomWalls } from './classroomSouth'
import { buildingsGeometry } from './geometry'
import { frame } from './landmark'
import {
  BAND,
  CORNER_TOP,
  DECK,
  ENTRY,
  FLOOR,
  FLOORS,
  GLASS_WALL,
  librarySouthGeometry,
  PLAZA_DOORS,
  RECESS,
  SLOT,
  SLOTS,
  WINDOWS,
  type LibrarySouthData,
} from './librarySouth'

const ls = campus.buildings.find((b) => b.name === 'Library South') as LibrarySouthData
const corner = campus.buildings.find(
  (b) => (b.landmark as { with?: string } | undefined)?.with === 'Library South',
)!
const geo = librarySouthGeometry(ls)
const { parts, signs, inside } = geo
const pts = ls.points.map(([x, z]) => ({ x: x!, z: z! }))
const walls = classroomWalls(pts)
const [north, east] = ls.landmark!.front.map(([x, z]) => ({ x: x!, z: z! })) as [
  { x: number; z: number },
  { x: number; z: number },
]
const f = frame(north, east)
// the side toward the plaza faces north, half way between decatur street and the far end
const plaza = walls.find((w) => {
  const x = w.o.x * f.out.x + w.o.z * f.out.z
  return x > 0.3 && x < 0.9
})!

describe('library south', () => {
  it('is nine 5m floors, the coping over the top one', () => {
    expect(FLOORS * FLOOR).toBeLessThan(ls.height)
    expect(ls.height).toBeCloseTo(45.3, 1)
    // the bands and the slots fit between them
    for (const floors of Object.values(SLOTS)) expect(floors).toHaveLength(FLOORS)
    const pos = parts.stone.getAttribute('position')
    let top = 0
    for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i))
    expect(top).toBeCloseTo(ls.height)
    expect(BAND[1] - BAND[0]).toBeLessThan(0.5)
  })

  it('is 16m on decatur street and 27m on courtland street, like on the satellite', () => {
    expect(f.len).toBeCloseTo(16.4, 0)
    const courtland = walls.find((w) => w.o.x * f.along.x + w.o.z * f.along.z > 0.9)!
    expect(courtland.len).toBeCloseTo(26.6, 0)
    expect(plaza.len).toBeCloseTo(29.4, 0)
  })

  it('has its slot windows on the walls, not over each other or the corners', () => {
    for (const w of walls) {
      const side =
        w.o.x * f.out.x + w.o.z * f.out.z > 0.9
          ? 'ne'
          : w.o.x * f.along.x + w.o.z * f.along.z > 0.9
            ? 'se'
            : null
      if (!side) continue
      SLOTS[side].forEach((us) => {
        const sorted = [...us].sort((a, b) => a - b)
        sorted.forEach((u, i) => {
          expect(u - SLOT / 2).toBeGreaterThan(0.5)
          expect(u + SLOT / 2).toBeLessThan(w.len - 0.5)
          if (i) expect(u - sorted[i - 1]!).toBeGreaterThan(SLOT + 0.3)
        })
      })
      for (const [u0, u1, y0, y1] of WINDOWS[side] ?? []) {
        expect(u0).toBeGreaterThan(0.5)
        expect(u1).toBeLessThan(w.len)
        expect(y1).toBeGreaterThan(y0)
      }
    }
  })

  it('has its front door under the plaza entrance, facing library north', () => {
    const [x, z, nx, nz] = ls.door!
    expect(nx! * plaza.o.x + nz! * plaza.o.z).toBeGreaterThan(0.99)
    const u = (x! - plaza.p.x) * plaza.dir.x + (z! - plaza.p.z) * plaza.dir.z
    expect(u).toBeGreaterThan(PLAZA_DOORS[0] + 1.2)
    expect(u).toBeLessThan(PLAZA_DOORS[1] - 1.2)
    expect(u).toBeGreaterThan(ENTRY[0])
    expect(u).toBeLessThan(ENTRY[1])
    expect(u).toBeLessThan(GLASS_WALL)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    expect(signs.filter((s) => s.text === 'LIBRARY SOUTH').length).toBeGreaterThanOrEqual(2)
  })

  it('has every outside wall facing out', () => {
    let checked = 0
    for (const part of ['brick', 'cream'] as const) {
      const pos = parts[part].getAttribute('position')
      const normal = parts[part].getAttribute('normal')
      for (let i = 0; i < pos.count; i += 6) {
        if (Math.abs(normal.getY(i)) > 0.5) continue
        const p = { x: (pos.getX(i) + pos.getX(i + 1)) / 2, z: (pos.getZ(i) + pos.getZ(i + 1)) / 2 }
        const n = { x: normal.getX(i), z: normal.getZ(i) }
        // only walls standing just in front of the outline (not the parapet's inside)
        const on = pts.some((a, k) => {
          const b = pts[(k + 1) % pts.length]!
          const l = Math.hypot(b.x - a.x, b.z - a.z)
          const t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / (l * l)
          const d = Math.abs((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / l
          return t > 0.05 && t < 0.95 && Math.abs(d - RECESS) < 0.01
        })
        if (!on || pointInPolygon(p, pts)) continue
        checked++
        expect(pointInPolygon({ x: p.x + n.x * 0.3, z: p.z + n.z * 0.3 }, pts)).toBe(false)
      }
    }
    expect(checked).toBeGreaterThan(200)
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
      expect(pointInPolygon({ x: p.x + n.getX(0) * 0.3, z: p.z + n.getZ(0) * 0.3 }, pts)).toBe(true)
    }
    // the doors and the two wide windows on decatur street
    expect(inside.glass.length).toBeGreaterThanOrEqual(4)
  })

  it('lets its glass wall cast a shadow on the plaza', () => {
    // shadows are drawn from the faces turned away from the sun: without it the sun came
    // straight through the building onto the plaza
    expect(geo.noShadow).not.toContain('curtain')
    expect(geo.noShadow).not.toContain('brick')
  })

  it('puts the plaza between classroom south and the link, a floor up', () => {
    const cs = campus.buildings.find((b) => b.name === 'Classroom South')!
    const link = campus.buildings.find(
      (b) =>
        b.minHeight && b.part && Math.hypot(b.points[0]![0]! + 125.7, b.points[0]![1]! - 177.4) < 1,
    )!
    const poly = (b: { points: number[][] }) => b.points.map(([x, z]) => ({ x: x!, z: z! }))
    const pos = parts.pavers.getAttribute('position')
    let deck = 0
    for (let i = 0; i < pos.count; i += 3) {
      if (Math.abs(pos.getY(i) - DECK[1]) > 0.01) continue
      deck++
      const c = {
        x: (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
        z: (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
      }
      expect(pointInPolygon(c, poly(cs))).toBe(false)
      expect(pointInPolygon(c, poly(link))).toBe(false)
    }
    expect(deck).toBeGreaterThan(3)
    // the link lands on it, a floor up like the plaza
    expect(link.minHeight).toBeLessThan(DECK[1])
  })

  it('draws the corner by classroom south with it, not in the regular buildings mesh', () => {
    expect(corner.height).toBe(CORNER_TOP)
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
