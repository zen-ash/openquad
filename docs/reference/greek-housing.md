# Greek Housing: references

What I built GSU's Greek Housing from: three blocks of three storey town homes (2008) for nine
fraternities and sororities round a lawn off Edgewood Ave, east of 148 Edgewood, outside the
walking fence. GSU's map calls them all "Greek Housing" (156 Edgewood Ave). Each town home is a
bay: red brick all the way up, or tan stucco over a brick ground floor. The brick bays stand a
bit forward and their parapets a bit higher, the windows are 2x2 lights in white frames, the
chapters' letters are on plates up top and blue standing seam canopies on two posts cover the
doors on the lawn. Everything here is reference only: no photos are in the repo, the
measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                         | date              | license              | facade                      | used for                                                              |
| -------------------------------------------------------------- | ----------------- | -------------------- | --------------------------- | --------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, 287169 / 295241 / 293786) | 2026-08 (uniqid)  | GSU, reference       | the gate by the drive       | the guard booth and the two storey block behind it                    |
| GSU campus map photo (2019-12-04, "Housing stock 015")         | 2019-12-04        | GSU, reference       | the lawn                    | the bays, the canopies, the letters, colors, the fitted side by side  |
| Mapillary nhhecker / deirdreedsign along Edgewood Ave          | 2019-04, 2019-12  | CC BY-SA 4.0         | edgewood ave side           | the edgewood block's bays, the side by side                           |
| Mapillary SydneyIStroud along Edgewood Ave                     | 2022-09-08, 09-13 | CC BY-SA 4.0         | edgewood ave side, east end | the "156" end (brick, diamond vents), glass block on the ground floor |
| GSU campus map photo (2018-03-29, "Spring Admissions 0104")    | 2018-03-29        | GSU, reference       | the east end on the drive   | alpha xi delta's plate on the brick bay, the stucco and brick split   |
| USGS 3DEP lidar (GA statewide 2018)                            | 2018              | public domain        | all                         | roofs, the ground, that osm's outlines are right                      |
| Esri World Imagery (sat.py default release)                    | -                 | Esri, reference only | roofs                       | white membrane roofs                                                  |
| OpenStreetMap ways of buildings 39, 40, 61                     | -                 | ODbL                 | -                           | the outlines (kept)                                                   |

- **Rating**: the lawn photo is an ultra wide lens, its camera fitted (Nov 26 2026, see below).
  The Edgewood Ave Mapillary photo is the Mapillary pose moved into the bike lane by eye.

## Measurements

USGS lidar (2018). Each block is drawn from its own floor, the ground at its door (no DATUM:
the three share a name, see "What's in the game").

- Ground: Edgewood Ave sidewalk 303.4-303.7, the lawn 302.0, west of 39 302.9, the drive between
  61 and Patton Hall falls from 303.3 on Edgewood to 301.7 in the back.
- 39 (west row, 12x38m): roof 311.3, 9.3m over the lawn. Three storeys.
- 40 (back, 9x16m): roof 307.1, 5.2m over 301.9. Two storeys (the 2026 gate photo).
- 61 (on Edgewood with a wing up the east side): roof 311.4, 8.0m over the Edgewood sidewalk,
  9.4m over the lawn.
- The outlines are osm's: the lidar's walls are within half a meter of them.

## What's in the game

- campus/greekHousing.ts, one builder for all three. build-campus.mjs GREEK_HOUSING picks each
  block by its middle and sets its height (to the brick parapets, 0.5m over the stucco
  cornices), `landmark: { floors }`, and 61's door moves from the lawn to the community room's
  on Edgewood Ave (156 Edgewood).
- All three are named "Greek Housing", so landmarkGeometry() caches by building now instead of
  by name, and Landmarks.tsx keys its buildings by index.
- Every outline edge is cut into bays about 6.5m wide that take turns (brick, stucco), short
  jogs are brick. Ground floors are brick everywhere with a brick band under the stucco, 2x2
  windows (1.6 x 1.4m) on every floor in white reveals, a cream cornice on the stucco bays and a
  cap on the brick ones, the parapets' backs, a white roof.
- Blue hipped canopies on two posts over up to three stucco bays facing the lawn (only drawn
  within 80m). Letters on plain cream plates (no logo square): alpha xi delta on 61's end facing
  the drive, zeta tau alpha and pi kappa phi over their canopies on 61's lawn side.
- MEASURED in greekHousing.ts: where the rule got the lawn photo wrong, an edge's bays are listed
  by hand. I fitted a camera to GSU's 2019 lawn photo (two vanishing points and two cornice lines:
  at (219.8, -62.7) 1.5m over the lawn, heading 131, pitched up 24.7, rolled 4.3, a 76 deg lens) and
  put the photo's corners back on the walls: the east wing's lawn side is a 3.6m brick end by the
  corner, zeta tau alpha's 3.6m stucco town home and another stucco one; pi kappa phi is the brick
  one sticking out of the Edgewood block. The 2016 photo from Patton Hall has zeta tau alpha's
  letters on the wing too.
- The lawn side by side from Nov 25 had its camera at the wing's north end with an 80 deg lens
  tilted up: the wing's corner and its leaning edge made the flat roof line read as a gable. The
  roofs are flat (the lidar and the photos agree), only the camera was wrong.

## What still differs

- The bay pattern is a rule (edges cut into 6.5m bays taking turns), not the real sequence of
  town homes: the real stucco bays are wider, some brick bays have a basket weave panel between
  the windows, and the stucco has diagonal scoring.
- Which chapter is in which bay is a guess outside the lawn photo, only three of the nine are drawn.
- In the photo the wing's brick end is narrower and a stucco face set back behind it shows; the
  game's brick end runs the full 3.6m to the corner. The photo's time isn't known: the wing's west
  face is lit grazing, so about 13:00.
- The Edgewood Ave front has glass block windows, vents and diamond vents in the stucco gables
  for real; here it has the same 2x2 windows as the rest. The "156" numbers aren't drawn.
- The guard booth and gates by the drive (2026 photo), the fences, the patio furniture and the
  lawn's tree aren't drawn.
- 61 stands on the Edgewood sidewalk (303.4), so on the lawn side its brick runs 1.4m lower than
  the ground floor (the plinth). The real one may be split level there.
- 40's two storeys are from the lidar and one photo of its corner; its look is the same rule.

## Cost

5 parts each (brick, stucco, trim, glass, blue) from the library's families, shared materials,
no new shaders or textures. About 1.6k (39), 0.6k (40) and 2.7k (61) triangles. glass and trim
don't cast, blue is near only; a hidden core in each keeps a low sun out.

Measured after the merge.
