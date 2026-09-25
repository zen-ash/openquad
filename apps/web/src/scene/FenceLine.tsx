import { FENCE } from '@quad/shared'
import * as THREE from 'three'

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
  FENCE.forEach(([ax, az], i) => {
    const [bx, bz] = FENCE[(i + 1) % FENCE.length]!
    pos.push(ax, 0, az, bx, 0, bz, bx, height, bz, ax, 0, az, bx, height, bz, ax, height, az)
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
