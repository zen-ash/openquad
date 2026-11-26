# Patton Hall: references

What I built Patton Hall from: GSU's six storey dorm for 325 (2008) with the Patton Dining Hall
in its base, at Edgewood Ave and Piedmont Ave (160 Edgewood Ave), outside the walking fence. A U
open to the west round a court, with a one storey block in the court's east half. Two floors of
tan stucco at the bottom on a split face block base (all block on Piedmont Ave), red brick over
that with white sunshades over the windows and blue panels by some of them, tan stucco at the
west end and on the top floor's east half, silver round columns along the base, and the corner
at Edgewood and Piedmont open two floors up round the entrance on two slanted blue columns.
Everything here is reference only: no photos are in the repo, the measurements are my own.

## Sources

Newest first.

| source                                                        | date              | license        | facade                     | used for                                                      |
| ------------------------------------------------------------- | ----------------- | -------------- | -------------------------- | ------------------------------------------------------------- |
| GSU campus map (Concept3D, 287170 / 295242 / 287200) entrance | 2026-08 (uniqid)  | GSU, reference | the entrance               | the blue entry floor, split face block, the round columns     |
| Mapillary SydneyIStroud, Piedmont Ave and the corner          | 2022-09-08, 09-13 | CC BY-SA 4.0   | piedmont ave, the corner   | block base, storefront windows, columns, the white panel wall |
| GSU campus map photos (2019-11-11, 2019-11-13)                | 2019-11           | GSU, reference | edgewood ave, the entrance | floors, materials, sunshades, the sign, the side by side      |
| Mapillary nhhecker / deirdreedsign along Edgewood Ave         | 2019-04, 2019-12  | CC BY-SA 4.0   | edgewood ave, the west end | the stucco west end, a side by side                           |
| GSU campus map photo (2018-03-29)                             | 2018-03-29        | GSU, reference | the west end on the drive  | the brick strip of narrow windows by the south west corner    |
| USGS 3DEP lidar (GA statewide 2018)                           | 2018              | public domain  | all                        | the outline (a U, not osm's solid block), heights, the ground |
| OpenStreetMap way of building 74                              | -                 | ODbL           | -                          | the old outline                                               |

- **Rating**: the Edgewood Ave photo (2019-11-13) is matched by eye at a guessed lens, no fit.
  The Mapillary Edgewood photo is its pose moved into the bike lane by eye.

## Measurements

USGS lidar (2018), heights in the game are over the Edgewood Ave sidewalk at the door (303.3m).

- Ground: Edgewood Ave 303.0-303.4, Piedmont Ave falls from 303 to 300 northwards, the lot on
  the north 300.3, the court's west half 301.7.
- Roof 323.0 (19.7), parapet 324.2 (20.9), the north bar's west end and a screened plant area
  next to it 326.6 (23.3), the lift penthouse on the Edgewood bar 327.8 (24.5 = height).
- Six floors in the 2019 photo: a 4.4m ground floor, then 3m.
- The court's east half (x 254-267.5) has no ground returns at all, a roof at 307.4 (4.1m over
  Edgewood, the second floor's level): a one storey block with the terrace on it.
- Outline: Edgewood face z -39.8, Piedmont x 280.6 (osm's sidewalk center line is just east),
  north z -96.6, the north bar reaches x 240.8 (osm stopped at 244 and filled in the court).

## What's in the game

- campus/pattonHall.ts. build-campus.mjs PATTON_HALL redraws the outline (the U plus the court
  block, a notch round the entrance), height 24.5, the door in the corner facing Edgewood Ave.
  DATUM 303.3 in surface.ts.
- Edgewood Ave: block plinth, two floors of stucco with the dining hall's big windows and
  mullions, a white sunshade band, two silver columns, brick floors 3-6 with sunshades over
  every window and blue panels next to every third one, the top floor's east half stucco, the
  stucco west end with a brick strip of narrow windows by the corner, the PATTON HALL plate
  with a plain blue square where GSU's logo is.
- The open corner: white panel wall, the entrance's glass and doorway, the soffit at 7.4m, two
  slanted blue columns, the blue entry floor.
- Piedmont Ave: split face block with storefront windows between silver columns, brick over it
  with sunshades. The north side and the court: block or stucco, brick over it, windows drawn
  flat on the wall (seen from far only). The court block with the terrace rail on top.
- Hidden cores in the three bars (with floors, the open corner has no ceiling under it).

## What still differs

- The window rhythm is a regular grid (2.8-3.1m), the real one pairs and triples windows with
  the blue panels in between; the blue panels read lighter than the real ones.
- The real brick is a deeper, duller red than the game's in sun (auto exposure puts it on the
  shoulder), the windows read paler than the photo's dark glass with blinds.
- The 2019 photo's ground floor windows are separate groups with blinds; here they're two long
  ribbons with thin mullions.
- The parapet line has small steps for real, flat here. The top floor's split between brick and
  stucco is placed by eye.
- The court, the north side and the north bar's west end weren't seen in any photo: their
  materials and windows are guesses. The court block's look is a guess from the lidar alone.
- The ground falls 3m to the north: the north side gets the plinth below the block base.
- Furniture: the ground floor glass is opaque (glass()), so the dining hall's furniture only
  shows through the doorway.

## Cost

6 parts (brick, stucco, block, glass, metal, blue) from the library's families, no new shaders or
textures. About 4.1k triangles (metal 1.6k: columns and sunshades). glass and blue don't cast;
hidden cores keep a low sun out.

Measured after the merge.
