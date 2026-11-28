import { closestOnSegment, lineBlocked, type Point, type World } from './collision'

// "take me there": the character follows the gps route by itself. Player asks steer()
// which way to go every frame nobody's holding a key or the stick

// aims at a spot this far along the route ahead of you, so corners get rounded a little
// instead of overshot. closer if a wall is in the way of that
const AHEADS = [2.5, 1.2, 0.5]
// stops this close to the end of the route
const THERE = 0.6
// the body's radius and a bit, for going round poles and trees
const ROOM = 0.6
// only poles/trees this close ahead count
const LOOK = 2.5

/** which way to walk (unit length) to follow path, or null once you're at the end */
export function steer(me: Point, path: Point[], world: World): Point | null {
  const end = path[path.length - 1]
  if (!end || Math.hypot(end.x - me.x, end.z - me.z) < THERE) return null

  // the closest spot on the route, and which leg it's on
  let leg = 0
  let on = path[0]!
  let best = Infinity
  for (let i = 0; i < path.length - 1; i++) {
    const c = closestOnSegment(me, path[i]!, path[i + 1]!)
    const d = Math.hypot(c.x - me.x, c.z - me.z)
    if (d < best) {
      best = d
      leg = i
      on = c
    }
  }

  // the furthest spot ahead you can walk to in a straight line. none: back onto the route
  let target = on
  for (const ahead of AHEADS) {
    const spot = along(path, leg, on, ahead)
    if (!lineBlocked(me, spot, world)) {
      target = spot
      break
    }
  }

  let dir = toward(me, target)
  if (!dir) return null

  // a pole or a tree right ahead: go round it on the side you're already on
  let closest = LOOK
  let aim: Point | null = null
  for (const c of world.circles) {
    const ox = c.x - me.x
    const oz = c.z - me.z
    const ahead = ox * dir.x + oz * dir.z
    if (ahead <= 0 || ahead >= closest) continue
    // how far it is to the left of the line you're walking
    const left = -ox * dir.z + oz * dir.x
    const need = c.radius + ROOM
    if (Math.abs(left) >= need) continue
    closest = ahead
    const s = left > 0 ? -1 : 1
    aim = { x: c.x - dir.z * need * s, z: c.z + dir.x * need * s }
  }
  if (aim) dir = toward(me, aim) ?? dir
  return dir
}

// it gives up if it hasn't got this far in this long (pinned against something it can't
// get round), rather than walking into a wall forever
const STUCK_MOVE = 1.5
const STUCK_TIME = 3
const progress = { x: 0, z: 0, time: 0 }

/** call every frame you walk by yourself. true once you haven't got anywhere for a while */
export function stuck(me: Point, dt: number) {
  progress.time += dt
  if (progress.time < STUCK_TIME) return false
  const moved = Math.hypot(me.x - progress.x, me.z - progress.z)
  progress.x = me.x
  progress.z = me.z
  progress.time = 0
  return moved < STUCK_MOVE
}

// the spot `ahead` meters on along the path from `on` (which is on leg `leg`)
function along(path: Point[], leg: number, on: Point, ahead: number) {
  let left = ahead
  let from = on
  for (let i = leg + 1; i < path.length; i++) {
    const to = path[i]!
    const len = Math.hypot(to.x - from.x, to.z - from.z)
    if (len >= left) {
      return {
        x: from.x + ((to.x - from.x) * left) / len,
        z: from.z + ((to.z - from.z) * left) / len,
      }
    }
    left -= len
    from = to
  }
  return path[path.length - 1]!
}

function toward(me: Point, p: Point) {
  const dx = p.x - me.x
  const dz = p.z - me.z
  const len = Math.hypot(dx, dz)
  return len < 1e-6 ? null : { x: dx / len, z: dz / len }
}
