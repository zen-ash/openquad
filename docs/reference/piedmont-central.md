# Piedmont Central: references

What I built GSU's Piedmont Central from (housing plus the 24 hour dining hall, 92 Piedmont Ave
NE, on John Wesley Dobbs Ave at Piedmont Ave, opened August 2016 with 1,152 beds). It's an 11
storey U of rooms round a court that opens south onto the W Lot: cream panels with tall blue
stripes, red brick up to the 8th floor on the wings and the street sides, a brick core over the
main doors and a taller tan block with a two storey glass corner at Piedmont / JW Dobbs. The one
storey dining hall fills the east half of the court. In November 2026 GSU's map added a new
L shaped canopy round the dining hall, a stair from the W Lot and a blue walkway across the lot.
Everything here is reference only: no photos are in the repo, the measurements are my own. The
photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                          | date             | license              | facade                                | used for                                                                                                       |
| --------------------------------------------------------------- | ---------------- | -------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D 1293211, "November 2026 Map Updates") | 2026-11-10 09:59 | GSU                  | the court and dining hall from W Lot  | camera fitted by hand: floors against the court's back wall, the core, the doors, the canopy, the dock; colors |
| GSU campus map (Concept3D 1293211), aerial from the south east  | 2026-11          | GSU                  | the dining hall, the east wing        | the clerestory, the brick box and the blue dock band east of the glass hall, the canopy's extent               |
| GSU campus map (Concept3D 287171 / 287201) photos               | 2016-2021        | GSU                  | the whole south side, the dining hall | 2016 overview (fitted by hand): the massing, brick and tan floors, stripe counts; the dock (2024)              |
| GSU campus map (Concept3D 502084) bike rack photos              | -                | GSU                  | the JW Dobbs side, west end           | brick ground floor with the PIEDMONT CENTRAL sign (logo in a blue square), tan piers, shop glass further east  |
| Mapillary 2352912124874734 / 1508657402970020 (SydneyIStroud)   | 2022-09          | CC BY-SA 4.0         | the north east corner                 | by eye: the glass corner with 92, the wide windows on the corner block, brick and stripes along both streets   |
| Mapillary 318999826236895 (toddwiese)                           | 2019-12-19       | CC BY-SA 4.0         | the JW Dobbs side from the east       | by eye: tan piers and shop glass under brick with stripes                                                      |
| USGS 3DEP lidar (GA statewide 2018)                             | 2018             | public domain        | all                                   | the outline, every height, the ground round it                                                                 |
| Esri World Imagery Wayback, release 26334                       | -                | Esri, reference only | roof                                  | the court, the dining hall's roof and clerestory                                                               |
| OpenStreetMap way of building 231                               | -                | ODbL                 | -                                     | the old outline (dining hall at full height, the north side short)                                             |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/287171

- **Newest photos**: GSU's own from Nov 10 2026, the court, the dining hall and the W Lot. Nothing
  2025-26 of the street sides (the 2022 Mapillary walk is the newest there).
- **Rating**: one good camera fit (Nov 2026, the court), one rough (2016 overview, no lens info),
  the street sides by eye, the west side never seen up close.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the court at the main doors
(305.4m).

- Ground: the court 305.3-305.8, the W Lot 304.4, John Wesley Dobbs Ave falls from 308.2 at the
  west end to 304.2 at Piedmont Ave, the east side 303.6, the drive on the west 307.9.
- Tower (`upper` in build-campus.mjs): west wing x 180.4-197.4 from the court (z -276, a notch to
  -278.5 at its south west corner) to the north side at z -311.6 (osm had -311.1, the lidar's
  roof reaches -311.6); east wing x 264.2-280.8 from z -276 to -313; the court's back wall at
  z -295.7, the brick core over the dining hall standing 0.9m out of it (x 221-230, 9m: the lidar
  says 9-10m, the Nov 2026 photo 1.45 bays).
