# Piedmont North: references

What I built GSU's Piedmont North from: building A, building B and the Piedmont North Dining Hall
(175 Piedmont Ave NE). It's the freshman housing at the north end of the map, on the east side of
Piedmont Ave between Ellis St and Andrew Young International Blvd, right by the Downtown Connector,
outside the walking fence. B (opened fall 2010) is the tall pale stucco block on the east, A
(opened fall 2011) is an L of a 5 floor bar along the south and a 6 floor arm going north, in tan
stucco with balconies set into it under blue grey metal mansards and a gable with GSU's name. The
dining hall is a low box of red panels and cream ribbed siding between A and Piedmont Ave, with a
glass corner and a band of clerestory windows, and the gabled entrance pavilion between it and A's
arm. Everything here is reference only: no photos are in the repo, the measurements are my own.
Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                              | date             | license       | facade                          | used for                                                                    |
| ------------------------------------------------------------------- | ---------------- | ------------- | ------------------------------- | --------------------------------------------------------------------------- |
| GSU campus map (Concept3D, location 287172), "image0-5"             | 2026-08 (upload) | GSU           | A's and B's doors, lobbies      | A's door with the blue awning, B's sliding doors under a canopy, the colors |
| GSU campus map photo "20230816CPR_Move_In_245"                      | 2023-08-16       | GSU           | the pavilion from the lawn      | the porch, the sign, the siding box behind it                               |
| GSU campus map photo "20210805MLB_Piedmont_North_Stock_009"         | 2021-08-05 dusk  | GSU           | A's arm, pavilion, dining hall  | the balconies (rails, blue stripe), the gable, the mansards, floor lines    |
| GSU housing site photo "20191119CPR_Piedmont_North_002"             | 2019-11-19 sun   | GSU           | the same from farther back      | the side by side, the dining hall's glass corner and clerestory, colors     |
| Mapillary sherbets (Andrew Young bridge, 501569964381003 and next)  | 2021-06-14 11:03 | CC BY-SA 4.0  | B's east face and north end     | B's windows and grilles, the cornice, the sign on the raised parapet        |
| Mapillary SydneyIStroud (Piedmont / Andrew Young, 1972119049645240) | 2022-09-09 15:30 | CC BY-SA 4.0  | A, pavilion, dining from the NW | the massing from Piedmont Ave                                               |
| Mapillary deirdreedsign, lxmatl8 (Piedmont Ave northbound)          | 2017-2019        | CC BY-SA 4.0  | the dining hall's west side     | red panels, siding, A's balconies at the bar's west end                     |
| USGS 3DEP lidar (GA statewide 2018)                                 | 2018             | public domain | all                             | every outline, every height, the ground                                     |
| Esri World Imagery Wayback (26334)                                  | winter           | Esri          | roofs                           | checking the lidar outlines (osm's B is ~10m off)                           |

GSU links (text only): https://map.concept3d.com/?id=1108#!m/287172 and #!m/287202

- **Newest photos**: the 2026 door photos on GSU's map (uploaded Aug 2026) show the same colors,
  awning and doors as 2019-2023. Nothing I found says the outside changed since they opened.
- **Which side is which**: the pavilion's gable faces Piedmont Ave (the lidar's main ridge runs
  east-west), so the GSU photos look east from the lawn: A's arm is behind the pavilion, the dining
  hall's north side and its glass corner on Piedmont Ave are on the right. B is seen from the
  Andrew Young bridge looking southwest: the long face with windows is its east side, the blank
  wall with the sign its north end.
- **Rating**: the 2019 photo is fitted on 4 points (the pavilion's gable apex and eave corners, the
  gable on A's arm), rms ~8px at 1280x720, camera 1.4m over the lawn. The 2021 Mapillary camera
  was moved onto the bridge's left lane (Mapillary's position was ~5m off the deck) and turned
  until B's northeast corner and the sign parapet line up; it is not a full fit. The 2022 one is
  Mapillary's pose as it is.

## Measurements

Elevations are USGS lidar (2018). All three stand on 302.0m (DATUMS): the ground is within 0.3m of
that all round (301.8 north, 302.1 south and west), except the court between A and B (sunken to
299.0) and the drive east of B (303.6). The game's ground there is the coarse 16m grid, ~1.5m low
in places; the plinths cover it.

- Outlines: all redrawn on the lidar walls. osm's B was ~10m east of where it is (x 430-456, the
  lidar says 422-445) and A's arm 3m east. A: the bar x 349.5-410.5, z -502.5..-521.5, the arm x
  367-385.5 to z -568.8. B: west face x 422, east 445, north -575.5 with a 3.5x3m notch at the
  northeast corner, the south side one diagonal from (410.5, -502.2) to (444.8, -515.2). The
  dining hall: x 340-367, z -517.5..-551.5, plus the pavilion (to the porch's back at x 354) and a
  low link to A's arm.
- A: the bar's roof 315.3, its parapet 316.8 (14.8m); the arm's roof 318.3, parapet and mansards
  319.3 (17.3m); the gable's ridge 323.2 (21.2m, x 367-381, z -549.5..-556.5). A stair tower where
  A meets B, 320.5. Floors from the 2021 photo's lines: a 3.3m ground floor, then 2.6m (the arm,
  6 floors) and 2.5m (the bar, 5 floors).
