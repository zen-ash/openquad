import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { CEILING } from '../game/interiors'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BANDS,
  BAY,
  bookstoreCorners,
  COLUMNS,
  CURTAIN,
  GABLE,
  ROOF,
  ROWS,
  TOWER,
  universityBookstoreGeometry,
  type UniversityBookstoreData,
} from './universityBookstore'

const bs = campus.buildings.find(
  (b) => b.name === 'University Bookstore',
) as UniversityBookstoreData
const { parts, signs } = universityBookstoreGeometry(bs)
const c = bookstoreCorners(bs)
const pts = bs.points.map(([x, z]) => ({ x: x!, z: z! }))

// how far a point is from the outline
function toOutline(p: { x: number; z: number }) {
  let best = Infinity
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length]!
    const [dx, dz] = [b.x - a.x, b.z - a.z]
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)))
    best = Math.min(best, Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz))
  })
  return best
}

describe('university bookstore', () => {
  it('is 18m to the parapet over unity plaza, the rows of windows between the bands', () => {
    expect(bs.height).toBe(18)
    expect(ROOF).toBeLessThan(bs.height - 1)
    // the bottom row sits on the lower band, the upper band runs across the middle row's heads
    expect(ROWS[0]![0]).toBeGreaterThanOrEqual(BANDS[0]![1])
    expect(BANDS[1]![0]).toBeGreaterThan(ROWS[1]![0])
    expect(BANDS[1]![0]).toBeLessThan(ROWS[1]![1])
    expect(ROWS[2]![1]).toBeLessThan(bs.height - 1)
    for (const a of COLUMNS) expect(a).toBeLessThan(c.f.len)
  })

  it('finds its corners on the outline', () => {
    // the plaza front is 24.4m, courtland st 8.7m, the notch 4.25m deep
    expect(c.f.len).toBeCloseTo(24.4, 0)
    const len = (i: number, j: number) => Math.hypot(pts[j]!.x - pts[i]!.x, pts[j]!.z - pts[i]!.z)
    expect(len(c.C, c.W)).toBeCloseTo(8.7, 0)
    expect(len(c.k0, c.k1)).toBeCloseTo(4.25, 1)
    expect(c.tower).toHaveLength(4)
    // the party wall with student center west is the long straight bit behind
    expect(len(c.scw, c.k1)).toBeGreaterThan(25)
  })

  it('has its doors in the middle of the notch, facing courtland st', () => {
    const [x, z, nx, nz] = bs.door!
    const [k0, k1] = [pts[c.k0]!, pts[c.k1]!]
    expect(x).toBeCloseTo((k0.x + k1.x) / 2, 0)
    expect(z).toBeCloseTo((k0.z + k1.z) / 2, 0)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
  })

  it('puts the gable over the notch and the tower over the roof', () => {
    expect(GABLE.peak).toBeGreaterThan(bs.height)
    expect(GABLE.end).toBeLessThan(bs.height)
    expect(CURTAIN).toBeLessThan(GABLE.end)
    expect(TOWER.eave).toBeGreaterThan(bs.height)
    expect(TOWER.ridge).toBeGreaterThan(TOWER.eave)
    expect(BAY.film).toBeGreaterThan(BAY.y0)
    expect(BAY.film).toBeLessThan(BAY.y1)
  })

  it('has nothing behind the outline under the ceiling', () => {
    // the inside walls are drawn right on the outline up to the ceiling, anything set back
    // there gets their shadow and a line along the ceiling's edge
    for (const geo of Object.values(parts)) {
      const pos = geo.getAttribute('position')
      for (let i = 0; i < pos.count; i += 3) {
        const ys = [0, 1, 2].map((k) => pos.getY(i + k))
        if (Math.max(...ys) > CEILING - 0.01) continue
        const p = {
          x: (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
          z: (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
        }
        if (pointInPolygon(p, pts)) expect(toOutline(p)).toBeLessThan(0.02)
      }
    }
  })

  it('has its name on the plaza side', () => {
    expect(signs).toHaveLength(1)
    expect(signs[0]!.text).toBe('UNIVERSITY BOOKSTORE')
    expect(signs[0]!.y).toBeGreaterThan(ROWS[1]![1])
    expect(signs[0]!.y).toBeLessThan(ROWS[2]![0])
  })

  it('is left out of the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => !b.landmark))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
  })

  it('stays a few thousand triangles', () => {
    let triangles = 0
    for (const g of Object.values(parts)) triangles += g.getAttribute('position').count / 3
    expect(triangles).toBeLessThan(5000)
  })
})
