import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { SpotLight } from 'three'
import { localPlayer } from '../game/localPlayer'
import { CEILING } from '../game/interiors'

// the sun doesn't get inside (the ceiling shades the floor), so indoors there's a light
// over you, like the ceiling lights around where you're standing. it points down like a
// real one. a point light also lit up the ceiling right above you and made everything glow
export default function IndoorLight() {
  const light = useRef<SpotLight>(null)

  useFrame((_, dt) => {
    const l = light.current
    if (!l) return
    const target = localPlayer.inside >= 0 ? 6 : 0
    l.intensity += (target - l.intensity) * Math.min(1, dt * 4)
    l.position.set(localPlayer.x, CEILING - 0.1, localPlayer.z)
    l.target.position.set(localPlayer.x, 0, localPlayer.z)
    l.target.updateMatrixWorld()
  })

  return (
    <spotLight
      ref={light}
      intensity={0}
      angle={1.25}
      penumbra={1}
      distance={20}
      decay={1.5}
      color="#ffe6c7"
    />
  )
}
