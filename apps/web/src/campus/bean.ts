import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  attribute,
  float,
  length,
  mix,
  normalize,
  normalView,
  select,
  smoothstep,
  uniform,
  uv,
  vec3,
  vertexColor,
} from 'three/tsl'
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu'
import { toonMaterial } from './toon'

// everyone's a jellybean with no legs, big eyes, rosy cheeks and a little sprout on top.
// one mesh and one material for all of them (toon in the cartoon look, soft vinyl in the
// real one), the colors come from each mesh's userData (body, accent), so a new person
// never means a new shader

export const BEAN_HEIGHT = 1.5

// how wide the bean is at a height: a rounded capsule, a bit wider at the bottom
export function beanRadius(y: number) {
  const u = Math.min(1, Math.max(0, y / BEAN_HEIGHT))
  const round = (1 - Math.abs(2 * u - 1) ** 2.6) ** (1 / 2.6)
  return (0.55 - 0.08 * u) * round
}

// which color each vertex takes: the bean's, its accent, or its own (the face)
const BODY = 0
const ACCENT = 1
const FACE = 2

function paint(geo: THREE.BufferGeometry, part: number, color = '#ffffff') {
  geo.deleteAttribute('uv')
  const n = geo.attributes.position!.count
  const c = new THREE.Color(color)
  const rgb = Array.from({ length: n }, () => [c.r, c.g, c.b]).flat()
  geo.setAttribute('color', new THREE.Float32BufferAttribute(rgb, 3))
  geo.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1))
  return geo
}

// a squashed ball, stuck onto the bean's front at a height, turned by angle around it.
// sink pushes it into the surface so it doesn't float on the curve
function onFace(
  geo: THREE.BufferGeometry,
  y: number,
  angle: number,
  sink: number,
  offset = new THREE.Vector3(),
) {
  const r = beanRadius(y) - sink
  return geo
    .translate(offset.x, offset.y, r + offset.z)
    .rotateY(angle)
    .translate(0, y, 0)
}

const ball = (w: number, h: number, d: number, detail = 8) =>
  new THREE.SphereGeometry(1, detail, Math.max(4, detail - 2)).scale(w, h, d)

export function beanGeometry() {
  const profile = []
  for (let i = 0; i <= 20; i++) {
    // more points round the ends, where it curves most
    const y = ((1 - Math.cos((Math.PI * i) / 20)) / 2) * BEAN_HEIGHT
    profile.push(new THREE.Vector2(beanRadius(y), y))
  }
  const body = paint(new THREE.LatheGeometry(profile, 32), BODY)

  // big eyes up high, that's most of the cute
  const eyeY = BEAN_HEIGHT * 0.68
  const eyeAngle = 0.3
  const eyes = [-1, 1].flatMap((side) => [
    paint(onFace(ball(0.085, 0.125, 0.045, 12), eyeY, side * eyeAngle, 0.025), FACE, '#1d1a2b'),
    // the catchlight, up and to the left in both eyes like there's one light
    paint(
      onFace(
        ball(0.03, 0.034, 0.004, 6),
        eyeY,
        side * eyeAngle,
        0,
        new THREE.Vector3(-0.025, 0.045, 0.016),
      ),
      FACE,
    ),
    paint(
      onFace(ball(0.08, 0.045, 0.025), BEAN_HEIGHT * 0.585, side * 0.62, 0.014),
      FACE,
      '#ff8fb0',
    ),
  ])
  const smile = paint(
    onFace(
      new THREE.TorusGeometry(0.05, 0.013, 4, 10, Math.PI).rotateZ(Math.PI),
      BEAN_HEIGHT * 0.6,
      0,
      0.004,
    ),
    FACE,
    '#1d1a2b',
  )
  const top = BEAN_HEIGHT - 0.02
  const sprout = [
    new THREE.CylinderGeometry(0.018, 0.024, 0.14, 5).translate(0, top + 0.06, 0),
    ball(0.09, 0.024, 0.05, 6)
      .rotateZ(0.45)
      .translate(0.075, top + 0.15, 0),
    ball(0.09, 0.024, 0.05, 6)
      .rotateZ(-0.45)
      .translate(-0.075, top + 0.15, 0),
  ].map((g) => paint(g, ACCENT))

  const geo = mergeGeometries([body, ...eyes, smile, ...sprout])!
  geo.computeBoundingSphere()
  return geo
}

// each bean's colors, from its mesh (Bean.tsx sets userData.body and userData.accent)
const fromMesh =
  (name: string) =>
  ({ object }: { object: THREE.Object3D | null }) =>
    object?.userData[name] as THREE.Color | undefined

const part = attribute('aPart', 'float')
const on = (from: number) => select(part.greaterThan(from), float(1), float(0))
// 1 on the face (eyes, cheeks, smile), 0 on the body and sprout
const face = on(1.5)
const beanColor = () => {
  const body = uniform(new THREE.Color()).onObjectUpdate(fromMesh('body'))
  const accent = uniform(new THREE.Color()).onObjectUpdate(fromMesh('accent'))
  return mix(mix(body, accent, on(0.5)), vertexColor().rgb, face)
}

export function beanMaterial() {
  const m = toonMaterial()
  m.colorNode = beanColor()
  // a shiny spot like on a gummy candy, always up and to the left of the view. not on
  // the face
  const gloss = smoothstep(0.955, 0.975, normalView.dot(normalize(vec3(-0.35, 0.55, 0.75))))
  m.emissiveNode = vec3(gloss.mul(float(0.35).sub(face.mul(0.35))))
  return m
}

/**
 * The bean in the real world: a soft vinyl toy. Satin body, glossier eyes. The sky and
 * the sun light it like everything else and it casts real shadows
 */
export function beanVinyl() {
  const m = new MeshStandardNodeMaterial()
  m.name = 'bean'
  m.colorNode = beanColor()
  m.roughnessNode = mix(float(0.42), float(0.2), face)
  m.metalnessNode = float(0)
  return m
}

// a soft dark spot on the ground under it. shrinks when it hops. the cartoon one is a
// bluish grey, the real one only darkens (grey lit up dark asphalt)
export function beanShadow(color: [number, number, number], opacity: number) {
  const m = new MeshBasicNodeMaterial()
  m.transparent = true
  m.depthWrite = false
  // on top of the ground's layers (ground.ts), which are millimeters apart
  m.polygonOffset = true
  m.polygonOffsetFactor = -8
  m.polygonOffsetUnits = -32
  m.colorNode = vec3(...color)
  m.opacityNode = float(1)
    .sub(smoothstep(0.25, 1, length(uv().sub(0.5)).mul(2)))
    .mul(opacity)
  return m
}

// the puff of dust when it lands off a table: a soft ring that grows and fades. how far
// it's faded comes from each mesh's userData.fade
export function beanDust() {
  const m = new MeshBasicNodeMaterial()
  m.transparent = true
  m.depthWrite = false
  m.polygonOffset = true
  m.polygonOffsetFactor = -8
  m.polygonOffsetUnits = -32
  m.colorNode = vec3(0.95, 0.92, 0.86)
  const d = length(uv().sub(0.5)).mul(2)
  const fade = uniform(0).onObjectUpdate(({ object }) => object?.userData.fade as number)
  m.opacityNode = smoothstep(0.5, 0.8, d)
    .sub(smoothstep(0.85, 1, d))
    .mul(fade)
    .mul(0.8)
  return m
}
