import { FENCE } from '@quad/shared'
import campus from '../campus/campus.json'
import { BED, memorialWall } from '../campus/fountain'
import { polygon, type Segment, type World } from './collision'
import { footprint, furnish } from './furniture'
import { enterable, interiors } from './interiors'
import { benches, bins } from './streetFurniture'

const TREE_RADIUS = 0.8
const { quad } = campus

// the edge of the part of campus you can walk around in (packages/shared/src/fence.ts).
// it's just walls, so you slide along it like any other wall
export const fenceWalls: Segment[] = FENCE.map(([ax, az], i) => {
  const [bx, bz] = FENCE[(i + 1) % FENCE.length]!
  return { ax, az, bx, bz }
})

export const world: World = {
  // buildings you can walk into are just their walls (with a doorway), the rest are solid
  buildings: [
    ...campus.buildings.filter((_, i) => !enterable.has(i)).map((b) => b.points),
    ...quad.planters.map((p) => p.points),
  ].map((points) => polygon(points as [number, number][])),
  walls: [
    ...interiors.flatMap((i) => i.walls),
    ...memorialWall({ x: campus.fountain[0]!, z: campus.fountain[1]! }),
    ...fenceWalls,
  ],
  circles: [
    ...campus.trees.map(([x, z]) => ({ x: x!, z: z!, radius: TREE_RADIUS })),
    { x: quad.monument[0]!, z: quad.monument[1]!, radius: 1 },
    // benches are two circles along their length
    ...benches.flatMap((b) =>
      [-0.5, 0.5].map((k) => ({
        x: b.x + Math.cos(b.rot) * k,
        z: b.z - Math.sin(b.rot) * k,
        radius: 0.4,
      })),
    ),
    ...bins.map((b) => ({ x: b.x, z: b.z, radius: 0.3 })),
    // the fountain, out to the edge of its flower beds
    { x: campus.fountain[0]!, z: campus.fountain[1]!, radius: BED },
    ...quad.flags.map(([x, z]) => ({ x: x!, z: z!, radius: 0.2 })),
  ],
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
