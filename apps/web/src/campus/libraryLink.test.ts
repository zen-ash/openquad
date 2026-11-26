import type * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../game/collision'
import { baseOf } from '../game/surface'
import { fromElevation, heightAt } from '../game/terrain'
import campus from './campus.json'
import { buildingsGeometry } from './geometry'
import { clip, edges, frame, parts as collect, pt } from './landmark'
import { libraryLink, LOW_TOP, SOFFIT, STEP, TOP } from './libraryLink'
import { librarySouthGeometry, type LibrarySouthData, type Part } from './librarySouth'

const ls = campus.buildings.find((b) => b.name === 'Library South') as LibrarySouthData
const north = campus.buildings.find((b) => b.name === 'Library North')!
const link = campus.buildings.find(
  (b) => (b.landmark as { with?: string } | undefined)?.with === 'Library South' && b.minHeight,
)!
const outline = link.points.map(pt)
const base = baseOf(ls)
const { add, merged } = collect<Part>()
const signs = libraryLink(add, ls.landmark!.link!, base)
const parts = merged()

// distance from p to the segment ab, and how far along it
const onSegment = (p: { x: number; z: number }, a: number[], b: number[]) => {
  const [dx, dz] = [b[0]! - a[0]!, b[1]! - a[1]!]
  const l = Math.hypot(dx, dz)
  const t = ((p.x - a[0]!) * dx + (p.z - a[1]!) * dz) / l
  return t > -0.05 && t < l + 0.05 && Math.abs((p.x - a[0]!) * dz - (p.z - a[1]!) * dx) / l < 0.2
}
const onOutline = (p: { x: number; z: number }, points: number[][]) =>
  points.some((a, i) => onSegment(p, a, points[(i + 1) % points.length]!))

const ys = (geo: THREE.BufferGeometry) => {
  const pos = geo.getAttribute('position')
  return Array.from({ length: pos.count }, (_, i) => pos.getY(i))
}

