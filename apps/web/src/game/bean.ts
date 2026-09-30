import { angleBetween, GLIDE_SPEED, DASH_SPEED } from './glide'

// how a cartoon bean (scene/Bean.tsx) wobbles. it only looks at where its player is and
// which way they face, so it works the same for you and for everyone else (whose
// positions come in over the network)

// floats this high off the ground (m)
export const HOVER = 0.16
// how long each emote lasts (s)
export const EMOTE_LENGTH: Record<string, number> = {
  Wave: 1.4,
  Clap: 1.3,
  Cheer: 1.3,
  Laugh: 1.4,
  Shrug: 1.4,
}
const RUNNING = (GLIDE_SPEED + DASH_SPEED) / 2
// a jump bigger than this in one frame is a teleport, not movement (m). a bike does 24 m/s
const TELEPORT = 8
const GRAVITY = 22
const HOP = 3.2 // m/s up, about 23cm high
// clears a table with this much to spare (m)
const CLEAR = 0.35
// landing faster than this (m/s) kicks up dust. a hop off a table, not a little one
const DUST = 5

export type Bean = {
  x: number
  z: number
  heading: number
  started: boolean
  vx: number
  vz: number
  speed: number
  accel: number
  // what it's over: 0 on the floor, the top of a table it's hopping over
  ground: number
  // springs: a value and how fast it's changing
  squash: number
  squashV: number
  lean: number
  leanV: number
  roll: number
  rollV: number
  hop: number
  hopV: number
  // bob
  phase: number
  emote: { key: number; time: number } | null
}

export type Pose = {
  y: number
  // 1 = normal, above is taller and thinner, below is squashed
  stretch: number
  // forward lean, sideways lean, and turning (radians)
  pitch: number
  roll: number
  yaw: number
  // the emote that was playing just ended
  done: boolean
  // landed hard this frame, puff of dust
  dust: boolean
}

export const newBean = (phase = 0): Bean => ({
  x: 0,
  z: 0,
  heading: 0,
  started: false,
  vx: 0,
  vz: 0,
  speed: 0,
  accel: 0,
  ground: 0,
  squash: 0,
  squashV: 0,
  lean: 0,
  leanV: 0,
  roll: 0,
  rollV: 0,
  hop: 0,
  hopV: 0,
  phase,
  emote: null,
})

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const ease = (dt: number, k: number) => 1 - Math.exp(-k * dt)

// a bit bouncy: stiffness 170, damping 9 wobbles twice before it settles
function spring(x: number, v: number, target: number, dt: number) {
  v += (-(x - target) * 170 - v * 9) * dt
  return [x + v * dt, v] as const
}

function hop(b: Bean, up = HOP) {
  if (b.hop <= b.ground + 0.02) b.hopV = up
}

/**
 * Moves the bean's springs along by one frame, given where its player is now. emote is
 * the one playing (key changes when a new one starts), done is set on the frame it ends.
 * ground is the top of the low furniture it's over, if any: it hops up and over
 */
