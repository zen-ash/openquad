import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { drape } from '../campus/drape'
import { linesGeometry, planarUv, type LineData } from '../campus/geometry'
import { railMaterial, trackMaterial } from '../campus/ground'
import { clearGlass, concrete, metal } from '../campus/materials'
import {
  overheadGeometry,
  stopsGeometry,
  streetcarGeometry,
  streetcarMaterial,
  trackLines,
} from '../campus/streetcar'
import { clock } from '../game/signals'
import { streetcarsAt } from '../game/streetcar'
import { COARSE, GRID, isNear } from '../game/terrain'
import { still, useSettings } from '../settings'

// the two streetcars: three sections each, every section its own mesh so it's culled on its
// own (they're far apart most of the time). the front one leads with its head lamps, the
// back one is the same end turned round
const geo = streetcarGeometry()
const cars = [0, 1].map(() =>
  [geo.end, geo.middle, geo.end].map((g, i) => {
    const m = new THREE.Mesh(g, streetcarMaterial)
    m.castShadow = true
    m.receiveShadow = true
    m.rotation.order = 'YXZ'
    m.userData.leads = i === 0 ? 1 : 0
    return m
  }),
)

// on the ground like the roads (Campus.tsx onGround)
const onGround = (lines: LineData[], lift: number) =>
  planarUv(
    mergeGeometries([
      drape(linesGeometry(lines, 0), lift, GRID, isNear),
      drape(linesGeometry(lines, 0), lift, COARSE, (x, z) => !isNear(x, z)),
    ]),
  )
const track = trackLines()
const slab = onGround(track.slab, 0.0042)
const rails = onGround(track.rails, 0.0047)
const stops = stopsGeometry()
const overhead = overheadGeometry()
// the wire goes in with the poles: one mesh, one material (its shadow is a hairline)
const steel = mergeGeometries([stops.steel, overhead.steel, overhead.wire])
// the stops' concrete, dark grey steel (shelters, poles, the wire) and the shelters' glass
const platformMaterial = concrete({ color: '#b9b6ae', dirt: 0.3 })
const steelMaterial = metal({ color: '#2b2e33', roughness: 0.5, joint: 0 })
const glassMaterial = clearGlass({ color: '#c9d3d8', opacity: 0.25 })
const NO_PREPASS = { prepass: false }

export default function Streetcar() {
  useFrame(() => {
    const { warming } = useSettings.getState()
    const running = streetcarsAt(clock(still))
    cars.forEach((meshes, n) => {
      const car = running.find((c) => c.id === n)
      meshes.forEach((m, i) => {
        // while warming they're drawn somewhere under the ground so the shader gets built
        m.visible = !!car || warming
        if (!car) {
          m.position.set(0, -60, 0)
          return
        }
        const s = car.sections[i]!
        const back = i === 2
        m.position.set(s.x, s.y, s.z)
        m.rotation.set(back ? s.pitch : -s.pitch, s.heading + (back ? Math.PI : 0), 0)
      })
    })
  })
  return (
    <>
      {/* these run the whole route, so they're in view (and drawn) from almost everywhere:
          they stay out of the prepass (only the ao reads it, Effects.tsx) and the platforms,
          0.36m high, don't cast */}
      <mesh geometry={slab} material={trackMaterial} receiveShadow userData={NO_PREPASS} />
      <mesh geometry={rails} material={railMaterial} receiveShadow userData={NO_PREPASS} />
      <mesh
        geometry={stops.platform}
        material={platformMaterial}
        receiveShadow
        userData={NO_PREPASS}
      />
      <mesh
        geometry={steel}
        material={steelMaterial}
        castShadow
        receiveShadow
        userData={NO_PREPASS}
      />
      <mesh geometry={stops.glass} material={glassMaterial} userData={NO_PREPASS} />
      {cars.flat().map((m) => (
        <primitive key={m.uuid} object={m} />
      ))}
    </>
  )
}
