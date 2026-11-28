import { onMap } from '@quad/shared'
import campus from '../campus/campus.json'
import { centroid } from '../campus/geometry'
import names from '../campus/places.json'
import { pointInPolygon, polygon, resolveCollisions, type Point } from './collision'
import { world } from './world'

const outlines = campus.buildings.map((b) => polygon(b.points as [number, number][]))

// search outward from the middle of the place in rings until there's a spot with some room
// around it. just pushing out of a building can land you inside the one next door on packed
// blocks
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

// label is the official name (what the hud says when you're there), also the short names
// people use for it (campus/places.json)
export type Place = { label: string; spot: Point; also: string[]; gsu: boolean }

// a couple of meters out from the front door
function inFrontOfDoor(door: number[]) {
  const [x, z, nx, nz] = door as [number, number, number, number]
  return { x: x + nx * 2.5, z: z + nz * 2.5 }
}

const shortNames = names as Record<string, string[]>
const also = (label: string) => shortNames[label] ?? []

// every gsu building you can walk into, and the parks and plazas with a name
const buildings = new Map<string, Place>()
for (const b of campus.buildings) {
  // three greek housing blocks share a name, the first one's door will do
  if (!b.gsu || !b.name || !b.door || buildings.has(b.name)) continue
  buildings.set(b.name, {
    label: b.name,
    spot: inFrontOfDoor(b.door),
    also: also(b.name),
    gsu: true,
  })
}
const areas = campus.areas.map((a) => ({
  label: a.name,
  // hurt park's middle is the fountain, the plaza in front of it is where you start
  spot: a.name === 'Hurt Park' ? { x: 0, z: 0 } : openSpotNear(centroid(a.points)),
  also: also(a.name),
  gsu: !!a.gsu,
}))
export const places: Place[] = [...buildings.values(), ...areas]
  .filter((p) => onMap(p.spot.x, p.spot.z))
  .sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }))

// lower case words, & as "and", no punctuation: "A&H", "a & h" and "a and h" are the same
export const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['.]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

// how well a name fits what was typed, lower is better
function fit(typed: string[], name: string) {
  const w = words(name)
  const [q, n] = [typed.join(' '), w.join(' ')]
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  // every word typed starts one of the name's words: "rec cent", "park place"
  if (typed.every((t) => w.some((nw) => nw.startsWith(t)))) return 2
  if (n.includes(q)) return 3
  return Infinity
}

/** the places that match what someone typed, best first. nothing typed: all of them */
export function search(text: string): Place[] {
  const typed = words(text)
  if (!typed.length) return places
  return places
    .map((p) => ({ p, fit: Math.min(...[p.label, ...p.also].map((n) => fit(typed, n))) }))
    .filter(({ fit }) => fit < Infinity)
    .sort(
      (a, b) =>
        a.fit - b.fit || Number(b.p.gsu) - Number(a.p.gsu) || a.p.label.length - b.p.label.length,
    )
    .map(({ p }) => p)
}

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
