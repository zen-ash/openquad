import type * as THREE from 'three'
import { artsHumanitiesGeometry, type ArtsData } from './artsHumanities'
import { classroomSouthGeometry, type ClassroomSouthData } from './classroomSouth'
import { collegeOfEducationGeometry, type CollegeOfEducationData } from './collegeOfEducation'
import { courtlandBuildingGeometry, type CourtlandBuildingData } from './courtlandBuilding'
import { courtlandNorthGeometry, type CourtlandNorthData } from './courtlandNorth'
import { dahlbergGeometry, type DahlbergData } from './dahlberg'
import { langdaleHallGeometry, type LangdaleData } from './langdaleHall'
import { libraryNorthGeometry, type LibraryNorthData } from './libraryNorth'
import { librarySouthGeometry, type LibrarySouthData } from './librarySouth'
import { loftsParkingGeometry, type ParkingData } from './loftsParking'
import { naturalScienceGeometry, type NscData } from './naturalScience'
import { oneParkGeometry, type OneParkData } from './onePark'
import { parkingDeckGeometry, type DeckData } from './parkingDecks'
import { petitScienceGeometry, type PetitData } from './petitScience'
import { practiceFacilityGeometry, type PracticeFacilityData } from './practiceFacility'
import { recCenterGeometry, type RecData } from './recCenter'
import { researchScienceGeometry, type RscData } from './researchScience'
import { researchTowerGeometry, type TowerData } from './researchTower'
import { scienceAnnexGeometry, type AnnexData } from './scienceAnnex'
import { sportsArenaGeometry, type ArenaData } from './sportsArena'
import { studentCenterEastGeometry, type StudentCenterData } from './studentCenterEast'
import { studentCenterWestGeometry, type StudentCenterWestData } from './studentCenterWest'
import { universityBookstoreGeometry, type UniversityBookstoreData } from './universityBookstore'
import { universityLoftsGeometry, type LoftsData } from './universityLofts'
import { urbanLifeGeometry, type UrbanLifeData } from './urbanLife'
import { sink } from './landmark'
import { baseOf } from '../game/surface'
import { terrainAt } from '../game/terrain'

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
  // a parking deck: open floors, no rooms inside. it draws its own floors and its sides go
  // down to the ground, so no inside floor, ceiling or plinth
  open?: boolean
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
  RecData &
  NscData &
  CourtlandNorthData &
  CourtlandBuildingData &
  RscData &
  AnnexData &
  OneParkData &
  LoftsData &
  ParkingData &
  DeckData
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
  'Natural Science Center': naturalScienceGeometry,
  'Courtland North': courtlandNorthGeometry,
  'Courtland Building': courtlandBuildingGeometry,
  'Research Science Center': researchScienceGeometry,
  'Science Annex': scienceAnnexGeometry,
  'One Park Place': oneParkGeometry,
  'University Lofts': universityLoftsGeometry,
  'University Lofts Parking': loftsParkingGeometry,
  'N Deck': parkingDeckGeometry,
  'K Deck': parkingDeckGeometry,
  'S Deck': parkingDeckGeometry,
  'M Deck': parkingDeckGeometry,
  'G Deck': parkingDeckGeometry,
}

// the scene and the interiors both need it, only build it once
const cache = new Map<string, LandmarkGeometry>()

export function landmarkGeometry(b: { name?: string; landmark?: unknown }) {
  const build = b.name && b.landmark ? builders[b.name] : undefined
  if (!build) return null
  let geo = cache.get(b.name!)
  if (!geo) cache.set(b.name!, (geo = sunk(b as Data, build(b as Data))))
  return geo
}

// a building is drawn from one height and the ground can be lower on another side: every wall
// standing on that height carries on down past the lowest ground within 5m of it, steps and
// bases out past the outline too. the plinth only went round the outline, so there was sky
// under anything that stood out from it
function sunk(b: Data, geo: LandmarkGeometry) {
  const xs = b.points.map((p) => p[0]!)
  const zs = b.points.map((p) => p[1]!)
  let low = Infinity
  for (let x = Math.min(...xs) - 5; x <= Math.max(...xs) + 5; x += 2)
    for (let z = Math.min(...zs) - 5; z <= Math.max(...zs) + 5; z += 2)
      low = Math.min(low, terrainAt(x, z))
  const depth = low - baseOf(b) - 0.3
  if (depth < 0) sink(geo.parts, depth)
  return geo
}
