import * as THREE from 'three'
import campus from './campus.json'
import { baseOf } from '../game/surface'
import { terrainAt } from '../game/terrain'
import { edt } from './edt'
import { facadeOf } from './facades'
import { GLASS } from './facade'
import { landmarkGeometry } from './landmarks'
import { landmarkMaterials } from './landmarkMaterials'
import {
  CELL,
  city,
  FIRST,
  GRASS,
  HALF,
  KINDS,
  LEVEL,
  PAVED,
  ROAD,
  SIZE,
  TREE,
} from './reflections'

// draws the map the glass reflections are traced through (reflections.ts), once, when the
// hand-built buildings are made (Landmarks.tsx)

type Building = (typeof campus.buildings)[number] & { minHeight?: number; landmark?: unknown }

// a fine square's middle, in campus coords
const middle = (i: number) => -HALF + (i + 0.5) * CELL
const square = (v: number) => Math.floor((v + HALF) / CELL)

// what's under everything: streets, sidewalks and plazas, parks (one color each, for which
// is which)
function groundKinds() {
  if (typeof OffscreenCanvas === 'undefined') return null
  const canvas = new OffscreenCanvas(SIZE, SIZE)
  const g = canvas.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  g.setTransform(1 / CELL, 0, 0, 1 / CELL, SIZE / 2, SIZE / 2)
  g.fillStyle = '#f00'
  g.fillRect(-HALF, -HALF, 2 * HALF, 2 * HALF)
  const fill = (rings: number[][][], color: string) => {
    g.fillStyle = color
    for (const ring of rings) {
      g.beginPath()
      ring.forEach(([x, z], i) => (i ? g.lineTo(x!, z!) : g.moveTo(x!, z!)))
      g.fill()
    }
  }
  fill(campus.lots, '#0f0')
  fill([...campus.parks, ...campus.lawns], '#00f')
  g.strokeStyle = '#0f0'
  g.lineCap = 'round'
  for (const { width, points } of campus.roads) {
    g.lineWidth = width
    g.beginPath()
    points.forEach(([x, z], i) => (i ? g.lineTo(x!, z!) : g.moveTo(x!, z!)))
    g.stroke()
  }
  const px = g.getImageData(0, 0, SIZE, SIZE).data
  const kinds = new Uint8Array(SIZE * SIZE)
  for (let i = 0; i < SIZE * SIZE; i++) {
    const [r, gr, b] = [px[i * 4]!, px[i * 4 + 1]!, px[i * 4 + 2]!]
    kinds[i] = b > r && b > gr ? GRASS : gr > r ? ROAD : PAVED
  }
  return kinds
}

// every square of the outline: a row at a time, between where the edges cross it
function eachInside(points: number[][], visit: (i: number) => void) {
  const zs = points.map((p) => p[1]!)
  const [r0, r1] = [square(Math.min(...zs)), square(Math.max(...zs))]
  for (let r = Math.max(0, r0); r <= Math.min(SIZE - 1, r1); r++) {
    const z = middle(r)
    const xs: number[] = []
    points.forEach(([ax, az], k) => {
      const [bx, bz] = points[(k + 1) % points.length] as [number, number]
      if (az! <= z !== bz <= z) xs.push(ax! + ((z - az!) / (bz - az!)) * (bx - ax!))
    })
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k]! + HALF) / CELL - 0.5))
      const c1 = Math.min(SIZE - 1, Math.floor((xs[k + 1]! + HALF) / CELL - 0.5))
      for (let c = c0; c <= c1; c++) visit(r * SIZE + c)
    }
  }
}

