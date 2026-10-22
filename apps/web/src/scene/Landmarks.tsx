import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import campus from '../campus/campus.json'
import { artsHumanitiesMaterials } from '../campus/artsHumanitiesMaterials'
import { classroomSouthMaterials } from '../campus/classroomSouthMaterials'
import { collegeOfEducationMaterials } from '../campus/collegeOfEducationMaterials'
import { courtlandBuildingMaterials } from '../campus/courtlandBuildingMaterials'
import { courtlandNorthMaterials } from '../campus/courtlandNorthMaterials'
import { dahlbergMaterials } from '../campus/dahlbergMaterials'
import { langdaleHallMaterials } from '../campus/langdaleHallMaterials'
import { wallQuad } from '../campus/landmark'
import { landmarkGeometry, type Sign } from '../campus/landmarks'
import { libraryNorthMaterials } from '../campus/libraryNorthMaterials'
import { precast } from '../campus/materials'
import { librarySouthMaterials } from '../campus/librarySouthMaterials'
import { naturalScienceMaterials } from '../campus/naturalScienceMaterials'
import { petitScienceMaterials } from '../campus/petitScienceMaterials'
import { practiceFacilityMaterials } from '../campus/practiceFacilityMaterials'
import { recCenterMaterials } from '../campus/recCenterMaterials'
import { researchScienceMaterials } from '../campus/researchScienceMaterials'
import { researchTowerMaterials } from '../campus/researchTowerMaterials'
import { scienceAnnexMaterials } from '../campus/scienceAnnexMaterials'
import { sportsArenaMaterials } from '../campus/sportsArenaMaterials'
import { studentCenterEastMaterials } from '../campus/studentCenterEastMaterials'
import { studentCenterWestMaterials } from '../campus/studentCenterWestMaterials'
import { universityBookstoreMaterials } from '../campus/universityBookstoreMaterials'
import { urbanLifeMaterials } from '../campus/urbanLifeMaterials'
import { floorOf, lowestUnder } from '../game/surface'
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
  'College of Education & Human Development': collegeOfEducationMaterials,
  'Petit Science Center': petitScienceMaterials,
  'University Bookstore': universityBookstoreMaterials,
  'Practice Facility': practiceFacilityMaterials,
  'GSU Sports Arena': sportsArenaMaterials,
  'Student Recreation Center': recCenterMaterials,
  'Natural Science Center': naturalScienceMaterials,
  'Courtland North': courtlandNorthMaterials,
  'Courtland Building': courtlandBuildingMaterials,
  'Research Science Center': researchScienceMaterials,
  'Science Annex': scienceAnnexMaterials,
}

// white sign with the name in gsu blue. the real ones have the logo where the blue
// square is, but that's gsu's trademark
function NameSign({ sign }: { sign: Sign }) {
  if (!sign.text)
    return (
      <mesh position={[sign.x, sign.y, sign.z]} rotation-y={sign.rot}>
        <planeGeometry args={[sign.width ?? 1, sign.height ?? 1]} />
        <meshStandardMaterial color={sign.plate ?? '#f4f4f2'} />
      </mesh>
    )
  if (sign.letters)
    return (
      <Label
        position={[sign.x, sign.y, sign.z]}
        rotation-y={sign.rot}
        scale-x={sign.wide ?? 1}
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
  const height = sign.height ?? 0.75 + (lines.length - 1) * 0.45
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

// under a hand-built building where the ground falls away from its floor: plain concrete
// walls round its outline from just below the ground up to the floor. all of them are one
// mesh: one each was a few more draws a frame for every building in view
const plinth = precast({ color: '#8f8a82', panel: [3, 1.5], joint: 0.01, tone: 0.03, dirt: 0.5 })
let plinths: THREE.BufferGeometry | null | undefined
function allPlinths() {
  if (plinths !== undefined) return plinths
  const walls = campus.buildings
    .filter((b) => b.name && materials[b.name] && landmarkGeometry(b))
    .map((b) => plinthGeometry(b.points, floorOf(b)))
    .filter((g): g is THREE.BufferGeometry => !!g)
  return (plinths = walls.length ? mergeGeometries(walls) : null)
}
function plinthGeometry(points: number[][], floor: number) {
  const outline = points.map(([x, z]) => ({ x: x!, z: z! }))
  const area = outline.reduce((a, p, i) => {
    const q = outline[(i + 1) % outline.length]!
    return a + p.x * q.z - q.x * p.z
  }, 0)
  const walls = outline.flatMap((a, i) => {
    const b = outline[(i + 1) % outline.length]!
    const low = Math.min(
      lowestUnder([
        [a.x, a.z],
        [b.x, b.z],
      ]) - floor,
      0,
    )
    if (low > -0.02) return []
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1
    const sign = area > 0 ? 1 : -1
    const out = { x: (-(b.z - a.z) / len) * sign, z: ((b.x - a.x) / len) * sign }
    return [wallQuad(a, b, low - 0.3, 0.02, out)]
  })
  return walls.length ? mergeGeometries(walls).translate(0, floor, 0) : null
}

// a wall drawn before everything else while you're close to it (LandmarkGeometry.first).
// from further away the building is more often behind other things, so then it keeps its
// place (drawn first from 50m away, the bits of it behind library north cost 0.5ms)
const NEAR = 20
const near = new THREE.Vector3()
function FirstWhenNear({
  geometry,
  material,
  floor,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  floor: number
}) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame(({ camera }) => {
    if (!mesh.current) return
    if (!geometry.boundingBox) geometry.computeBoundingBox()
    // the box is the building's own, it stands at its floor
    near.copy(camera.position).setY(camera.position.y - floor)
    mesh.current.renderOrder = geometry.boundingBox!.distanceToPoint(near) < NEAR ? -1 : 0
  })
  return <mesh ref={mesh} geometry={geometry} material={material} castShadow receiveShadow />
}

// the buildings drawn by hand from photos (campus/landmarks.ts). they're left out of
// the regular buildings mesh
export default function Landmarks() {
  const under = allPlinths()
  return (
    <>
      {under && <mesh geometry={under} material={plinth} castShadow receiveShadow />}
      {campus.buildings.map((b) => {
        const geo = landmarkGeometry(b)
        const mats = b.name ? materials[b.name] : undefined
        if (!geo || !mats) return null
        // drawn as if the ground were flat at its floor (surface.ts), so it stands there and
        // gets a plinth down to the ground wherever the ground is lower
        const floor = floorOf(b)
        return (
          <group key={b.name} position-y={floor}>
            {Object.entries(geo.parts).map(([part, g]) =>
              geo.first?.includes(part) ? (
                <FirstWhenNear key={part} geometry={g} material={mats[part]!} floor={floor} />
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
