# 25 Park Place: references

What I built 25 Park Place from: the old Trust Company of Georgia tower (1969, Carson, Lundin &
Shaw, later SunTrust, GSU's since 2007) across Park Place from Woodruff Park, and the four storey
banking hall of 1973 on its Edgewood Ave end, which is GSU's Creative Media Industries Institute
now. Both are white Georgia marble. Everything here is reference only: no photos are in the repo,
the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                | date             | license       | facade                                 | used for                                                                                              |
| --------------------------------------------------------------------- | ---------------- | ------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295204), "Image 12-15"  | 2026-03          | GSU           | the main door, the CMII door           | the revolving door and "25 Park Place" over it, the CMII entrance on Park Place                       |
| Wikimedia Commons "A25ParkPlaceDT2511-0618" (AtlChampion)             | 2025-11-02 12:16 | CC BY-SA 4.0  | west and south faces, roofs, plaza     | camera fitted on the lidar (1.8px rms on 900x1600): floors, ledges, crown, corner piers, the roofs    |
| GSU campus map photo "20230922MLB_Honors_Students_221"                | 2023-09-22       | GSU           | the colonnade                          | by eye: the piers, the lobby glass, the logo and name on the fascia, the planters                     |
| GSU campus map photo "20220301MLB_Spring_042"                         | 2022-03-01       | GSU           | east face (from the east)              | by eye: the plain middle with one column of paired windows, GSU's name in the crown over it           |
| Mapillary (SydneyIStroud), Edgewood Ave, Park Place, Equitable Pl     | 2022-09          | CC BY-SA 4.0  | the banking hall's corners, the back   | by eye: the glass bay on the corner of Equitable Pl, the plain marble back                            |
| GSU campus map photo "20210823MLB_1st_Day_of_School_291" (plaza)      | 2021-08-23       | GSU           | west face from the banking hall's roof | by eye: fins and windows close up, the colonnade, the plaza                                           |
| Wikimedia Commons, JJonahJackalope                                    | 2020-03-04       | CC BY-SA 4.0  | north and west faces                   | 16 windows on the north face, the floors, the colonnade on the north side                             |
| GSU campus map photo "20191017_MLB_Fall_Admissions_278"               | 2019-10-17, dusk | GSU           | the banking hall from Edgewood Ave     | by eye: piers along Edgewood Ave, the overhang, the band of short fins, the top floor's deep openings |
| Wikimedia Commons / Flickr 46559100935, 32532495287 (Warren LeMay)    | 2019-03-23       | CC0           | west face from Park Place, north face  | a weak camera fit (4 points): the banking hall's overhang (5.5m) and its fins band                    |
| USGS 3DEP lidar (GA statewide 2018)                                   | 2018             | public domain | all                                    | both outlines, every height, the ground round it                                                      |
| OpenStreetMap ways 252608921 (the lot) and 886352430 (the tower part) | -                | ODbL          | -                                      | the old outlines, Park Place's road for the plaza's curb                                              |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295204

- **Newest photos**: the Nov 2025 aerial for the whole thing, March 2026 for the doors. Nothing
  from 2026 shows the street fronts. GSU's College Town Downtown page (Nov 2026) lists a facade
  job, a plaza redo and streetscape work for 25 Park Place as future work, so the 2019-2025
  photos are still what it looks like.
- **Rating**: one good camera fit (the aerial), one weak one (LeMay), the rest by eye.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the plaza at the main doors
(318.8m).

- Ground: the plaza is 318.4-319.0, Park Place's sidewalk by the banking hall 318.3-318.5,
  Edgewood Ave falls from 317.6 at Park Place to 314.5 at Equitable Pl, Equitable Pl from 318.3
  at the north end to 315.0 at Edgewood Ave.
- Tower: x -232.45 to -205.95, z -142.85 to -84.45 (the front of the ledges and fins), 26.5 x
  58.4m. Roof 431.8 (113.0), coping 433.0 (114.2, the height of building 309).
- Floors: 16 windows on the short faces and 37 on the long ones (5ft apart), solid corner piers
  1.3m. The colonnade up to 8.6m, the fascia to 12.2, then 25 floors 3.76m apart, each a 1.05m
  ledge and a window row, the crown (a ledge, 5m of thin fins, 2.1m of coping). The floors are
  from the aerial: 0.53 floor of coping, 1.5 of fins, about 0.3 ledge to 0.7 window.