// a hand-built building from above: the top of its roofs (the walls are edge on from up
// there), and the average color of its walls
function landmark(
  parts: Record<string, THREE.BufferGeometry>,
  mats: Record<string, THREE.Material>,
  floor: number,
  top: Float32Array,
  what: Uint16Array,
  id: number,
) {
  const wall = new THREE.Color(0, 0, 0)
  let [area, glass] = [0, 0]
  for (const [name, geo] of Object.entries(parts)) {
    const m = mats[name] as THREE.MeshStandardMaterial | undefined
    if (!m) continue
    const isGlass = m.name === 'glass' || m.name === 'clearGlass'
    const p = geo.getAttribute('position').array
    const index = geo.getIndex()?.array
    const count = index ? index.length : p.length / 3
    for (let k = 0; k < count; k += 3) {
      const [i, j, l] = index ? [index[k]!, index[k + 1]!, index[k + 2]!] : [k, k + 1, k + 2]
      const ax = p[i * 3]!
      const ay = p[i * 3 + 1]!
      const az = p[i * 3 + 2]!
      const bx = p[j * 3]! - ax
      const by = p[j * 3 + 1]! - ay
      const bz = p[j * 3 + 2]! - az
      const cx = p[l * 3]! - ax
      const cy = p[l * 3 + 1]! - ay
      const cz = p[l * 3 + 2]! - az
      // twice the area, and twice the area seen from above
      const flat = bx * cz - bz * cx
      const size = Math.hypot(by * cz - bz * cy, flat, bx * cy - by * cx)
      if (size < 1e-6) continue
      if (Math.abs(flat) < 0.3 * size) {
        // a wall
        area += size
        if (isGlass) glass += size
        else {
          wall.r += m.color.r * size
          wall.g += m.color.g * size
          wall.b += m.color.b * size
        }
        continue
      }
      if (m.transparent) continue
      // a roof (or a floor, a step): fill the squares whose middles it covers
      const y = floor + ay + Math.max(0, by, cy)
      const r0 = Math.max(0, square(az + Math.min(0, bz, cz)))
      const r1 = Math.min(SIZE - 1, square(az + Math.max(0, bz, cz)))
      const c0 = Math.max(0, square(ax + Math.min(0, bx, cx)))
      const c1 = Math.min(SIZE - 1, square(ax + Math.max(0, bx, cx)))
      for (let r = r0; r <= r1; r++)
        for (let col = c0; col <= c1; col++) {
          // inside all three edges, in the triangle's own turning direction
          const [x, z] = [middle(col) - ax, middle(r) - az]
          const u = (bx * z - bz * x) * flat
          const v = ((cx - bx) * (z - bz) - (cz - bz) * (x - bx)) * flat
          const w = (cz * x - cx * z) * flat
          if (u < 0 || v < 0 || w < 0) continue
          const at = r * SIZE + col
          if (y > top[at]!) {
            top[at] = y
            what[at] = id
          }
        }
    }
  }
  const solid = area - glass
  return {
    color: solid > 0 ? wall.multiplyScalar(1 / solid) : new THREE.Color(0.3, 0.32, 0.34),
    glass: glass > area * 0.5,
  }
}

// meters to the nearest square with something over `over` standing in it, rounded down and
// never more than it really is from anywhere in the square, on a grid `scale` times coarser
function clearance(top: Float32Array, under: Float32Array, over: number, scale: number) {
  const size = SIZE / scale
  const grid = new Float64Array(size * size).fill(1e10)
  for (let r = 0; r < SIZE; r++)
    for (let col = 0; col < SIZE; col++) {
      const i = r * SIZE + col
      if (top[i]! > under[i]! + 0.5 && top[i]! > over)
        grid[((r / scale) | 0) * size + ((col / scale) | 0)] = 0
    }
  edt(grid, size, size)
  const out = new Uint16Array(size * size)
  const margin = Math.SQRT2 * CELL * scale
  for (let i = 0; i < size * size; i++)
    out[i] = Math.max(0, Math.min(1000, Math.floor(Math.sqrt(grid[i]!) * CELL * scale - margin)))
  return out
}

