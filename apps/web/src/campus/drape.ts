import * as THREE from 'three'
import { pointInPolygon } from '../game/collision'
import { GRID, normalAt, type Grid } from '../game/terrain'

type Outline = { points: number[][] }

// keep the part of a polygon where s(p) >= 0 (s is linear). a point is [x, z, ...numbers that
// go along with it]
function clip<T extends number[]>(poly: T[], s: (p: T) => number) {
  const out: T[] = []
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]!
    const [sa, sb] = [s(a), s(b)]
    if (sa >= 0) out.push(a)
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb)
      out.push(a.map((v, k) => v + (b[k]! - v) * t) as T)
    }
  })
  return out
}

// does the segment a -> b cross the square from x0, z0, size on a side
function crosses(a: number[], b: number[], x0: number, z0: number, size: number) {
  const [dx, dz] = [b[0]! - a[0]!, b[1]! - a[1]!]
  let [t0, t1] = [0, 1]
  for (const [p, q] of [
    [-dx, a[0]! - x0],
    [dx, x0 + size - a[0]!],
    [-dz, a[1]! - z0],
    [dz, z0 + size - a[1]!],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false
    } else if (p < 0) t0 = Math.max(t0, q / p)
    else t1 = Math.min(t1, q / p)
  }
  return t0 <= t1
}

// the ground stops at these outlines (buildings you can walk into: on a slope it came up
// through their floors by the uphill walls). each square of the grid gets the outline edges
// that cross it, and a piece of ground in that square is cut along them, the bits inside left
// out. still on the grid's triangles, so it's the same heights
function carver(grid: Grid, outlines: Outline[]) {
  type Edge = { a: number[]; b: number[]; owner: { x: number; z: number }[] }
  const squares = new Map<number, Edge[]>()
  for (const { points } of outlines) {
    const owner = points.map(([x, z]) => ({ x: x!, z: z! }))
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length]!
      const [c0, c1] = [grid.column(Math.min(a[0]!, b[0]!)), grid.column(Math.max(a[0]!, b[0]!))]
      const [r0, r1] = [grid.row(Math.min(a[1]!, b[1]!)), grid.row(Math.max(a[1]!, b[1]!))]
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++) {
          if (!crosses(a, b, grid.x(c), grid.z(r), grid.cell)) continue
          const key = r * 100000 + c
          if (!squares.has(key)) squares.set(key, [])
          squares.get(key)!.push({ a, b, owner })
        }
    })
  }
  return {
    crossed: (c: number, r: number) => squares.has(r * 100000 + c),
    carve<T extends number[]>(poly: T[], c: number, r: number) {
      const edges = squares.get(r * 100000 + c)
      if (!edges) return [poly]
      let pieces = [poly]
      for (const { a, b } of edges) {
        const s = (p: T) => (b[0]! - a[0]!) * (p[1]! - a[1]!) - (b[1]! - a[1]!) * (p[0]! - a[0]!)
        pieces = pieces
          .flatMap((p) => [clip(p, s), clip(p, (q) => -s(q))])
          .filter((p) => p.length >= 3)
      }
      const owners = new Set(edges.map((e) => e.owner))
      // slivers from cuts through a corner are nothing, leave them out
      const area = (p: T[]) =>
        p.reduce((t, q, i) => {
          const n = p[(i + 1) % p.length]!
          return t + q[0]! * n[1]! - n[0]! * q[1]!
        }, 0) / 2
      return pieces.filter((p) => {
        if (Math.abs(area(p)) < 1e-4) return false
        const m = {
          x: p.reduce((t, q) => t + q[0]!, 0) / p.length,
          z: p.reduce((t, q) => t + q[1]!, 0) / p.length,
        }
        return ![...owners].some((o) => pointInPolygon(m, o))
      })
    },
  }
}

