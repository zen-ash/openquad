import { Sky } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { DoubleSide, type DirectionalLight } from 'three'
import campus from '../campus/campus.json'
import { areasGeometry, linesGeometry } from '../campus/geometry'
import { localPlayer } from '../game/localPlayer'
import Buildings from './Buildings'
import { toonMaterial } from './toon'
import Trees from './Trees'

const SKY = '#bcd9ee'

const grass = toonMaterial('#7cc36b')
const park = toonMaterial('#62b456')
const road = toonMaterial('#8d9096')
const path = toonMaterial('#e8dcbc')
// flat strips, depending on which way the road was drawn they can end up facing down
road.side = DoubleSide
path.side = DoubleSide

// the map is way bigger than one shadow map can cover nicely, so the sun (and the
// area it casts shadows in) follows you around
function Sun() {
  const light = useRef<DirectionalLight>(null)

  useFrame(() => {
    const l = light.current
    if (!l) return
    l.position.set(localPlayer.x + 30, 50, localPlayer.z + 20)
    l.target.position.set(localPlayer.x, 0, localPlayer.z)
    l.target.updateMatrixWorld()
  })

  return (
    <directionalLight
      ref={light}
      intensity={2}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-45}
      shadow-camera-right={45}
      shadow-camera-top={45}
      shadow-camera-bottom={-45}
      shadow-camera-far={150}
      // without these you get fine stripes all over the walls and grass (shadow acne)
      shadow-bias={-0.001}
      shadow-normalBias={0.2}
    />
  )
}

function Ground() {
  const geos = useMemo(
    () => ({
      parks: areasGeometry(campus.parks, 0.02),
      plazas: areasGeometry(campus.plazas, 0.03),
      roads: linesGeometry(campus.roads, 0.04),
      paths: linesGeometry(campus.paths, 0.05),
    }),
    [],
  )

  return (
    <>
      {/* goes well past the edge of the map so you don't see where it ends */}
      <mesh rotation-x={-Math.PI / 2} material={grass} receiveShadow>
        <planeGeometry args={[campus.halfSize * 6, campus.halfSize * 6]} />
      </mesh>
      <mesh geometry={geos.parks} material={park} receiveShadow />
      <mesh geometry={geos.plazas} material={path} receiveShadow />
      <mesh geometry={geos.roads} material={road} receiveShadow />
      <mesh geometry={geos.paths} material={path} receiveShadow />
    </>
  )
}

export default function Campus() {
  return (
    <>
      <Sky sunPosition={[40, 30, 20]} />
      <fog attach="fog" args={[SKY, 90, 220]} />
      <ambientLight intensity={1.2} />
      <Sun />
      <Ground />
      <Buildings />
      <Trees />
    </>
  )
}
