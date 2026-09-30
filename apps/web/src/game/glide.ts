import { resolveCollisions, type Point, type World } from './collision'
import { headingFor } from './movement'

// the cartoon look's beans don't walk, they zip around like in an arcade game: full speed
// the moment a key goes down, stopped the moment it comes up. the wobble in game/bean.ts
// is what makes starting and stopping look soft
export const GLIDE_SPEED = 7
// holding shift
export const DASH_SPEED = 14
// B toggles the bike
export const BIKE_SPEED = 24

// how fast the bean turns to face where it's going (1/s). 90 degrees is done in ~0.2s
const TURN = 14
// substeps: at most this long and this far each, so a fast bean can't skip through a wall
// and the result is the same at any frame rate
const MAX_STEP = 1 / 60
const MAX_MOVE = 0.2
const MAX_FRAME = 0.5

export type Glide = { x: number; z: number; heading: number }

const blocked = (to: Point, got: Point) => Math.abs(to.x - got.x) + Math.abs(to.z - got.z) > 1e-6

/**
 * One frame of moving. want is the unit direction the keys/stick point (null = stopped).
 * Each step tries the whole move, then only its x part, then only its z part, so you slide
 * along walls. If none of those fit (a slanted wall with only one key held, or starting
 * inside something) it's pushed out the usual way
 */
export function glide(
  from: Glide,
  want: { x: number; z: number } | null,
  speed: number,
  delta: number,
  radius: number,
  world: World,
): Glide {
  let { x, z, heading } = from
  const total = Math.min(delta, MAX_FRAME)
  if (want && total > 0) {
    const steps = Math.ceil(Math.max(total / MAX_STEP, (total * speed) / MAX_MOVE) - 1e-9)
    const dt = total / steps
    const dx = want.x * speed * dt
    const dz = want.z * speed * dt
    for (let i = 0; i < steps; i++) {
      const tries = [{ x: x + dx, z: z + dz }]
      if (dx !== 0 && dz !== 0) tries.push({ x: x + dx, z }, { x, z: z + dz })
      const free = tries.find((to) => !blocked(to, resolveCollisions(to, radius, world)))
      const next = free ?? resolveCollisions(tries[0]!, radius, world)
      x = next.x
      z = next.z
    }
    heading = turnToward(heading, headingFor(want), total)
  }
  return { x, z, heading }
}

// shortest way round from a to b
export function angleBetween(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

// eases the heading toward where it's going, the shortest way round. never past it
export function turnToward(heading: number, target: number, dt: number) {
  return heading + angleBetween(heading, target) * (1 - Math.exp(-TURN * dt))
}