let drawn = false
export function drawCityMap() {
  if (drawn) return
  drawn = true
  const top = new Float32Array(SIZE * SIZE)
  const under = new Float32Array(SIZE * SIZE)
  const what = new Uint16Array(SIZE * SIZE)
  const ground = groundKinds()
  // the ground's smooth, a height every other square is plenty
  for (let r = 0; r < SIZE; r += 2)
    for (let col = 0; col < SIZE; col += 2) {
      const y = terrainAt(middle(col) + CELL / 2, middle(r) + CELL / 2)
      for (const i of [
        r * SIZE + col,
        r * SIZE + col + 1,
        (r + 1) * SIZE + col,
        (r + 1) * SIZE + col + 1,
      ])
        under[i] = top[i] = y
    }
  for (let i = 0; i < SIZE * SIZE; i++) what[i] = ground ? ground[i]! : PAVED
  // what each thing looks like: color and kind, in the last row
  const looks: number[][] = []
  looks[PAVED] = [0.2, 0.2, 0.19, KINDS.ground]
  looks[ROAD] = [0.05, 0.05, 0.05, KINDS.ground]
  looks[GRASS] = [0.05, 0.08, 0.025, KINDS.ground]
  looks[TREE] = [0.04, 0.065, 0.025, KINDS.tree]

  const color = new THREE.Color()
  campus.buildings.forEach((building, index) => {
    const bld = building as Building
    const id = FIRST + index
    // bridges have air under them, a column of it would block the street
    if (bld.minHeight) return
    const mats = bld.name ? landmarkMaterials[bld.name] : undefined
    const geo = mats ? landmarkGeometry(bld) : null
    if (geo && mats) {
      const { color: wall, glass } = landmark(geo.parts, mats, baseOf(bld), top, what, id)
      looks[id] = [wall.r, wall.g, wall.b, glass ? KINDS.glass : KINDS.wall]
      return
    }
    // the rest of the hand-built ones are drawn with these
    if (bld.landmark) return
    const facade = facadeOf(bld, index)
    const y = baseOf(bld) + bld.height
    color.set(facade.color)
    looks[id] = [color.r, color.g, color.b, facade.style === GLASS ? KINDS.glass : KINDS.wall]
    eachInside(bld.points, (i) => {
      if (y <= top[i]!) return
      top[i] = y
      what[i] = id
    })
  })

  // the trees as round green columns, a canopy about 10m up
  for (const [x, z] of campus.trees as number[][]) {
    const [cx, cz] = [square(x!), square(z!)]
    const reach = Math.ceil(3.5 / CELL)
    for (let r = cz - reach; r <= cz + reach; r++)
      for (let col = cx - reach; col <= cx + reach; col++) {
        if (r < 0 || col < 0 || r >= SIZE || col >= SIZE) continue
        if (Math.hypot(middle(col) - x!, middle(r) - z!) > 3.5) continue
        const i = r * SIZE + col
        const y = under[i]! + 10
        if (y <= top[i]!) continue
        top[i] = y
        what[i] = TREE
      }
  }

  // how far to the nearest thing standing there, and to the nearest over LEVEL, from the
  // middle of each square. a ray anywhere in its square can be a square closer than that
  // a ray anywhere in a square can be half a square's diagonal closer than its middle, and
  // the thing it's near the same again. the taller things' map is half as fine (it's quicker
  // to make), so twice that
  const near = clearance(top, under, -Infinity, 1)
  const high = clearance(top, under, LEVEL, 2)
  const half = city.image.data as Uint16Array
  // whole meters, those are quick to turn into half floats
  const halves = Array.from({ length: 1001 }, (_, m) => THREE.DataUtils.toHalfFloat(m))
  for (let r = 0; r < SIZE; r++)
    for (let col = 0; col < SIZE; col++) {
      const i = r * SIZE + col
      half[i * 4] = THREE.DataUtils.toHalfFloat(top[i]!)
      half[i * 4 + 1] = halves[near[i]!]!
      half[i * 4 + 2] = halves[high[(r >> 1) * (SIZE / 2) + (col >> 1)]!]!
      half[i * 4 + 3] = halves[what[i]!]!
    }
  looks.forEach((look, i) => {
    for (let k = 0; k < 4; k++)
      half[((SIZE - 1) * SIZE + i) * 4 + k] = THREE.DataUtils.toHalfFloat(look[k]!)
  })
  city.needsUpdate = true
}
