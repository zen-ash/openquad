import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CEILING, DOOR_WIDTH } from '../game/interiors'
import { baseOf, floorOf } from '../game/surface'
import campus from './campus.json'
import { edges, flat, pt, wallQuad } from './landmark'
import { casts, landmarkMaterials } from './landmarkMaterials'
import { landmarkGeometry, type LandmarkGeometry } from './landmarks'

// checks every building drawn by hand has to pass. the ones drawn with another (classroom
// south's wing) have no name of their own
const landmarks = campus.buildings.filter((b) => b.landmark && b.name)

describe.each(landmarks.map((b) => [b.name!, b] as const))('%s', (_, b) => {
  const geo = landmarkGeometry(b)!

  it('is drawn by hand', () => {
    expect(geo).not.toBeNull()
  })

  // three only draws the side a triangle's corners go counterclockwise from, so the
  // winding has to agree with the normal or a wall is invisible from outside
  it('has every triangle wound the same way as its normal', () => {
    for (const part of Object.values(geo.parts)) {
      const pos = part.getAttribute('position')
      const normal = part.getAttribute('normal')
      for (let i = 0; i < pos.count; i += 3) {
        const v = [0, 1, 2].map((k) => [pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k)])
        const u = [0, 1, 2].map((k) => v[1]![k]! - v[0]![k]!)
        const w = [0, 1, 2].map((k) => v[2]![k]! - v[0]![k]!)
        const cross = [
          u[1]! * w[2]! - u[2]! * w[1]!,
          u[2]! * w[0]! - u[0]! * w[2]!,
          u[0]! * w[1]! - u[1]! * w[0]!,
        ]
        const dot =
          cross[0]! * normal.getX(i) + cross[1]! * normal.getY(i) + cross[2]! * normal.getZ(i)
        expect(dot).toBeGreaterThan(0)
      }
    }
  })

  it('has inside walls the whole way round, except the doorway', () => {
    // a parking deck is open, its floors and sides are what you see from inside too. one with
    // no door (the hurt building and the skyline towers aren't gsu's) has no inside at all
    if (geo.open || !b.door) {
      expect(geo.inside.solid.length + geo.inside.glass.length).toBe(0)
      return
    }
    // at waist height, add up how much wall (or window) there is
    let length = 0
    for (const g of [...geo.inside.solid, ...geo.inside.glass]) {
      const pos = g.getAttribute('position')
      const ys = [0, 1, 2, 4].map((i) => pos.getY(i))
      if (Math.min(...ys) > 1.1 || Math.max(...ys) < 1.1) continue
      const xs = [0, 1, 2, 4].map((i) => [pos.getX(i), pos.getZ(i)] as const)
      let widest = 0
      for (const p of xs)
        for (const q of xs) widest = Math.max(widest, Math.hypot(p[0] - q[0], p[1] - q[1]))
      length += widest
    }
    const pts = b.points
    const perimeter = pts.reduce((sum, p, i) => {
      const q = pts[(i + 1) % pts.length]!
      return sum + Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!)
    }, 0)
    expect(length).toBeCloseTo(perimeter - DOOR_WIDTH, 0)
  })

  // a parking deck is open, the sun goes through it for real
  it.skipIf(!!geo.open)('keeps a low sun from shining through it', () => {
    const { lines, leaks } = sunThrough(b)
    const parts = new Map<string, number>()
    for (const l of leaks) for (const p of new Set(l.parts)) parts.set(p, (parts.get(p) ?? 0) + 1)
    const first = leaks[0]
    const where = first
      ? `, first at ${first.at.toArray().map((x) => x.toFixed(1))} from ${first.sun.toArray().map((x) => x.toFixed(2))}`
      : ''
    // a few still get through where two blocks meet at a corner or under a coping: specks, not
    // rows of windows (the empty buildings let 2-20% of them through)
    expect(
      leaks.length,
      `${leaks.length} of ${lines} lines, through ${[...parts].map(([p, n]) => `${p} ${n}`).join(', ')}${where}`,
    ).toBeLessThanOrEqual(lines / 2000)
  })
})

// a low sun (winter, mornings, evenings) shines in the windows on one side of a building and
// out the other's. the shadow pass only draws the faces turned away from the sun (three
// draws a front side material's back side there), so it's the far side that has to stop it,
// and the windows there are glass that doesn't cast. above the ground floor's ceiling the
// buildings are hollow: rows of sunny patches on the street in their shadow
const SUNS = [15, 25, 35, 45].flatMap((elevation, i) =>
  Array.from({ length: 12 }, (_, k) => {
    const az = ((k * 30 + i * 7) * Math.PI) / 180
    const el = (elevation * Math.PI) / 180
    return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az))
  }),
)

type Flat = [[number, number], [number, number], [number, number]]
type Tri = {
  v: THREE.Vector3[]
  normal: THREE.Vector3
  casts: boolean
  clear: boolean
  part: string
}

