import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { closestOnSegment, type Point, type Segment } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH, type Interior } from '../game/interiors'
import campus from './campus.json'
import { planarUv, seedOf, styleOf } from './geometry'

// + for one winding, - for the other. decides which way is "out"
function signedArea(points: Point[]) {
  let a = 0
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]!
    a += p.x * q.z - q.x * p.z
  })
  return a / 2
}

// a vertical wall facing `into` (a unit vector on the ground), from y0 to y1
export function wallQuad(a: Point, b: Point, y0: number, y1: number, into: Point) {
  let corners = [
    [a.x, y0, a.z],
    [b.x, y0, b.z],
    [b.x, y1, b.z],
    [a.x, y1, a.z],
  ]
  // flip the winding if it would face the wrong way
  const ex = b.x - a.x
  const ez = b.z - a.z
  // the front of (a, b, top) faces (b - a) x up = (-ez, 0, ex)
  const facesInto = -ez * into.x + ex * into.z > 0
  if (!facesInto) corners = [corners[1]!, corners[0]!, corners[3]!, corners[2]!]

  const pos = [0, 1, 2, 0, 2, 3].flatMap((i) => corners[i]!)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      [0, 0, 0, 0, 0, 0].flatMap(() => [into.x, 0, into.z]),
      3,
    ),
  )
  // u along the wall, v up, in meters
  const len = Math.hypot(ex, ez)
  const uv = [0, 1, 2, 0, 2, 3].flatMap((i) => {
    const [x, y, z] = corners[i]!
    return [((x! - a.x) * ex + (z! - a.z) * ez) / (len || 1), y!]
  })
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geo
}

function withStyle(geo: THREE.BufferGeometry, style: number) {
  const count = geo.getAttribute('position').count
  geo.setAttribute('aStyle', new THREE.BufferAttribute(new Float32Array(count).fill(style), 1))
  return geo
}

// styles for the window shader besides the facade ones (interiorMaterials.ts)
export const NO_WINDOWS = -1
export const ALL_GLASS = 3

// library north's brick box really has no windows, and its lobby is all glass
function landmarkStyle(w: Segment, box: number[][]) {
  const mid = { x: (w.ax + w.bx) / 2, z: (w.az + w.bz) / 2 }
  const onBox = box.some(([x, z], i) => {
    const [nx, nz] = box[(i + 1) % box.length]!
    const c = closestOnSegment(mid, { x: x!, z: z! }, { x: nx!, z: nz! })
    return Math.hypot(c.x - mid.x, c.z - mid.z) < 0.2
  })
  return onBox ? NO_WINDOWS : ALL_GLASS
}

/** inside walls for every building you can walk into, window holes are done in the shader */
export function interiorWallsGeometry(interiors: Interior[]) {
  const parts = interiors.flatMap((room) => {
    const b = campus.buildings[room.index]!
    const style = styleOf(b.height, seedOf(room.index))
    const flip = signedArea(room.points) > 0 ? -1 : 1

    const walls = room.walls.map((w) => {
      const dx = w.bx - w.ax
      const dz = w.bz - w.az
      const len = Math.hypot(dx, dz) || 1
      // facing in, so the opposite of outward
      const into = { x: (dz / len) * flip, z: (-dx / len) * flip }
      return withStyle(
        wallQuad({ x: w.ax, z: w.az }, { x: w.bx, z: w.bz }, 0, CEILING, into),
        b.landmark ? landmarkStyle(w, b.landmark.box) : style,
      )
    })

    // the bit of wall above the doorway
    const { x, z, nx, nz } = room.door
    const along = { x: -nz, z: nx }
    const half = DOOR_WIDTH / 2
    const above = wallQuad(
      { x: x - along.x * half, z: z - along.z * half },
      { x: x + along.x * half, z: z + along.z * half },
      DOOR_HEIGHT,
      CEILING,
      { x: -nx, z: -nz },
    )
    return [...walls, withStyle(above, NO_WINDOWS)]
  })
  return mergeGeometries(parts)
}

function flat(points: Point[], y: number, facingUp: boolean) {
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, -p.z)))
  const geo = new THREE.ShapeGeometry(shape)
  geo.rotateX(-Math.PI / 2) // lay it flat, facing up
  if (!facingUp) {
    // turn it over so it faces down
    geo.scale(1, -1, 1)
    const index = geo.getIndex()!
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1)
      index.setX(i + 1, index.getX(i + 2))
      index.setX(i + 2, b)
    }
  }
  geo.translate(0, y, 0)
  return planarUv(geo, 0.4)
}

export const floorsGeometry = (interiors: Interior[]) =>
  mergeGeometries(interiors.map((r) => flat(r.points, 0.06, true)))

export const ceilingsGeometry = (interiors: Interior[]) =>
  mergeGeometries(interiors.map((r) => flat(r.points, CEILING, false)))
