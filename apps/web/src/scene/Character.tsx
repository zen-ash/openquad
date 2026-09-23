import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { toonify } from './toon'

export type Anim = 'Idle' | 'Walk' | 'Run' | 'Wave'

const MODEL = '/models/adventurer.glb'

export default function Character({ anim }: { anim: Anim }) {
  const { scene, animations } = useGLTF(MODEL)
  const group = useRef<Group>(null)

  // SkeletonUtils.clone so more than one person can use the same model
  const model = useMemo(() => {
    const copy = clone(scene)
    toonify(copy)
    return copy
  }, [scene])

  const { actions } = useAnimations(animations, group)

  useEffect(() => {
    const action = actions[anim]
    action?.reset().fadeIn(0.2).play()
    return () => {
      action?.fadeOut(0.2)
    }
  }, [anim, actions])

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  )
}

useGLTF.preload(MODEL)
