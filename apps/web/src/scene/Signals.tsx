import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { attribute, mod, select, uniform, vec3 } from 'three/tsl'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { metal } from '../campus/materials'
import { signalPoles } from '../game/signals'
import { surfaceAt } from '../game/surface'
import { still } from '../settings'

// traffic lights on mast arms at the junctions (game/signals.ts): black steel like downtown's,
// the heads hanging off the end of the arm. the two roads of a junction take turns: a minute
// round, 25s green, 3s yellow, then red while the other road goes
const POLE = 6.2
const ARM_AT = 5.9
const CYCLE = 60

const poles = signalPoles()
const steel = metal({ color: '#25272a', roughness: 0.5 })
const geometry = {
  pole: new THREE.CylinderGeometry(0.11, 0.14, POLE, 10).translate(0, POLE / 2, 0),
  // one meter long along +x, scaled to each arm's reach
  arm: new THREE.CylinderGeometry(0.06, 0.08, 1, 8).rotateZ(Math.PI / 2).translate(0.5, ARM_AT, 0),
  head: new THREE.BoxGeometry(0.36, 1.05, 0.26).translate(0, ARM_AT - 0.65, 0),
  lamp: new THREE.CircleGeometry(0.11, 14),
}

// the game's clock for the lights: from the time of day, so everyone sees the same lights,
// held still for the screenshot tests
const time = uniform(still ? 0 : (Date.now() / 1000) % (CYCLE * 100))
// each lamp's color and when in the minute it's on (red, yellow, green)
const LAMPS = [
  { color: [1, 0.08, 0.03], on: [28, CYCLE] },
  { color: [1, 0.62, 0.05], on: [25, 28] },
  { color: [0.1, 1, 0.45], on: [0, 25] },
]
const lampMaterial = new MeshStandardNodeMaterial({ color: '#111', roughness: 0.3 })
{
  const t = mod(time.add(attribute('aCycle', 'float')), CYCLE)
  const on = attribute('aOn', 'vec2')
  lampMaterial.emissiveNode = select(
    t.greaterThanEqual(on.x).and(t.lessThan(on.y)),
    attribute('aLight', 'vec3').mul(6),
    vec3(0.02),
  )
}

// every pole in one mesh and every lamp in another: as instanced meshes they were six,
// each drawn up to five times a frame wherever you were
function build() {
  const up = new THREE.Vector3(0, 1, 0)
  const q = new THREE.Quaternion()
  const one = new THREE.Vector3(1, 1, 1)
  const steelParts: THREE.BufferGeometry[] = []
  const lampParts: THREE.BufferGeometry[] = []
  const at = (g: THREE.BufferGeometry, m: THREE.Matrix4) => g.clone().applyMatrix4(m)
  for (const p of poles) {
    const foot = new THREE.Vector3(p.x, surfaceAt(p.x, p.z), p.z)
    const tip = foot.clone().add(new THREE.Vector3(p.arm[0] * p.reach, 0, p.arm[1] * p.reach))
    // the head's front (+z of the box) toward the traffic
    const facing = q.setFromAxisAngle(up, Math.atan2(p.face[0], p.face[1])).clone()
    steelParts.push(
      at(geometry.pole, new THREE.Matrix4().makeTranslation(foot)),
      at(
        geometry.arm,
        new THREE.Matrix4().compose(
          foot,
          q.setFromAxisAngle(up, Math.atan2(-p.arm[1], p.arm[0])),
          new THREE.Vector3(p.reach, 1, 1),
        ),
      ),
      at(geometry.head, new THREE.Matrix4().compose(tip, facing, one)),
    )
    const cycle = p.offset + p.road * (CYCLE / 2)
    LAMPS.forEach((lamp, k) => {
      const spot = tip
        .clone()
        .add(new THREE.Vector3(p.face[0] * 0.135, ARM_AT - 0.3 - k * 0.33, p.face[1] * 0.135))
      const g = at(geometry.lamp, new THREE.Matrix4().compose(spot, facing, one))
      const n = g.getAttribute('position').count
      const each = (v: number[]) => new Float32Array(Array.from({ length: n }, () => v).flat())
      g.setAttribute('aCycle', new THREE.BufferAttribute(each([cycle]), 1))
      g.setAttribute('aOn', new THREE.BufferAttribute(each(lamp.on), 2))
      g.setAttribute('aLight', new THREE.BufferAttribute(each(lamp.color), 3))
      lampParts.push(g)
    })
  }
  return { steel: mergeGeometries(steelParts), lamps: mergeGeometries(lampParts) }
}
const built = poles.length ? build() : null

export default function Signals() {
  useFrame((_, dt) => {
    if (!still) time.value = (time.value + dt) % (CYCLE * 100)
  })
  if (!built) return null
  return (
    <>
      <mesh geometry={built.steel} material={steel} castShadow receiveShadow />
      <mesh geometry={built.lamps} material={lampMaterial} />
    </>
  )
}
