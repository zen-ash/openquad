import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { heightAt, fromElevation } from '../game/terrain'
import { onDeck, type LineData } from './geometry'

// how deep a bridge's deck is under its surface, and how far apart its piers are
const ROAD_DEPTH = 1.1
const PATH_DEPTH = 0.45
const PIER_SPACING = 25
const PIER = 0.9
// lower than this over the ground it's a slab on the ground, no piers
const HIGH = 3

type Corner = [x: number, y: number, z: number, u: number, v: number]

// is x, z on a road or path (within its width, plus room)
function onLine(x: number, z: number, { width, points }: LineData, room: number) {
  return points.slice(1).some((b, i) => {
    const a = points[i]!
    const [dx, dz] = [b[0]! - a[0]!, b[1]! - a[1]!]
    const t = Math.max(
      0,
      Math.min(1, ((x - a[0]!) * dx + (z - a[1]!) * dz) / (dx * dx + dz * dz || 1)),
    )
    return Math.hypot(a[0]! + dx * t - x, a[1]! + dz * t - z) < width / 2 + room
  })
}

// two triangles from four corners going round, with their own uvs (meters, like walls)
function quad(corners: Corner[], normal: number[]) {
  const pos: number[] = []
  const uv: number[] = []
  for (const i of [0, 1, 2, 0, 2, 3]) {
    const [x, y, z, u, v] = corners[i]!
    pos.push(x, y, z)
    uv.push(u, v)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      [0, 1, 2, 3, 4, 5].flatMap(() => normal),
      3,
    ),
  )
  return geo
}

// the concrete of every bridge (the lines with deck heights, build-campus): its edges down
// each side, its underside, and piers down to the ground where it's up high (courtland st's
// viaduct, 8m over decatur st)
export function deckStructure(lines: LineData[]) {
  const parts: THREE.BufferGeometry[] = []
  const below = lines.filter((l) => !onDeck(l))
  for (const line of lines.filter(onDeck)) {
    const depth = line.width >= 5 ? ROAD_DEPTH : PATH_DEPTH
    const half = line.width / 2
    let along = 0
    let nextPier = PIER_SPACING / 2
    line.points.slice(1).forEach((b, i) => {
      const a = line.points[i]!
      const [ax, az, bx, bz] = [a[0]!, a[1]!, b[0]!, b[1]!]
      const [ha, hb] = [fromElevation(a[2]!), fromElevation(b[2]!)]
      const len = Math.hypot(bx - ax, bz - az) || 1
      const [nx, nz] = [-(bz - az) / len, (bx - ax) / len]
      for (const side of [1, -1]) {
        const [ox, oz] = [nx * half * side, nz * half * side]
        // facing out from this side, the corners going round so the front faces out
        const corners: Corner[] = [
          [ax + ox, ha - depth, az + oz, along, -depth],
          [bx + ox, hb - depth, bz + oz, along + len, -depth],
          [bx + ox, hb, bz + oz, along + len, 0],
          [ax + ox, ha, az + oz, along, 0],
        ]
        parts.push(
          quad(side > 0 ? corners : [corners[1]!, corners[0]!, corners[3]!, corners[2]!], [
            nx * side,
            0,
            nz * side,
          ]),
        )
      }
      // underneath, facing down
      parts.push(
        quad(
          [
            [ax + nx * half, ha - depth, az + nz * half, along, half],
            [ax - nx * half, ha - depth, az - nz * half, along, -half],
            [bx - nx * half, hb - depth, bz - nz * half, along + len, -half],
            [bx + nx * half, hb - depth, bz + nz * half, along + len, half],
          ],
          [0, -1, 0],
        ),
      )
      // piers on the ground where it's high enough to need them
      while (nextPier < along + len) {
        const t = (nextPier - along) / len
        const [x, z, h] = [ax + (bx - ax) * t, az + (bz - az) * t, ha + (hb - ha) * t]
        const ground = heightAt(x, z)
        // not in the middle of a road or path down there: the bridge spans those
        if (h - depth - ground > HIGH && !below.some((l) => onLine(x, z, l, PIER))) {
          const tall = h - depth - ground + 0.3
          const pier = new THREE.BoxGeometry(PIER, tall, PIER)
          pier.rotateY(Math.atan2(bx - ax, bz - az)).translate(x, ground - 0.3 + tall / 2, z)
          parts.push(pier.toNonIndexed())
        }
        nextPier += PIER_SPACING
      }
      along += len
    })
  }
  return parts.length ? mergeGeometries(parts) : null
}
