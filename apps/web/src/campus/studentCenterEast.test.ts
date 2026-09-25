import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BAND,
  BANDS,
  LOBBY,
  studentCenterEastGeometry,
  WING,
  withoutLobby,
  type StudentCenterData,
} from './studentCenterEast'

const sce = campus.buildings.find((b) => b.name === 'Student Center East') as StudentCenterData
const { parts, signs } = studentCenterEastGeometry(sce)
const pts = sce.points.map(([x, z]) => ({ x: x!, z: z! }))
const box = (part: keyof typeof parts) => {
  parts[part].computeBoundingBox()
  return parts[part].boundingBox!
}

describe('student center east', () => {
  it('is 14 bands of block tall, the wing on the plaza 7', () => {
    expect(sce.height).toBeCloseTo(BANDS * BAND, 1)
    expect(Math.max(box('white').max.y, box('tan').max.y)).toBeCloseTo(sce.height)
    // the roofs: the three floors, the ballroom, the wing and the lobby
    const roof = parts.roof.getAttribute('position')
    const heights = new Set<number>()
    for (let i = 0; i < roof.count; i++) heights.add(Math.round(roof.getY(i) * 10) / 10)
    expect([...heights].sort((a, b) => a - b)).toEqual(
      [LOBBY, WING, 10 * BAND, sce.height].map((y) => Math.round((y - 0.02) * 10) / 10),
    )
  })

  it('is about 60 by 62m, like on the satellite', () => {
    const [n, e, s, w] = sce.landmark!.corners
    const side = (p: number[], q: number[]) => Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!)
    expect(side(n!, e!)).toBeCloseTo(59, 0)
    expect(side(e!, s!)).toBeCloseTo(62, 0)
    expect(side(s!, w!)).toBeCloseTo(60, 0)
  })

  it('has its front door on the glass lobby, facing unity plaza', () => {
    const [x, z, nx, nz] = sce.door!
    // northwest. east is +x, north is -z
    expect(nx).toBeLessThan(-0.5)
    expect(nz).toBeLessThan(-0.5)
    const lobby = sce.landmark!.lobby.map(([px, pz]) => ({ x: px!, z: pz! }))
    const inside = { x: x! - nx! * 0.5, z: z! - nz! * 0.5 }
    expect(pointInPolygon(inside, lobby)).toBe(true)
    // and on the outside wall, nothing in front of it
    const out = { x: x! + nx! * 0.5, z: z! + nz! * 0.5 }
    expect(pointInPolygon(out, pts)).toBe(false)
  })

  it('has every outside block wall facing out', () => {
    // the walls lying along the outline (not the sides of window openings) have to face
    // away from the building
    for (const part of ['white', 'tan'] as const) {
      const pos = parts[part].getAttribute('position')
      const normal = parts[part].getAttribute('normal')
      let checked = 0
      for (let i = 0; i < pos.count; i += 6) {
        // walls only, not the sills and tops of the openings
        if (Math.abs(normal.getY(i)) > 0.5) continue
        const n = { x: normal.getX(i), z: normal.getZ(i) }
        const p = { x: (pos.getX(i) + pos.getX(i + 1)) / 2, z: (pos.getZ(i) + pos.getZ(i + 1)) / 2 }
        const along = pts.some((a, k) => {
          const b = pts[(k + 1) % pts.length]!
          const l = Math.hypot(b.x - a.x, b.z - a.z)
          const t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / (l * l)
          const d = Math.abs((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / l
          const square = Math.abs((n.x * (b.x - a.x) + n.z * (b.z - a.z)) / l) < 0.05
          return t > 0 && t < 1 && d < 0.01 && square
        })
        if (!along) continue
        checked++
        expect(pointInPolygon({ x: p.x + n.x * 0.3, z: p.z + n.z * 0.3 }, pts)).toBe(false)
      }
      expect(checked).toBeGreaterThan(100)
    }
  })

  it('takes the lobby out of the wing', () => {
    const lobby = sce.landmark!.lobby.map(([x, z]) => ({ x: x!, z: z! }))
    const rest = withoutLobby(pts, lobby)
    const area = (poly: { x: number; z: number }[]) =>
      Math.abs(
        poly.reduce((s, p, i) => {
          const q = poly[(i + 1) % poly.length]!
          return s + p.x * q.z - q.x * p.z
        }, 0) / 2,
      )
    expect(area(rest) + area(lobby)).toBeCloseTo(area(pts), 0)
  })

  it('has gsu on the sign, with a blue square instead of the logo', () => {
    const words = signs.map((s) => s.text)
    expect(words).toEqual(expect.arrayContaining(['GEORGIA', 'STATE', 'UNIVERSITY']))
    expect(words.filter((w) => w.startsWith('STUDENT CENTER')).length).toBeGreaterThan(0)
    expect(parts.blue).toBeDefined()
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
