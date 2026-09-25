import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'
import { buildingsGeometry, centroid } from '../campus/geometry'
import { facadeMaterial } from '../campus/facade'
import { localPlayer } from '../game/localPlayer'
import Label from './Label'

const LABEL_DISTANCE = 120

const material = facadeMaterial()

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
          position={[l.x, l.height + 4, l.z]}
        >
          <Label fontSize={2.4} outlineWidth={0.14} outlineColor="#111" fillOpacity={0.95}>
            {l.name}
          </Label>
        </Billboard>
      ))}
    </>
  )
}

export default function Buildings() {
  const geometry = useMemo(() => buildingsGeometry(campus.buildings), [])

  return (
    <>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <Labels />
    </>
  )
}
