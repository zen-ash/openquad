import { useFrame } from '@react-three/fiber'
import {
  AtmosphereContext,
  AtmosphereLight,
  AtmosphereLightNode,
  AtmosphereParameters,
  sky,
  skyEnvironment,
  StarsNode,
} from '@takram/three-atmosphere/webgpu'
import { Ellipsoid, Geodetic, radians } from '@takram/three-geospatial'
import { useEffect } from 'react'
import { Color, Matrix4, Vector3 } from 'three'
import {
  cameraProjectionMatrixInverse,
  cameraWorldMatrix,
  color,
  context,
  max,
  mix,
  positionGeometry,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'
import { Mesh, NodeMaterial, PlaneGeometry, type Node, type WebGPURenderer } from 'three/webgpu'
import { eciToEcef, moonDirection } from '../game/celestial'
import { SoftCascades } from './softShadows'

// takram's atmosphere (bruneton's precomputed scattering): the sky, sunlight colored by how
// much air it came through, and the haze that turns far buildings paler and bluer. it's
// the real earth, so hurt park (0, 0 here) goes where it really is. high quality only, low
// keeps the old sky (Sky.tsx)
const HURT_PARK = { lat: 33.75419, lon: -84.3854, height: 305 }

// the model works in real units, direct sun about 1. everything else here (lit windows,
// the ceiling panels, google's tiles, the old lights) was made for a sun of about 3.5 to 5,
// so the atmosphere is turned up to match instead. auto exposure goes on top of that
const BRIGHTNESS = 5
const parameters = new AtmosphereParameters()
parameters.luminanceScale *= BRIGHTNESS
export const atmosphere = new AtmosphereContext(parameters)
{
  const at = new Geodetic(radians(HURT_PARK.lon), radians(HURT_PARK.lat), HURT_PARK.height)
  // x north, y up, z east there. ours is x east, y up, z south
  const frame = Ellipsoid.WGS84.getNorthUpEastFrame(at.toECEF(), new Matrix4())
  const axes = new Matrix4().makeBasis(
    new Vector3(0, 0, 1),
    new Vector3(0, 1, 0),
    new Vector3(-1, 0, 0),
  )
  atmosphere.matrixWorldToECEF.value.multiplyMatrices(frame, axes)
}

// the star catalog ships with the game instead of coming from github
export const stars = () => new StarsNode('/atmosphere/stars.bin')

// once, when the renderer starts (App)
export function addAtmosphere(renderer: WebGPURenderer) {
  renderer.contextNode = context({
    ...(renderer.contextNode.value as object),
    getAtmosphere: () => atmosphere,
  })
  // takram's types and three's don't quite agree on the light node
  renderer.library.addLight(AtmosphereLightNode as never, AtmosphereLight)
}

// how bright the picture comes out (Effects), for auto exposure to set
export const exposure = uniform(1)

// the sky: a quad over the whole screen at the far plane, drawn after everything solid so
// it only runs where sky actually shows (it's an expensive shader, as the scene background
// it ran for every pixel, 3ms), and before glass and labels so they blend with it. Effects
// adds the haze on top. downtown's night sky isn't black: city light bounces off the air,
// brownish grey and brightest low down. the model has no cities, so that's added, fading
// in as it gets dark
const glow = uniform(0)
const skyMaterial = new NodeMaterial()
skyMaterial.vertexNode = vec4(positionGeometry.xy, 1, 1)
skyMaterial.depthWrite = false
skyMaterial.fog = false
const skyNode = sky()
skyNode.starsNode = stars()
const view = cameraProjectionMatrixInverse.mul(vec4(positionGeometry.xy, 1, 1)).xyz
const up = max(cameraWorldMatrix.mul(vec4(view, 0)).xyz.normalize().y, 0).pow(0.5)
skyMaterial.colorNode = vec3(skyNode as unknown as Node<'vec3'>).add(
  mix(color('#6b5a4c'), color('#1b1d26'), up).mul(glow),
)
const skyQuad = new Mesh(new PlaneGeometry(2, 2), skyMaterial)
skyQuad.frustumCulled = false
skyQuad.renderOrder = 1000

// the moon's light comes out 2.5e-6 of the sun's, which is right but reads as pitch black.
// this makes a full moon about a tenth of the sun, like before
const MOON = 40000
// and a bit cooler than it really is: at night eyes see blue, the way films show it
const MOONLIGHT = new Color(0.75, 0.87, 1.15)

// reflections and the soft light from the whole sky, redrawn when the camera moves far
const environment = skyEnvironment()

// the sun, through the atmosphere: redder and dimmer when it's low
const sunlight = new AtmosphereLight(150)
sunlight.castShadow = true
// shadows in cascades: a sharp map near you and bigger ones further out, blended into each
// other, out to 400m (the old single map stopped 60m from you). soft edges up close
// (softShadows.ts)
sunlight.shadow.mapSize.set(2048, 2048)
// without these you get fine stripes all over the walls and grass (shadow acne)
sunlight.shadow.bias = -0.0005
sunlight.shadow.normalBias = 0.1
const cascades = new SoftCascades(sunlight, { cascades: 3, maxFar: 400, lightMargin: 200 })
cascades.fade = true
sunlight.shadow.shadowNode = cascades
// the light from the sky comes from the environment map, only the sun is direct
sunlight.indirect.value = false

const toWorld = new Vector3()

export default function Atmosphere({ sun, when, day }: { sun: number[]; when: Date; day: number }) {
  const [x, y, z] = sun as [number, number, number]
  useEffect(() => {
    const toEcef = atmosphere.matrixWorldToECEF.value
    atmosphere.sunDirectionECEF.value.copy(toWorld.set(x, y, z)).transformDirection(toEcef)
    const sky = eciToEcef(when, atmosphere.matrixECIToECEF.value)
    moonDirection(when, sky, atmosphere.moonDirectionECEF.value)
    // the same light is the moon at night, from wherever the moon really is
    // (through color: the node multiplies by intensity twice, color only once)
    sunlight.body = day > 0 ? 'sun' : 'moon'
    if (day > 0) sunlight.color.setScalar(1)
    else sunlight.color.copy(MOONLIGHT).multiplyScalar(MOON)
    glow.value = 1 - day
  }, [x, y, z, when, day])

  useFrame(({ scene, camera }) => {
    atmosphere.camera = camera
    scene.environmentNode = environment as unknown as Node<'vec3'>
  })

  return (
    <>
      <primitive object={sunlight} />
      <primitive object={skyQuad} />
    </>
  )
}
