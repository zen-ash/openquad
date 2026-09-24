import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BRICK, CONCRETE, GLASS } from './facade'

type Pt = number[] // [x, z]
export type BuildingData = { points: Pt[]; height: number; name?: string; gsu?: boolean; door?: Pt }
export type LineData = { width: number; points: Pt[] }

// anything taller than ~14 floors (in real life) is a glass tower
const TOWER_HEIGHT = 50
// concrete comes out of the texture pretty gray, these warm it up a bit per building
const CONCRETE_TINTS = ['#d8d2c4', '#c9c6be', '#e2dccd', '#bfc3c6', '#d6c8b0']
const FRAME_TINTS = ['#8e98a3', '#5f6873', '#b8bfc6', '#7d7466']

// shapes are drawn on x/y, then laid flat. y has to be -z so it doesn't come out mirrored
function shape(points: Pt[]) {
  return new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x!, -z!)))
}

// same "random" 0-1 number for a building every time
export const seedOf = (i: number) => {
  const n = Math.sin(i * 12.9898) * 43758.5453
  return n - Math.floor(n)
}

export function styleOf(height: number, seed: number) {
  if (height >= TOWER_HEIGHT) return GLASS
  return seed < 0.4 ? BRICK : CONCRETE
}

function fill(count: number, value: number) {
  return new THREE.BufferAttribute(new Float32Array(count).fill(value), 1)
}

export function buildingsGeometry(buildings: BuildingData[]) {
  const parts = buildings.map((b, i) => {
    const geo = new THREE.ExtrudeGeometry(shape(b.points), { depth: b.height, bevelEnabled: false })
    geo.rotateX(-Math.PI / 2)
    geo.clearGroups()

    const count = geo.attributes.position!.count
    const seed = seedOf(i)
    const style = styleOf(b.height, seed)
    const tints = style === GLASS ? FRAME_TINTS : CONCRETE_TINTS
    const tint = new THREE.Color(tints[Math.floor(seed * tints.length)])

    const colors = new Float32Array(count * 3)
    for (let v = 0; v < count; v++) tint.toArray(colors, v * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    // the facade shader uses these to draw windows (see facade.ts)
    geo.setAttribute('aStyle', fill(count, style))
    geo.setAttribute('aHeight', fill(count, b.height))
    geo.setAttribute('aSeed', fill(count, seed))
    // where the doorway is, for the shader to cut it out. zeros for buildings without one
    const door = new Float32Array(count * 4)
    if (b.door) for (let v = 0; v < count; v++) door.set(b.door.slice(0, 4), v * 4)
    geo.setAttribute('aDoor', new THREE.BufferAttribute(door, 4))
    return geo
  })
  return mergeGeometries(parts)
}

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
// road, 0-1 across it, width) for drawing lane lines. the discs get width 0 = no lines
export function linesGeometry(lines: LineData[], y: number) {
  const pos: number[] = []
  const road: number[] = []

  type V = [x: number, z: number, along: number, across: number, width: number]
  // every triangle has to face up. which way round the points go depends on which way
  // the road was drawn on osm, and a face pointing down gets lit like the underside
  const tri = (a: V, b: V, c: V) => {
    const up = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1])
    for (const [x, z, along, across, width] of up >= 0 ? [a, b, c] : [a, c, b]) {
      pos.push(x, y, z)
      road.push(along, across, width)
    }
  }

  for (const { width, points } of lines) {
    const half = width / 2
    let along = 0
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i] as [number, number]
      const [bx, bz] = points[i + 1] as [number, number]
      const len = Math.hypot(bx - ax, bz - az) || 1
      const nx = (-(bz - az) / len) * half
      const nz = ((bx - ax) / len) * half
      const next = along + len
      tri(
        [ax + nx, az + nz, along, 0, width],
        [ax - nx, az - nz, along, 1, width],
        [bx + nx, bz + nz, next, 0, width],
      )
      tri(
        [bx + nx, bz + nz, next, 0, width],
        [ax - nx, az - nz, along, 1, width],
        [bx - nx, bz - nz, next, 1, width],
      )
      along = next
    }
    for (const [x, z] of points.slice(1, -1) as [number, number][]) {
      const steps = 8
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2
        const b = ((s + 1) / steps) * Math.PI * 2
        tri(
          [x, z, 0, 0.5, 0],
          [x + Math.cos(a) * half, z + Math.sin(a) * half, 0, 0.5, 0],
          [x + Math.cos(b) * half, z + Math.sin(b) * half, 0, 0.5, 0],
        )
      }
    }
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
