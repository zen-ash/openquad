import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import {
  BOTTOM,
  COLUMNS,
  GRILLES,
  RISE,
  rows,
  SHORT,
  studentCenterWestGeometry,
  TALL,
  UPPER,
  type StudentCenterWestData,
} from './studentCenterWest'

const scw = campus.buildings.find((b) => b.name === 'Student Center West') as StudentCenterWestData
const { parts, signs } = studentCenterWestGeometry(scw)
const pts = scw.points.map(([x, z]) => ({ x: x!, z: z! }))
const [sw, ne] = scw.landmark!.front.map(([x, z]) => ({ x: x!, z: z! })) as [
  { x: number; z: number },
  { x: number; z: number },
]
const box = (part: keyof typeof parts) => {
  parts[part].computeBoundingBox()
  return parts[part].boundingBox!
}

describe('student center west', () => {
  it('is 5 tall rows of marble and 4 short ones, plus what shows of the bottom one', () => {
    expect(scw.height).toBeCloseTo(BOTTOM + 5 * TALL + 4 * SHORT)
    const all = rows(0, scw.height)
    expect(all.filter((r) => r.part === 'tall')).toHaveLength(5)
    expect(all.at(-1)!.part).toBe('tall')
    expect(all.at(-1)!.y1).toBeCloseTo(scw.height)
  })

  it('has the block on the roof 3.7m higher, set back from courtland street', () => {
    expect(box('marble').max.y).toBeCloseTo(scw.height + RISE)
    const roof = parts.roof.getAttribute('position')
    const heights = new Set<number>()
    for (let i = 0; i < roof.count; i++) heights.add(Math.round(roof.getY(i) * 10) / 10)
    expect([...heights].sort((a, b) => a - b)).toEqual(
      [scw.height - 0.6, scw.height + RISE - 0.6].map((y) => Math.round(y * 10) / 10),
    )
    expect(UPPER[2]).toBeLessThan(-5)
  })

  it('is about 78 by 34m, like on the satellite', () => {
    expect(Math.hypot(ne.x - sw.x, ne.z - sw.z)).toBeCloseTo(78, 0)
    // the far side from courtland street, square to it
    const len = Math.hypot(ne.x - sw.x, ne.z - sw.z)
    const out = { x: (ne.z - sw.z) / len, z: -(ne.x - sw.x) / len }
    const deepest = Math.min(...pts.map((p) => (p.x - sw.x) * out.x + (p.z - sw.z) * out.z))
    expect(deepest).toBeCloseTo(-35, 0)
  })

  it('has its front door under "66" on courtland street', () => {
    const [x, z, nx, nz] = scw.door!
    // facing northwest, toward library north. east is +x, north is -z
    expect(nx).toBeLessThan(-0.5)
    expect(nz).toBeLessThan(-0.5)
    // 6.5m from the bookstore end
    expect(Math.hypot(x! - ne.x, z! - ne.z)).toBeCloseTo(6.5, 1)
    expect(pointInPolygon({ x: x! + nx! * 0.5, z: z! + nz! * 0.5 }, pts)).toBe(false)
    expect(pointInPolygon({ x: x! - nx! * 0.5, z: z! - nz! * 0.5 }, pts)).toBe(true)
    expect(signs.map((s) => s.text)).toContain('66')
  })

  it('has every outside marble wall facing out', () => {
    let checked = 0
    {
      const pos = parts.marble.getAttribute('position')
      const normal = parts.marble.getAttribute('normal')
      for (let i = 0; i < pos.count; i += 6) {
        if (Math.abs(normal.getY(i)) > 0.5) continue
        const n = { x: normal.getX(i), z: normal.getZ(i) }
        const p = { x: (pos.getX(i) + pos.getX(i + 1)) / 2, z: (pos.getZ(i) + pos.getZ(i + 1)) / 2 }
        // only walls lying along the outline
        const along = pts.some((a, k) => {
          const b = pts[(k + 1) % pts.length]!
          const l = Math.hypot(b.x - a.x, b.z - a.z)
          const t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / (l * l)
          const d = Math.abs((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / l
          return t > 0 && t < 1 && d < 0.01
        })
        if (!along) continue
        checked++
        expect(pointInPolygon({ x: p.x + n.x * 0.3, z: p.z + n.z * 0.3 }, pts)).toBe(false)
      }
    }
    expect(checked).toBeGreaterThan(100)
  })

  it('has a slot window every other tall row in each column on decatur street', () => {
    const pane = parts.glass.getAttribute('aPane')
    let slots = 0
    // six vertices per window
    for (let i = 0; i < pane.count; i += 6) if (Math.abs(pane.getX(i) - 0.2) < 0.01) slots++
    expect(slots).toBe(COLUMNS.length * 2)
    expect(GRILLES).toHaveLength(5)
  })

  it('has its name by the doors, with a blue square instead of the logo', () => {
    expect(signs.filter((s) => s.text === 'STUDENT CENTER\nWEST').length).toBeGreaterThan(0)
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
