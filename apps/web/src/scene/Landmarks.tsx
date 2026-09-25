import type * as THREE from 'three'
import campus from '../campus/campus.json'
import { artsHumanitiesMaterials } from '../campus/artsHumanitiesMaterials'
import { dahlbergMaterials } from '../campus/dahlbergMaterials'
import { landmarkGeometry, type Sign } from '../campus/landmarks'
import { libraryNorthMaterials } from '../campus/libraryNorthMaterials'
import { researchTowerMaterials } from '../campus/researchTowerMaterials'
import { studentCenterEastMaterials } from '../campus/studentCenterEastMaterials'
import Label from './Label'

const materials: Record<string, Record<string, THREE.Material>> = {
  'Library North': libraryNorthMaterials,
  'Dahlberg Hall': dahlbergMaterials,
  'Arts & Humanities': artsHumanitiesMaterials,
  'Research Tower': researchTowerMaterials,
  'Student Center East': studentCenterEastMaterials,
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
  const width = 0.8 + sign.text.length * 0.23
  return (
    <group position={[sign.x, sign.y, sign.z]} rotation-y={sign.rot} scale={sign.scale ?? 1}>
      <mesh>
        <planeGeometry args={[width, 0.75]} />
        <meshStandardMaterial color="#f4f4f2" />
      </mesh>
      <mesh position={[-width / 2 + 0.35, 0, 0.01]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshStandardMaterial color="#1f4b99" />
      </mesh>
      <Label position={[0.25, 0, 0.02]} fontSize={0.36} color="#1f3f86" fontWeight={700}>
        {sign.text}
      </Label>
    </group>
  )
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
            {Object.entries(geo.parts).map(([part, g]) => (
              <mesh
                key={part}
                geometry={g}
                material={mats[part]}
                // see-through glass doesn't cast shadows
                castShadow={!mats[part]!.transparent}
                receiveShadow
              />
            ))}
            {geo.signs.map((s, i) => (
              <NameSign key={i} sign={s} />
            ))}
          </group>
        )
      })}
    </>
  )
}
