import { FENCE } from '@quad/shared'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { night } from '../campus/facade'
import { localPlayer } from '../game/localPlayer'

const HEIGHT = 3
const DAY = new THREE.Color('#e6ebef')
const NIGHT = new THREE.Color('#2a3448')

const LINE_WIDTH = 0.35

// a see-through band standing along the fence, thickest at the ground, and a thin line
// on the ground just inside it. aUp goes 0 at the bottom to 1 at the top
function band() {
  const pos: number[] = []
  const up: number[] = []
  FENCE.forEach(([ax, az], i) => {
    const [bx, bz] = FENCE[(i + 1) % FENCE.length]!
    pos.push(ax, 0, az, bx, 0, bz, bx, HEIGHT, bz, ax, 0, az, bx, HEIGHT, bz, ax, HEIGHT, az)
    up.push(0, 0, 1, 0, 1, 1)
    // inward is to the right going round clockwise (z points south)
    const len = Math.hypot(bx - ax, bz - az)
    const [nx, nz] = [(-(bz - az) / len) * LINE_WIDTH, ((bx - ax) / len) * LINE_WIDTH]
    pos.push(ax, 0.07, az, bx, 0.07, bz, bx + nx, 0.07, bz + nz)
    pos.push(ax, 0.07, az, bx + nx, 0.07, bz + nz, ax + nx, 0.07, az + nz)
    up.push(0.2, 0.2, 0.2, 0.2, 0.2, 0.2)
  })
  return new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    .setAttribute('aUp', new THREE.Float32BufferAttribute(up, 1))
}

const material = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: DAY.clone() },
    uPlayer: { value: new THREE.Vector2() },
  },
  vertexShader: /* glsl */ `
    attribute float aUp;
    varying float vUp;
    varying vec2 vXZ;
    void main() {
      vUp = aUp;
      vec4 world = modelMatrix * vec4(position, 1.0);
      vXZ = world.xz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
  // only shows up near you. from across campus there's nothing there
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform vec2 uPlayer;
    varying float vUp;
    varying vec2 vXZ;
    void main() {
      float near = 1.0 - smoothstep(4.0, 20.0, distance(vXZ, uPlayer));
      gl_FragColor = vec4(uColor, 0.45 * near * pow(1.0 - vUp, 1.5));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const geometry = band()

// where you can't walk any further (packages/shared/src/fence.ts). no wall, just a bit of
// haze and a faint line when you get close, so running into it doesn't feel like a bug
export default function FenceHaze() {
  useFrame(() => {
    material.uniforms.uPlayer!.value.set(localPlayer.x, localPlayer.z)
    material.uniforms.uColor!.value.copy(DAY).lerp(NIGHT, night.value)
  })
  return <mesh geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />
}
