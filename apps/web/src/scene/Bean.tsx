import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { beanGeometry, beanMaterial, beanShadow } from '../campus/bean'
import { HOVER, newBean, stepBean, type Bean as BeanState } from '../game/bean'
import { beanOf } from '../game/avatars'

// shared by every bean: one shader for the body, one for the shadow
const geometry = beanGeometry()
const material = beanMaterial()
const shadowGeometry = new THREE.CircleGeometry(0.62, 20).rotateX(-Math.PI / 2)
const shadowMaterial = beanShadow()

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
  const state = useRef<BeanState | null>(null)
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
    if (still || !mover || !pose.current || !body.current || !shadow.current) return
    // each one bobs on its own beat
    state.current ??= newBean(mover.id * 1.7)
    const p = stepBean(
      state.current,
      { x: mover.position.x, z: mover.position.z, heading: mover.rotation.y },
      delta,
      emote,
    )
    pose.current.position.y = p.y
    pose.current.rotation.set(p.pitch, p.yaw, p.roll)
    // squash and stretch keeps its volume
    body.current.scale.set(1 / Math.sqrt(p.stretch), p.stretch, 1 / Math.sqrt(p.stretch))
    shadow.current.scale.setScalar(Math.max(0.5, 1 - (p.y - HOVER) * 1.4))
    if (p.done) done.current?.()
  })

  return (
    <group ref={outer}>
      <mesh ref={shadow} geometry={shadowGeometry} material={shadowMaterial} position-y={0.02} />
      <group ref={pose} position-y={HOVER}>
        <mesh ref={body} geometry={geometry} material={material} userData={colors} receiveShadow />
      </group>
    </group>
  )
}
