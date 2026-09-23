import { lerpAngle } from '@quad/shared'
import { useKeyboardControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { resolveCollisions } from '../game/collision'
import type { Controls } from '../game/controls'
import { headingFor, moveDirection, RUN_SPEED, WALK_SPEED } from '../game/movement'
import { world } from '../game/world'
import Character, { type Anim } from './Character'

// up and behind, looking down at an angle like the pokemon games
const CAMERA_OFFSET = new THREE.Vector3(0, 6.5, 8)
const CAMERA_TURN_SPEED = 2 // radians/sec
const PLAYER_RADIUS = 0.4

const UP = new THREE.Vector3(0, 1, 0)
const camTarget = new THREE.Vector3()

export default function Player() {
  const body = useRef<THREE.Group>(null)
  const cameraYaw = useRef(0)
  const currentAnim = useRef<Anim>('Idle')
  const [anim, setAnim] = useState<Anim>('Idle')
  const [, getKeys] = useKeyboardControls<Controls>()

  useFrame(({ camera }, delta) => {
    const player = body.current
    if (!player) return
    // after switching tabs delta can be huge and you'd teleport through walls
    const dt = Math.min(delta, 0.1)
    const keys = getKeys()

    if (keys.turnLeft) cameraYaw.current -= CAMERA_TURN_SPEED * dt
    if (keys.turnRight) cameraYaw.current += CAMERA_TURN_SPEED * dt

    const dir = moveDirection(keys, cameraYaw.current)
    let next: Anim = 'Idle'

    if (dir) {
      const speed = keys.run ? RUN_SPEED : WALK_SPEED
      const pos = resolveCollisions(
        { x: player.position.x + dir.x * speed * dt, z: player.position.z + dir.z * speed * dt },
        PLAYER_RADIUS,
        world,
      )
      player.position.x = pos.x
      player.position.z = pos.z
      player.rotation.y = lerpAngle(player.rotation.y, headingFor(dir), 1 - Math.exp(-12 * dt))
      next = keys.run ? 'Run' : 'Walk'
    }

    // only re-render when the animation actually changes, not every frame
    if (next !== currentAnim.current) {
      currentAnim.current = next
      setAnim(next)
    }

    camTarget.copy(CAMERA_OFFSET).applyAxisAngle(UP, cameraYaw.current).add(player.position)
    camera.position.lerp(camTarget, 1 - Math.exp(-6 * dt))
    camera.lookAt(player.position.x, player.position.y + 1, player.position.z)
  })

  return (
    <group ref={body} position={[0, 0, 4]}>
      <Character anim={anim} />
    </group>
  )
}
