import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { beanDust, beanGeometry, beanMaterial, beanShadow } from '../campus/bean'
import { HOVER, newBean, stepBean, type Bean as BeanState } from '../game/bean'
import { beanOf } from '../game/avatars'
import { interiorAt } from '../game/interiors'
import { groundAt } from '../game/world'

// shared by every bean: one shader for the body, one for the shadow
const geometry = beanGeometry()
const material = beanMaterial()
const shadowGeometry = new THREE.CircleGeometry(0.62, 20).rotateX(-Math.PI / 2)
const shadowMaterial = beanShadow()
const dustGeometry = new THREE.CircleGeometry(1.1, 24).rotateX(-Math.PI / 2)
const dustMaterial = beanDust()
const DUST_TIME = 0.45 // s
const UP = new THREE.Vector3(0, 1, 0)

type Props = {
  avatar: string
  // the emote playing, if any. the bean plays its own version and says when it's done
  emote?: { name: string; key: number }
  onEmoteDone?: () => void
  // for the warm-up: just stand there
  still?: boolean
}

/**
 * The cartoon look's person (campus/bean.ts). Goes inside the group that's moved around
 * (Player / RemotePlayers) and works out its wobble from how that moves (game/bean.ts)
 */
export default function Bean({ avatar, emote, onEmoteDone, still }: Props) {
  const outer = useRef<THREE.Group>(null)
  const pose = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const dust = useRef<THREE.Mesh>(null)
  const state = useRef<BeanState | null>(null)
  // which building it's in (checked now and then) and where the last puff of dust is
  const inside = useRef({ index: -1, timer: 0 })
  const puff = useRef({ at: new THREE.Vector3(), age: Infinity })
  const colors = useMemo(() => {
    const c = beanOf(avatar)
    return { body: new THREE.Color(c.body), accent: new THREE.Color(c.accent) }
  }, [avatar])

  const done = useRef(onEmoteDone)
  useEffect(() => {
    done.current = onEmoteDone
  })

  useFrame((_, delta) => {
    const mover = outer.current?.parent
    const ring = dust.current
    if (still || !mover || !pose.current || !body.current || !shadow.current || !ring) return
    // each one bobs on its own beat
    state.current ??= newBean(mover.id * 1.7)
    const room = inside.current
    room.timer -= delta
    if (room.timer <= 0) {
      room.timer = 0.2
      room.index = interiorAt(mover.position)?.index ?? -1
    }
    // hops over tables and chairs (they're left out of its collisions, game/world.ts)
    const ground = room.index >= 0 ? groundAt(room.index, mover.position, 0.3) : 0
    const p = stepBean(
      state.current,
      { x: mover.position.x, z: mover.position.z, heading: mover.rotation.y },
      delta,
      emote,
      ground,
    )
    pose.current.position.y = p.y
    pose.current.rotation.set(p.pitch, p.yaw, p.roll)
    // squash and stretch keeps its volume
    body.current.scale.set(1 / Math.sqrt(p.stretch), p.stretch, 1 / Math.sqrt(p.stretch))
    shadow.current.scale.setScalar(Math.max(0.5, 1 - (p.y - HOVER) * 1.4))
    if (p.done) done.current?.()

    // the dust stays where it landed while the bean goes on
    const f = puff.current
    if (p.dust) {
      f.at.set(mover.position.x, ground + 0.03, mover.position.z)
      f.age = 0
    }
    f.age += delta
    ring.visible = f.age < DUST_TIME
    if (ring.visible) {
      const k = f.age / DUST_TIME
      ring.position.copy(f.at).sub(mover.position).applyAxisAngle(UP, -mover.rotation.y)
      ring.scale.setScalar(0.5 + k)
      ring.userData.fade = 1 - k
    }
  })

  return (
    <group ref={outer}>
      <mesh ref={shadow} geometry={shadowGeometry} material={shadowMaterial} position-y={0.02} />
      {/* shown in the warm-up so its shader gets built */}
      <mesh
        ref={dust}
        geometry={dustGeometry}
        material={dustMaterial}
        visible={!!still}
        userData={{ fade: 0.5 }}
      />
      <group ref={pose} position-y={HOVER}>
        <mesh ref={body} geometry={geometry} material={material} userData={colors} receiveShadow />
      </group>
    </group>
  )
}
