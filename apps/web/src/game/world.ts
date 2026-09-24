import campus from '../campus/campus.json'
import { polygon, type Segment, type World } from './collision'
import { footprint, furnish } from './furniture'
import { enterable, interiors } from './interiors'

const TREE_RADIUS = 0.8

export const world: World = {
  // buildings you can walk into are just their walls (with a doorway), the rest are solid
  buildings: campus.buildings
    .filter((_, i) => !enterable.has(i))
    .map((b) => polygon(b.points as [number, number][])),
  walls: interiors.flatMap((i) => i.walls),
  circles: campus.trees.map(([x, z]) => ({ x: x!, z: z!, radius: TREE_RADIUS })),
  halfSize: campus.halfSize,
}

// furniture only matters in the building you're in, and all of it together is a lot of walls
const furnished = new Map<number, { world: World; tall: Segment[] }>()

function furnishedRoom(inside: number) {
  const room = interiors.find((r) => r.index === inside)
  if (!room) return undefined
  let f = furnished.get(inside)
  if (!f) {
    const items = furnish(room)
    f = {
      world: { ...world, walls: [...world.walls, ...items.flatMap(footprint)] },
      tall: items.filter((i) => i.kind === 'shelf').flatMap(footprint),
    }
    furnished.set(inside, f)
  }
  return f
}

export const worldFor = (inside: number) => furnishedRoom(inside)?.world ?? world

// shelves are taller than the camera is indoors, it has to stay in front of them
export const tallFurniture = (inside: number) => furnishedRoom(inside)?.tall ?? []
