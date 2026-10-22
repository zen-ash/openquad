import { FENCE } from '@quad/shared'
import * as THREE from 'three'
import { alongGround } from '../game/surface'

// debug: the fence, as a see-through yellow curtain. a line or a strip on the ground is lost
// from up high, and drawn over everything it looked like it was on the roofs
const material = new THREE.MeshBasicMaterial({
  color: '#ffd400',
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  depthWrite: false,
})
function curtain(height = 4) {
  const pos: number[] = []
  const ring = FENCE.map(([x, z]) => ({ x: x!, z: z! }))
  const points = alongGround([...ring, ring[0]!], 4)
  points.slice(1).forEach(([bx, bz, by], i) => {
    const [ax, az, ay] = points[i]!
    pos.push(ax, ay, az, bx, by, bz, bx, by + height, bz, ax, ay, az, bx, by + height, bz)
    pos.push(ax, ay + height, az)
  })
  return new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute(pos, 3),
  )
}
const fence = curtain()

export default function FenceLine() {
  return <mesh geometry={fence} material={material} renderOrder={11} />
}