function trianglesOf(geo: LandmarkGeometry, mats: Record<string, THREE.Material>) {
  const tris: Tri[] = []
  const add = (g: THREE.BufferGeometry, part: string, cast: boolean, clear: boolean) => {
    const pos = g.getAttribute('position')
    const index = g.getIndex()
    const count = index ? index.count : pos.count
    for (let i = 0; i < count; i += 3) {
      const v = [0, 1, 2].map((k) => {
        const j = index ? index.getX(i + k) : i + k
        return new THREE.Vector3(pos.getX(j), pos.getY(j), pos.getZ(j))
      })
      const normal = v[1]!.clone().sub(v[0]!).cross(v[2]!.clone().sub(v[0]!))
      tris.push({ v, normal, casts: cast, clear, part })
    }
  }
  for (const [part, g] of Object.entries(geo.parts))
    add(g, part, casts(geo, mats, part), mats[part]!.transparent)
  return { tris, add }
}

const inside = (p: number[][], x: number, z: number) => {
  let hit = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [ax, az] = p[i]!
    const [bx, bz] = p[j]!
    if (az! > z !== bz! > z && x < ((bx! - ax!) * (z - az!)) / (bz! - az!) + ax!) hit = !hit
  }
  return hit
}
const edgeDistance = (p: number[][], x: number, z: number) =>
  Math.min(
    ...p.map((a, i) => {
      const b = p[(i + 1) % p.length]!
      const ex = b[0]! - a[0]!
      const ez = b[1]! - a[1]!
      const t = Math.max(
        0,
        Math.min(1, ((x - a[0]!) * ex + (z - a[1]!) * ez) / (ex * ex + ez * ez)),
      )
      return Math.hypot(x - a[0]! - ex * t, z - a[1]! - ez * t)
    }),
  )