- B: roof 325.6, parapet 326.2 (24.2m, 8 floors), raised parapets 329.8 on the middle of the east
  face (z -541..-553, the sign) and the west face (z -535..-553), a corner one on the front 328.2,
  the penthouse 330.8 (28.8m).
- The dining hall: its roof slopes from 305.8 at the south end to 308.6 at the north front (3.9 to
  6.6m), the link 4m. The pavilion's ridge 311.0 (9m) running east-west, eaves ~5.2m by the photo.
- Canopies: a 2.7m one along A's south front (x 376-407) and one on B's diagonal front at x ~430;
  that's where the doors are.

## What's in the game

- campus/piedmontNorth.ts: three builders sharing one kit and one materials set
  (piedmontNorthMaterials.ts). build-campus PIEDMONT_NORTH has the outlines, heights and doors
  (campus.json 198, 277, 278 changed, nothing else). The dining hall's 18.2m left MEASURED_HEIGHTS.
- Doors: A's moved to the bar's south front under the canopy, B's to its diagonal front under the
  canopy (the sliding doors), the dining hall's to the back of the pavilion's porch (the sign
  there says "to building A & dining hall").
- A: balcony bays set 1.2m into the walls (slab edges, glass doors at the back, glass rails with
  white tops, a blue stripe down the middle) under blue grey mansards with blue fascias; on the
  arm the piers between them are blank (the photos), on the bar there are windows on them. A peach
  base with a storefront, a peach band under the top floor, a coping. The gable stands 0.4m out of
  the arm's west face with a peach band, a blue edge, "Georgia State University" in blue letters
  and a blue square where the logo is; its roof goes back over the arm. The blue canopy along the
  south front.
- B: single windows every 3m with a brown grille under each, a cornice and coping, the raised
  parapets and the penthouse, the blank north end. GSU's name and a blue square on the east face's
  raised parapet and high on the north end. A storefront and canopy at the door.
- The dining hall: red panels and cream siding (ribs running along it), the glass corner on
  Piedmont Ave, storefront windows between red panels, the clerestory under the roof stepping down
  with it, a roof sloping up to the north with a grey fascia. The pavilion: peach stucco, piers at
  the porch's corners, the gable over it with white trim, a standing seam roof, the "PIEDMONT
  NORTH" sign (the plate's blue square where the logo is), doors at the back of the porch.
- Shared walls: the dining hall is lower than A, so A draws its walls from 3.3m up where the hall
  and the link stand against it; B draws its wall over A's bar from 14.3m up and A draws nothing
  there.

## What still differs

- A's bar and the arm's east face and north end were never seen in a photo: their balcony bays,
  windows and mansards are copied from the arm's west face. The bar's south front is what you see
  from campus.
- In the 2021 photo of B, the north half of the east face looks a few meters taller than the south
  half; the lidar has one roof (325.6) over all of B, so I kept one height. B's top floor has paired
  windows on the north part of the east face; the game has the same single windows on every floor.
- The pavilion is simplified: no small north gable (the lidar has one), no round window in the
  gable, the porch is a plain recess with the doors and a cream band; the real one has a siding box
  inside it. The ground under the porch is the game's.
- The "175 PIEDMONT AVE" sign on the glass corner isn't drawn (the plate signs always have the
  blue square). No bike racks, benches, lamps or the blue Piedmont North sign at the corner of
  Piedmont Ave and Ellis St.
- The stucco colors were matched to the 2019 photo in sun by ratio; the game still reads a little
  pinker on the pavilion. The game's sky had clouds where the photos have clear sky.
- The doors are placed from the lidar's canopies, not seen in a photo from the street: the 2026
  photos show A's door with a blue awning and B's sliding doors under an overhang on a drive, but
  not which face they're on.
- The court between A and B is sunken now (Nov 26): the ground there is set to 299.0 in
  build-terrain.mjs (SUNKEN) and the drive's level north of it is a raised plaza at 301.85
  (raised.ts 'Piedmont North court wall') with the retaining wall and a 1m guard wall on it, drawn
  with A in peach. The wall's line is from the satellite (its shadow edge, z -542), no photo shows
  the court, so its finish, steps and rail are guesses. Out here the ground is the 16m grid: the
  court's floor rises ~0.7m in its last few meters to A's bar.

## Cost

One set of 10 materials, all from the library's families (precast, metal, glass): no new shaders
or textures. A: 6 parts, ~3.7k triangles; B: 4 parts, ~5.2k; the dining hall: 5 parts, ~400. A's
window glass casts (its balconies are deeper than a hidden core can sit) and only its rails don't;
B's glass, grilles and canopy don't cast and a hidden core stops a low sun; the pavilion has a
hidden core and gable wall over the porch. 7 signs.

Measured after the merge.
