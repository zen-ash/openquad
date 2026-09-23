import { Environment, Sky } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { PlaneGeometry, type DirectionalLight } from 'three'
import campus from '../campus/campus.json'
import { areasGeometry, linesGeometry, planarUv } from '../campus/geometry'
import { grassMaterial, roadMaterial, sidewalkMaterial } from '../campus/ground'
import { localPlayer } from '../game/localPlayer'
import Buildings from './Buildings'
import Trees from './Trees'

// late afternoon, sun in the southwest-ish. used for the sky, the light and reflections
const SUN: [number, number, number] = [-60, 45, 40]
const HAZE = '#c9d6e0'

// the map is way bigger than one shadow map can cover nicely, so the sun (and the
// area it casts shadows in) follows you around
function Sun() {
  const light = useRef<DirectionalLight>(null)

  useFrame(() => {
    const l = light.current
    if (!l) return
    l.position.set(localPlayer.x + SUN[0], SUN[1], localPlayer.z + SUN[2])
    l.target.position.set(localPlayer.x, 0, localPlayer.z)
    l.target.updateMatrixWorld()
  })

  return (
    <directionalLight
      ref={light}
      color="#fff0dc"
      intensity={3}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-50}
      shadow-camera-right={50}
      shadow-camera-top={50}
      shadow-camera-bottom={-50}
      shadow-camera-far={200}
      // without these you get fine stripes all over the walls and grass (shadow acne)
      shadow-bias={-0.001}
      shadow-normalBias={0.2}
    />
  )
}

function Ground() {
  const geos = useMemo(() => {
    const size = campus.halfSize * 6
    return {
      // goes well past the edge of the map so you don't see where it ends
      lawn: planarUv(new PlaneGeometry(size, size).rotateX(-Math.PI / 2)),
      parks: areasGeometry(campus.parks, 0.02),
      plazas: areasGeometry(campus.plazas, 0.03),
      roads: linesGeometry(campus.roads, 0.04),
      paths: linesGeometry(campus.paths, 0.05),
    }
  }, [])

  return (
    <>
      <mesh geometry={geos.lawn} material={grassMaterial} receiveShadow />
      <mesh geometry={geos.parks} material={grassMaterial} receiveShadow />
      <mesh geometry={geos.plazas} material={sidewalkMaterial} receiveShadow />
      <mesh geometry={geos.roads} material={roadMaterial} receiveShadow />
      <mesh geometry={geos.paths} material={sidewalkMaterial} receiveShadow />
    </>
  )
}

export default function Campus() {
  return (
    <>
      <Sky sunPosition={SUN} turbidity={5} rayleigh={1.2} mieCoefficient={0.004} />
      {/* same sky rendered once into a cube map, for reflections and soft light */}
      <Environment frames={1} resolution={128} environmentIntensity={0.7}>
        <Sky sunPosition={SUN} turbidity={5} rayleigh={1.2} mieCoefficient={0.004} />
      </Environment>
      <fog attach="fog" args={[HAZE, 200, 600]} />
      <hemisphereLight args={['#dcecff', '#6d6452', 0.5]} />
      <Sun />
      <Ground />
      <Buildings />
      <Trees />
    </>
  )
}