- East face: 11 windows each side of a plain middle as wide as 15, with one column of paired
  windows up it. Over it in the crown: GSU's name, about 2m letters.
- Link to the banking hall: x -228 to -211, its roof 331.0 (12.2).
- Banking hall: x -258 to -207.2, z -73 to -46. The box's top 331.0 (12.2), with a terrace on its
  west 9m (331-333 with the glass rail) and the top floor set back from x -249, 1.5m in from the
  long sides, to 336.6 (17.8). A plant room on the roof to 340.5. The overhang's underside 5.5
  over the plaza (LeMay fit), the short fins between 9.6 and 12.0.

## What's in the game

- campus/parkPlace25.ts draws both: building 93 is the lot (gsu, the door, the inside) and 309
  is the tower part (no name of its own, `landmark: {with: '25 Park Place'}`). campus.test.ts's
  door check now leaves out a building's own parts: the door is under the tower's overhang.
  build-campus.mjs PARK_PLACE_25: the lot's outline is the ground floor's glass (the lobby 2m
  behind the colonnade on the plaza and the north side, the banking hall's glass 1.2-2.5m in
  under its overhang), so nothing outside stands behind it under 3.3m. The tower goes on the
  lidar's walls. The door moved from the Edgewood Ave end to the revolving door in the middle of
  the lobby on the plaza.
- The tower: a ledge at every floor on the lidar's wall line, wrapping round the corners, fins
  0.42m wide between the windows with their fronts 0.15m behind the ledges (the ledges make the
  lines across in the photos), the glass 0.5m in (deeper hid the windows from the side), the
  crown's thin fins in front of a dark grille, the coping. The colonnade (9 bays on the plaza, 4
  on the north), the plain back with a grille by the loading door.
- The banking hall: piers along Edgewood Ave (a glass bay on the Equitable Pl corner), glass all
  round under the overhang on a marble curb, the band of short fins with dark windows between,
  the terrace, the top floor's deep openings on the long sides, a plant room.
- Signs: GEORGIA STATE UNIVERSITY on the plaza's fascia with a plain blue square for the logo,
  "25 Park Place" over the door, "Georgia State / University" in the east face's crown with a
  blue square for the flame. No logos.
- The plaza: a plaza polygon in build-campus from the tower and the banking hall out to Park
  Place's curb (osm's road 4.5m out from its middle), and 19 planters (blue steel drums with a
  white rim, in rows 6m apart that fit before the curb) with a tree in each. The planters are in
  building 93's `landmark.planters`, the trees go on the end of campus.json's trees, each
  nudged a few cm till Trees.tsx makes it a street tree (it picks the kind from where a tree
  stands). The planters are only drawn within 80m.

## What still differs

- The plaza's trees are the game's street trees, much bigger and bushier than the young trees
  in the planters. The planters are a regular grid, the real ones are looser. The tables, the
  flag poles and the fenced patio in front of the link aren't there, and the pavers are the
  generic plaza ones, not the grey granite with dark diagonal bands.
- The east face is from one photo; the north face's colonnade and the back are by eye.
- The crown's fins: the photos have them about two to a window, in front of something dark;
  how deep they are is a guess. The coping is plain.
- The banking hall's ground floor: one floor level (the plaza's). Along Edgewood Ave the street
  falls 3.9m and the glass and piers just run down to it on a marble curb; the real building
  has the CMII entrance up steps on Park Place, a granite planter and the historic marker at the
  corner, and the lower east end. The top floor's openings are evenly spaced (6.15m), the photo
  has them plain at the Park Place end only by eye.
- The skybridge over Equitable Pl to the Bell Building isn't drawn (not part of this building
  in osm).
- The LeMay street view doesn't line up well (weak fit), so the street level proportions are
  from the aerial and by eye.

## Cost

5 parts (marble, glass, louvre, roof, blue) from the library's families (marble, glass,
metal, precast, metal), no new shaders or textures. About 11k triangles (marble 4.1k, glass
4.8k: the tower's windows are a quad each so they light up one by one at night, roof 1.2k,
planters 0.6k, grille 0.3k). Glass, the grille and the planters don't cast; hidden cores in the
tower, the lobby, the banking hall and its top floor keep a low sun from going through. The
planters (blue) are only drawn within 80m. 19 more trees on the plaza.

Measured after the merge.
