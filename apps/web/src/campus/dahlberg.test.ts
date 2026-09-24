import { describe, expect, it } from 'vitest'
import campus from './campus.json'
import { dahlbergGeometry, WING, type DahlbergData } from './dahlberg'

const hall = campus.buildings.find((b) => b.name === 'Dahlberg Hall') as DahlbergData
const { parts, signs } = dahlbergGeometry(hall)

describe('dahlberg hall', () => {
  it('is 18m tall at the corner and lower past the entrance', () => {
    parts.marble.computeBoundingBox()
    expect(parts.marble.boundingBox!.max.y).toBeCloseTo(18)
    parts.roof.computeBoundingBox()
    expect(parts.roof.boundingBox!.min.y).toBeCloseTo(WING - 0.05)
  })

  it('has its front door on courtland street, facing hurt park', () => {
    const [x, z, nx, nz] = hall.door!
    // hurt park is northwest of it. east is +x, north is -z
    expect(nx).toBeLessThan(-0.5)
    expect(nz).toBeLessThan(-0.5)
    expect(Math.hypot(x!, z!)).toBeLessThan(80)
  })

  it('has three big windows on each side of the corner', () => {
    const pane = parts.bigGlass.getAttribute('aPane')
    let tall = 0
    // six vertices per window
    for (let i = 0; i < pane.count; i += 6) if (pane.getY(i) > 9) tall++
    expect(tall).toBe(6)
  })

  it('has its name up on the corner', () => {
    expect(signs.map((s) => s.text)).toEqual(['DAHLBERG HALL'])
  })
})
