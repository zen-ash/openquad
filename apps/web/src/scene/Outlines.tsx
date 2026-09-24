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

export default function Outlines() {
  const geos = useMemo(() => ({ ground: outlines(() => 0.2), roof: outlines((h) => h) }), [])
  return (
    <>
      <lineSegments geometry={geos.ground} material={material} renderOrder={10} />
      <lineSegments geometry={geos.roof} material={roofs} renderOrder={10} />
    </>
  )
}
