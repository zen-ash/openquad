import { lerpAngle, TICK_RATE, type PlayerInfo } from '@quad/shared'
import { useKeyboardControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { cutout } from '../campus/cutout'
import type { Controls } from '../game/controls'
import { avatarById } from '../game/avatars'
import { clampDistance, clampPitch, orbit } from '../game/camera'
import { localPlayer } from '../game/localPlayer'
import {
  headingFor,
  moveDirection,
  RUN_SPEED,
  STICK_RUN,
  stickDirection,
  walk,
  WALK_SPEED,
} from '../game/movement'
import { input } from '../game/input'
import { world } from '../game/world'
import { send } from '../net/connection'
import { stopEmote, useEmotes } from '../net/emotes'
import Character, { type Anim } from './Character'
import ChatBubble from './ChatBubble'

// behind and a bit above, looking at about head height
const LOOK_HEIGHT = 1.6
const START_PITCH = 0.3
const START_DISTANCE = 9
// the camera eases back this much while you jog, and the lens widens a little
const RUN_PULL = 1.8
const WALK_FOV = 50
const RUN_FOV = 56
const CAMERA_TURN_SPEED = 2 // radians/sec
const PLAYER_RADIUS = 0.4
const SEND_INTERVAL = 1 / TICK_RATE

const NO_KEYS: Record<Controls, boolean> = {
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false,
  turnLeft: false,
  turnRight: false,
}

const look = new THREE.Vector3()
const lookGoal = new THREE.Vector3()

export default function Player({ spawn }: { spawn: PlayerInfo }) {
  const body = useRef<THREE.Group>(null)
  // carried over from before a reconnect, so the camera doesn't jump
  const cameraYaw = useRef(localPlayer.cameraYaw)
  const pitch = useRef(START_PITCH)
  const distance = useRef(START_DISTANCE)
  const pull = useRef(0)
  const currentAnim = useRef<Anim>('Idle')
  const [anim, setAnim] = useState<Anim>('Idle')
  const emote = useEmotes((s) => s.playing[spawn.id])
  const [, getKeys] = useKeyboardControls<Controls>()
  const sendTimer = useRef(0)
  const snapCamera = useRef(true)

  // walking off cancels an emote
  useEffect(() => {
    if (anim !== 'Idle' && emote) stopEmote(spawn.id, emote.key)
  }, [anim, emote, spawn.id])
  const lastSent = useRef({ x: spawn.position.x, z: spawn.position.z, heading: spawn.heading })

  useFrame(({ camera }, delta) => {
    const player = body.current
    if (!player) return
    // for turning/smoothing. walking handles long frames itself (see walk)
    const dt = Math.min(delta, 0.1)
    // typing in the chat box shouldn't walk you around
    const typing = document.activeElement instanceof HTMLInputElement
    const keys = typing ? NO_KEYS : getKeys()

    if (localPlayer.teleport) {
      player.position.set(localPlayer.teleport.x, 0, localPlayer.teleport.z)
      localPlayer.teleport = null
      sendTimer.current = SEND_INTERVAL // send the new spot right away
      snapCamera.current = true
    }

    // bigger yaw swings the camera around so the view turns left
    if (keys.turnLeft) cameraYaw.current += CAMERA_TURN_SPEED * dt
    if (keys.turnRight) cameraYaw.current -= CAMERA_TURN_SPEED * dt
    cameraYaw.current += input.turn
    pitch.current = clampPitch(pitch.current + input.tilt)
    distance.current = clampDistance(distance.current + input.zoom)
    input.turn = input.tilt = input.zoom = 0

    let dir = moveDirection(keys, cameraYaw.current)
    let running = keys.run
    if (!dir) {
      dir = stickDirection(input.x, input.y, cameraYaw.current)
      running = Math.hypot(input.x, input.y) > STICK_RUN
    }
    let next: Anim = 'Idle'

    if (dir) {
      const speed = running ? RUN_SPEED : WALK_SPEED
      const pos = walk(player.position, dir, speed, delta, PLAYER_RADIUS, world)
      player.position.x = pos.x
      player.position.z = pos.z
      player.rotation.y = lerpAngle(player.rotation.y, headingFor(dir), 1 - Math.exp(-12 * dt))
      next = running ? 'Run' : 'Walk'
    }

    // only re-render when the animation actually changes, not every frame
    if (next !== currentAnim.current) {
      currentAnim.current = next
      setAnim(next)
    }

    localPlayer.x = player.position.x
    localPlayer.z = player.position.z
    localPlayer.cameraYaw = cameraYaw.current
    localPlayer.heading = player.rotation.y

    // send at the server's tick rate, and only if something changed
    sendTimer.current += dt
    if (sendTimer.current >= SEND_INTERVAL) {
      sendTimer.current = 0
      const { x, z } = player.position
      const heading = player.rotation.y
      const prev = lastSent.current
      if (x !== prev.x || z !== prev.z || Math.abs(heading - prev.heading) > 0.01) {
        send({ type: 'move', position: { x, y: 0, z }, heading })
        lastSent.current = { x, z, heading }
      }
    }

    // ease back while jogging, back in when you stop
    pull.current += ((running && dir ? 1 : 0) - pull.current) * (1 - Math.exp(-2 * dt))
    const cam = camera as THREE.PerspectiveCamera
    const fov = WALK_FOV + (RUN_FOV - WALK_FOV) * pull.current
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }

    // what the camera looks at glides after you a little, and the camera glides after
    // that. two layers of smoothing is what makes it feel like someone's filming
    lookGoal.set(player.position.x, player.position.y + LOOK_HEIGHT, player.position.z)
    if (snapCamera.current) look.copy(lookGoal)
    else look.lerp(lookGoal, 1 - Math.exp(-10 * dt))

    const dist = distance.current + RUN_PULL * pull.current
    const want = orbit(look, cameraYaw.current, pitch.current, dist)
    if (snapCamera.current) camera.position.set(want.x, want.y, want.z)
    else camera.position.lerp(want, 1 - Math.exp(-7 * dt))
    snapCamera.current = false
    camera.lookAt(look)

    cutout.uCutoutPlayer.value.set(player.position.x, 1, player.position.z)
    cutout.uCutoutCamera.value.copy(camera.position)
  })

  return (
    <group ref={body} position={[spawn.position.x, 0, spawn.position.z]} rotation-y={spawn.heading}>
      <Character
        avatar={avatarById(spawn.avatar)}
        anim={emote && anim === 'Idle' ? emote.name : anim}
        onEmoteDone={() => emote && stopEmote(spawn.id, emote.key)}
      />
      <ChatBubble id={spawn.id} />
    </group>
  )
}
