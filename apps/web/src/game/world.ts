import { FENCE } from '@quad/shared'
import campus from '../campus/campus.json'
import { coeObstacles, type CollegeOfEducationData } from '../campus/collegeOfEducation'
import { arenaObstacles, type ArenaData } from '../campus/sportsArena'
import { BED, memorialWall } from '../campus/fountain'
import { practiceObstacles, type PracticeFacilityData } from '../campus/practiceFacility'
import { polygon, type Point, type Segment, type World } from './collision'
import { footprint, furnish, isOver, LOW, type Item } from './furniture'
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

// the planter along the practice facility on decatur st and the floodlight pole by its wing
const gym = practiceObstacles(
  campus.buildings.find((b) => b.name === 'Practice Facility') as PracticeFacilityData,
)

// the piers and screens in front of the college of education's set back ground floor
const coe = coeObstacles(
  campus.buildings.find(
    (b) => b.name === 'College of Education & Human Development',
  ) as CollegeOfEducationData,
)
// the sports arena's terrace columns, the piers under its bridges, the steps under the terrace
const arena = arenaObstacles(
  campus.buildings.find((b) => b.name === 'GSU Sports Arena') as ArenaData,
)

export const world: World = {
  // buildings you can walk into are just their walls (with a doorway), the rest are solid.
  // except the ones up off the ground, you walk under those (the library link)
  buildings: [
    ...campus.buildings.filter((b, i) => !enterable.has(i) && !b.minHeight).map((b) => b.points),
    ...quad.planters.map((p) => p.points),
    gym.planter.map((p) => [p.x, p.z]),
  ].map((points) => polygon(points as [number, number][])),
  walls: [
    ...interiors.flatMap((i) => i.walls),
    ...memorialWall({ x: campus.fountain[0]!, z: campus.fountain[1]! }),
    ...fenceWalls,
    ...coe.walls,
    ...arena.walls,
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
    ...coe.circles,
    gym.pole,
    ...arena.circles,
  ],
  halfSize: campus.halfSize,
}

// furniture only matters in the building you're in, and all of it together is a lot of walls
const furnished = new Map<number, { world: World; tall: Segment[]; hopping: World; low: Item[] }>()

function furnishedRoom(inside: number) {
  const room = interiors.find((r) => r.index === inside)
  if (!room) return undefined
  let f = furnished.get(inside)
  if (!f) {
    const items = furnish(room)
    const low = items.filter((i) => LOW[i.kind])
    f = {
      world: { ...world, walls: [...world.walls, ...items.flatMap(footprint)] },
      tall: items.filter((i) => i.kind === 'shelf').flatMap(footprint),
      // the cartoon bean hops over the low things
      hopping: {
        ...world,
        walls: [...world.walls, ...items.filter((i) => !LOW[i.kind]).flatMap(footprint)],
      },
      low,
    }
    furnished.set(inside, f)
  }
  return f
}

export const worldFor = (inside: number) => furnishedRoom(inside)?.world ?? world

// shelves are taller than the camera is indoors, it has to stay in front of them
export const tallFurniture = (inside: number) => furnishedRoom(inside)?.tall ?? []

// the cartoon look's collisions: tables and chairs get hopped over (game/bean.ts)
export const hoppingWorldFor = (inside: number) => furnishedRoom(inside)?.hopping ?? world

/** the top of the low furniture a bean at p is over, 0 if none */
export function groundAt(inside: number, p: Point, radius: number) {
  let top = 0
  for (const item of furnishedRoom(inside)?.low ?? [])
    if (isOver(item, p, radius)) top = Math.max(top, LOW[item.kind]!)
  return top
}
