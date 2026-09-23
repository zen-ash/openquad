import campus from '../campus/campus.json'
import { centroid } from '../campus/geometry'
import { resolveCollisions, type Point } from './collision'
import { world } from './world'

// short name in the menu -> building name on openstreetmap
const SPOTS: [string, string][] = [
  ['Library North', 'Library North'],
  ['Student Center East', 'Student Center East'],
  ['Langdale Hall', 'Langdale Hall'],
  ['Classroom South', 'Classroom South'],
  ['Aderhold', 'Helen M. Aderhold Learning Center'],
  ['Urban Life', 'Urban Life Building'],
  ['Petit Science Center', 'Petit Science Center'],
  ['Rialto Center', 'Rialto Center for the Arts'],
  ['College of Law', 'GSU College of Law'],
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

export const places: Place[] = [
  { label: 'Hurt Park', spot: { x: 0, z: 0 } },
  ...SPOTS.flatMap(([label, name]) => {
    const building = campus.buildings.find((b) => b.name === name)
    return building ? [{ label, spot: openSpotNear(centroid(building.points)) }] : []
  }),
]