- Roof 343.3, parapets 344.1 (38.7 up), and three things at 347.3 (41.9): the corner block (x
  267.5-280.8, z -297..-313), the stair tower on the east wing's south end, and the light grey
  screen round the roof's machinery behind the core (x 202.5-230).
- Floors: 11 storeys (ground floor + 10 floors of rooms, counted on the core in both 2026
  photos). Against the court's back wall (23.6m, 4 stripes) the floors come out 2.9-3.0m and the
  ground floor tall (6.6m to the 2nd floor). The top windows are ~3m under the parapet.
- Windows 1.5 x 1.85m, a 1.15m blue stripe between each pair, a group every ~6.2m (4 west of the
  core, 5 east of it, 3 on each wing's court side). The core's are triple windows 3.2m wide in a
  brick panel framed in tan, brick from the 2nd to the 9th floor. The wings' ends: brick with a
  tan strip of paired windows up the middle, tan from the 9th floor up.
- Dining hall: glass under a blue band (band 3.3-5.0) from x 226.2 to 243, a brick box to 251.7
  (5.6), then the loading dock set back 2.5m under a blue band. The clerestory on its roof: a
  curved wall of pale glass ~10m across, bowed out to the south, to ~7m (lidar 312). The 2026
  canopy: a deep flat box at 3.2-4.1m, 3.2m out, along the core's base and the hall's south front
  to x ~236 (the Nov 2026 photo; GSU's note says "to the left and bottom of the C").
- Main doors: in the court's back wall just west of the core (the Nov 2026 photo, under a small
  glass canopy), moved there from osm's door on the west wing.

## What's in the game

- campus/piedmontCentral.ts. build-campus.mjs PIEDMONT_CENTRAL: points = the ground floor (tower
  plus dining hall, the court open), landmark.upper = the tower over it. Only building 231
  changed in campus.json. DATUM 305.4.
- Each face of the tower has a plan (FACES): blue stripe groups, a middle column of paired
  windows, wide windows (the corner block), or plain; brick or tan; and what the ground floor is
  (brick with windows, shop glass between tan piers, the court side, the doors under the core).
  Faces over the dining hall start on its roof.
- Window glass sits 0.15m in and is cut a bit bigger than its hole, so there are no reveal sides
  (3 quads a window saved) and you never see past its edge.
- Signs: a plain blue square where GSU's logo is on the core's top (trademark), the PIEDMONT
  CENTRAL plate on JW Dobbs with a blue square for the logo, 92 on the glass corner.

## What still differs

- The court is the map's paving: the real one is a raised plaza with lawns, young trees, a black
  fence and steps up from the W Lot. Not drawn (it's the map's ground, not the building).
- The west side (on the drive) and most of the JW Dobbs side were only seen far off or at an
  angle: the stripe groups there are the same rule as the court, the counts aren't checked.
- The floors: the photos say ~2.95m floors and a tall ground floor, the lidar's parapet then
  leaves ~3m over the top windows. If the ground floor is really lower there's an 11th floor I
  didn't see (I counted 10 floors of rooms in both 2026 photos).
- The blue stripes' small square vents, the window frames' horizontal transom, the brick's tan
  sills, the corner's glass canopy and the small glass canopy over the main doors are not in.
- The new 2026 canopy is a plain box; the real one has a grey fascia over a white soffit. The
  clerestory is drawn as pale panels (metal), the real one is translucent glass with mullions.
- The new stair and blue walkway in the W Lot aren't drawn (the lot isn't the building).
- Colors: matched to the Nov 2026 morning photo; in the game's full sun the cream reads a bit
  paler and pinker than the photo, the 2016 photo's blue is deeper.

## Cost

6 parts (tan, brick, blue, glass, store, metal) from the library's families, no new shaders or
textures. About 5.5k triangles. Glass and shop glass don't cast; a hidden core keeps a low sun
from going in the windows. 4 small sign planes (shown within 60m).

Measured after the merge.
