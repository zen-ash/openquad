import campus from '../campus/campus.json'
import { clearView } from './camera'
import { pointInPolygon, polygon, type Point } from './collision'

const shapes = campus.buildings.map((b) => ({
  ...polygon(b.points as [number, number][]),
  height: b.height,
  bottom: b.minHeight ?? 0,
}))

// do segments ab and cd cross
function crosses(a: Point, b: Point, c: Point, d: Point) {
  const side = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x)
  const d1 = side(c, d, a)
  const d2 = side(c, d, b)
  const d3 = side(a, b, c)
  const d4 = side(a, b, d)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/**
 * Is there a building wall between the camera and the player (looking from above)?
 * The see-through cutout only turns on when there is. Without this check it also cut
 * walls you were just walking alongside, since the camera line runs right along them.
 */
export function blocksView(camera: Point, player: Point) {
  const minX = Math.min(camera.x, player.x)
  const maxX = Math.max(camera.x, player.x)
  const minZ = Math.min(camera.z, player.z)
  const maxZ = Math.max(camera.z, player.z)
  for (const s of shapes) {
    if (s.maxX < minX || s.minX > maxX || s.maxZ < minZ || s.minZ > maxZ) continue
    const pts = s.points
    for (let i = 0; i < pts.length; i++) {
      if (crosses(camera, player, pts[i]!, pts[(i + 1) % pts.length]!)) return true
    }
  }
  return false
}

/**
 * Where the camera should go so it doesn't end up inside a building (the one you're in
 * doesn't count). Walls in between are fine, the see-through cutout deals with those, but
 * from inside a building you'd just see its insides. It comes in to just short of the
 * wall instead, unless it's up over the roof anyway. Returns how far out to go, 0 to 1
 */
export function cameraReach(
  look: Point,
  camera: { x: number; y: number; z: number },
  inside: Point[] | null,
) {
  for (const s of shapes) {
    if (camera.x < s.minX || camera.x > s.maxX || camera.z < s.minZ || camera.z > s.maxZ) continue
    // over the roof, or under a bridge, it's not inside it
    if (camera.y > s.height + 0.5 || camera.y < s.bottom - 0.3 || s.points === inside) continue
    if (!pointInPolygon(camera, s.points)) continue
    const walls = s.points.map((a, i) => {
      const b = s.points[(i + 1) % s.points.length]!
      return { ax: a.x, az: a.z, bx: b.x, bz: b.z }
    })
    const t = clearView(look, camera, walls)
    const len = Math.hypot(camera.x - look.x, camera.z - look.z) || 1
    // a little in front of the wall
    return Math.max(0, t - 0.4 / len)
  }
  return 1
}

// the outline of the building you're in, for cameraReach
export const outlineOf = (index: number) => (index >= 0 ? shapes[index]!.points : null)
