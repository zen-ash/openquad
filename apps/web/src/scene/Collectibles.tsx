import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  float,
  instanceIndex,
  instancedBufferAttribute,
  length,
  select,
  smoothstep,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshStandardNodeMaterial, SpriteNodeMaterial, type Node } from 'three/webgpu'
import { collect, pickUp, STARS, useStars } from '../game/collectibles'
import { localPlayer } from '../game/localPlayer'
import { chime } from '../game/sounds'
import { useGame } from '../net/store'
import { still, useSettings } from '../settings'

// the game look's stars (game/collectibles.ts): spinning and bobbing at about the bean's
// middle, with a soft glow round them. glide through one and it pops with a sparkle

const HEIGHT = 1.05
const POP = 0.25 // s
const SPARKLE = 0.9 // s
const SPARKS = 32
// gsu blue, lit up
const BLUE = new THREE.Color('#1446d8')

function starGeometry() {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.19 : 0.44
    const a = Math.PI / 2 + (i * Math.PI) / 5
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  })
  geo.center()
  geo.computeBoundingSphere()
  return geo
}

// how much they glow: more on high, where the glare spreads it round them (like the lamps)
const glow = uniform(1)

const starMaterial = new MeshStandardNodeMaterial({ roughness: 0.3, metalness: 0 })
starMaterial.colorNode = vec3(...BLUE.toArray())
starMaterial.emissiveNode = vec3(0.02, 0.12, 1).mul(glow)

// a soft round glow behind each star, always facing the camera
const haloAt = new THREE.InstancedBufferAttribute(new Float32Array(STARS.length * 4), 4)
const haloMaterial = new SpriteNodeMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})
{
  const at = instancedBufferAttribute(haloAt, 'vec4') as unknown as Node<'vec4'>
  haloMaterial.positionNode = at.xyz
  haloMaterial.scaleNode = at.w.mul(2.2)
  const fade = float(1).sub(smoothstep(0, 0.5, length(uv().sub(0.5))))
  haloMaterial.colorNode = vec4(vec3(0.2, 0.45, 1).mul(glow.mul(0.4)), fade.mul(fade))
}

// the sparkle when one's picked up: bits flying out and falling, fading as they go
const sparkAt = uniform(new THREE.Vector3())
const sparkAge = uniform(0)
const sparkDirs = new THREE.InstancedBufferAttribute(new Float32Array(SPARKS * 3), 3)
for (let i = 0; i < SPARKS; i++) {
  const v = new THREE.Vector3(Math.cos(i * 2.4), 0.4 + ((i * 0.618) % 1), Math.sin(i * 2.4))
  v.normalize().toArray(sparkDirs.array, i * 3)
}
const sparkMaterial = new SpriteNodeMaterial({ transparent: true, depthWrite: false })
{
  const dir = instancedBufferAttribute(sparkDirs, 'vec3') as unknown as Node<'vec3'>
  const t = sparkAge
  sparkMaterial.positionNode = sparkAt.add(dir.mul(t.mul(4.2))).add(vec3(0, t.mul(t).mul(-3), 0))
  const left = float(1).sub(t.div(SPARKLE))
  sparkMaterial.scaleNode = left.mul(0.5)
  // little four pointed glints: a dot with a cross through it
  const d = uv().sub(0.5).abs()
  const dot = float(1).sub(smoothstep(0.1, 0.25, length(d)))
  const cross = float(1)
    .sub(smoothstep(0.02, 0.07, d.x.min(d.y)))
    .mul(float(1).sub(d.x.max(d.y).mul(2)))
  // yellow, white and blue ones
  const kind = float(instanceIndex).mod(3)
  const color = select(
    kind.lessThan(1),
    vec3(1, 0.85, 0.2),
    select(kind.lessThan(2), vec3(1), vec3(0.3, 0.55, 1)),
  )
  sparkMaterial.colorNode = vec4(color.mul(1.4), dot.max(cross).mul(left))
}

const halo = new THREE.Sprite(haloMaterial)
;(halo as THREE.Sprite & { count: number }).count = STARS.length
halo.frustumCulled = false
const sparks = new THREE.Sprite(sparkMaterial)
;(sparks as THREE.Sprite & { count: number }).count = SPARKS
sparks.frustumCulled = false

const m = new THREE.Matrix4()
const q = new THREE.Quaternion()
const pos = new THREE.Vector3()
const scale = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

export default function Collectibles() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => starGeometry(), [])
  // seconds since each was picked up (Infinity = not yet, or long ago)
  const pops = useRef(new Float32Array(STARS.length).fill(Infinity))
  const clock = useRef(0)
  const combo = useRef({ count: 0, last: -10 })
  const burst = useRef(Infinity)

  useLayoutEffect(() => {
    // picked up on an earlier visit: gone for good
    for (const i of useStars.getState().got) pops.current[i] = POP
  }, [])

  useFrame((_, dt) => {
    const stars = mesh.current
    if (!stars) return
    if (!still) clock.current += dt
    const t = clock.current
    const { quality, warming } = useSettings.getState()
    glow.value = quality === 'high' ? 0.8 : 0.35

    if (useGame.getState().me && !warming) {
      const taken = new Set(useStars.getState().got)
      const picked = pickUp(taken, localPlayer)
      if (picked.length) {
        collect(picked)
        const c = combo.current
        c.count = t - c.last < 4 ? c.count + 1 : 0
        c.last = t
        chime(c.count)
        for (const i of picked) pops.current[i] = 0
        const s = STARS[picked[0]!]!
        sparkAt.value.set(s.x, HEIGHT, s.z)
        burst.current = 0
      }
    }

    STARS.forEach((s, i) => {
      const phase = i * 1.7
      const pop = (pops.current[i]! += dt)
      // grows a bit, then it's gone
      const size = pop === Infinity ? 1 : pop < POP ? 1 + (pop / POP) * 0.6 : 0
      pos.set(s.x, HEIGHT + Math.sin(t * 2.4 + phase) * 0.12, s.z)
      q.setFromAxisAngle(UP, t * 2 + phase)
      stars.setMatrixAt(i, m.compose(pos, q, scale.setScalar(size)))
      haloAt.setXYZW(i, pos.x, pos.y, pos.z, size)
    })
    stars.instanceMatrix.needsUpdate = true
    haloAt.needsUpdate = true

    burst.current += dt
    sparkAge.value = Math.min(burst.current, SPARKLE)
    // drawn while the shaders are built, so the first pickup doesn't wait for one
    sparks.visible = burst.current < SPARKLE || warming
  })

  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[geometry, starMaterial, STARS.length]}
        frustumCulled={false}
        castShadow
      />
      <primitive object={halo} />
      <primitive object={sparks} />
    </>
  )
}
