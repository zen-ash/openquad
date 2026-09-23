export type MoveInput = {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
  run: boolean
}

export const WALK_SPEED = 3.5
export const RUN_SPEED = 7

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
