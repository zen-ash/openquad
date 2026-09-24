import campus from '../campus/campus.json'
import { polygon, type Point } from './collision'

const shapes = campus.buildings.map((b) => polygon(b.points as [number, number][]))

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
