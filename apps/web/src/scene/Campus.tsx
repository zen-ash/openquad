import { useFrame } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Color,
  type BufferAttribute,
  type BufferGeometry,
  type DirectionalLight,
  type HemisphereLight,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import campus from '../campus/campus.json'
import { deckStructure } from '../campus/decks'
import { drape, terrainGeometry } from '../campus/drape'
import { COARSE, GRID, isNear } from '../game/terrain'
import { precast } from '../campus/materials'
import { areasGeometry, linesGeometry, onDeck, planarUv, type LineData } from '../campus/geometry'
import { night } from '../campus/facade'
import {
  crosswalkMaterial,
  grassMaterial,
  paversMaterial,
  pavingMaterial,
  roadMaterial,
  sidewalkMaterial,
} from '../campus/ground'
import {
  gameGrass,
  gameLot,
  gamePath,
  gamePavers,
  gamePaving,
  gamePlaza,
  gameRoad,
} from '../campus/game'
import {
  toonGrass,
  toonLot,
  toonPath,
  toonPavers,
  toonPaving,
  toonPlaza,
  toonRoad,
} from '../campus/toon'
import { localPlayer } from '../game/localPlayer'
import { daylight, sunDirection, sunPosition, timeFor } from '../game/sun'
import { game, today, toon, useSettings } from '../settings'
import Buildings from './Buildings'
import Collectibles from './Collectibles'
import Doors from './Doors'
import EntranceMarkers from './EntranceMarkers'
import FenceHaze from './FenceHaze'
import FenceLine from './FenceLine'
import Fountain from './Fountain'
import Furniture from './Furniture'
import GameSky, { HORIZON as GAME_HORIZON } from './GameSky'
import GameTrees from './GameTrees'
import Interiors from './Interiors'
import Landmarks from './Landmarks'
import PantherQuad from './PantherQuad'
import { SkyDome, SkyEnvironment, Stars } from './Sky'
import Signals from './Signals'
import StreetFurniture from './StreetFurniture'
import Toonify from './Toonify'
import ToonSky, { HORIZON } from './ToonSky'
import ToonTrees from './ToonTrees'
import Trees from './Trees'

// only loaded on high quality (App loads it first thing when it starts on high)
const Atmosphere = lazy(() => import('./Atmosphere'))

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
// the cartoon sun is a plain warm white at any time of day, and the light from the ground
// is a pale green instead of brown, so the shade stays colorful
const TOON_SUN = new Color('#fff4df')
const TOON_GROUND_LIGHT = new Color('#a7b98f')

// the real sun over atlanta (or a picked time of day). checked every 30 seconds, it
// doesn't move fast enough to need more
function useSky() {
  const setting = useSettings((s) => s.time)
  const [now, setNow] = useState(today)

  useEffect(() => {
    const timer = setInterval(() => setNow(today()), 30_000)
    return () => clearInterval(timer)
  }, [])

  return useMemo(() => {
    const when = timeFor(setting, now)
    const dir = sunDirection(when)
    const day = daylight(sunPosition(when).altitude)
    // at night the "sun" light is moonlight from high up in the east
    const light: [number, number, number] = day > 0 ? dir : [0.3, 0.8, -0.5]
    return { dir, day, light, when }
  }, [setting, now])
}

// the map is way bigger than one shadow map can cover nicely, so the sun (and the
// area it casts shadows in) follows you around
function Sun({ dir, day }: { dir: [number, number, number]; day: number }) {
  const light = useRef<DirectionalLight>(null)
  const color = useMemo(() => {
    const low = 1 - Math.min(1, dir[1] * 4) // warmer when the sun is near the horizon
    if (toon) return day > 0 ? TOON_SUN : MOONLIGHT
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
      intensity={day > 0 ? (toon ? 2.3 : 3.5) * day : 0.35}
      castShadow
      shadow-mapSize={[2048, 2048]}
      // the cartoon camera is further out, and its shadows are softer
      shadow-radius={toon ? 3 : 1}
      shadow-camera-left={toon ? -80 : -60}
      shadow-camera-right={toon ? 80 : 60}
      shadow-camera-top={toon ? 80 : 60}
      shadow-camera-bottom={toon ? -80 : -60}
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
    l.groundColor.copy(toon ? TOON_GROUND_LIGHT : GROUND_LIGHT).lerp(FLOOR_LIGHT, k)
  })

  // not in args: fiber makes a new light when args change, and a new light (new id) means
  // every material in the scene gets rebuilt. that happened whenever the time of day moved
  return <hemisphereLight ref={light} args={[SKY_LIGHT, GROUND_LIGHT]} intensity={intensity} />
}