// lines of sunlight through points inside the building (and the bits drawn with it), from
// above the ground floor's ceiling up, to where they land on the ground outside. one that
// goes through the building's walls or windows and never meets a face that casts is a leak
function sunThrough(b: (typeof landmarks)[number]) {
  const geo = landmarkGeometry(b)!
  const base = baseOf(b)
  const { tris, add } = trianglesOf(geo, landmarkMaterials[b.name!]!)
  const group = campus.buildings.filter((x) => x === b || x.landmark?.with === b.name)
  // the ground floor's ceiling and inside walls cast (Interiors.tsx), all the way round
  for (const x of group) {
    if (!x.door) continue
    const floor = floorOf(x) - base
    add(flat(x.points.map(pt), floor + CEILING, false), 'ceiling', true, false)
    for (const { p, q, out } of edges(x.points.map(pt)))
      add(wallQuad(p, q, floor, floor + CEILING, { x: -out.x, z: -out.z }), 'inside', true, false)
  }
  const standing = group.filter((x) => !x.minHeight).map((x) => x.points)
  // the other hand-built buildings, at their heights here: sun that goes on into one of
  // those is up to that one to stop (the lofts and their deck, the arena and the practice
  // facility, petit's bridge into the research science center)
  const others = campus.buildings
    .filter((x) => x.landmark && !group.includes(x) && landmarkGeometry(x.name ? x : b) !== null)
    .map((x) => {
      const owner = x.name ? x : campus.buildings.find((y) => y.name === x.landmark?.with)!
      const lift = baseOf(owner) - base
      return { points: x.points, y0: lift + (x.minHeight ?? -100), y1: lift + x.height }
    })
  const intoAnother = (q: THREE.Vector3, sun: THREE.Vector3, lands: number) => {
    for (let t = 0; t > lands; t -= 0.5) {
      const p = q.clone().addScaledVector(sun, t)
      if (others.some((o) => p.y > o.y0 && p.y < o.y1 && inside(o.points, p.x, p.z))) return true
    }
    return false
  }

  // points 4m apart, 3m up, a meter in from the walls (windows at a corner can let some
  // light through for real)
  let seed = 1
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  let points: THREE.Vector3[] = []
  for (const x of group) {
    const y0 = (x.door ? floorOf(x) - base + CEILING : (x.minHeight ?? 0)) + 0.3
    const xs = x.points.map((p) => p[0]!)
    const zs = x.points.map((p) => p[1]!)
    for (let px = Math.min(...xs); px < Math.max(...xs); px += 4)
      for (let pz = Math.min(...zs); pz < Math.max(...zs); pz += 4)
        for (let py = y0; py < x.height - 0.3; py += 3) {
          const q = new THREE.Vector3(px + random() * 4, py + random() * 3, pz + random() * 4)
          if (q.y < x.height - 0.3 && inside(x.points, q.x, q.z))
            if (edgeDistance(x.points, q.x, q.z) > 1) points.push(q)
        }
  }

  // only points under the building's roof: not the air over a lower part of it, or a
  // court, or a glass lobby (the sun shining into one of those is right)
  const roofs = new Map<string, number[]>()
  tris.forEach((t, i) => {
    if (t.clear || t.normal.y <= 0) return
    const xs = t.v.map((v) => v.x)
    const zs = t.v.map((v) => v.z)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.floor(Math.max(...xs)); x++)
      for (let z = Math.floor(Math.min(...zs)); z <= Math.floor(Math.max(...zs)); z++)
        roofs.set(`${x},${z}`, [...(roofs.get(`${x},${z}`) ?? []), i])
  })
  const underRoof = (q: THREE.Vector3) =>
    (roofs.get(`${Math.floor(q.x)},${Math.floor(q.z)}`) ?? []).some((i) => {
      const [a, b, c] = tris[i]!.v
      const area = (b!.x - a!.x) * (c!.z - a!.z) - (c!.x - a!.x) * (b!.z - a!.z)
      const w = [
        (b!.x - q.x) * (c!.z - q.z) - (c!.x - q.x) * (b!.z - q.z),
        (c!.x - q.x) * (a!.z - q.z) - (a!.x - q.x) * (c!.z - q.z),
        (a!.x - q.x) * (b!.z - q.z) - (b!.x - q.x) * (a!.z - q.z),
      ].map((x) => x / area)
      return w.every((x) => x >= 0) && w[0]! * a!.y + w[1]! * b!.y + w[2]! * c!.y > q.y
    })
  points = points.filter(underRoof)

  let lines = 0
  const leaks: { at: THREE.Vector3; sun: THREE.Vector3; parts: string[] }[] = []
  for (const sun of SUNS) {
    // looking down the sunlight every line is a point and every triangle a triangle: put
    // them in 1m squares
    const e1 = new THREE.Vector3(0, 1, 0).cross(sun).normalize()
    const e2 = sun.clone().cross(e1)
    const flatTris = tris.map((t) => t.v.map((v) => [v.dot(e1), v.dot(e2)]) as Flat)
    const cells = new Map<string, number[]>()
    flatTris.forEach((t, i) => {
      const us = t.map((p) => p[0])
      const vs = t.map((p) => p[1])
      for (let u = Math.floor(Math.min(...us)); u <= Math.floor(Math.max(...us)); u++)
        for (let v = Math.floor(Math.min(...vs)); v <= Math.floor(Math.max(...vs)); v++) {
          const key = `${u},${v}`
          const list = cells.get(key)
          if (list) list.push(i)
          else cells.set(key, [i])
        }
    })
    for (const q of points) {
      const u = q.dot(e1)
      const v = q.dot(e2)
      // where along the line (up toward the sun) it crosses each triangle
      const hits: { t: number; tri: Tri }[] = []
      for (const i of cells.get(`${Math.floor(u)},${Math.floor(v)}`) ?? []) {
        const t = flatTris[i]!
        const area =
          (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])
        if (Math.abs(area) < 1e-9) continue
        // barycentric, and how far outside each edge it is. a line right on the edge between
        // two triangles hits, and one that grazes a wall that casts by a few cm doesn't get
        // past it in the shadow map either (window sills under the glass)
        const tri = tris[i]!
        const w = [0, 1, 2].map((k) => {
          const a = t[(k + 1) % 3]!
          const c = t[(k + 2) % 3]!
          return ((c[0] - a[0]) * (v - a[1]) - (c[1] - a[1]) * (u - a[0])) / area
        })
        const off = w.map((x, k) => {
          const a = t[(k + 1) % 3]!
          const c = t[(k + 2) % 3]!
          return (-x * Math.abs(area)) / Math.hypot(c[0] - a[0], c[1] - a[1])
        })
        const near = tri.casts && tri.normal.dot(sun) < 0 ? 0.03 : 1e-4
        if (off.some((x) => x > near)) continue
        const sum = w.reduce((s, x) => s + Math.max(x, 0), 0)
        const at = new THREE.Vector3()
        tri.v.forEach((p, k) => at.addScaledVector(p, Math.max(w[k]!, 0) / sum))
        if (at.y > -0.01) hits.push({ t: at.sub(q).dot(sun), tri })
      }
      // where the light that came through here lands: the first thing outside the building
      // below it facing the sun (a plaza, a lower roof next door; not its own sills and
      // ledges), or the ground. on the building's own floor nobody sees it
      const out = (h: { t: number }) => {
        const p = q.clone().addScaledVector(sun, h.t)
        return !standing.some((s) => inside(s, p.x, p.z) || edgeDistance(s, p.x, p.z) < 0.5)
      }
      let lands = hits
        .filter((h) => h.t <= 0 && !h.tri.clear && h.tri.normal.dot(sun) > 0 && out(h))
        .reduce((best, h) => Math.max(best, h.t), -Infinity)
      if (lands === -Infinity) {
        lands = -q.y / sun.y
        if (!out({ t: lands })) continue
      }
      lines++
      // between there and the sun: anything that casts stops it, and if it went through a
      // wall or window of the building to get there it's a leak
      const above = hits.filter((h) => h.t > lands + 1e-4)
      if (above.some((h) => h.tri.casts && h.tri.normal.dot(sun) < 0)) continue
      const through = above.filter((h) => !h.tri.clear && h.t > lands + 0.5).map((h) => h.tri.part)
      if (through.length && !intoAnother(q, sun, lands)) leaks.push({ at: q, sun, parts: through })
    }
  }
  return { lines, leaks }
}
