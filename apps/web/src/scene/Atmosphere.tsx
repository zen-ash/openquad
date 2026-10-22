import { useFrame } from '@react-three/fiber'
import {
  AtmosphereContext,
  AtmosphereLight,
  AtmosphereLightNode,
  AtmosphereParameters,
  getSplitIlluminance,
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
  smoothstep,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'
import { Mesh, NodeMaterial, PlaneGeometry, type Node, type WebGPURenderer } from 'three/webgpu'
import { eciToEcef, moonDirection } from '../game/celestial'
import { useSettings } from '../settings'
import { cloudySky, updateClouds } from './clouds'
import { lighterShadowPasses, SoftCascades } from './softShadows'

// takram's atmosphere (bruneton's precomputed scattering): the sky, sunlight colored by how
// much air it came through, and the haze that turns far buildings paler and bluer. it's
// the real earth, so hurt park (0, 0 here) goes where it really is. high quality only, low
// keeps the old sky (Sky.tsx)
const HURT_PARK = { lat: 33.75419, lon: -84.3854, height: 305 }

// the model works in real units, direct sun about 1. everything else here (lit windows,
// the ceiling panels, the old lights) was made for a sun of about 3.5 to 5,
// so the atmosphere is turned up to match instead. auto exposure goes on top of that
const BRIGHTNESS = 5
const parameters = new AtmosphereParameters()
parameters.luminanceScale *= BRIGHTNESS
export const atmosphere = new AtmosphereContext(parameters)
// past the edge of the map the ground would be the model's bare earth, which came out
// black. the horizon's haze goes down to it instead, like the city just carries on
atmosphere.showGround = false
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
  lighterShadowPasses(renderer, cascades)
}

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
// the stars are drawn into a texture the size of the screen every frame (0.1ms). in full
// daylight they don't show at all, so then it's left as it was. drawn while the shaders
// are being built either way, or the first dusk would build them
const starsNode = stars()
const drawStars = starsNode.updateBefore.bind(starsNode)
starsNode.updateBefore = (frame) => {
  if (glow.value > 0 || useSettings.getState().warming) drawStars(frame)
}
skyNode.starsNode = starsNode
const view = cameraProjectionMatrixInverse.mul(vec4(positionGeometry.xy, 1, 1)).xyz
const dir = cameraWorldMatrix.mul(vec4(view, 0)).xyz.normalize()
const up = max(dir.y, 0).pow(0.5)
skyMaterial.colorNode = cloudySky(vec3(skyNode as unknown as Node<'vec3'>), dir, atmosphere).add(
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
// there's no ground in the model here (showGround above), so under the horizon the sky just
// carried on as more bright haze, and anything in the shade got lit blue from underneath. real
// shade gets the light bounced off the street and off the sunlit walls across it: warm, and
// about a third of what the sun and the sky put on the ground
// how much of that comes back, per color (linear): warm grey, like concrete and pavement
const BOUNCE = vec3(0.32, 0.29, 0.25)
const look = cameraProjectionMatrixInverse.mul(vec4(positionGeometry.xy, 1, 1)).xyz
const down = cameraWorldMatrix.mul(vec4(look, 0)).xyz.normalize().y.negate()
const onGround = getSplitIlluminance(
  atmosphere.cameraPositionUnit.add(atmosphere.altitudeCorrectionUnit),
  atmosphere.cameraPositionUnit.normalize(),
  atmosphere.sunDirectionECEF,
)
const bounced = onGround
  .get('direct')
  .add(onGround.get('indirect'))
  .mul(BOUNCE)
  .mul(1 / Math.PI)
// made once: takram sets the environment up again now and then, a new node every time
// rebuilt its shader and drew its cube again (2.4s more to get through the warm-up)
const grounded = mix(
  vec3(environment.skyNode as unknown as Node<'vec3'>),
  bounced,
  smoothstep(0, 0.15, down),
)
const setupEnvironment = environment.setup.bind(environment)
environment.setup = (builder) => {
  const out = setupEnvironment(builder)
  ;(environment as unknown as { material: NodeMaterial }).material.fragmentNode = grounded
  return out
}

// the sun, through the atmosphere: redder and dimmer when it's low
export const sunlight = new AtmosphereLight(150)
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

export default function Atmosphere({
  sun,
  when,
  day,
  sky = true,
}: {
  sun: number[]
  when: Date
  day: number
  // false: only the light and the haze, the game look draws its own sky
  sky?: boolean
}) {
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

  useFrame(({ scene, camera }, dt) => {
    atmosphere.camera = camera
    scene.environmentNode = environment as unknown as Node<'vec3'>
    updateClouds(sun, dt)
  })

  return (
    <>
      <primitive object={sunlight} />
      {sky && <primitive object={skyQuad} />}
    </>
  )
}
