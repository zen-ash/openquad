import { Text } from '@react-three/drei'
import { useMemo } from 'react'
import campus from '../campus/campus.json'
import { libraryNorthGeometry, type Part } from '../campus/libraryNorth'
import { libraryNorthMaterials } from '../campus/libraryNorthMaterials'

const building = campus.buildings.find((b) => b.landmark)
// see-through, no shadows
const NO_SHADOW = new Set<Part>(['lobbyGlass', 'railing'])

// library north isn't in the regular buildings mesh, it's drawn here from photos of the
// real one (campus/libraryNorth.ts)
export default function LibraryNorth() {
  const geo = useMemo(() => (building ? libraryNorthGeometry(building) : null), [])
  if (!geo) return null

  return (
    <>
      {(Object.keys(geo.parts) as Part[]).map((part) => (
        <mesh
          key={part}
          geometry={geo.parts[part]}
          material={libraryNorthMaterials[part]}
          castShadow={!NO_SHADOW.has(part)}
          receiveShadow
        />
      ))}
      {geo.sign && (
        <group position={[geo.sign.x, geo.sign.y, geo.sign.z]} rotation-y={geo.sign.rot}>
          <mesh>
            <planeGeometry args={[3.8, 0.75]} />
            <meshStandardMaterial color="#f4f4f2" />
          </mesh>
          <mesh position={[-1.55, 0, 0.01]}>
            <planeGeometry args={[0.55, 0.55]} />
            <meshStandardMaterial color="#1f4b99" />
          </mesh>
          <Text position={[0.25, 0, 0.02]} fontSize={0.36} color="#1f3f86" fontWeight={700}>
            LIBRARY NORTH
          </Text>
        </group>
      )}
    </>
  )
}