export function stepBean(
  b: Bean,
  at: { x: number; z: number; heading: number },
  delta: number,
  emote?: { name: string; key: number },
  ground = 0,
): Pose {
  const real = Math.max(delta, 1e-4)
  if (!b.started || Math.hypot(at.x - b.x, at.z - b.z) > TELEPORT) {
    b.x = at.x
    b.z = at.z
    b.heading = at.heading
    b.started = true
  }
  // how fast it's going, from how far it moved. smoothed a little, other people's
  // positions come in steps
  const smooth = ease(real, 12)
  b.vx += ((at.x - b.x) / real - b.vx) * smooth
  b.vz += ((at.z - b.z) / real - b.vz) * smooth
  const speed = Math.hypot(b.vx, b.vz)
  b.accel += ((speed - b.speed) / real - b.accel) * ease(real, 10)
  // a little hop when you start running
  if (speed > RUNNING && b.speed <= RUNNING) hop(b)
  b.speed = speed
  // how far it still has to turn to face where it's going, it leans into that
  const going = Math.atan2(b.vx, b.vz)
  const turning = speed > 0.5 ? angleBetween(at.heading, going) : 0
  // something to hop onto
  if (ground > b.hop + 0.05 && b.hopV <= 0)
    b.hopV = Math.sqrt(2 * GRAVITY * (ground - b.hop + CLEAR))
  b.ground = ground
  let dust = false
  b.x = at.x
  b.z = at.z
  b.heading = at.heading

  // springs and emotes don't need to be exact over a long frame, just stable
  let left = Math.min(delta, 0.1)
  while (left > 0) {
    const dt = Math.min(left, 1 / 90)
    left -= dt
    // leans forward when gliding and harder while speeding up, back a bit when braking
    const lean = clamp(b.speed * 0.02 + b.accel * 0.004, -0.2, 0.3)
    ;[b.lean, b.leanV] = spring(b.lean, b.leanV, lean, dt)
    // and into turns, like on a bike. back upright once it's stopped
    const roll = clamp(-turning * 0.6, -0.35, 0.35)
    ;[b.roll, b.rollV] = spring(b.roll, b.rollV, roll, dt)
    // squashed when it starts and stops, a stretch while in the air. the spring's
    // overshoot does the rest
    const squash = b.hop > ground + 0.02 ? 0.1 : clamp(-Math.abs(b.accel) * 0.002, -0.12, 0)
    ;[b.squash, b.squashV] = spring(b.squash, b.squashV, squash, dt)
    if (b.hop > ground || b.hopV > 0) {
      b.hopV -= GRAVITY * dt
      b.hop += b.hopV * dt
      if (b.hop <= ground && b.hopV <= 0) {
        // landing
        dust ||= b.hopV < -DUST
        b.hop = ground
        b.hopV = 0
        b.squashV -= 2.2
      }
    }
    // bobs gently on the spot, faster and smaller when going
    b.phase += (2.2 + Math.min(b.speed, 6) * 0.8) * dt
  }

  const pose: Pose = {
    y: HOVER + b.hop + Math.sin(b.phase) * (0.012 + 0.035 * clamp(1 - b.speed / 2, 0, 1)),
    stretch: 1 + b.squash,
    pitch: b.lean,
    roll: clamp(b.roll, -0.35, 0.35),
    yaw: 0,
    done: false,
    dust,
  }

  if (emote && emote.key !== b.emote?.key) {
    b.emote = { key: emote.key, time: 0 }
    if (emote.name === 'Cheer') hop(b, 4)
  }
  const length = EMOTE_LENGTH[emote?.name ?? ''] ?? 1
  if (emote && b.emote && b.emote.time < length) {
    const t = (b.emote.time += Math.min(delta, 0.1))
    if (t >= length) pose.done = true
    else playEmote(b, pose, emote.name, t, length)
  }
  return pose
}

// the bean versions of the emotes, laid on top of the pose
function playEmote(b: Bean, pose: Pose, name: string, t: number, length: number) {
  // 0 -> 1 -> 0 over the emote, eased at both ends
  const env = Math.sin((Math.PI * t) / length) ** 2
  if (name === 'Wave') {
    // wiggles side to side
    pose.yaw += Math.sin(t * 13) * 0.55 * env
    pose.roll += Math.sin(t * 13) * 0.18 * env
  } else if (name === 'Clap') {
    // squishes itself a few times
    pose.stretch -= Math.max(0, Math.sin(t * 15)) * 0.22 * env
  } else if (name === 'Cheer') {
    // a second, higher hop halfway through, and stretched up with joy
    if (t > length * 0.45 && t < length * 0.55) hop(b, 4.6)
    pose.stretch += 0.06 * env
  } else if (name === 'Laugh') {
    // shakes and bounces
    pose.roll += Math.sin(t * 32) * 0.12 * env
    pose.y += Math.abs(Math.sin(t * 16)) * 0.08 * env
    pose.pitch -= 0.12 * env
  } else if (name === 'Shrug') {
    // tilts over and up a little, then back
    pose.roll += 0.28 * env
    pose.y += 0.05 * env
    pose.stretch += 0.04 * env
  }
}
