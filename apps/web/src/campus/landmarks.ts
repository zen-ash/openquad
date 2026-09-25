import type * as THREE from 'three'
import { artsHumanitiesGeometry, type ArtsData } from './artsHumanities'
import { dahlbergGeometry, type DahlbergData } from './dahlberg'
import { libraryNorthGeometry, type LibraryNorthData } from './libraryNorth'
import { researchTowerGeometry, type TowerData } from './researchTower'
import { studentCenterEastGeometry, type StudentCenterData } from './studentCenterEast'

// buildings drawn by hand from photos instead of the regular buildings mesh, by name

// letters are cut-out metal letters on the wall (size in meters, color), the rest are
// white signs (scale makes a small plate of one)
export type Sign = {
  x: number
  y: number
  z: number
  rot: number
  text: string
  letters?: boolean
  size?: number
  color?: string
  scale?: number
}
export type LandmarkGeometry = {
  parts: Record<string, THREE.BufferGeometry>
  // inside of the ground floor walls, with holes where the windows really are
  inside: { solid: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[] }
  signs: Sign[]
}

// each one wants its own bits of the map data, the json doesn't know which is which
type Data = LibraryNorthData & DahlbergData & ArtsData & TowerData & StudentCenterData
const builders: Record<string, (b: Data) => LandmarkGeometry> = {
  'Library North': libraryNorthGeometry,
  'Dahlberg Hall': dahlbergGeometry,
  'Arts & Humanities': artsHumanitiesGeometry,
  'Research Tower': researchTowerGeometry,
  'Student Center East': studentCenterEastGeometry,
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
