import type * as THREE from 'three'
import { aderholdMaterials } from './aderholdMaterials'
import { artsHumanitiesMaterials } from './artsHumanitiesMaterials'
import { classroomSouthMaterials } from './classroomSouthMaterials'
import { collegeOfEducationMaterials } from './collegeOfEducationMaterials'
import { courtlandBuildingMaterials } from './courtlandBuildingMaterials'
import { courtlandNorthMaterials } from './courtlandNorthMaterials'
import { dahlbergMaterials } from './dahlbergMaterials'
import { collegeOfLawMaterials } from './collegeOfLawMaterials'
import { centennialHallMaterials } from './centennialHallMaterials'
import { alumniCenterMaterials } from './alumniCenterMaterials'
import { rialtoMaterials } from './rialtoMaterials'
import { robinsonMaterials } from './robinsonCollegeMaterials'
import { commerceMaterials } from './commerceBuildingMaterials'
import { edgewood58Materials } from './edgewood58Materials'
import { edgewood148Materials } from './edgewood148Materials'
import { greekHousingMaterials } from './greekHousingMaterials'
import { pattonHallMaterials } from './pattonHallMaterials'
import { edgewood100Materials } from './edgewood100Materials'
import { parkPlace55Materials } from './parkPlace55Materials'
import { haasHowellMaterials } from './haasHowellMaterials'
import { hurtBuildingMaterials } from './hurtBuildingMaterials'
import { langdaleHallMaterials } from './langdaleHallMaterials'
import { libraryNorthMaterials } from './libraryNorthMaterials'
import { librarySouthMaterials } from './librarySouthMaterials'
import { loftsParkingMaterials } from './loftsParkingMaterials'
import { naturalScienceMaterials } from './naturalScienceMaterials'
import { oneParkMaterials } from './oneParkMaterials'
import {
  bandDeckMaterials,
  paintedDeckMaterials,
  spandrelDeckMaterials,
  singleDeckMaterials,
  steelDeckMaterials,
} from './parkingDecksMaterials'
import { parkPlace25Materials } from './parkPlace25Materials'
import { peachtree191Materials } from './peachtree191Materials'
import { petitScienceMaterials } from './petitScienceMaterials'
import { practiceFacilityMaterials } from './practiceFacilityMaterials'
import { recCenterMaterials } from './recCenterMaterials'
import { standardMaterials } from './standardBuildingMaterials'
import { researchScienceMaterials } from './researchScienceMaterials'
import { researchTowerMaterials } from './researchTowerMaterials'
import { scienceAnnexMaterials } from './scienceAnnexMaterials'
import { piedmontCentralMaterials } from './piedmontCentralMaterials'
import { sculptureStudioMaterials } from './sculptureStudioMaterials'
import { southernBellMaterials } from './southernBellMaterials'
import { sportsArenaMaterials } from './sportsArenaMaterials'
import { studentCenterEastMaterials } from './studentCenterEastMaterials'
import { studentCenterWestMaterials } from './studentCenterWestMaterials'
import { studentSuccessMaterials } from './studentSuccessMaterials'
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
  'T Deck': spandrelDeckMaterials,
  'A Deck': singleDeckMaterials,
  'Southern Bell Building': southernBellMaterials,
  '191 Peachtree Tower': peachtree191Materials,
  'Hurt Building': hurtBuildingMaterials,
  '58 Edgewood': edgewood58Materials,
  '148 Edgewood': edgewood148Materials,
  'Greek Housing': greekHousingMaterials,
  'Patton Hall': pattonHallMaterials,
  '100 Edgewood': edgewood100Materials,
  '55 Park Place': parkPlace55Materials,
  'Student Success Center': studentSuccessMaterials,
  'College of Law': collegeOfLawMaterials,
  'Centennial Hall': centennialHallMaterials,
  'Alumni Center': alumniCenterMaterials,
  'Rialto Center for the Arts': rialtoMaterials,
  'J. Mack Robinson College of Business': robinsonMaterials,
  'Commerce Building': commerceMaterials,
  '25 Park Place': parkPlace25Materials,
  'Helen M. Aderhold Learning Center': aderholdMaterials,
  'Haas-Howell Building': haasHowellMaterials,
  'Standard Building': standardMaterials,
  'Sculpture Studio': sculptureStudioMaterials,
  'Piedmont Central': piedmontCentralMaterials,
}

// see-through glass and the parts in noShadow don't cast shadows, everything else does
export const casts = (geo: LandmarkGeometry, mats: Record<string, THREE.Material>, part: string) =>
  !mats[part]!.transparent && !geo.noShadow?.includes(part)
