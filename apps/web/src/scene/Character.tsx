import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { AVATARS, MOCAP_SPEED, type Avatar } from '../game/avatars'
import { RUN_SPEED, WALK_SPEED } from '../game/movement'

export type Anim = 'Idle' | 'Walk' | 'Run'

const HEIGHT = 1.8 // meters

const modelUrl = (a: Avatar) => `/models/people/${a.id}.glb`
const animsUrl = (a: Avatar) => `/models/people/anims_${a.body}.glb`

type Props = {
  avatar: Avatar
  // Idle/Walk/Run loop, anything else (an emote) plays once
  anim: string
  onEmoteDone?: () => void
}

const LOOPING = ['Idle', 'Walk', 'Run']

export default function Character({ avatar, anim, onEmoteDone }: Props) {
  const { scene } = useGLTF(modelUrl(avatar))
  const { animations } = useGLTF(animsUrl(avatar))
  const group = useRef<THREE.Group>(null)

  // SkeletonUtils.clone so more than one person can use the same model. the avatars
  // aren't all exported at the same size, so scale each one to a real person's height
  const model = useMemo(() => {
    const copy = clone(scene)
    copy.traverse((obj) => {
      obj.castShadow = true
    })
    // bone matrices only get worked out when it's rendered, so do it by hand first,
    // otherwise the skinned size comes out way off
    copy.updateMatrixWorld(true)
    copy.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) obj.skeleton.update()
    })
    const box = new THREE.Box3().setFromObject(copy, true)
    const scale = HEIGHT / (box.max.y - box.min.y)
    copy.scale.setScalar(scale)
    copy.position.y = -box.min.y * scale
    return copy
  }, [scene])

  const { actions, mixer } = useAnimations(animations, group)

  // tell whoever's showing the emote that it's over, so they go back to standing
  const done = useRef(onEmoteDone)
  useEffect(() => {
    done.current = onEmoteDone
  })
  useEffect(() => {
    const finished = () => done.current?.()
    mixer.addEventListener('finished', finished)
    return () => mixer.removeEventListener('finished', finished)
  }, [mixer])

  useEffect(() => {
    const action = actions[anim]
    // play walk/run at whatever rate matches how fast we actually move
    const mocap = MOCAP_SPEED[avatar.body]
    const rate =
      anim === 'Walk' ? WALK_SPEED / mocap.Walk : anim === 'Run' ? RUN_SPEED / mocap.Run : 1
    action?.reset().setEffectiveTimeScale(rate)
    const once = !LOOPING.includes(anim)
    action?.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    // hold the last pose of an emote instead of snapping to a t-pose before idle fades in.
    // three's animation objects are meant to be changed like this
    // eslint-disable-next-line react-hooks/immutability
    if (action) action.clampWhenFinished = once
    action?.fadeIn(0.25).play()
    return () => {
      action?.fadeOut(0.25)
    }
  }, [anim, actions, avatar.body])

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  )
}

for (const a of AVATARS) {
  useGLTF.preload(modelUrl(a))
  useGLTF.preload(animsUrl(a))
}
