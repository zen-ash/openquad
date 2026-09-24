import { FENCE } from '@quad/shared'
import { useMemo } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'

// debug: every osm building footprint in bright lines, at the ground and at roof height,
// drawn over everything. with the 3d tiles on, these should sit right on the real buildings
const material = new THREE.LineBasicMaterial({ color: '#ff2bd6', depthTest: false })
const roofs = new THREE.LineBasicMaterial({ color: '#29f0ff', depthTest: false })

function outlines(y: (height: number) => number) {
  const points: number[] = []
  for (const b of campus.buildings) {
    const pts = b.points as number[][]
    pts.forEach(([x, z], i) => {
      const [nx, nz] = pts[(i + 1) % pts.length]!
      points.push(x!, y(b.height), z!, nx!, y(b.height), nz!)
    })
  }
  return new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points, 3),
  )
}

// and the fence, as a see-through yellow curtain. a line or a strip on the ground is lost
// from up high, and drawn over everything it looked like it was on the roofs
const fenceMaterial = new THREE.MeshBasicMaterial({
  color: '#ffd400',
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false,
})
function fenceCurtain(height = 4) {
  const pos: number[] = []
  FENCE.forEach(([ax, az], i) => {
    const [bx, bz] = FENCE[(i + 1) % FENCE.length]!
    pos.push(ax, 0, az, bx, 0, bz, bx, height, bz, ax, 0, az, bx, height, bz, ax, height, az)
  })
  return new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute(pos, 3),
  )
}
const fence = fenceCurtain()

export function FenceLine() {
  return <mesh geometry={fence} material={fenceMaterial} renderOrder={11} />
}

export default function Outlines() {
  const geos = useMemo(() => ({ ground: outlines(() => 0.2), roof: outlines((h) => h) }), [])
  return (
    <>
      <lineSegments geometry={geos.ground} material={material} renderOrder={10} />
      <lineSegments geometry={geos.roof} material={roofs} renderOrder={10} />
    </>
  )
}
