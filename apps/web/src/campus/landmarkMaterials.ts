import type * as THREE from 'three'
import { artsHumanitiesMaterials } from './artsHumanitiesMaterials'
import { classroomSouthMaterials } from './classroomSouthMaterials'
import { collegeOfEducationMaterials } from './collegeOfEducationMaterials'
import { courtlandBuildingMaterials } from './courtlandBuildingMaterials'
import { courtlandNorthMaterials } from './courtlandNorthMaterials'
import { dahlbergMaterials } from './dahlbergMaterials'
import { langdaleHallMaterials } from './langdaleHallMaterials'
import { libraryNorthMaterials } from './libraryNorthMaterials'
import { librarySouthMaterials } from './librarySouthMaterials'
import { loftsParkingMaterials } from './loftsParkingMaterials'
import { naturalScienceMaterials } from './naturalScienceMaterials'
import { oneParkMaterials } from './oneParkMaterials'
import {
  bandDeckMaterials,
  paintedDeckMaterials,
  steelDeckMaterials,
} from './parkingDecksMaterials'
import { petitScienceMaterials } from './petitScienceMaterials'
import { practiceFacilityMaterials } from './practiceFacilityMaterials'
import { recCenterMaterials } from './recCenterMaterials'
import { researchScienceMaterials } from './researchScienceMaterials'
import { researchTowerMaterials } from './researchTowerMaterials'
import { scienceAnnexMaterials } from './scienceAnnexMaterials'
import { sportsArenaMaterials } from './sportsArenaMaterials'
import { studentCenterEastMaterials } from './studentCenterEastMaterials'
import { studentCenterWestMaterials } from './studentCenterWestMaterials'
import { universityBookstoreMaterials } from './universityBookstoreMaterials'
import { universityLoftsMaterials } from './universityLoftsMaterials'
import { urbanLifeMaterials } from './urbanLifeMaterials'
import type { LandmarkGeometry } from './landmarks'

// what each hand-built building is made of, part -> material (all from materials.ts)
export const landmarkMaterials: Record<string, Record<string, THREE.Material>> = {
  'Library North': libraryNorthMaterials,
  'Dahlberg Hall': dahlbergMaterials,
  'Arts & Humanities': artsHumanitiesMaterials,
  'Research Tower': researchTowerMaterials,
  'Student Center East': studentCenterEastMaterials,
  'Student Center West': studentCenterWestMaterials,
  'Langdale Hall': langdaleHallMaterials,
  'Classroom South': classroomSouthMaterials,
  'Library South': librarySouthMaterials,
  'Urban Life Building': urbanLifeMaterials,
  'College of Education & Human Development': collegeOfEducationMaterials,
  'Petit Science Center': petitScienceMaterials,
  'University Bookstore': universityBookstoreMaterials,
  'Practice Facility': practiceFacilityMaterials,
  'GSU Sports Arena': sportsArenaMaterials,
  'Student Recreation Center': recCenterMaterials,
  'Natural Science Center': naturalScienceMaterials,
  'Courtland North': courtlandNorthMaterials,
  'Courtland Building': courtlandBuildingMaterials,
  'Research Science Center': researchScienceMaterials,
  'Science Annex': scienceAnnexMaterials,
  'One Park Place': oneParkMaterials,
  'University Lofts': universityLoftsMaterials,
  'University Lofts Parking': loftsParkingMaterials,
  'N Deck': steelDeckMaterials,
  'K Deck': steelDeckMaterials,
  'S Deck': steelDeckMaterials,
  'M Deck': paintedDeckMaterials,
  'G Deck': bandDeckMaterials,
}

// see-through glass and the parts in noShadow don't cast shadows, everything else does
export const casts = (geo: LandmarkGeometry, mats: Record<string, THREE.Material>, part: string) =>
  !mats[part]!.transparent && !geo.noShadow?.includes(part)
