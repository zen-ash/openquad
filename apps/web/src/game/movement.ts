import { resolveCollisions, type Point, type World } from './collision'

export type MoveInput = {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
  run: boolean
}

// meters per second. a brisk walk and a jog. kept close to the mocap speeds (see
// MOCAP_SPEED) so the animations don't have to be sped up much
export const WALK_SPEED = 1.6
export const RUN_SPEED = 4.2

/**
 * Turns WASD into a world space direction (unit length), or null if not moving.
 * cameraYaw is how far the camera is rotated around the player, so W always
 * means "away from the camera".
 */
export function moveDirection(input: MoveInput, cameraYaw: number) {
  const x = Number(input.right) - Number(input.left)
  const z = Number(input.back) - Number(input.forward)
  if (x === 0 && z === 0) return null

  const len = Math.hypot(x, z)
  const cos = Math.cos(cameraYaw)
  const sin = Math.sin(cameraYaw)
  return {
    x: (x * cos + z * sin) / len,
    z: (-x * sin + z * cos) / len,
  }
}

// the model faces +z by default
export function headingFor(dir: { x: number; z: number }) {
  return Math.atan2(dir.x, dir.z)
}

// for other players we only know how fast they're going, not what keys they hold
export function animForSpeed(speed: number) {
  if (speed > (WALK_SPEED + RUN_SPEED) / 2) return 'Run'
  if (speed > 0.5) return 'Walk'
  return 'Idle'
}

// longest single step. bigger frames get split up so you can't skip through a wall
const MAX_STEP = 1 / 30
// after a long pause (tab in the background) just stop instead of replaying it all
const MAX_FRAME = 0.5

/**
 * Moves the player for one frame. On a slow computer frames are long, so this takes
 * several small steps instead of one big one. Just capping the frame time (what this
 * used to do) made people on slow laptops walk in slow motion.
 */
export function walk(
  from: Point,
  dir: { x: number; z: number },
  speed: number,
  delta: number,
  radius: number,
  world: World,
): Point {
  let pos = from
  let left = Math.min(delta, MAX_FRAME)
  while (left > 0) {
    const dt = Math.min(left, MAX_STEP)
    pos = resolveCollisions(
      { x: pos.x + dir.x * speed * dt, z: pos.z + dir.z * speed * dt },
      radius,
      world,
    )
    left -= dt
  }
  return pos
}