// on the ground's shape, on the fine grid near campus and the coarse one past that
// (game/terrain.ts isNear): half the ground's triangles
function onGround(geo: BufferGeometry, lift: number, cut: { points: number[][] }[] = []) {
  return mergeGeometries([
    drape(geo, lift, GRID, isNear, cut),
    drape(geo, lift, COARSE, (x, z) => !isNear(x, z), cut),
  ])
}
// the buildings you can walk into: the ground stops at their walls, their own floor is inside
const enterable = campus.buildings.filter((b) => b.door && !b.minHeight)

// roads and paths on the ground, and bridges at their decks' height

function lines(all: LineData[], lift: number) {
  const ground = onGround(
    linesGeometry(
      all.filter((l) => !onDeck(l)),
      0,
    ),
    lift,
  )
  const decks = linesGeometry(all.filter(onDeck), lift)
  // indexed like the draped ones, or they can't be merged
  decks.setIndex([...Array(decks.getAttribute('position').count).keys()])
  return mergeGeometries([planarUv(ground), decks])
}
// the crossings (osm footway=crossing), a meter short at each end so they stay on the road,
// with their width negative: that's how the road shader knows to paint the bars (ground.ts)
function crosswalks() {
  const short = campus.crossings.flatMap(({ width, points }) => {
    const [a, b] = [points[0]!, points[points.length - 1]!]
    const len = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!)
    if (len < 4) return []
    const k = 1 / len
    const at = (t: number) => [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t]
    return [{ width, points: [at(k), at(1 - k)] }]
  })
  const geo = planarUv(onGround(linesGeometry(short, 0), 0.0045))
  const road = geo.getAttribute('aRoad') as BufferAttribute
  for (let i = 0; i < road.count; i++) road.setZ(i, -Math.abs(road.getZ(i)))
  return geo
}
const areas = (all: number[][][], lift: number) =>
  planarUv(onGround(areasGeometry(all, 0), lift, enterable))

// the concrete under the bridges' decks (campus/decks.ts), once for the whole visit
const deckConcrete = precast({
  color: '#9b968d',
  panel: [6, 1.2],
  joint: 0.012,
  tone: 0.04,
  dirt: 0.6,
})
const deckGeometry = deckStructure([...campus.roads, ...campus.paths] as LineData[])
function Decks() {
  if (!deckGeometry) return null
  return <mesh geometry={deckGeometry} material={deckConcrete} castShadow receiveShadow />
}

// the ground: the 4m grid near campus, the coarse one everywhere else. they meet on one of
// the coarse grid's lines at the same heights
function ground() {
  const solid = campus.buildings.filter((b) => !b.minHeight)
  return mergeGeometries([
    terrainGeometry(campus.halfSize * 3, solid, { keep: isNear, ring: false, cut: enterable }),
    terrainGeometry(campus.halfSize * 3, solid, {
      grid: COARSE,
      keep: (x, z) => !isNear(x, z),
      cut: enterable,
    }),
  ])
}

function Ground() {
  const geos = useMemo(
    () => ({
      // goes well past the edge of the map so you don't see where it ends
      ground: planarUv(ground()),
      lots: areas(campus.lots, 0.0012),
      parks: areas([...campus.parks, ...campus.lawns], 0.002),
      plazas: areas(campus.plazas, 0.003),
      // under the lawns, which sit on top of it
      pavers: areas(campus.quad.pavers, 0.0015),
      roads: lines(campus.roads, 0.004),
      crosswalks: crosswalks(),
      paths: lines(campus.paths, 0.005),
    }),
    [],
  )

  if (game)
    return (
      <>
        <mesh geometry={geos.ground} material={gamePaving()} receiveShadow />
        <mesh geometry={geos.lots} material={gameLot()} receiveShadow />
        <mesh geometry={geos.pavers} material={gamePavers()} receiveShadow />
        <mesh geometry={geos.parks} material={gameGrass()} receiveShadow />
        <mesh geometry={geos.roads} material={gameRoad()} receiveShadow />
        <mesh geometry={geos.plazas} material={gamePlaza()} receiveShadow />
        <mesh geometry={geos.paths} material={gamePath()} receiveShadow />
      </>
    )
  if (toon)
    return (
      <>
        <mesh geometry={geos.ground} material={toonPaving()} receiveShadow />
        <mesh geometry={geos.lots} material={toonLot()} receiveShadow />
        <mesh geometry={geos.pavers} material={toonPavers()} receiveShadow />
        <mesh geometry={geos.parks} material={toonGrass()} receiveShadow />
        <mesh geometry={geos.roads} material={toonRoad()} receiveShadow />
        <mesh geometry={geos.plazas} material={toonPlaza()} receiveShadow />
        <mesh geometry={geos.paths} material={toonPath()} receiveShadow />
      </>
    )
  return (
    <>
      <mesh geometry={geos.ground} material={pavingMaterial} receiveShadow />
      {/* parking lots are asphalt like the roads, the lane lines only go on roads */}
      <mesh geometry={geos.lots} material={roadMaterial} receiveShadow />
      <mesh geometry={geos.pavers} material={paversMaterial} receiveShadow />
      <mesh geometry={geos.parks} material={grassMaterial} receiveShadow />
      <mesh geometry={geos.roads} material={roadMaterial} receiveShadow />
      <mesh geometry={geos.crosswalks} material={crosswalkMaterial} receiveShadow />
      <mesh geometry={geos.plazas} material={sidewalkMaterial} receiveShadow />
      <mesh geometry={geos.paths} material={sidewalkMaterial} receiveShadow />
    </>
  )
}

