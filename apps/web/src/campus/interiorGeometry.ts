import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH, type Interior } from '../game/interiors'
import campus from './campus.json'
import { planarUv, seedOf, styleOf } from './geometry'
import { wallQuad } from './landmark'
import { landmarkGeometry } from './landmarks'

// + for one winding, - for the other. decides which way is "out"
function signedArea(points: Point[]) {
  let a = 0
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]!
    a += p.x * q.z - q.x * p.z
  })
  return a / 2
}

function withStyle(geo: THREE.BufferGeometry, style: number) {
  const count = geo.getAttribute('position').count
  geo.setAttribute('aStyle', new THREE.BufferAttribute(new Float32Array(count).fill(style), 1))
  return geo
}

// styles for the window shader besides the facade ones (interiorMaterials.ts)
export const NO_WINDOWS = -1
export const ALL_GLASS = 3

/** inside walls for every building you can walk into, window holes are done in the shader */
export function interiorWallsGeometry(interiors: Interior[]) {
  const parts = interiors.flatMap((room) => {
    const b = campus.buildings[room.index]!
    // the ones drawn by hand know where their windows are
    const landmark = landmarkGeometry(b)
    if (landmark)
      return [
        ...landmark.inside.solid.map((g) => withStyle(g.clone(), NO_WINDOWS)),
        ...landmark.inside.glass.map((g) => withStyle(g.clone(), ALL_GLASS)),
      ]
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
        style,
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
