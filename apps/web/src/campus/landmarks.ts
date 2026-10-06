import type * as THREE from 'three'
import { artsHumanitiesGeometry, type ArtsData } from './artsHumanities'
import { classroomSouthGeometry, type ClassroomSouthData } from './classroomSouth'
import { collegeOfEducationGeometry, type CollegeOfEducationData } from './collegeOfEducation'
import { dahlbergGeometry, type DahlbergData } from './dahlberg'
import { langdaleHallGeometry, type LangdaleData } from './langdaleHall'
import { libraryNorthGeometry, type LibraryNorthData } from './libraryNorth'
import { librarySouthGeometry, type LibrarySouthData } from './librarySouth'
import { petitScienceGeometry, type PetitData } from './petitScience'
import { practiceFacilityGeometry, type PracticeFacilityData } from './practiceFacility'
import { recCenterGeometry, type RecData } from './recCenter'
import { researchTowerGeometry, type TowerData } from './researchTower'
import { sportsArenaGeometry, type ArenaData } from './sportsArena'
import { studentCenterEastGeometry, type StudentCenterData } from './studentCenterEast'
import { studentCenterWestGeometry, type StudentCenterWestData } from './studentCenterWest'
import { universityBookstoreGeometry, type UniversityBookstoreData } from './universityBookstore'
import { urbanLifeGeometry, type UrbanLifeData } from './urbanLife'

// buildings drawn by hand from photos instead of the regular buildings mesh, by name

// letters are cut-out metal letters on the wall (size in meters, color, weight), the rest
// are white signs (scale makes a small plate of one, plate and color change the plate's
// and the text's color)
export type Sign = {
  x: number
  y: number
  z: number
  rot: number
  text: string
  letters?: boolean
  size?: number
  color?: string
  weight?: number
  // squeezes the letters to this much of their width, for condensed type
  wide?: number
  scale?: number
  plate?: string
  // the plate's height, before scale (it's sized to the text otherwise)
  height?: number
  // with no text it's just a plate of its color this wide (a painted bar, a logo's square)
  width?: number
}
export type LandmarkGeometry = {
  parts: Record<string, THREE.BufferGeometry>
  // inside of the ground floor walls, with holes where the windows really are
  inside: { solid: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[] }
  signs: Sign[]
  // parts drawn before everything else while you're close: big walls you walk right past.
  // three sorts by the middle of each mesh, and the campus wide ones (ground, buildings,
  // interiors) have theirs behind you there, so they went first and all of them behind
  // the wall got shaded for nothing (the cutout's discard stops the gpu skipping it)
  first?: string[]
  // parts that don't cast shadows: glass and frames deep in the walls, nothing behind them
  // shows the difference and each part is three more draws (the cascades)
  noShadow?: string[]
}

// each one wants its own bits of the map data, the json doesn't know which is which
type Data = LibraryNorthData &
  DahlbergData &
  ArtsData &
  TowerData &
  StudentCenterData &
  StudentCenterWestData &
  LangdaleData &
  ClassroomSouthData &
  LibrarySouthData &
  UrbanLifeData &
  CollegeOfEducationData &
  PetitData &
  UniversityBookstoreData &
  PracticeFacilityData &
  ArenaData &
  RecData
const builders: Record<string, (b: Data) => LandmarkGeometry> = {
  'Library North': libraryNorthGeometry,
  'Dahlberg Hall': dahlbergGeometry,
  'Arts & Humanities': artsHumanitiesGeometry,
  'Research Tower': researchTowerGeometry,
  'Student Center East': studentCenterEastGeometry,
  'Student Center West': studentCenterWestGeometry,
  'Langdale Hall': langdaleHallGeometry,
  'Classroom South': classroomSouthGeometry,
  'Library South': librarySouthGeometry,
  'Urban Life Building': urbanLifeGeometry,
  'College of Education & Human Development': collegeOfEducationGeometry,
  'Petit Science Center': petitScienceGeometry,
  'University Bookstore': universityBookstoreGeometry,
  'Practice Facility': practiceFacilityGeometry,
  'GSU Sports Arena': sportsArenaGeometry,
  'Student Recreation Center': recCenterGeometry,
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
