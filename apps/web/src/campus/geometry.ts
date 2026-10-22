import * as THREE from 'three'
import {
  interleaveAttributes,
  mergeGeometries,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { floorOf, lowestUnder } from '../game/surface'
import { fromElevation } from '../game/terrain'
import { facadeOf, seedOf } from './facades'

type Pt = number[] // [x, z]
export type BuildingData = {
  points: Pt[]
  height: number
  name?: string
  gsu?: boolean
  // a piece of a gsu building with no name of its own, no door
  part?: boolean
  // up off the ground, like the library link over decatur st: where the underside is
  minHeight?: number
  deck?: boolean
  door?: Pt
  // drawn by hand instead (campus/landmarks.ts)
  landmark?: unknown
}
export type LineData = { width: number; points: Pt[]; bridge?: boolean }
// is drawn at its deck's height (its points have it), not laid on the ground
export const onDeck = (l: LineData) => l.points[0]?.length === 3

// shapes are drawn on x/y, then laid flat. y has to be -z so it doesn't come out mirrored
function shape(points: Pt[]) {
  return new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x!, -z!)))
}

function fill(count: number, value: number) {
  return new THREE.BufferAttribute(new Float32Array(count).fill(value), 1)
}

export function buildingsGeometry(buildings: BuildingData[]) {
  const parts = buildings.flatMap((b, i) => {
    if (b.landmark) return []
    // on the ground's real shape: the walls go down into it wherever it's lower than the
    // floor, and the height is from the floor
    const floor = floorOf(b)
    const bottom = b.minHeight ? floor + b.minHeight : Math.min(lowestUnder(b.points), floor) - 0.5
    const geo = new THREE.ExtrudeGeometry(shape(b.points), {
      depth: floor + b.height - bottom,
      bevelEnabled: false,
    })
    geo.rotateX(-Math.PI / 2).translate(0, bottom, 0)
    geo.clearGroups()

    const count = geo.attributes.position!.count
    // what the walls and windows look like, see facades.ts and the shader in facade.ts
    const look = facadeOf(b, i)
    const tint = new THREE.Color(look.color)
    const frame = new THREE.Color(look.frame)
    const colors = new Float32Array(count * 3)
    const frames = new Float32Array(count * 3)
    const windows = new Float32Array(count * 4)
    for (let v = 0; v < count; v++) {
      tint.toArray(colors, v * 3)
      frame.toArray(frames, v * 3)
      windows.set(look.window, v * 4)
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aFrame', new THREE.BufferAttribute(frames, 3))
    geo.setAttribute('aWindow', new THREE.BufferAttribute(windows, 4))
    geo.setAttribute('aStyle', fill(count, look.style))
    geo.setAttribute('aHeight', fill(count, b.height))
    geo.setAttribute('aBase', fill(count, floor))
    geo.setAttribute('aSeed', fill(count, seedOf(i)))
    // where the doorway is, for the shader to cut it out. zeros for buildings without one
    const door = new Float32Array(count * 4)
    if (b.door) for (let v = 0; v < count; v++) door.set(b.door.slice(0, 4), v * 4)
    geo.setAttribute('aDoor', new THREE.BufferAttribute(door, 4))
    return [geo]
  })
  const geo = mergeGeometries(parts)
  // webgpu takes at most 8 vertex buffers per mesh, so the facade numbers share one
  const packed = interleaveAttributes(
    FACADE.map((n) => geo.getAttribute(n) as THREE.BufferAttribute),
  ) as unknown as THREE.InterleavedBufferAttribute[]
  FACADE.forEach((n, i) => geo.setAttribute(n, packed[i]!))
  return geo
}

const FACADE = ['aStyle', 'aHeight', 'aBase', 'aSeed', 'aDoor', 'aWindow', 'aFrame']

// ground textures are mapped straight from world x/z, one repeat every 5m
export function planarUv(geo: THREE.BufferGeometry, scale = 0.2) {
  const pos = geo.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * scale
    uv[i * 2 + 1] = pos.getZ(i) * scale
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}

// flat strips for roads and paths. a quad per segment plus a little disc at every
// corner so there are no gaps where two segments meet. aRoad is (distance along the
// road, 0-1 across it, width) for drawing lane lines. the discs get width 0 = no lines.
// a bridge's points have its deck's height as a third number (sea level meters), the rest
// are drawn at y and laid on the ground after (drape.ts)
export function linesGeometry(lines: LineData[], y: number) {
  const pos: number[] = []
  const road: number[] = []

  type V = [x: number, z: number, along: number, across: number, width: number, h: number]
  // every triangle has to face up. which way round the points go depends on which way
  // the road was drawn on osm, and a face pointing down gets lit like the underside
  const tri = (a: V, b: V, c: V) => {
    const up = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1])
    for (const [x, z, along, across, width, h] of up >= 0 ? [a, b, c] : [a, c, b]) {
      pos.push(x, y + h, z)
      road.push(along, across, width)
    }
  }
  const deck = (p: Pt) => (p[2] === undefined ? 0 : fromElevation(p[2]))

  for (const { width, points } of lines) {
    const half = width / 2
    let along = 0
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i] as [number, number]
      const [bx, bz] = points[i + 1] as [number, number]
      const [ha, hb] = [deck(points[i]!), deck(points[i + 1]!)]
      const len = Math.hypot(bx - ax, bz - az) || 1
      const nx = (-(bz - az) / len) * half
      const nz = ((bx - ax) / len) * half
      const next = along + len
      tri(
        [ax + nx, az + nz, along, 0, width, ha],
        [ax - nx, az - nz, along, 1, width, ha],
        [bx + nx, bz + nz, next, 0, width, hb],
      )
      tri(
        [bx + nx, bz + nz, next, 0, width, hb],
        [ax - nx, az - nz, along, 1, width, ha],
        [bx - nx, bz - nz, next, 1, width, hb],
      )
      along = next
    }
    points.slice(1, -1).forEach((p, i) => {
      const [x, z] = p as [number, number]
      // nearly straight on: the two quads already meet, no gap to fill
      const [a, b] = [points[i]!, points[i + 2]!]
      const turn =
        ((x - a[0]!) * (b[0]! - x) + (z - a[1]!) * (b[1]! - z)) /
        (Math.hypot(x - a[0]!, z - a[1]!) * Math.hypot(b[0]! - x, b[1]! - z) || 1)
      if (turn > 0.995) return
      const h = deck(p)
      const steps = 8
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2
        const b = ((s + 1) / steps) * Math.PI * 2
        tri(
          [x, z, 0, 0.5, 0, h],
          [x + Math.cos(a) * half, z + Math.sin(a) * half, 0, 0.5, 0, h],
          [x + Math.cos(b) * half, z + Math.sin(b) * half, 0, 0.5, 0, h],
        )
      }
    })
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  // everything is flat on the ground, so normals just point up
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, i) => (i % 3 === 1 ? 1 : 0)),
      3,
    ),
  )
  geo.setAttribute('aRoad', new THREE.Float32BufferAttribute(road, 3))
  return planarUv(geo)
}

export function areasGeometry(areas: Pt[][], y: number) {
  const parts = areas.map((points) => {
    const geo = new THREE.ShapeGeometry(shape(points))
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, y, 0)
    return planarUv(geo)
  })
  return mergeGeometries(parts)
}

export function centroid(points: Pt[]) {
  const x = points.reduce((s, p) => s + p[0]!, 0) / points.length
  const z = points.reduce((s, p) => s + p[1]!, 0) / points.length
  return { x, z }
}