// lays flat ground geometry (roads, lawns, plazas...) onto the ground's real shape. every
// triangle is cut along the terrain's grid and its diagonals first, the same triangles the
// ground itself is made of (terrainGeometry), so each piece is flat on the ground with no
// gaps: cutting by size instead split the same edge differently on each side of it.
// only the grid's squares keep() wants (by their middle) are done, and nothing inside cut
export function drape(
  source: THREE.BufferGeometry,
  lift: number,
  grid: Grid = GRID,
  keep: (x: number, z: number) => boolean = () => true,
  cut: Outline[] = [],
) {
  const { carve } = carver(grid, cut)
  const geo = source.index ? source.toNonIndexed() : source
  const names = Object.keys(geo.attributes).filter((n) => n !== 'position' && n !== 'normal')
  const attrs = names.map((n) => geo.getAttribute(n) as THREE.BufferAttribute)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const outPos: number[] = []
  const outAttrs = attrs.map(() => [] as number[])
  const index: number[] = []

  // a corner of a clipped piece: x, z and its weights on the source triangle's corners
  type P = [x: number, z: number, wa: number, wb: number, wc: number]
  // corners shared by the pieces either side of a grid line are one vertex: the same spot
  // (to a millimeter) with the same numbers. a quarter of the vertices, and the gpu draws
  // the ground twice a frame (the depth prepass and the scene)
  const seen = new Map<number, number[]>()
  const values: number[] = []
  const all: number[] = []
  const stride = attrs.reduce((n, a) => n + a.itemSize, 0)
  const emit = (t: number, p: P) => {
    values.length = 0
    for (const a of attrs)
      for (let c = 0; c < a.itemSize; c++) {
        const v = (i: number) => a.array[(t * 3 + i) * a.itemSize + c]!
        values.push(v(0) * p[2] + v(1) * p[3] + v(2) * p[4])
      }
    const key = (Math.round(p[0] * 1000) + 2 ** 20) * 2 ** 21 + Math.round(p[1] * 1000) + 2 ** 20
    const bucket = seen.get(key)
    if (bucket)
      for (const i of bucket)
        if (values.every((v, k) => Math.abs(all[i * stride + k]! - v) < 1e-4)) return i
    const i = outPos.length / 3
    outPos.push(p[0], grid.height(p[0], p[1]) + lift, p[1])
    let k = 0
    attrs.forEach((a, n) => {
      for (let c = 0; c < a.itemSize; c++) outAttrs[n]!.push(values[k++]!)
    })
    all.push(...values)
    if (bucket) bucket.push(i)
    else seen.set(key, [i])
    return i
  }
  for (let t = 0; t < pos.count / 3; t++) {
    const [ax, az, bx, bz, cx, cz] = [0, 1, 2].flatMap((i) => [
      pos.getX(t * 3 + i),
      pos.getZ(t * 3 + i),
    ]) as number[]
    // clipping keeps the corners' order, so the pieces face the same way as the source
    const tri: P[] = [
      [ax!, az!, 1, 0, 0],
      [bx!, bz!, 0, 1, 0],
      [cx!, cz!, 0, 0, 1],
    ]
    const [u0, u1] = [grid.column(Math.min(ax!, bx!, cx!)), grid.column(Math.max(ax!, bx!, cx!))]
    const [v0, v1] = [grid.row(Math.min(az!, bz!, cz!)), grid.row(Math.max(az!, bz!, cz!))]
    for (let r = v0; r <= v1; r++)
      for (let c = u0; c <= u1; c++) {
        const [x0, z0] = [grid.x(c), grid.z(r)]
        const [x1, z1] = [x0 + grid.cell, z0 + grid.cell]
        if (!keep(x0 + grid.cell / 2, z0 + grid.cell / 2)) continue
        let cellPoly = clip(tri, (p) => p[0] - x0)
        cellPoly = clip(cellPoly, (p) => x1 - p[0])
        cellPoly = clip(cellPoly, (p) => p[1] - z0)
        cellPoly = clip(cellPoly, (p) => z1 - p[1])
        if (cellPoly.length < 3) continue
        // the cell's two triangles meet along its diagonal
        for (const side of [1, -1]) {
          const half = clip(cellPoly, (p) => side * (p[0] - x0 - (p[1] - z0)))
          if (half.length < 3) continue
          for (const piece of carve(half, c, r)) {
            // a fan of triangles over each piece
            const corners = piece.map((p) => emit(t, p))
            for (let k = 1; k + 1 < piece.length; k++) {
              const [a, b, d] = [piece[0]!, piece[k]!, piece[k + 1]!]
              const area = (b[1] - a[1]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[1] - a[1])
              if (Math.abs(area) > 1e-6) index.push(corners[0]!, corners[k]!, corners[k + 1]!)
            }
          }
        }
      }
  }

  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3))
  // the ground's own slope, not the triangle's, so lighting doesn't show where it was cut
  const normals = new Float32Array(outPos.length)
  for (let i = 0; i < outPos.length; i += 3) normals.set(normalAt(outPos[i]!, outPos[i + 2]!), i)
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  names.forEach((n, k) =>
    out.setAttribute(n, new THREE.Float32BufferAttribute(outAttrs[k]!, attrs[k]!.itemSize)),
  )
  out.setIndex(index)
  return out
}

