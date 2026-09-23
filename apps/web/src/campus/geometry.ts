import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

type Pt = number[] // [x, z]
export type BuildingData = { points: Pt[]; height: number; name?: string; gsu?: boolean }
export type LineData = { width: number; points: Pt[] }

const GSU_BLUE = '#2a5bd7'
const GSU_WALL = '#b9cdee'
// from the street you mostly see walls, so they need real color, not just cream
const WALLS = ['#e8b98f', '#c98a6b', '#a9c4de', '#b7dcc0', '#f0d9a4', '#c9b8e3', '#f2c4b4']
const ROOFS = ['#c8604c', '#6f8196', '#7f9a5d', '#b08a52', '#8a76a8', '#4f9a94']

// shapes are drawn on x/y, then laid flat. y has to be -z so it doesn't come out mirrored
function shape(points: Pt[]) {
  return new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x!, -z!)))
}

function paint(geo: THREE.BufferGeometry, from: number, count: number, color: THREE.Color) {
  const colors = geo.getAttribute('color') as THREE.BufferAttribute
  for (let i = from; i < from + count; i++) colors.setXYZ(i, color.r, color.g, color.b)
}

export function buildingsGeometry(buildings: BuildingData[]) {
  const parts = buildings.map((b, i) => {
    const geo = new THREE.ExtrudeGeometry(shape(b.points), { depth: b.height, bevelEnabled: false })
    geo.rotateX(-Math.PI / 2)
    geo.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(geo.attributes.position!.count * 3), 3),
    )

    // extrude puts the top/bottom in group 0 and the walls in group 1
    const roof = new THREE.Color(b.gsu ? GSU_BLUE : ROOFS[i % ROOFS.length])
    const wall = new THREE.Color(b.gsu ? GSU_WALL : WALLS[i % WALLS.length])
    for (const g of geo.groups) paint(geo, g.start, g.count, g.materialIndex === 0 ? roof : wall)

    geo.clearGroups()
    return geo
  })
  return mergeGeometries(parts)
}

// flat strips for roads and paths. a quad per segment plus a little disc at every
// corner so there are no gaps where two segments meet
export function linesGeometry(lines: LineData[], y: number) {
  const pos: number[] = []

  const tri = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number) =>
    pos.push(ax, y, az, bx, y, bz, cx, y, cz)

  for (const { width, points } of lines) {
    const half = width / 2
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i] as [number, number]
      const [bx, bz] = points[i + 1] as [number, number]
      const len = Math.hypot(bx - ax, bz - az) || 1
      const nx = (-(bz - az) / len) * half
      const nz = ((bx - ax) / len) * half
      tri(ax + nx, az + nz, ax - nx, az - nz, bx + nx, bz + nz)
      tri(bx + nx, bz + nz, ax - nx, az - nz, bx - nx, bz - nz)
    }
    for (const [x, z] of points.slice(1, -1) as [number, number][]) {
      const steps = 8
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2
        const b = ((s + 1) / steps) * Math.PI * 2
        tri(
          x,
          z,
          x + Math.cos(a) * half,
          z + Math.sin(a) * half,
          x + Math.cos(b) * half,
          z + Math.sin(b) * half,
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
  return geo
}

export function areasGeometry(areas: Pt[][], y: number) {
  const parts = areas.map((points) => {
    const geo = new THREE.ShapeGeometry(shape(points))
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, y, 0)
    return geo
  })
  return mergeGeometries(parts)
}

export function centroid(points: Pt[]) {
  const x = points.reduce((s, p) => s + p[0]!, 0) / points.length
  const z = points.reduce((s, p) => s + p[1]!, 0) / points.length
  return { x, z }
}
