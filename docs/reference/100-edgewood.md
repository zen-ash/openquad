# 100 Edgewood: references

What I built 100 Edgewood Ave from. It's an 18 storey office tower from the 1960s across Edgewood
Ave from Hurt Park, GSU's offices now (GSU plans classrooms on its first four floors and a one
storey addition with a roof terrace on Edgewood Ave from Feb 2027: not built, so not drawn). A
white precast grid with dark glass set in it, 21 bays on the long faces and 12 on the ends, on a
colonnade with the ground floor's glass set back behind it, all on a plaza that Edgewood Ave
falls away from. Everything here is reference only: no photos are in the repo, the measurements
are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                     | date                      | license       | facade                                       | used for                                                                                                                       |
| -------------------------------------------------------------------------- | ------------------------- | ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| GSU campus map (Concept3D, map 1108, location 963489), text                | 2026                      | GSU           | -                                            | the facade renovation "starting in February 2026" (no photos of it), the planned addition                                      |
| GSU campus map, "100_Edgewood_Facade" rendering                            | uploaded 2026-09          | GSU           | the Edgewood Ave front, planned              | only that it's a plan: the addition isn't built                                                                                |
| GSU campus map, aerial over Hurt Park                                      | undated, uploaded 2024-09 | GSU           | south and east faces, roof                   | camera fitted on the lidar corners (level camera, ~7px rms on 1600): 21 bays, 15 + 1 rows, the penthouse, the colonnade        |
| Mapillary (SydneyIStroud) along Edgewood Ave and at Peachtree Center Ave   | 2022-09-07 15:47-15:53    | CC BY-SA 4.0  | the plaza's wall, the west planter           | by eye: board formed concrete wall (vertical boards) with a stone coping and a black rail, the colonnade's pale columns        |
| GSU campus map photo "20220930MLB_100_Edgewood_090"                        | 2022-09-30                | GSU           | the top floors from below                    | by eye: the top floor's taller glass with a grey panel over it, pier and band widths, the corner                               |
| Commons "Hurt Park streetcar station in downtown Atlanta.jpg" (Biosthmors) | 2016-09-22 17:24          | CC BY-SA 4.0  | the south face's lower floors from Hurt Park | camera fitted by hand (lines up within a few px): the colonnade, the band over it, the column spacing, the doors and the "100" |
| USGS 3DEP lidar (GA statewide 2018)                                        | 2018                      | public domain | all                                          | the outline, the turn off the grid, every height, the plaza and the ground round it                                            |
| OpenStreetMap way of building 38                                           | -                         | ODbL          | -                                            | the old outline (a skewed box about the tower's size)                                                                          |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/963489

- **Newest photos**: 2022. Nothing from 2025-26 shows the outside. GSU's map says a facade
  renovation was to start in February 2026 with the Edgewood Ave sidewalk closed at times; no
  photo shows what it changes, so this is the 2022 look.
- **Rating**: two camera fits (the 2016 park photo, the aerial), the rest by eye.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the plaza (309.65m).

- Ground: the plaza is flat at 309.65 all round the tower and out to the drive on the west side.
  The Edgewood Ave sidewalk falls from 310.1 at the west end to 307.8 at the east corner and 307.3
  further on, so the plaza's front is level with it in the west, steps in the middle, and a wall
  up to ~1.9m at the east end. East of the tower is a lot at 305.8-306.2 (a 3.7m wall). The back
  (Lynch's Alley) is ~309.4.
- Tower: 57.45 x 33.75m from the roof points, turned 0.8 deg from the game's x (the north west
  corner is 0.8m further north than the north east one). Parapet 377.55 (67.9), roof 376.3
  (66.65), penthouse 381.8 (72.15) over x -37..3.8, z -69.9..-51.8.
- From the photos, over the plaza: the colonnade to 6.0, a solid band to the first sill at 7.85,
  15 rows of 3.6m (glass 3.05, band 0.55), the top floor's glass 61.85-65.8, a grey panel to
  67.4, the coping to 67.9. Piers 0.4m, the glass 0.35m in (the 2016 photo, near frontal: glass
  ~89% of a bay, ~86% of a row). The 2022 photo looking up has the top row 1.7 rows tall.
- Columns on every third pier (7 spans on the long faces, 4 on the ends), about 1.1m square, the
  ground floor's glass 2.4m behind the faces (the outline). Doors in the middle span, a little
  west of its middle, the "100" in brass on the glass beside them.

## What's in the game

- campus/edgewood100.ts. Outline redrawn in build-campus.mjs (EDGEWOOD_100): the lidar faces
  are `landmark.corners`, the outline is the ground floor's glass 2.4m in from them (Part 22's
  rule), the door moved to the main doors in the middle of the front.
- The grid is each face's wall with the windows cut out, then the pier sides and the band tops and
  bottoms back to the glass a whole row at a time (the bits inside the piers and bands don't show)
  and one glass quad per window.
- The plaza: paving round the tower, steps down to the sidewalk in the middle of the front, its
  walls board formed concrete under a pale stone coping, a black rail where the sidewalk has
  fallen away (front east end, over the lot).

## What still differs

- The 2026 facade renovation: unknown, not drawn.
- The planter on the west side (low curved wall, shrubs, crape myrtles and a row of floodlights)
  and the shrubs on the east end aren't there: the west side is plain paving.
- The windows have a dark panel along their bottom (the 2016 photo) but no blinds; the glass is
  bluer and darker than in the photos, which have bright sky in it (no city reflections in the
  game).
- The bronze hand sculpture on the plaza, the flags east of the tower and the lot's own walls
  aren't drawn.
- The north face (only seen from Lynch's Alley and the deck) is the same as the south face.
- The penthouse is a plain grey box with the board lines standing up for louvres.
- The columns are square boxes; the real ones are clad in a pale stone and may be L-shaped at the
  corners (not seen).

## Cost

6 parts (precast, glass, lobby, concrete, paving, metal) from the library's families, no new
shaders or textures. About 5.5k triangles (precast ~3.1k, glass ~2.1k). Glass, lobby glass and
paving don't cast; two hidden cores (over the ground floor, and the ground floor behind its
glass) keep a low sun from going through. The rail is only drawn within 80m.

Measured after the merge.
