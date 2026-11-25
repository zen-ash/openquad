# College of Law: references

What I built GSU's College of Law (85 Park Place, opened 2015) from. It's on Park Place at John
Wesley Dobbs Ave, across Park Place from the Candler Building and across JWD from the
Georgia-Pacific tower, outside the walking fence at the north end of Woodruff Park. Beige limestone
on Park Place and the drive behind it, a terrace on top of the stone on Park Place with the law
library's glass (floors 5 and 6) set back over it under a big flat roof on louvres, a lower all
glass box on the JWD corner with the entrance, glass under the roof on JWD and grey metal panels on
the south side. Everything here is reference only: no photos are in the repo, the measurements are
my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                  | date              | license              | facade                       | used for                                                                                           |
| ----------------------------------------------------------------------- | ----------------- | -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295217), "COLLEGE_OF_LAN" | 2026-03           | GSU                  | the doors on Park Place      | the grey band over the doors with the plate sign and logo, the stone pier next to it, colors       |
| GSU campus map photo "20230828MLB_Stamps_Scholars"                      | 2023-08-28        | GSU                  | the terrace                  | the terrace in front of the library glass, the louvres under the roof, the parapet                 |
| Mapillary (SydneyIStroud) round the block                               | 2022-09-07 and 13 | CC BY-SA 4.0         | JWD corner, Park Place       | by eye: the box and the stone over the street                                                      |
| GSU campus map photo "20210113_MLB_Back_To_School_233"                  | 2021-01-13, dusk  | GSU                  | Park Place from JWD          | the sign band on the box, the stone's tall windows, the roof over the library                      |
| Mapillary 492997495234032 (deirdreedsign)                               | 2019-12-19 16:54  | CC BY-SA 4.0         | the drive (east side)        | the grey service floor with roll up doors, the stone's tan courses, the window rhythm, a glass bay |
| Mapillary 503996770725900 (deirdreedsign)                               | 2019-12-16 16:40  | CC BY-SA 4.0         | south side from Park Place   | the library's glass on the south corner in a grey frame, the grey metal and narrow windows         |
| GSU campus map photo "20190411CPR\_\_Spring_Admissions_032"             | 2019-04-11        | GSU                  | south west corner from below | the roof's dark edge and soffit, the glass corner, the logo on the grey metal                      |
| Mapillary 153637496742419 (lxmatl3)                                     | 2017-08-28 08:47  | CC BY-SA 4.0         | JWD from the east            | by eye: glass under a roof that hangs out over JWD                                                 |
| Commons "Georgia State University College of Law Building.jpeg"         | 2015-11-04        | CC BY-SA 4.0         | the JWD / Park Place corner  | the whole massing: box, stone, terrace, library glass, roof, the shelf on the JWD side             |
| USGS 3DEP lidar (GA statewide 2018)                                     | 2018              | public domain        | all                          | the outline, every height, the terrace, the ground                                                 |
| Esri World Imagery Wayback, release 3692                                | 2026-11           | Esri, reference only | roof                         | the louvres over the terrace (leaning, the lidar was better for the edges)                         |
| OpenStreetMap way of building 196                                       | -                 | ODbL                 | -                            | the old outline (about right, with the roof's edge on JWD as the wall)                             |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295217

- **Newest photos**: March 2026 for the entrance (close up), 2023 for the terrace. The newest
  photo of the whole building is the 2015 one on Commons; the street photos of the other sides are
  2017-2022. Nothing I found says the outside changed since it opened apart from the entrance sign.
- **Rating**: no fitted camera. Cameras for the side by sides were lined up by eye on the Commons
  photo and the Mapillary positions. Heights are lidar, the window rows and bays are by eye.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Park Place sidewalk at the
entrance (323.6m).

- Ground: Park Place 323.6, the JWD corner 324.2. The drive on the east side is 322.3-323 near
  JWD and drops to 318.6 (5m under Park Place) from about z -278 south, where the loading doors are.
- Outline (the roof's edges): Park Place's stone face is one straight line from the south corner
  (-198.5, -252.8) to the roof's edge on JWD (-181.4, -315.1). The roof's edge on JWD runs from the
  box's corner (-193.4, -318.6) to (-140.6, -303.3). The drive side is x -140.5, the south side z
  -252.8.
- The box on the JWD corner: x -193.4 to the Park Place line, back to z -295.3, its roof 351.6
  (28.0). Its north wall is on the roof's edge line.
- The terrace: 346.1 (22.5), from the stone face 5m in, then the library's glass. The louvres over
  it reach 359.0-359.3 and the lidar sees through them to the terrace. At the south corner the
  lidar's terrace stops 2.2m short of the south side (the library's glass comes out over it).
- The roof: 358.9 (35.3) round the edges, 357.2 inside with mechanical boxes to 360-364.
- By eye: a 6.5m ground floor, three stone floors of 5.33m (the terrace is the top of the third),
  3.7m windows in 3.6m bays (3.3m on the drive), tan courses under and over each window row and two
  thin ones between, the service floor on the drive up to the second floor's windows.

## What's in the game

- campus/collegeOfLaw.ts. Outline redrawn in build-campus.mjs (COLLEGE_OF_LAW) on the lidar's
  lines, with the JWD wall 3m in under the roof (the photos from JWD show the roof hanging out
  over the glass). The stone stands 0.3m out of the storefront glass (Part 22's rule). The door
  moved from the drive to the doors on Park Place in the box, under the sign.
- Park Place: storefronts between stone piers, three rows of windows, the terrace and its
  parapet, the library's glass set back 5m, louvres (fins, no lid) from the library to the stone,
  a beam along the stone's edge.
- The box: glass on a grey band (the 2026 plate sign "COLLEGE OF LAW" with the blue square), a
  stone wall at the bottom on JWD, grey coping at 28m, its roof reaching back to the library.
- JWD: stone ground floor with storefronts, glass to the roof, a shelf out of the glass at the
  third floor's top on the east part (Commons photo).
- The drive: grey precast service floor with roll up doors down at the drive, stone with windows
  and tan courses over it, a glass bay in a grey frame near JWD.
- South side: stone with the library's glass over it in a grey frame at the Park Place end, grey
  metal with narrow windows to the drive, a blue square where GSU's logo is.

## What still differs

- No camera was fitted: the side by sides are lined up by eye, so the proportions are checked
  but not measured. The Commons photo is from 2015 (the sign band was black with letters then).
- The JWD side: the real shelf is a deeper block and the ground floor under the box is darker
  glass with planters along it. I didn't see enough of it to do more.
- The drive's glass bay and its corner box at the top (2019 photo) are only roughly placed; the
  stretch of the drive near JWD was never seen.
- The south side's lower floors are behind the low building next door (osm building 134, drawn as
  a 14m generic deck, the real one is a two storey building with a canopy) and were never seen.
- The stone's courses: the real tan bands are a little wider and more even; the window frames
  have a transom the game's glass doesn't.
- The roof's mechanical boxes are three plain blocks.

## Cost

6 parts (stone, tan, base, metal, glass, store) from the library's families, no new shaders or
textures. About 5k triangles (2k of them the tan courses). Glass, storefronts and the tan courses don't cast; hidden cores
(the whole thing under the terrace, the library, the box's top, the corner glass) keep a low sun
from going through. Stone is drawn first when you're close.

Measured after the merge.
