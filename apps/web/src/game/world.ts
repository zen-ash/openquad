import { FENCE } from '@quad/shared'
import campus from '../campus/campus.json'
import { coeObstacles, type CollegeOfEducationData } from '../campus/collegeOfEducation'
import { wingWalls, type CourtlandBuildingData } from '../campus/courtlandBuilding'
import { courtlandObstacles, type CourtlandNorthData } from '../campus/courtlandNorth'
import { nscObstacles, type NscData } from '../campus/naturalScience'
import { arenaObstacles, type ArenaData } from '../campus/sportsArena'
import { BED, memorialWall } from '../campus/fountain'
import { practiceObstacles, type PracticeFacilityData } from '../campus/practiceFacility'
import { recObstacles, type RecData } from '../campus/recCenter'
import { rscObstacles, type RscData } from '../campus/researchScience'
import { annexObstacles, type AnnexData } from '../campus/scienceAnnex'
import { polygon, type Point, type Segment, type World } from './collision'
import { footprint, furnish, isOver, LOW, type Item } from './furniture'
import { enterable, interiors } from './interiors'
import { benches, bins } from './streetFurniture'
import { decksAt } from './surface'
import { fromElevation, heightAt } from './terrain'

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
// the rec center's columns, the corner sign's pillar and post, the patio fence, low walls
const rec = recObstacles(
  campus.buildings.find((b) => b.name === 'Student Recreation Center') as RecData,
)
// the natural science center's planters and the gate across its alley
const nsc = nscObstacles(
  campus.buildings.find((b) => b.name === 'Natural Science Center') as NscData,
)
// the parapet along courtland st's viaduct by the two courtland buildings
const viaduct = courtlandObstacles(
  campus.buildings.find((b) => b.name === 'Courtland North') as CourtlandNorthData,
)
// the courtland building's low part at the back, it isn't in its outline
const wing = wingWalls(
  campus.buildings.find((b) => b.name === 'Courtland Building') as CourtlandBuildingData,
)
// the research science center's columns, the posts of its canopy and pergola
const rsc = rscObstacles(
  campus.buildings.find((b) => b.name === 'Research Science Center') as RscData,
)
// the science annex's planter on hurt plaza and the piers and fences of its colonnade
const annex = annexObstacles(campus.buildings.find((b) => b.name === 'Science Annex') as AnnexData)

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
    ...rec.walls,
    ...nsc.planters,
    nsc.gate,
    ...viaduct,
    ...wing,
    ...annex,
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
    ...rec.circles,
    ...rsc.circles,
  ],
  halfSize: campus.halfSize,
}

// the sides of bridges with a drop beside them: walls, but only for someone up on the deck.
// collisions are flat, the same walls would stop you walking under courtland st on decatur st
const DROP = 1
const deckEdges: Segment[] = [...campus.roads, ...campus.paths]
  .filter((l) => l.points[0]?.length === 3)
  .flatMap(({ width, points }) =>
    points.slice(1).flatMap((b, i) => {
      const a = points[i]!
      const [dx, dz] = [b[0]! - a[0]!, b[1]! - a[1]!]
      const len = Math.hypot(dx, dz) || 1
      const [nx, nz] = [-dz / len, dx / len]
      const [mx, mz] = [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2]
      const deck = fromElevation((a[2]! + b[2]!) / 2)
      return [1, -1].flatMap((side) => {
        const off = (width / 2) * side
        // a metre out from this side: another deck (the sidewalk next to the road), or the
        // ground not far below, and it's open
        const [ox, oz] = [mx + nx * (off + side), mz + nz * (off + side)]
        if (decksAt(ox, oz).some((h) => Math.abs(h - deck) < DROP)) return []
        if (heightAt(ox, oz) > deck - DROP) return []
        return [
          {
            ax: a[0]! + nx * off,
            az: a[1]! + nz * off,
            bx: b[0]! + nx * off,
            bz: b[1]! + nz * off,
          },
        ]
      })
    }),
  )
const deckWorld: World = { ...world, walls: [...world.walls, ...deckEdges] }

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

// high: standing up on a bridge's deck (Player)
export const worldFor = (inside: number, high = false) =>
  furnishedRoom(inside)?.world ?? (high ? deckWorld : world)

// shelves are taller than the camera is indoors, it has to stay in front of them
export const tallFurniture = (inside: number) => furnishedRoom(inside)?.tall ?? []

// the cartoon look's collisions: tables and chairs get hopped over (game/bean.ts)
export const hoppingWorldFor = (inside: number, high = false) =>
  furnishedRoom(inside)?.hopping ?? (high ? deckWorld : world)

/** the top of the low furniture a bean at p is over, 0 if none */
export function groundAt(inside: number, p: Point, radius: number) {
  let top = 0
  for (const item of furnishedRoom(inside)?.low ?? [])
    if (isOver(item, p, radius)) top = Math.max(top, LOW[item.kind]!)
  return top
}
