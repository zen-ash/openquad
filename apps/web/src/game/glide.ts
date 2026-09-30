import { lerpAngle } from '@quad/shared'
import { resolveCollisions, type World } from './collision'
import { headingFor } from './movement'

// the cartoon look's beans don't walk, they glide: speed eases in and out and the body
// turns toward where you steer instead of snapping. a bit faster than walking, there are
// no legs to keep in step with
export const GLIDE_SPEED = 3.2
export const BOOST_SPEED = 5.6

// how quickly the speed catches up with the stick (1/s). 95% of the way in 3/k seconds:
// ~0.33s to get going, ~0.43s to stop, so you slide about half a meter after letting go
const SPEED_UP = 9
const SLOW_DOWN = 7
// same for the heading, 90 degrees is done in about a quarter second
const TURN = 10
// below this it's stopped, instead of creeping forever
const REST = 0.05
// substeps, like walk() in movement.ts: long frames get split up so the result doesn't
// depend on the frame rate and you can't skip through a wall
const MAX_STEP = 1 / 60
const MAX_FRAME = 0.5

export type Glide = { x: number; z: number; vx: number; vz: number; heading: number }

/**
 * One frame of gliding. want is the unit direction the keys/stick point (null = let go).
 * The velocity eases toward want * speed, and whatever a wall takes away is gone from the
 * velocity too, so pushing into a wall doesn't store up speed and you slide along it
 */
export function glide(
  from: Glide,
  want: { x: number; z: number } | null,
  speed: number,
  delta: number,
  radius: number,
  world: World,
): Glide {
  let { x, z, vx, vz, heading } = from
  // equal steps: a leftover step of 1e-17s (0.05 - 3/60) made the wall check below think
  // a wall had stopped you
  const total = Math.min(delta, MAX_FRAME)
  const steps = Math.ceil(total / MAX_STEP - 1e-9)
  const dt = total / steps
  for (let i = 0; i < steps; i++) {
    const k = 1 - Math.exp(-(want ? SPEED_UP : SLOW_DOWN) * dt)
    vx += ((want ? want.x * speed : 0) - vx) * k
    vz += ((want ? want.z * speed : 0) - vz) * k
    if (!want && Math.hypot(vx, vz) < REST) vx = vz = 0
    if (want) heading = lerpAngle(heading, headingFor(want), 1 - Math.exp(-TURN * dt))
    if (vx === 0 && vz === 0) continue

    const next = resolveCollisions({ x: x + vx * dt, z: z + vz * dt }, radius, world)
    // what actually happened. only ever slower: getting pushed out of something you
    // started inside shouldn't fling you
    const ax = (next.x - x) / dt
    const az = (next.z - z) / dt
    const was = Math.hypot(vx, vz)
    const got = Math.hypot(ax, az)
    if (got < was - 1e-6) {
      vx = ax
      vz = az
    } else if (got > was) {
      vx = (ax / got) * was
      vz = (az / got) * was
    }
    x = next.x
    z = next.z
  }
  return { x, z, vx, vz, heading }
}
