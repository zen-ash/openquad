import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'
import { buildingsGeometry, centroid } from '../campus/geometry'
import { addCutout } from '../campus/cutout'
import { localPlayer } from '../game/localPlayer'
import { toonMaterial } from './toon'

const LABEL_DISTANCE = 70

const material = toonMaterial('white')
material.vertexColors = true
addCutout(material)

// thin edge lines instead of drei's <Outlines>. those draw a black shell behind the
// mesh, which would show through the see-through hole as a big black blob
const edgeMaterial = new THREE.LineBasicMaterial({ color: '#2b2b2b' })
addCutout(edgeMaterial)

const labels = campus.buildings
  .filter((b) => b.gsu && b.name)
  .map((b) => ({ name: b.name!, height: b.height, ...centroid(b.points) }))

function Labels() {
  const refs = useRef<(THREE.Group | null)[]>([])

  // only show names for buildings nearby, otherwise it's a wall of text
  useFrame(() => {
    labels.forEach((l, i) => {
      const group = refs.current[i]
      if (group)
        group.visible = Math.hypot(l.x - localPlayer.x, l.z - localPlayer.z) < LABEL_DISTANCE
    })
  })

  return (
    <>
      {labels.map((l, i) => (
        <Billboard
          key={`${l.name}-${i}`}
          ref={(g) => {
            refs.current[i] = g
          }}
          position={[l.x, l.height + 2, l.z]}
        >
          <Text fontSize={2} color="white" outlineWidth={0.12} outlineColor="#1b2a4a">
            {l.name}
          </Text>
        </Billboard>
      ))}
    </>
  )
}

export default function Buildings() {
  const { geometry, edges } = useMemo(() => {
    const geometry = buildingsGeometry(campus.buildings)
    return { geometry, edges: new THREE.EdgesGeometry(geometry, 30) }
  }, [])

  return (
    <>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <lineSegments geometry={edges} material={edgeMaterial} />
      <Labels />
    </>
  )
}