describe('library link', () => {
  it('spans decatur street from library north to library south, square to the street', () => {
    const box = (north.landmark as { box: number[][] }).box
    // two corners on library north's wall, the rest on library south
    expect(outline.filter((p) => onOutline(p, box))).toHaveLength(2)
    expect(outline.filter((p) => onOutline(p, ls.points))).toHaveLength(4)
    // 16.9m along the street (lidar), both ends across it
    const f = frame(outline[0]!, outline[1]!)
    expect(f.len).toBeCloseTo(16.9, 0)
    expect(Math.abs(f.aOf(outline[2]!) - f.len)).toBeLessThan(0.2)
    expect(Math.abs(f.aOf(outline.at(-1)!))).toBeLessThan(0.3)
  })

  it('is drawn with library south, not in the regular buildings mesh', () => {
    const all = buildingsGeometry(campus.buildings)
    const rest = buildingsGeometry(campus.buildings.filter((b) => b !== link))
    expect(all.getAttribute('position').count).toBe(rest.getAttribute('position').count)
    // and it's drawn in the parts library south has
    const whole = librarySouthGeometry(ls).parts
    expect(whole.link.getAttribute('position').count).toBe(
      parts.link.getAttribute('position').count,
    )
  })

  it('hangs its soffit over the street with a truck high clearance', () => {
    const bottom = Math.min(...ys(parts.metal))
    expect(bottom).toBeCloseTo(fromElevation(SOFFIT) - base)
    // the street under it, lidar says 311.2-312.0m
    let ground = -Infinity
    for (let i = 0; i <= 10; i++)
      for (let j = 0; j <= 10; j++) {
        const [a, b, c] = [outline[0]!, outline[1]!, outline[2]!]
        const p = {
          x: a.x + ((b.x - a.x) * i) / 10 + ((c.x - b.x) * j) / 10,
          z: a.z + ((b.z - a.z) * i) / 10 + ((c.z - b.z) * j) / 10,
        }
        if (pointInPolygon(p, outline)) ground = Math.max(ground, heightAt(p.x, p.z))
      }
    expect(fromElevation(SOFFIT) - ground).toBeGreaterThan(5)
    // and the map knows it's up there, so you walk under it
    expect(link.minHeight).toBeGreaterThan(5)
  })

  it('has the low part along the classroom south side and the tall one behind it', () => {
    // the pavers are the roofs and the soffit under it
    const roofs = [...new Set(ys(parts.pavers).map((y) => Math.round(y * 100) / 100))].filter(
      (y) => y > fromElevation(SOFFIT) - base + 0.1,
    )
    expect(roofs.sort((a, b) => a - b)).toEqual(
      [LOW_TOP, TOP].map((e) => Math.round((fromElevation(e) - base) * 100) / 100),
    )
    expect(Math.max(...ys(parts.metal))).toBeCloseTo(fromElevation(TOP) - base)
    expect(STEP).toBeLessThan(frame(outline[0]!, outline[1]!).len / 2)
  })

  it('only has glass on its ends along the street, facing out', () => {
    const pos = parts.link.getAttribute('position')
    const normal = parts.link.getAttribute('normal')
    const f = frame(outline[0]!, outline[1]!)
    // over the low part's roof the tall part's glass faces out over it
    const tall = clip(outline, (p) => f.aOf(p) - STEP)
    const low = fromElevation(LOW_TOP) - base
    let checked = 0
    for (let i = 0; i < pos.count; i += 6) {
      const n = { x: normal.getX(i), z: normal.getZ(i) }
      expect(Math.abs(n.x * f.along.x + n.z * f.along.z)).toBeGreaterThan(0.99)
      const p = { x: (pos.getX(i) + pos.getX(i + 1)) / 2, z: (pos.getZ(i) + pos.getZ(i + 1)) / 2 }
      const shape = pos.getY(i) > low - 0.01 ? tall : outline
      expect(pointInPolygon({ x: p.x + n.x * 0.3, z: p.z + n.z * 0.3 }, shape)).toBe(false)
      checked++
    }
    expect(checked).toBeGreaterThanOrEqual(8)
  })

  it('casts a shadow through its glass, nothing behind it shows the sky', () => {
    expect(librarySouthGeometry(ls).noShadow).not.toContain('link')
    // a sheet over the soffit closes it from under (the soffit's pavers don't cast)
    const area = edges(outline).reduce((s, e) => s + e.p.x * e.q.z - e.q.x * e.p.z, 0) / 2
    const pos = parts.metal.getAttribute('position')
    const normal = parts.metal.getAttribute('normal')
    let under = 0
    for (let i = 0; i < pos.count; i += 3) {
      if (normal.getY(i) > -0.99) continue
      const [a, b, c] = [0, 1, 2].map((k) => [pos.getX(i + k), pos.getZ(i + k)]) as number[][]
      under +=
        Math.abs((b![0]! - a![0]!) * (c![1]! - a![1]!) - (c![0]! - a![0]!) * (b![1]! - a![1]!)) / 2
    }
    expect(under).toBeGreaterThan(Math.abs(area) - 0.01)
  })
  it('puts the walkway over decatur street a deck up, with its sign toward classroom south', () => {
    const walk = campus.paths.find(
      (p) => p.bridge && p.points.some(([x, z]) => Math.hypot(x! + 159, z! - 160.2) < 0.5),
    )!
    // the deck the game walks on (decks.json) is the lidar's, the box is drawn just under it
    expect(walk.points.every((p) => p[2] === 318)).toBe(true)
    const deck = ys(parts.stone).filter((y) => Math.abs(y - (fromElevation(317.98) - base)) < 0.01)
    expect(deck.length).toBeGreaterThan(0)
    const [sign] = signs
    expect(sign!.text).toBe('GEORGIA STATE UNIVERSITY')
    // facing back along the street, toward the 2019 photos' camera
    const f = frame(outline[0]!, outline[1]!)
    expect(Math.sin(sign!.rot) * f.along.x + Math.cos(sign!.rot) * f.along.z).toBeLessThan(-0.99)
    // and over the street, between the two sidewalks
    expect(pointInPolygon({ x: sign!.x, z: sign!.z }, outline)).toBe(false)
  })
})