// the ground itself: the terrain's own triangles over the map (the squares keep() wants, on
// grid, cut round the outlines in cut), and if ring, flat out to the horizon from its edge,
// so you don't see where it ends
export function terrainGeometry(
  beyond: number,
  buildings: Outline[],
  {
    grid = GRID,
    keep = () => true,
    ring = true,
    cut = [],
  }: {
    grid?: Grid
    keep?: (x: number, z: number) => boolean
    ring?: boolean
    cut?: Outline[]
  } = {},
) {
  const carving = carver(grid, cut)
  const [first, last] = [grid.column(-grid.half) + 1, grid.column(grid.half) - 1]
  const n = last - first + 1
  // squares with all four corners inside a building are left out: nobody sees them, and on a
  // slope the ground under a building comes up through its floor on the uphill side
  const under = new Set<number>()
  for (const b of buildings) {
    const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
    const xs = outline.map((p) => p.x)
    const zs = outline.map((p) => p.z)
    const [c0, c1] = [grid.column(Math.min(...xs)), grid.column(Math.max(...xs)) + 1]
    const [r0, r1] = [grid.row(Math.min(...zs)), grid.row(Math.max(...zs)) + 1]
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (pointInPolygon({ x: grid.x(c), z: grid.z(r) }, outline)) under.add(r * 100000 + c)
  }
  const hidden = (c: number, r: number) =>
    [0, 1].every((dr) => [0, 1].every((dc) => under.has((r + dr) * 100000 + c + dc)))
  const pos: number[] = []
  const index: number[] = []
  for (let r = first; r <= last; r++)
    for (let c = first; c <= last; c++)
      pos.push(grid.x(c), grid.height(grid.x(c), grid.z(r)), grid.z(r))
  const at = (c: number, r: number) => (r - first) * n + (c - first)
  // each square split along the same diagonal heightAt uses, facing up. the cut ones are
  // their own pieces, added at the end
  const pieces: number[][][] = []
  for (let r = first; r < last; r++)
    for (let c = first; c < last; c++) {
      if (!keep(grid.x(c) + grid.cell / 2, grid.z(r) + grid.cell / 2)) continue
      // a cut one is up to the carving: all its corners can be in buildings with a gap
      // between them
      if (!carving.crossed(c, r)) {
        if (!hidden(c, r))
          index.push(
            at(c, r),
            at(c + 1, r + 1),
            at(c + 1, r),
            at(c, r),
            at(c, r + 1),
            at(c + 1, r + 1),
          )
        continue
      }
      const [x0, z0, x1, z1] = [grid.x(c), grid.z(r), grid.x(c + 1), grid.z(r + 1)]
      for (const tri of [
        [
          [x0, z0],
          [x1, z1],
          [x1, z0],
        ],
        [
          [x0, z0],
          [x0, z1],
          [x1, z1],
        ],
      ])
        pieces.push(...carving.carve(tri, c, r))
    }
  if (ring) {
    // every edge vertex again, pushed straight out
    const edge: [number, number][] = []
    for (let c = first; c < last; c++) edge.push([c, first])
    for (let r = first; r < last; r++) edge.push([last, r])
    for (let c = last; c > first; c--) edge.push([c, last])
    for (let r = last; r > first; r--) edge.push([first, r])
    const outer = pos.length / 3
    edge.forEach(([c, r]) => {
      const [x, z] = [grid.x(c), grid.z(r)]
      const k = beyond / Math.max(Math.abs(x), Math.abs(z))
      pos.push(x * k, grid.height(x, z), z * k)
    })
    edge.forEach(([c, r], i) => {
      const [c2, r2] = edge[(i + 1) % edge.length]!
      const [a, b] = [at(c, r), at(c2, r2)]
      const [fa, fb] = [outer + i, outer + ((i + 1) % edge.length)]
      index.push(a, b, fa, b, fb, fa)
    })
  }
  for (const piece of pieces) {
    const base = pos.length / 3
    for (const [x, z] of piece) pos.push(x!, grid.height(x!, z!), z!)
    for (let k = 1; k + 1 < piece.length; k++) {
      const [a, b, d] = [piece[0]!, piece[k]!, piece[k + 1]!]
      const area = (b[1]! - a[1]!) * (d[0]! - a[0]!) - (b[0]! - a[0]!) * (d[1]! - a[1]!)
      if (Math.abs(area) > 1e-6) index.push(base, base + k, base + k + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(index)
  const normals = new Float32Array(pos.length)
  for (let i = 0; i < pos.length; i += 3) normals.set(normalAt(pos[i]!, pos[i + 2]!), i)
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  return geo
}