// the game sky's stars: always there so their shader stays built, shown at night (and
// while the shaders are being built before joining)
function GameStars({ night }: { night: boolean }) {
  const warming = useSettings((s) => s.warming)
  return (
    <group visible={night || warming}>
      <Stars />
    </group>
  )
}

export default function Campus() {
  const sky = useSky()
  // the real atmosphere when the visit started on high quality with webgpu (it stays if it
  // drops to low), otherwise the old sky (it's cheaper and runs on webgl2)
  const high = useSettings((s) => s.atmosphere)
  const fenceLine = useSettings((s) => s.fenceLine)
  const sunAt = sky.dir.map((v) => v * 100) as [number, number, number]
  // not too much light from the sky, or shade looks nearly as bright as sun and the
  // whole city goes flat and hazy
  const environment = 0.15 + 0.3 * sky.day
  const haze = useMemo(() => NIGHT_HAZE.clone().lerp(DAY_HAZE, sky.day), [sky.day])
  const gameHaze = useMemo(() => NIGHT_HAZE.clone().lerp(GAME_HORIZON, sky.day), [sky.day])

  // lit windows fade in as it gets dark
  useEffect(() => {
    night.value = 1 - sky.day
  }, [sky.day])

  return (
    <>
      {toon ? (
        <>
          <ToonSky daylight={sky.day} />
          <fog attach="fog" args={[HORIZON, 260, 1300]} />
          <Sun dir={sky.light} day={sky.day} />
        </>
      ) : high ? (
        <Suspense fallback={null}>
          {/* the game look keeps the real sky's light and haze, and draws its own sky */}
          <Atmosphere sun={sky.dir} when={sky.when} day={sky.day} sky={!game} />
          {game && <GameSky daylight={sky.day} sun={sky.dir} />}
          {game && <GameStars night={sky.day < 0.3} />}
        </Suspense>
      ) : (
        <>
          {game ? <GameSky daylight={sky.day} sun={sky.dir} /> : <SkyDome sun={sunAt} />}
          {game ? <GameStars night={sky.day < 0.3} /> : sky.day < 0.3 && <Stars />}
          <SkyEnvironment sun={sunAt} />
          {/* the color as a prop for the same reason as the sky light below */}
          <fog
            attach="fog"
            args={[DAY_HAZE, game ? 350 : 300, game ? 1300 : 1000]}
            color={game ? gameHaze : haze}
          />
          <Sun dir={sky.light} day={sky.day} />
        </>
      )}
      <SkyLight
        // with the atmosphere, the sky's light is its environment map. at night the city's
        // own glow stands in, as dim as the old night light
        intensity={toon ? 0.3 + 1.5 * sky.day : high ? 0.12 * (1 - sky.day) : 0.12 + 0.16 * sky.day}
        environment={high ? 1 : environment}
      />
      <Ground />
      <Decks />
      <Buildings />
      <Landmarks />
      <Interiors />
      <Furniture />
      <Doors />
      <PantherQuad />
      <Fountain />
      <StreetFurniture />
      {!game && !toon && <Signals />}
      {game ? <GameTrees /> : toon ? <ToonTrees /> : <Trees />}
      {game && (
        <>
          <Collectibles />
          <EntranceMarkers />
        </>
      )}
      <FenceHaze />
      {fenceLine && <FenceLine />}
      {toon && <Toonify />}
    </>
  )
}
