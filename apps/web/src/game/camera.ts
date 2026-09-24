export const MIN_PITCH = 0.05 // almost level
export const MAX_PITCH = 1.1 // ~60 degrees down
export const MIN_DISTANCE = 3
export const MAX_DISTANCE = 18

export const clampPitch = (p: number) => Math.min(MAX_PITCH, Math.max(MIN_PITCH, p))
export const clampDistance = (d: number) => Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d))

/**
 * Where the camera goes, orbiting the point it looks at. yaw 0 is behind the player
 * looking north, pitch is how far it tilts down, distance is in meters.
 */
export function orbit(
  target: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
  distance: number,
) {
  const flat = Math.cos(pitch) * distance
  return {
    x: target.x + Math.sin(yaw) * flat,
    y: target.y + Math.sin(pitch) * distance,
    z: target.z + Math.cos(yaw) * flat,
  }
}
