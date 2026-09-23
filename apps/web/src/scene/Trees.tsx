import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import campus from '../campus/campus.json'

const bark = new THREE.MeshStandardMaterial({ color: '#5a4332', roughness: 1 })
const leaves = new THREE.MeshStandardMaterial({ roughness: 0.9 })

// same "random" number for a tree every time
const rand = (x: number, z: number, salt: number) => {
  const n = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453
  return n - Math.floor(n)
}

// a canopy made of a few lumpy blobs instead of one ball, so it reads as leaves
function canopyGeometry() {
  const blobs = [
    [0, 0, 0, 1.6],
    [0.9, -0.3, 0.4, 1.1],
    [-0.8, -0.2, 0.5, 1.2],
    [0.2, 0.6, -0.7, 1.1],
    [-0.3, 0.9, 0.3, 1],
  ].map(([x, y, z, r]) => {
    // detail 1 is a quarter of the triangles of 2 and looks the same from the camera.
    // 250 trees at detail 2 was over a million vertices
    const geo = new THREE.IcosahedronGeometry(r, 1)
    const pos = geo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const bump = 1 + (rand(pos.getX(i), pos.getZ(i), pos.getY(i)) - 0.5) * 0.25
      pos.setXYZ(i, pos.getX(i) * bump, pos.getY(i) * bump, pos.getZ(i) * bump)
    }
    geo.translate(x!, y!, z!)
    return geo
  })
  const merged = mergeGeometries(blobs)
  merged.computeVertexNormals()
  return merged
}

// 250+ trees, so one instanced mesh for all the trunks and one for all the canopies
export default function Trees() {
  const trunks = useRef<THREE.InstancedMesh>(null)
  const tops = useRef<THREE.InstancedMesh>(null)
  const canopy = useMemo(() => canopyGeometry(), [])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const color = new THREE.Color()
    const up = new THREE.Vector3(0, 1, 0)

    campus.trees.forEach(([x, z], i) => {
      const s = 0.8 + rand(x!, z!, 1) * 0.6
      const turn = q.setFromAxisAngle(up, rand(x!, z!, 2) * Math.PI * 2)

      m.compose(new THREE.Vector3(x!, 1.2 * s, z!), turn, new THREE.Vector3(s, s, s))
      trunks.current!.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(x!, 3.4 * s, z!), turn, new THREE.Vector3(s, s * 0.9, s))
      tops.current!.setMatrixAt(i, m)

      // a bit of variety in the greens
      color.setHSL(0.26 + rand(x!, z!, 3) * 0.06, 0.55, 0.12 + rand(x!, z!, 4) * 0.07)
      tops.current!.setColorAt(i, color)
    })
    trunks.current!.instanceMatrix.needsUpdate = true
    tops.current!.instanceMatrix.needsUpdate = true
    tops.current!.instanceColor!.needsUpdate = true
  }, [])

  const count = campus.trees.length
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, bark, count]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 2.4, 7]} />
      </instancedMesh>
      <instancedMesh ref={tops} args={[canopy, leaves, count]} castShadow receiveShadow />
    </>
  )
}
