import { Environment, Sky, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, PlaneGeometry, type DirectionalLight, type HemisphereLight } from 'three'
import campus from '../campus/campus.json'
import { areasGeometry, linesGeometry, planarUv } from '../campus/geometry'
import { night } from '../campus/facade'
import { grassMaterial, paversMaterial, roadMaterial, sidewalkMaterial } from '../campus/ground'
import { localPlayer } from '../game/localPlayer'
import { daylight, sunDirection, sunPosition, timeFor } from '../game/sun'
import { useSettings } from '../settings'
import Buildings from './Buildings'
import Doors from './Doors'
import Furniture from './Furniture'
import Interiors from './Interiors'
import LibraryNorth from './LibraryNorth'
import PantherQuad from './PantherQuad'
import Trees from './Trees'

const DAY_HAZE = new Color('#c9d6e0')
const NIGHT_HAZE = new Color('#0b1322')
const SUNLIGHT = new Color('#fff0dc')
const SUNSET_LIGHT = new Color('#ffb070')
const MOONLIGHT = new Color('#8fa6d6')
const SKY_LIGHT = new Color('#dcecff')
const GROUND_LIGHT = new Color('#6d6452')
const CEILING_LIGHT = new Color('#fff0dc')
const FLOOR_LIGHT = new Color('#8a7460')
const INDOOR_LIGHT = 1.2
const INDOOR_ENVIRONMENT = 0.12

// the real sun over atlanta (or a picked time of day). checked every 30 seconds, it
// doesn't move fast enough to need more
function useSky() {
  const setting = useSettings((s) => s.time)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  return useMemo(() => {
    const when = timeFor(setting, now)
    const dir = sunDirection(when)
    const day = daylight(sunPosition(when).altitude)
    // at night the "sun" light is moonlight from high up in the east
    const light: [number, number, number] = day > 0 ? dir : [0.3, 0.8, -0.5]
    return { dir, day, light, key: `${setting}-${Math.round(when.getTime() / 600_000)}` }
  }, [setting, now])
}

// the map is way bigger than one shadow map can cover nicely, so the sun (and the
// area it casts shadows in) follows you around
function Sun({ dir, day }: { dir: [number, number, number]; day: number }) {
  const light = useRef<DirectionalLight>(null)
  const color = useMemo(() => {
    const low = 1 - Math.min(1, dir[1] * 4) // warmer when the sun is near the horizon
    return day > 0 ? SUNLIGHT.clone().lerp(SUNSET_LIGHT, low) : MOONLIGHT
  }, [dir, day])

  useFrame(() => {
    const l = light.current
    if (!l) return
    l.position.set(localPlayer.x + dir[0] * 150, dir[1] * 150, localPlayer.z + dir[2] * 150)
    l.target.position.set(localPlayer.x, 0, localPlayer.z)
    l.target.updateMatrixWorld()
  })

  return (
    <directionalLight
      ref={light}
      color={color}
      intensity={day > 0 ? 3 * day : 0.35}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-60}
      shadow-camera-right={60}
      shadow-camera-top={60}
      shadow-camera-bottom={-60}
      shadow-camera-far={400}
      // without these you get fine stripes all over the walls and grass (shadow acne)
      shadow-bias={-0.001}
      shadow-normalBias={0.2}
    />
  )
}

// light from the whole sky (the hemisphere light and the environment map). indoors the
// sky can't reach you, it becomes the ceiling lights instead: warm, and the same at any
// time of day. with the sky still lighting everything the rooms looked foggy and blue
function SkyLight({ intensity, environment }: { intensity: number; environment: number }) {
  const light = useRef<HemisphereLight>(null)
  const indoors = useRef(0)

  useFrame(({ scene }, dt) => {
    const l = light.current
    if (!l) return
    const k = (indoors.current +=
      ((localPlayer.inside >= 0 ? 1 : 0) - indoors.current) * Math.min(1, dt * 4))
    // materials without their own envMap all use this, their envMapIntensity is ignored
    scene.environmentIntensity = environment + (INDOOR_ENVIRONMENT - environment) * k
    l.intensity = intensity + (INDOOR_LIGHT - intensity) * k
    l.color.copy(SKY_LIGHT).lerp(CEILING_LIGHT, k)
    l.groundColor.copy(GROUND_LIGHT).lerp(FLOOR_LIGHT, k)
  })

  return <hemisphereLight ref={light} args={[SKY_LIGHT, GROUND_LIGHT, intensity]} />
}

function Ground() {
  const geos = useMemo(() => {
    const size = campus.halfSize * 6
    return {
      // goes well past the edge of the map so you don't see where it ends
      lawn: planarUv(new PlaneGeometry(size, size).rotateX(-Math.PI / 2)),
      parks: areasGeometry(campus.parks, 0.02),
      plazas: areasGeometry(campus.plazas, 0.03),
      // under the lawns, which sit on top of it
      pavers: areasGeometry(campus.quad.pavers, 0.015),
      roads: linesGeometry(campus.roads, 0.04),
      paths: linesGeometry(campus.paths, 0.05),
    }
  }, [])

  return (
    <>
      <mesh geometry={geos.lawn} material={grassMaterial} receiveShadow />
      <mesh geometry={geos.parks} material={grassMaterial} receiveShadow />
      <mesh geometry={geos.plazas} material={sidewalkMaterial} receiveShadow />
      <mesh geometry={geos.pavers} material={paversMaterial} receiveShadow />
      <mesh geometry={geos.roads} material={roadMaterial} receiveShadow />
      <mesh geometry={geos.paths} material={sidewalkMaterial} receiveShadow />
    </>
  )
}

export default function Campus() {
  const sky = useSky()
  const sunAt = sky.dir.map((v) => v * 100) as [number, number, number]
  const environment = 0.15 + 0.55 * sky.day
  const haze = useMemo(() => NIGHT_HAZE.clone().lerp(DAY_HAZE, sky.day), [sky.day])

  // lit windows fade in as it gets dark
  useEffect(() => {
    night.value = 1 - sky.day
  }, [sky.day])

  return (
    <>
      <Sky sunPosition={sunAt} turbidity={5} rayleigh={1.2} mieCoefficient={0.004} />
      {sky.day < 0.3 && <Stars radius={600} depth={100} count={3000} factor={12} fade />}
      {/* same sky rendered into a cube map, for reflections and soft light. the key
          makes it re-render when the sun has moved */}
      <Environment key={sky.key} frames={1} resolution={128} environmentIntensity={environment}>
        <Sky sunPosition={sunAt} turbidity={5} rayleigh={1.2} mieCoefficient={0.004} />
      </Environment>
      <fog attach="fog" args={[haze, 300, 1000]} />
      <SkyLight intensity={0.12 + 0.38 * sky.day} environment={environment} />
      <Sun dir={sky.light} day={sky.day} />
      <Ground />
      <Buildings />
      <LibraryNorth />
      <Interiors />
      <Furniture />
      <Doors />
      <PantherQuad />
      <Trees />
    </>
  )
}
