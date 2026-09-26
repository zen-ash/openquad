import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import {
  BAY,
  CANOPY,
  classroomSouthGeometry,
  COLUMNS,
  FIRST,
  LOBBY_FRONT,
  RECESS,
  SIDE_ENTRANCE,
  SILLS,
  WINDOW,
  WING_TOP,
  type ClassroomSouthData,
} from './classroomSouth'
import { buildingsGeometry } from './geometry'
import { frame } from './landmark'

const cs = campus.buildings.find((b) => b.name === 'Classroom South') as ClassroomSouthData
const wing = campus.buildings.find(
  (b) => (b.landmark as { with?: string } | undefined)?.with === 'Classroom South',
)!
const { parts, signs, inside } = classroomSouthGeometry(cs)
const pts = cs.points.map(([x, z]) => ({ x: x!, z: z! }))
const [corner, end] = cs.landmark!.front.map(([x, z]) => ({ x: x!, z: z! })) as [
  { x: number; z: number },
  { x: number; z: number },
]
const f = frame(corner, end)
const box = (part: keyof typeof parts) => {
  parts[part].computeBoundingBox()
  return parts[part].boundingBox!
}

describe('classroom south', () => {
  it('has six rows of windows under the parapet, a bigger gap under the top one', () => {
    expect(SILLS).toHaveLength(6)
    const gaps = SILLS.slice(1).map((s, i) => s - SILLS[i]!)
    for (const g of gaps.slice(0, -1)) expect(g).toBeCloseTo(2.5)
    expect(gaps.at(-1)!).toBeGreaterThan(3.5)
    expect(SILLS.at(-1)! + WINDOW[1]).toBeLessThan(cs.height - 1)
    // the parapet along decatur street
    const pos = parts.marble.getAttribute('position')
    let top = 0
    for (let i = 0; i < pos.count; i++)
      if (f.dOf({ x: pos.getX(i), z: pos.getZ(i) }) > 0) top = Math.max(top, pos.getY(i))
    expect(top).toBeCloseTo(cs.height)
  })

  it('is about 61m along decatur street, like on the satellite', () => {
    expect(f.len).toBeCloseTo(60.9, 0)
    // the windows fit on the front with blank marble at both ends
    expect(FIRST).toBeGreaterThan(2)
    expect(FIRST + (COLUMNS - 1) * BAY).toBeLessThan(f.len - 4)
    // the doors toward library south are between two bays
    const k = (SIDE_ENTRANCE - FIRST) / BAY
    expect(k - Math.floor(k)).toBeCloseTo(0.5)
  })

  it('has its front door in the lobby, under the canopy', () => {
    const [x, z, nx, nz] = cs.door!
    // facing decatur street
    expect(nx! * f.out.x + nz! * f.out.z).toBeGreaterThan(0.99)
    const s = -f.aOf({ x: x!, z: z! })
    expect(s).toBeGreaterThan(CANOPY[0] + 1.2)
    expect(s).toBeLessThan(CANOPY[1] - 1.2)
    expect(f.dOf({ x: x!, z: z! })).toBeCloseTo(LOBBY_FRONT, 1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    // over the lobby doors, the doors toward library south and the end doors, once each
    expect(signs.filter((s) => s.text === 'CLASSROOM SOUTH')).toHaveLength(3)
  })

  it('has every outside wall facing out', () => {
    const outline = [...pts]
    const wingPts = wing.points.map(([x, z]) => ({ x: x!, z: z! }))
    let checked = 0
    for (const part of ['marble', 'clear', 'cream', 'tan', 'grey'] as const) {
      const pos = parts[part].getAttribute('position')
      const normal = parts[part].getAttribute('normal')
      for (let i = 0; i < pos.count; i += 6) {
        // the walls, not the inside of the parapets over the roofs
        if (Math.abs(normal.getY(i)) > 0.5 || Math.min(pos.getY(i), pos.getY(i + 2)) > 12) continue
        const p = { x: (pos.getX(i) + pos.getX(i + 1)) / 2, z: (pos.getZ(i) + pos.getZ(i + 1)) / 2 }
        const n = { x: normal.getX(i), z: normal.getZ(i) }
        // only walls standing on or just in front of an outline
        const on = (poly: typeof pts) =>
          poly.some((a, k) => {
            const b = poly[(k + 1) % poly.length]!
            const l = Math.hypot(b.x - a.x, b.z - a.z)
            const t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / (l * l)
            const d = Math.abs((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / l
            return t > 0.05 && t < 0.95 && d < RECESS + 0.01
          })
        for (const poly of [outline, wingPts]) {
          if (!on(poly) || pointInPolygon(p, poly)) continue
          checked++
          expect(pointInPolygon({ x: p.x + n.x * 0.3, z: p.z + n.z * 0.3 }, poly)).toBe(false)
        }
      }
    }
    expect(checked).toBeGreaterThan(100)
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
    // the lobby is glass
    expect(inside.glass.length).toBeGreaterThan(3)
  })

  it('has a roof over the whole outline and the wing', () => {
    const area = (poly: number[][]) =>
      Math.abs(
        poly.reduce((sum, p, i) => {
          const q = poly[(i + 1) % poly.length]!
          return sum + p[0]! * q[1]! - q[0]! * p[1]!
        }, 0),
      ) / 2
    let roofs = 0
    for (const part of ['tan'] as const) {
      const pos = parts[part].getAttribute('position')
      const normal = parts[part].getAttribute('normal')
      for (let i = 0; i < pos.count; i += 3) {
        if (normal.getY(i) < 0.99 || pos.getY(i) < 10) continue
        const [a, b, c] = [0, 1, 2].map((k) => [pos.getX(i + k), pos.getZ(i + k)] as const)
        roofs += Math.abs((b![0] - a![0]) * (c![1] - a![1]) - (c![0] - a![0]) * (b![1] - a![1])) / 2
      }
    }
    const all = area(cs.points) + area(wing.points)
    expect(Math.abs(roofs - all)).toBeLessThan(all * 0.01)
  })

  it('draws the west wing with it, not in the regular buildings mesh', () => {
    expect(wing.height).toBe(WING_TOP)
    expect(box('grey').max.y).toBeLessThan(WING_TOP)
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
