import { FENCE } from '@quad/shared'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  attribute,
  distance,
  float,
  positionWorld,
  pow,
  smoothstep,
  uniform,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { night } from '../campus/facade'
import { localPlayer } from '../game/localPlayer'
import { alongGround } from '../game/surface'

const HEIGHT = 3
const DAY = new THREE.Color('#e6ebef')
const NIGHT = new THREE.Color('#2a3448')

const LINE_WIDTH = 0.35

// a see-through band standing along the fence, thickest at the ground, and a thin line
// on the ground just inside it. aUp goes 0 at the bottom to 1 at the top
function band() {
  const pos: number[] = []
  const up: number[] = []
  // in 4m pieces, each on the ground under it
  const ring = FENCE.map(([x, z]) => ({ x: x!, z: z! }))
  const points = alongGround([...ring, ring[0]!], 4)
  points.slice(1).forEach(([bx, bz, by], i) => {
    const [ax, az, ay] = points[i]!
    pos.push(ax, ay, az, bx, by, bz, bx, by + HEIGHT, bz, ax, ay, az, bx, by + HEIGHT, bz)
    pos.push(ax, ay + HEIGHT, az)
    up.push(0, 0, 1, 0, 1, 1)
    // inward is to the right going round clockwise (z points south)
    const len = Math.hypot(bx - ax, bz - az) || 1
    const [nx, nz] = [(-(bz - az) / len) * LINE_WIDTH, ((bx - ax) / len) * LINE_WIDTH]
    const [la, lb] = [ay + 0.07, by + 0.07]
    pos.push(ax, la, az, bx, lb, bz, bx + nx, lb, bz + nz)
    pos.push(ax, la, az, bx + nx, lb, bz + nz, ax + nx, la, az + nz)
    up.push(0.2, 0.2, 0.2, 0.2, 0.2, 0.2)
  })
  return new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    .setAttribute('aUp', new THREE.Float32BufferAttribute(up, 1))
}

const color = uniform(DAY.clone())
const player = uniform(new THREE.Vector2())
const material = new MeshBasicNodeMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
})
// only shows up near you. from across campus there's nothing there
const near = float(1).sub(smoothstep(4, 20, distance(positionWorld.xz, player)))
material.colorNode = vec4(
  color,
  near.mul(0.45).mul(pow(float(1).sub(attribute('aUp', 'float')), 1.5)),
)
const geometry = band()

// where you can't walk any further (packages/shared/src/fence.ts). no wall, just a bit of
// haze and a faint line when you get close, so running into it doesn't feel like a bug
export default function FenceHaze() {
  useFrame(() => {
    player.value.set(localPlayer.x, localPlayer.z)
    color.value.copy(DAY).lerp(NIGHT, night.value)
  })
  return <mesh geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />
}
