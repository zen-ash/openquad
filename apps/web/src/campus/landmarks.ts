import type * as THREE from 'three'
import { dahlbergGeometry, type DahlbergData } from './dahlberg'
import { libraryNorthGeometry, type LibraryNorthData } from './libraryNorth'

// buildings drawn by hand from photos instead of the regular buildings mesh, by name

export type Sign = { x: number; y: number; z: number; rot: number; text: string }
export type LandmarkGeometry = {
  parts: Record<string, THREE.BufferGeometry>
  // inside of the ground floor walls, with holes where the windows really are
  inside: { solid: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[] }
  signs: Sign[]
}

// each one wants its own bits of the map data, the json doesn't know which is which
type Data = LibraryNorthData & DahlbergData
const builders: Record<string, (b: Data) => LandmarkGeometry> = {
  'Library North': libraryNorthGeometry,
  'Dahlberg Hall': dahlbergGeometry,
}

// the scene and the interiors both need it, only build it once
const cache = new Map<string, LandmarkGeometry>()

export function landmarkGeometry(b: { name?: string; landmark?: unknown }) {
  const build = b.name && b.landmark ? builders[b.name] : undefined
  if (!build) return null
  let geo = cache.get(b.name!)
  if (!geo) cache.set(b.name!, (geo = build(b as Data)))
  return geo
}
