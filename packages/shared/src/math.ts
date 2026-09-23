import type { Vec3 } from './types'

export function distance(a: Vec3, b: Vec3) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Volume (0 to 1) for someone talking `dist` meters away.
 * Linear falloff for now, might try something log-based later if it sounds off.
 */
export function voiceVolume(dist: number, min: number, max: number) {
  if (dist <= min) return 1
  if (dist >= max) return 0
  return 1 - (dist - min) / (max - min)
}

// shortest way around the circle, so turning from 350deg to 10deg goes +20 not -340
export function lerpAngle(from: number, to: number, t: number) {
  let diff = (to - from) % (Math.PI * 2)
  if (diff > Math.PI) diff -= Math.PI * 2
  if (diff < -Math.PI) diff += Math.PI * 2
  return from + diff * t
}
