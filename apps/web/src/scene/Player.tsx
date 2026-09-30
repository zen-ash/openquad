import { lerpAngle, TICK_RATE, type PlayerInfo } from '@quad/shared'
import { useKeyboardControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { cutout } from '../campus/cutout'
import type { Controls } from '../game/controls'
import { avatarById } from '../game/avatars'
import { clampDistance, clampPitch, clearView, orbit } from '../game/camera'
import { BIKE_SPEED, DASH_SPEED, glide, GLIDE_SPEED, turnToward } from '../game/glide'
import { interiorAt } from '../game/interiors'
import { blocksView, cameraReach, outlineOf } from '../game/occlusion'
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
import { hoppingWorldFor, tallFurniture, worldFor } from '../game/world'
import { send } from '../net/connection'
import { toon, useSettings } from '../settings'
import { stopEmote, useEmotes } from '../net/emotes'
import Bean from './Bean'
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
// indoors the camera comes in close and flatter so it stays under the ceiling
const INDOOR_DISTANCE = 4
const INDOOR_PITCH = 0.2
const CAMERA_TURN_SPEED = 2 // radians/sec
// the cartoon look's camera: high up looking down at 52 degrees with a long lens, north
// always up the screen. only scrolling moves it (in and out). it looks at a spot a bit
// above the ground under you
const TOON_PITCH = (52 * Math.PI) / 180
const TOON_DISTANCE = 32
const TOON_FOV = 34
// a little wider while running or on the bike
const TOON_RUN_FOV = 3
const TOON_LOOK = 0.8
const toonDistance = (d: number) => Math.min(72, Math.max(15, d))
// on a tall narrow screen (a phone) the sides are cramped, so it goes back a bit
const narrow = (aspect: number) => Math.min(1.5, Math.max(1, 1.2 / aspect))
// how close a wall behind you can pull the camera in
const CLOSEST = 2.2
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
  const pitch = useRef(toon ? TOON_PITCH : START_PITCH)
  const distance = useRef(toon ? TOON_DISTANCE : START_DISTANCE)
  const pull = useRef(0)
  const indoor = useRef(0) // 0 outside, 1 inside, eases in between
  const insideTimer = useRef(0)
  const currentAnim = useRef<Anim>('Idle')
  const [anim, setAnim] = useState<Anim>('Idle')
  const emote = useEmotes((s) => s.playing[spawn.id])
  const [, getKeys] = useKeyboardControls<Controls>()
  const sendTimer = useRef(0)
  const snapCamera = useRef(true)
  const bike = useSettings((s) => s.bike)

  // B gets on and off the bike, in the cartoon look
  useEffect(() => {
    if (!toon) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyB' || e.repeat || e.target instanceof HTMLInputElement) return
      useSettings.setState((s) => ({ bike: !s.bike }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

    // the cartoon look is north up outside: the camera never turns there, and swings back
    // to north when you come out of a building
    const northUp = toon && localPlayer.inside < 0
    if (northUp) {
      cameraYaw.current = turnToward(cameraYaw.current, 0, dt)
    } else {
      // bigger yaw swings the camera around so the view turns left
      if (keys.turnLeft) cameraYaw.current += CAMERA_TURN_SPEED * dt
      if (keys.turnRight) cameraYaw.current -= CAMERA_TURN_SPEED * dt
      cameraYaw.current += input.turn
    }
    if (toon) {
      distance.current = toonDistance(distance.current + input.zoom * 2.5)
    } else {
      pitch.current = clampPitch(pitch.current + input.tilt)
      distance.current = clampDistance(distance.current + input.zoom)
    }
    input.turn = input.tilt = input.zoom = 0

    // what the keys are relative to: the camera, or north
    const yaw = northUp ? 0 : cameraYaw.current
    let dir = moveDirection(keys, yaw)
    let running = keys.run
    if (!dir) {
      dir = stickDirection(input.x, input.y, yaw)
      running = Math.hypot(input.x, input.y) > STICK_RUN
    }
    let next: Anim = 'Idle'

    if (toon) {
      // full speed right away, stopped right away (game/glide.ts)
      const g = glide(
        { x: player.position.x, z: player.position.z, heading: player.rotation.y },
        dir,
        bike ? BIKE_SPEED : running ? DASH_SPEED : GLIDE_SPEED,
        delta,
        PLAYER_RADIUS,
        hoppingWorldFor(localPlayer.inside),
      )
      player.position.x = g.x
      player.position.z = g.z
      player.rotation.y = g.heading
      running ||= bike
      if (dir) next = running ? 'Run' : 'Walk'
    } else if (dir) {
      const speed = running ? RUN_SPEED : WALK_SPEED
      const pos = walk(
        player.position,
        dir,
        speed,
        delta,
        PLAYER_RADIUS,
        worldFor(localPlayer.inside),
      )
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

    // which building we're in. doesn't need checking every frame
    insideTimer.current -= dt
    if (insideTimer.current <= 0) {
      insideTimer.current = 0.15
      localPlayer.inside = interiorAt(player.position)?.index ?? -1
    }
    indoor.current += ((localPlayer.inside >= 0 ? 1 : 0) - indoor.current) * (1 - Math.exp(-4 * dt))

    // ease back while jogging, back in when you stop
    pull.current += ((running && dir ? 1 : 0) - pull.current) * (1 - Math.exp(-2 * dt))
    const cam = camera as THREE.PerspectiveCamera
    const fov =
      localPlayer.shot?.fov ??
      (toon
        ? TOON_FOV + TOON_RUN_FOV * pull.current
        : WALK_FOV + (RUN_FOV - WALK_FOV) * pull.current)
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }

    // what the camera looks at glides after you a little, and the camera glides after
    // that. two layers of smoothing is what makes it feel like someone's filming
    // (the cartoon one only has the camera's layer, it keeps looking the same way)
    const outdoors = 1 - indoor.current
    const height = toon ? TOON_LOOK * outdoors + LOOK_HEIGHT * indoor.current : LOOK_HEIGHT
    lookGoal.set(player.position.x, player.position.y + height, player.position.z)
    if (snapCamera.current || toon) look.copy(lookGoal)
    else look.lerp(lookGoal, 1 - Math.exp(-10 * dt))

    const dist = toon
      ? distance.current * narrow(cam.aspect)
      : distance.current + RUN_PULL * pull.current
    const want = orbit(
      look,
      cameraYaw.current,
      pitch.current * outdoors + Math.min(pitch.current, INDOOR_PITCH) * indoor.current,
      dist * outdoors + Math.min(dist, INDOOR_DISTANCE) * indoor.current,
    )
    // come in front of a bookshelf instead of filming the back of it
    const clear = clearView(look, want, tallFurniture(localPlayer.inside))
    if (clear < 1) {
      const k = Math.max(0.2, clear * 0.85)
      want.x = look.x + (want.x - look.x) * k
      want.y = look.y + (want.y - look.y) * k
      want.z = look.z + (want.z - look.z) * k
    }
    // and don't back into the building next door, all you'd see is its insides. unless
    // that puts it right in your face, then it stays and the cutout sees through
    const reach = cameraReach(look, want, outlineOf(localPlayer.inside))
    if (reach < 1 && reach * Math.hypot(want.x - look.x, want.z - look.z) > CLOSEST) {
      want.x = look.x + (want.x - look.x) * reach
      want.y = look.y + (want.y - look.y) * reach
      want.z = look.z + (want.z - look.z) * reach
    }
    if (snapCamera.current) camera.position.set(want.x, want.y, want.z)
    else camera.position.lerp(want, 1 - Math.exp(-(toon ? 6 : 7) * dt))
    snapCamera.current = false
    if (toon) {
      // outside it points the same way whatever it's doing, it just slides after you.
      // inside it looks at you like the realistic one
      lookGoal.set(want.x, want.y, want.z).sub(camera.position).multiplyScalar(-outdoors)
      camera.lookAt(lookGoal.add(look))
    } else {
      camera.lookAt(look)
    }
    if (localPlayer.shot) {
      camera.position.fromArray(localPlayer.shot.from)
      camera.lookAt(new THREE.Vector3().fromArray(localPlayer.shot.at))
    }

    cutout.uCutoutPlayer.value.set(player.position.x, 1, player.position.z)
    cutout.uCutoutCamera.value.copy(camera.position)
    // only cut a hole if a building is actually in the way
    const blocked =
      !localPlayer.shot &&
      blocksView({ x: camera.position.x, z: camera.position.z }, player.position)
    const radius = cutout.uCutoutRadius
    radius.value += ((blocked ? 3.5 : 0) - radius.value) * (1 - Math.exp(-10 * dt))
  })

  return (
    <group ref={body} position={[spawn.position.x, 0, spawn.position.z]} rotation-y={spawn.heading}>
      {toon ? (
        <Bean
          avatar={spawn.avatar}
          emote={emote && anim === 'Idle' ? emote : undefined}
          onEmoteDone={() => emote && stopEmote(spawn.id, emote.key)}
        />
      ) : (
        <Character
          avatar={avatarById(spawn.avatar)}
          anim={emote && anim === 'Idle' ? emote.name : anim}
          onEmoteDone={() => emote && stopEmote(spawn.id, emote.key)}
        />
      )}
      <ChatBubble id={spawn.id} />
    </group>
  )
}
