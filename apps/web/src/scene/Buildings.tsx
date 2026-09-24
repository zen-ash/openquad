import { insideFence } from '@quad/shared'
import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'
import { buildingsGeometry, centroid } from '../campus/geometry'
import { facadeMaterial } from '../campus/facade'
import { localPlayer } from '../game/localPlayer'
import { useSettings } from '../settings'

const LABEL_DISTANCE = 120

const material = facadeMaterial()

// buildings are all the way in or all the way out (there's a test), one corner is enough
const inside = (b: { points: number[][] }) => insideFence(b.points[0]![0]!, b.points[0]![1]!)

const labels = campus.buildings
  .filter((b) => b.gsu && b.name)
  .map((b) => ({ name: b.name!, height: b.height, inside: inside(b), ...centroid(b.points) }))

function Labels({ outside }: { outside: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([])

  // only show names for buildings nearby, otherwise it's a wall of text
  useFrame(() => {
    labels.forEach((l, i) => {
      const group = refs.current[i]
      if (group)
        group.visible =
          (l.inside || outside) &&
          Math.hypot(l.x - localPlayer.x, l.z - localPlayer.z) < LABEL_DISTANCE
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
          <Text
            fontSize={2.4}
            color="white"
            outlineWidth={0.14}
            outlineColor="#111"
            fillOpacity={0.95}
          >
            {l.name}
          </Text>
        </Billboard>
      ))}
    </>
  )
}

export default function Buildings() {
  const geos = useMemo(
    () => ({
      inside: buildingsGeometry(campus.buildings, inside),
      outside: buildingsGeometry(campus.buildings, (b) => !inside(b)),
    }),
    [],
  )
  // outside the fence google's tiles show the real buildings, so ours are hidden there
  const extruded = useSettings((s) => s.extruded)

  return (
    <>
      <mesh geometry={geos.inside} material={material} castShadow receiveShadow />
      <mesh
        geometry={geos.outside}
        material={material}
        castShadow
        receiveShadow
        visible={extruded}
      />
      <Labels outside={extruded} />
    </>
  )
}
