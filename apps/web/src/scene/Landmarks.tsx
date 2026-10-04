import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import campus from '../campus/campus.json'
import { artsHumanitiesMaterials } from '../campus/artsHumanitiesMaterials'
import { classroomSouthMaterials } from '../campus/classroomSouthMaterials'
import { dahlbergMaterials } from '../campus/dahlbergMaterials'
import { langdaleHallMaterials } from '../campus/langdaleHallMaterials'
import { landmarkGeometry, type Sign } from '../campus/landmarks'
import { libraryNorthMaterials } from '../campus/libraryNorthMaterials'
import { librarySouthMaterials } from '../campus/librarySouthMaterials'
import { researchTowerMaterials } from '../campus/researchTowerMaterials'
import { studentCenterEastMaterials } from '../campus/studentCenterEastMaterials'
import { studentCenterWestMaterials } from '../campus/studentCenterWestMaterials'
import { urbanLifeMaterials } from '../campus/urbanLifeMaterials'
import Label from './Label'

const materials: Record<string, Record<string, THREE.Material>> = {
  'Library North': libraryNorthMaterials,
  'Dahlberg Hall': dahlbergMaterials,
  'Arts & Humanities': artsHumanitiesMaterials,
  'Research Tower': researchTowerMaterials,
  'Student Center East': studentCenterEastMaterials,
  'Student Center West': studentCenterWestMaterials,
  'Langdale Hall': langdaleHallMaterials,
  'Classroom South': classroomSouthMaterials,
  'Library South': librarySouthMaterials,
  'Urban Life Building': urbanLifeMaterials,
}

// white sign with the name in gsu blue. the real ones have the logo where the blue
// square is, but that's gsu's trademark
function NameSign({ sign }: { sign: Sign }) {
  if (sign.letters)
    return (
      <Label
        position={[sign.x, sign.y, sign.z]}
        rotation-y={sign.rot}
        fontSize={sign.size ?? 0.3}
        fontWeight={sign.weight}
        lineHeight={1.25}
        textAlign="center"
        color={sign.color ?? '#3b3d40'}
      >
        {sign.text}
      </Label>
    )
  // two lines on some of them (student center west)
  const lines = sign.text.split('\n')
  const width = 0.8 + Math.max(...lines.map((l) => l.length)) * 0.23
  const height = 0.75 + (lines.length - 1) * 0.45
  return (
    <group position={[sign.x, sign.y, sign.z]} rotation-y={sign.rot} scale={sign.scale ?? 1}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={sign.plate ?? '#f4f4f2'} />
      </mesh>
      <mesh position={[-width / 2 + 0.35, 0, 0.01]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshStandardMaterial color="#1f4b99" />
      </mesh>
      <Label
        position={[0.25, 0, 0.02]}
        fontSize={0.36}
        lineHeight={1.25}
        color={sign.color ?? '#1f3f86'}
        fontWeight={700}
      >
        {sign.text}
      </Label>
    </group>
  )
}

// a wall drawn before everything else while you're close to it (LandmarkGeometry.first).
// from further away the building is more often behind other things, so then it keeps its
// place (drawn first from 50m away, the bits of it behind library north cost 0.5ms)
const NEAR = 20
function FirstWhenNear({
  geometry,
  material,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
}) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    if (!mesh.current) return
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    mesh.current.renderOrder =
      geometry.boundingBox!.distanceToPoint(camera.position) < NEAR ? -1 : 0
  })
  return <mesh ref={mesh} geometry={geometry} material={material} castShadow receiveShadow />
}

// the buildings drawn by hand from photos (campus/landmarks.ts). they're left out of
// the regular buildings mesh
export default function Landmarks() {
  return (
    <>
      {campus.buildings.map((b) => {
        const geo = landmarkGeometry(b)
        const mats = b.name ? materials[b.name] : undefined
        if (!geo || !mats) return null
        return (
          <group key={b.name}>
            {Object.entries(geo.parts).map(([part, g]) =>
              geo.first?.includes(part) ? (
                <FirstWhenNear key={part} geometry={g} material={mats[part]!} />
              ) : (
                <mesh
                  key={part}
                  geometry={g}
                  material={mats[part]}
                  // see-through glass doesn't cast shadows
                  castShadow={!mats[part]!.transparent && !geo.noShadow?.includes(part)}
                  receiveShadow
                />
              ),
            )}
            {geo.signs.map((s, i) => (
              <NameSign key={i} sign={s} />
            ))}
          </group>
        )
      })}
    </>
  )
}
