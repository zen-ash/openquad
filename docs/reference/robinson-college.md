# Robinson College of Business: references

What I built GSU's J. Mack Robinson College of Business (35 Broad St) from. It's the old Empire
Building (1901, Morgan & Dillon), Atlanta's first steel frame building, which became the Citizens
and Southern National Bank Building when the bank redid its base in 1929 (Hentz, Adler & Shutze);
the bank gave it to GSU in 1993. It's in the Fairlie-Poplar district on Broad St at Marietta St,
across Broad St from the Commerce Building, outside the walking fence about 60m up Marietta St
from Five Points. 14 floors: three of white rusticated limestone with arches, ten of cream terra
cotta with a pair of windows in each bay, and an orange-tan top floor under the cornice. The bank
(Bank of America now) still has the banking hall, with its clock on the Broad/Walton corner.
Everything here is reference only: no photos are in the repo, the measurements are my own. Photos
I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                       | date             | license              | facade                     | used for                                                                                          |
| ---------------------------------------------------------------------------- | ---------------- | -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295222), "Image_10"            | 2026-03          | GSU                  | the "35" doors on Broad St | sliding doors in black frames under an arched window, rusticated pier, the plate sign             |
| Mapillary 594014735524485 (SydneyIStroud) and the rest of that walk          | 2022-09-01 09:44 | CC BY-SA 4.0         | Broad/Walton corner        | by eye: the clock corner, the arched windows over pedimented ones, the base's rhythm              |
| GSU campus map photo "20220426MLB_RCB_12"                                    | 2022-04-26       | GSU                  | the Broad/Walton corner    | the limestone's color in the shade, the rustication, the niche at the corner, the clock           |
| GSU campus map photo "20220301MLB_GSU_Details_Stock_136"                     | 2022-03-01       | GSU                  | the Broad St doors         | the dark plate sign in the arch, the inscription band, the cornice's modillions                   |
| Commons "The Citizens and Southern National Bank Building ... (46559095175)" | 2019-03-23 11:29 | CC0                  | Broad St from Walton St    | side by side (camera lined up on the corner and the street's vanishing point), the shaft's rhythm |
| Commons "... (40508262843)"                                                  | 2019-03-23 11:28 | CC0                  | Walton St                  | the bank's arched doorway, the pediment windows, the sills and window frames, colors in the sun   |
| Commons "Atlanta Citizens and Southern Bank Building 2012 09 15 06 6180"     | 2012-09-15 15:22 | CC BY-SA 3.0         | the Broad/Marietta corner  | side by side (camera fitted on the corner's ground, base cornice and top), floor count, colors    |
| USGS 3DEP lidar (GA statewide 2018)                                          | 2018             | public domain        | all                        | the outline check, the cornice and roof, the penthouse, the light court, the ground               |
| Esri World Imagery Wayback, release 26334                                    | -                | Esri, reference only | roof                       | a check of the outline (the tower leans a lot in it)                                              |
| OpenStreetMap way 252608883                                                  | -                | ODbL                 | -                          | the outline (right, 62.4 x 24.4m = 204 x 80 feet, with an extra point on the back)                |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295222

- **Newest photos**: March 2026 for the Broad St doors (close up), 2022 for the corners. The
  newest photos of the whole building are the 2019 Commons ones; nothing I found says the outside
  changed since.
- **Rating**: one fitted camera (the 2012 corner photo: distance, pitch and lens from the ground,
  base cornice and top of the corner, the side from how wide Marietta St's face looks), one lined
  up by eye (2019). Heights are lidar, the bays and floors are counted from the photos.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Broad St sidewalk in the middle
of the building (320.6m).

- Ground: Broad St climbs from 319.8 at Marietta St to 321.4 at Walton St.
- Outline: osm's is right (Broad St 62.4m, the ends 24.4m), the back stands against the
  William-Oliver Building and 34 Peachtree. Corners (-454.1, -85.7) Broad/Marietta, (-406.62,
  -126.19) Broad/Walton, (-390.79, -107.62), (-438.27, -67.13).
- Cornice 376.2 (55.6), about a meter out from the walls. Roof 375.0 (54.4). Penthouse 380.9 and
  385.3, 21 x 7m, 19-40m along Broad St from Marietta and 6-13m in. A light court on the back
  (42-52m along, from 11m in to the back) goes down to about 335.
- Counted: 14 floors. The base is three (a tall ground floor, a mezzanine behind the arches, the
  third floor's small windows under the base cornice, 14.4m), then ten floors of 3.6m, the top
  floor, the cornice. 17 bays on Broad St and 6 on each end between wide corner piers.

## What's in the game

- campus/robinsonCollege.ts. Outline in build-campus.mjs (ROBINSON) is osm's without the extra
  point. Door moved from the Marietta end to the "35" doors under the middle arch on Broad St
  (the middle is my guess, the photos show the arch but not where it is along the street).
- The base: limestone in rusticated courses, a tall ground floor window with a little pediment
  in most bays and plain stone over it (where the inscription band is), arched windows over the
  ground floor ones in bays 1 and 15 on Broad St and 1 and 4 on the ends, arched doorways down to
  the ground in the middle of Broad St and near the back on Walton St (the bank's), a ring of
  stones and a keystone round each arch, dark fanlights, the third floor's small windows, a two
  step base cornice.
- The shaft: piers full height, the bays set back 0.2m with a pair of windows per floor, a terra
  cotta mullion between them, orange-tan sills and heads, window frames painted orange-tan.
- The top floor in orange-tan terra cotta with its windows, a band under it, the cornice out a
  meter with orange-tan under it. The back is a plain wall, the penthouse two plain blocks.
- A blind niche in each corner pier on the streets.
- The Bank of America clock as a dark box on the corner with two plain white faces (no logo, no
  hands).
- The plate sign "J. MACK ROBINSON / COLLEGE OF BUSINESS" next to the doors, no logo.

## What still differs

- The base is simpler than the real one: the arches' stones are one smooth ring, no modillions
  or dentils on the cornice, no inscription; the corner niches are square headed (the real ones are round). The rustication is a grid
  of long blocks where the real one has deep horizontal channels. On the ends the real base has
  fewer, wider openings than the six bays over it (the bank's doorway is wider than a bay); the
  game keeps to the shaft's bays.
- Which bays have arches is from three photos and partly guessed; the real Marietta St face has
  them a bit closer together.
- The top floors are richer for real: the ornament runs over two floors and the cornice has
  brackets. The light court on the back isn't there (only seen from the air).
- The 2019 side by side is lined up by eye; its camera is a few meters off (the corner sits
  further left in the photo).
- The terra cotta's color: the photos go from cream (overcast 2012) to warm yellow (sun 2019); I
  went between.

## Cost

5 parts (stone, tc, trim, glass, dark) from the library's families (precast, glass, metal), no new
shaders or textures. About 10.3k triangles (5.2k of them the terra cotta, cut round every window). Glass, the orange-tan trim and the dark bits (fanlights, door
frames, clock) don't cast; a hidden core keeps a low sun from going through the windows. The
limestone is drawn first when you're close.

Measured after the merge.
