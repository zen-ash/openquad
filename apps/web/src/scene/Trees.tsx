import { Outlines } from '@react-three/drei'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'
import { toonMaterial } from './toon'

const trunk = toonMaterial('#8b5a2b')
const leaves = toonMaterial('#4f9a3a')

// same "random" size for a tree every time
const sizeOf = (x: number, z: number) => 0.8 + (Math.abs(Math.sin(x * 3.1 + z * 7.7)) % 1) * 0.5

// 250+ trees, so one instanced mesh for all trunks and one for all the leaves
export default function Trees() {
  const trunks = useRef<THREE.InstancedMesh>(null)
  const tops = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    campus.trees.forEach(([x, z], i) => {
      const s = sizeOf(x!, z!)
      m.makeScale(s, s, s).setPosition(x!, 0.9 * s, z!)
      trunks.current!.setMatrixAt(i, m)
      m.makeScale(s, s, s).setPosition(x!, 2.8 * s, z!)
      tops.current!.setMatrixAt(i, m)
    })
    trunks.current!.instanceMatrix.needsUpdate = true
    tops.current!.instanceMatrix.needsUpdate = true
  }, [])

  const count = campus.trees.length
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, trunk, count]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 1.8, 8]} />
        <Outlines thickness={2} />
      </instancedMesh>
      <instancedMesh ref={tops} args={[undefined, leaves, count]} castShadow>
        <sphereGeometry args={[1.5, 10, 8]} />
        <Outlines thickness={2} />
      </instancedMesh>
    </>
  )
}
