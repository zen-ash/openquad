import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  Color,
  Mesh,
  Scene,
  Spherical,
  Vector3,
} from 'three'
import {
  acos,
  clamp,
  cos,
  distance,
  dot,
  exp,
  float,
  Fn,
  instancedBufferAttribute,
  max,
  mix,
  modelViewMatrix,
  modelViewProjection,
  normalize,
  positionWorld,
  pow,
  screenDPR,
  sin,
  smoothstep,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import {
  InstancedBufferAttribute,
  NodeMaterial,
  PMREMGenerator,
  PointsNodeMaterial,
  Sprite,
  type Node,
  type RenderTarget,
  type WebGPURenderer,
} from 'three/webgpu'

type Sun = [number, number, number]

// the sky drei's <Sky> drew: three's old preetham sky shader (from three-stdlib), redone
// in tsl. three's own webgpu SkyMesh has changed since (no final curve, a different sun
// disc, clouds), and it looked noticeably bluer
const TOTAL_RAYLEIGH = vec3(5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5)
const MIE_CONST = vec3(1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14)
const TURBIDITY = 5
const RAYLEIGH = 1.2
const MIE_COEFFICIENT = 0.004
const MIE_G = 0.8
const SUN_DISC_COS = 0.9999566769464484

function makeSky() {
  const sun = uniform(new Vector3(0, 1, 0))
  const material = new NodeMaterial()
  material.side = BackSide
  material.depthWrite = false
  material.fog = false
  // always at the far plane
  material.vertexNode = Fn(() => {
    const p = (modelViewProjection as Node<'vec4'>).toVar()
    p.z.assign(p.w)
    return p
  })()
  material.colorNode = Fn(() => {
    const sunDir = normalize(sun)
    const sunE = float(1000).mul(
      max(
        0,
        float(1).sub(
          exp(
            float(1.6110731556870734)
              .sub(acos(clamp(sunDir.y, -1, 1)))
              .div(-1.5),
          ),
        ),
      ),
    )
    const sunfade = float(1).sub(clamp(float(1).sub(exp(sun.y.div(450000))), 0, 1))
    const betaR = TOTAL_RAYLEIGH.mul(float(RAYLEIGH).sub(float(1).sub(sunfade)))
    const betaM = MIE_CONST.mul(0.434 * 0.2 * TURBIDITY * 10e-18 * MIE_COEFFICIENT)

    // from the middle of the map, not the camera, like the old one
    const direction = normalize(positionWorld)
    const zenith = acos(max(0, direction.y))
    const inverse = float(1).div(
      cos(zenith).add(pow(float(93.885).sub(zenith.mul(180 / Math.PI)), -1.253).mul(0.15)),
    )
    const fex = exp(
      betaR
        .mul(inverse.mul(8.4e3))
        .add(betaM.mul(inverse.mul(1.25e3)))
        .negate(),
    )
    const cosTheta = dot(direction, sunDir)
    const rPhase = pow(cosTheta.mul(0.5).add(0.5), 2).add(1).mul(0.05968310365946075)
    const mPhase = float(0.07957747154594767 * (1 - MIE_G * MIE_G)).div(
      pow(cosTheta.mul(-2 * MIE_G).add(1 + MIE_G * MIE_G), 1.5),
    )
    const scatter = betaR.mul(rPhase).add(betaM.mul(mPhase)).div(betaR.add(betaM)).mul(sunE)
    const lin = pow(scatter.mul(float(1).sub(fex)), vec3(1.5)).mul(
      mix(vec3(1), pow(scatter.mul(fex), vec3(0.5)), clamp(pow(float(1).sub(sunDir.y), 5), 0, 1)),
    )
    const disc = smoothstep(SUN_DISC_COS, SUN_DISC_COS + 0.00002, cosTheta)
    const l0 = fex.mul(0.1).add(fex.mul(sunE.mul(19000)).mul(disc))
    const color = lin
      .add(l0)
      .mul(0.04)
      .add(vec3(0, 0.0003, 0.00075))
    return vec4(pow(color, vec3(float(1).div(sunfade.mul(1.2).add(1.2)))), 1)
  })()
  const sky = new Mesh(new BoxGeometry(1, 1, 1), material)
  sky.scale.setScalar(1000)
  return { sky, sun }
}

const dome = makeSky()
// a second one in its own scene, for the environment map
const envSky = makeSky()
const envScene = new Scene().add(envSky.sky)

export function SkyDome({ sun }: { sun: Sun }) {
  const [x, y, z] = sun
  useEffect(() => {
    dome.sun.value.set(x, y, z)
  }, [x, y, z])
  return <primitive object={dome.sky} />
}

// the same sky rendered into a cube map, for reflections and soft light. redone when the
// sun moves, which is at most every 30 seconds (Campus useSky)
const env = { pmrem: null as PMREMGenerator | null, target: null as RenderTarget | null }

export function SkyEnvironment({ sun }: { sun: Sun }) {
  const [x, y, z] = sun
  useFrame(({ gl, scene }) => {
    // high quality's atmosphere (Atmosphere.tsx) sets its own, it'd win over this one
    scene.environmentNode = null
    const at = envSky.sun.value
    if (env.target && at.x === x && at.y === y && at.z === z) return
    at.set(x, y, z)
    env.pmrem ??= new PMREMGenerator(gl as unknown as WebGPURenderer)
    env.target = env.pmrem.fromScene(envScene, 0, 1, 1000, {
      size: 128,
      renderTarget: env.target,
    })
    scene.environment = env.target.texture
  })
  return null
}

// drei's <Stars> redone for webgpu (points bigger than a pixel are sprites there). same
// numbers: 3000 stars in a shell 600-700m out, a bit bigger or smaller, twinkling
const COUNT = 3000
const RADIUS = 600
const DEPTH = 100
const FACTOR = 12

function starField() {
  const positions = new Float32Array(COUNT * 3)
  const colors = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)
  const p = new Vector3()
  const color = new Color()
  let r = RADIUS + DEPTH
  for (let i = 0; i < COUNT; i++) {
    sizes[i] = (0.5 + 0.5 * Math.random()) * FACTOR
    r -= (DEPTH / COUNT) * Math.random()
    p.setFromSpherical(
      new Spherical(r, Math.acos(1 - Math.random() * 2), Math.random() * 2 * Math.PI),
    )
    // drei put them at w = 0.5, which is the same as twice as far out
    p.multiplyScalar(2).toArray(positions, i * 3)
    color.setHSL(i / COUNT, 0, 0.9).toArray(colors, i * 3)
  }

  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: false,
  })
  const each = <T extends string>(data: Float32Array, size: number, type: T) =>
    instancedBufferAttribute(new InstancedBufferAttribute(data, size), type)
  const position = each(positions, 3, 'vec3')
  const size = each(sizes, 1, 'float')
  const color3 = each(colors, 3, 'vec3')
  material.positionNode = position
  // drei's sizes were in canvas pixels and never under one, three multiplies by the dpr
  const depth = modelViewMatrix.mul(vec4(position, 1)).z.negate().mul(0.5)
  material.sizeNode = max(
    float(1),
    size.mul(float(30).div(depth)).mul(sin(time.add(100)).add(3)),
  ).div(screenDPR)
  const d = distance(uv(), vec2(0.5))
  material.colorNode = vec4(color3, float(1).div(exp(d.sub(0.25).mul(16)).add(1)))

  const sprite = new Sprite(material)
  sprite.count = COUNT
  sprite.frustumCulled = false
  return sprite
}

export function Stars() {
  const stars = useMemo(() => starField(), [])
  return <primitive object={stars} />
}
