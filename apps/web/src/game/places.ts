import campus from '../campus/campus.json'
import { centroid } from '../campus/geometry'
import { pointInPolygon, polygon, resolveCollisions, type Point } from './collision'
import { world } from './world'

const outlines = campus.buildings.map((b) => polygon(b.points as [number, number][]))

// short name in the menu -> building name on openstreetmap
const SPOTS: [string, string][] = [
  ['Library North', 'Library North'],
  ['Student Center East', 'Student Center East'],
  ['Langdale Hall', 'Langdale Hall'],
  ['Classroom South', 'Classroom South'],
  ['Urban Life', 'Urban Life Building'],
  ['Petit Science Center', 'Petit Science Center'],
  ['Research Tower', 'Research Tower'],
  ['Dahlberg Hall', 'Dahlberg Hall'],
  ['Sports Arena', 'GSU Sports Arena'],
  ['Rec Center', 'Student Recreation Center'],
]

// search outward from the middle of the building in rings until there's a spot with
// some room around it. just pushing out of the building can land you inside the one
// next door on packed blocks
function openSpotNear(p: Point) {
  for (let r = 0; r < 160; r += 2) {
    const steps = Math.max(1, Math.round(r * 1.5))
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2
      const spot = { x: p.x + Math.cos(angle) * r, z: p.z + Math.sin(angle) * r }
      const pushed = resolveCollisions(spot, 1.5, world)
      if (pushed.x === spot.x && pushed.z === spot.z) return spot
    }
  }
  return { x: 0, z: 0 }
}

export type Place = { label: string; spot: Point }

// a couple of meters out from the front door
function inFrontOfDoor(door: number[]) {
  const [x, z, nx, nz] = door as [number, number, number, number]
  return { x: x + nx * 2.5, z: z + nz * 2.5 }
}

export const places: Place[] = [
  { label: 'Hurt Park', spot: { x: 0, z: 0 } },
  ...SPOTS.flatMap(([label, name]) => {
    const building = campus.buildings.find((b) => b.name === name)
    if (!building) return []
    // go to the front door if it has one
    return [
      {
        label,
        spot: building.door
          ? inFrontOfDoor(building.door)
          : openSpotNear(centroid(building.points)),
      },
    ]
  }),
]

// somewhere random within a couple of meters of the spot, so people teleporting to
// the same place don't end up standing inside each other
export function arrivalSpot(spot: Point, random = Math.random) {
  const angle = random() * Math.PI * 2
  const dist = 1 + random() * 1.5
  const p = { x: spot.x + Math.cos(angle) * dist, z: spot.z + Math.sin(angle) * dist }
  const landed = resolveCollisions(p, 0.4, world)
  // right in front of a door it could land just inside the doorway, so fall back to the spot
  return outlines.some((o) => pointInPolygon(landed, o.points)) ? spot : landed
}
