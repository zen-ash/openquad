import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { DOOR_HEIGHT, DOOR_WIDTH, doorOpens, doorPanels, interiors } from '../game/interiors'
import { localPlayer } from '../game/localPlayer'
import { snapshots } from '../net/store'

const W = DOOR_WIDTH / 2
const H = DOOR_HEIGHT
const BAR = 0.05

const glassGeometry = new THREE.BoxGeometry(W - BAR * 2, H - BAR * 2, 0.02).translate(0, H / 2, 0)
// the metal frame around each pane
const frameGeometry = mergeGeometries([
  new THREE.BoxGeometry(W, BAR, 0.05).translate(0, BAR / 2, 0),
  new THREE.BoxGeometry(W, BAR, 0.05).translate(0, H - BAR / 2, 0),
  new THREE.BoxGeometry(BAR, H, 0.05).translate(-W / 2 + BAR / 2, H / 2, 0),
  new THREE.BoxGeometry(BAR, H, 0.05).translate(W / 2 - BAR / 2, H / 2, 0),
])
const glassMaterial = new THREE.MeshStandardMaterial({
  color: '#b9c9d2',
  roughness: 0.05,
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
})
const frameMaterial = new THREE.MeshStandardMaterial({
  color: '#3b3e42',
  metalness: 0.6,
  roughness: 0.4,
})

const UP = new THREE.Vector3(0, 1, 0)
const m = new THREE.Matrix4()
const q = new THREE.Quaternion()
const pos = new THREE.Vector3()
const one = new THREE.Vector3(1, 1, 1)

// automatic sliding doors on every building you can walk into
export default function Doors() {
  const glass = useRef<THREE.InstancedMesh>(null)
  const frames = useRef<THREE.InstancedMesh>(null)
  const open = useMemo(() => new Float32Array(interiors.length), [])

  useFrame((_, dt) => {
    if (!glass.current || !frames.current) return
    // everyone counts, so a door opens for other people walking in too
    const people = [localPlayer, ...[...snapshots.values()].flatMap((s) => s.slice(-1))]
    interiors.forEach((room, i) => {
      const target = doorOpens(room.door, people) ? 1 : 0
      open[i]! += (target - open[i]!) * Math.min(1, dt * 5)
      doorPanels(room.door, open[i]!).forEach((p, side) => {
        m.compose(pos.set(p.x, 0.06, p.z), q.setFromAxisAngle(UP, p.rot), one)
        glass.current!.setMatrixAt(i * 2 + side, m)
        frames.current!.setMatrixAt(i * 2 + side, m)
      })
    })
    glass.current.instanceMatrix.needsUpdate = true
    frames.current.instanceMatrix.needsUpdate = true
  })

  const count = interiors.length * 2
  return (
    <>
      <instancedMesh
        ref={frames}
        args={[frameGeometry, frameMaterial, count]}
        frustumCulled={false}
        castShadow
      />
      <instancedMesh
        ref={glass}
        args={[glassGeometry, glassMaterial, count]}
        frustumCulled={false}
      />
    </>
  )
}
