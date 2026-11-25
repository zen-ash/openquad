# 58 Edgewood: references

What I built 58 Edgewood Ave (GSU's CollabTech incubator, research services and LaunchGSU, also
called the 25 Park Place annex) from. It's an old four storey warehouse on Edgewood Ave at
Equitable Pl, across Edgewood Ave from the Hurt Building: buff brick with big steel windows over
a white marble ground floor from 1939 (the Greek key frieze), with GSU's blue glass sign box on
the corner from the 2016-17 renovation. On its east end, against T Deck, is a taller block with
black granite on Edgewood Ave. Everything here is reference only: no photos are in the repo, the
measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                               | date                 | license              | facade                                       | used for                                                                                                     |
| -------------------------------------------------------------------- | -------------------- | -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GSU campus map (Concept3D, map 1108, location 295206), "Image 21-23" | 2026-03              | GSU                  | the corner entrance, the accessible entrance | the fluted pilaster, steps and marble by the corner, the black granite and double doors in the east block    |
| Esri World Imagery Wayback, release 45134                            | 2022-12 (in shade)   | Esri, reference only | roof                                         | the two roofs, the split between them, the cooling unit on the east block (newer releases are no clearer)    |
| Mapillary (SydneyIStroud), along Edgewood Ave                        | 2022-09-07 and 09-13 | CC BY-SA 4.0         | the sidewalk, east block's ground floor      | by eye: the granite at the bottom of the east block, the recess, T Deck's brick piers next to it             |
| GSU campus map photo "20191017_MLB_Fall_Admissions_290"              | 2019-10-17, dusk     | GSU                  | Edgewood Ave front and Equitable Pl side     | camera fitted on the lidar (about 10px rms on 1600, level camera): bays, rows, heights, the sign box         |
| Mapillary 464516508111188 (nhhecker)                                 | 2019-04-23 08:58     | CC BY-SA 4.0         | the east block from the east                 | by eye: black granite over a recessed ground floor, the brick strip and blue glass on its west end           |
| Mapillary (deirdreedsign) along Edgewood Ave                         | 2019-12-16           | CC BY-SA 4.0         | the front from the east                      | by eye: the same front                                                                                       |
| GSU campus map photo "20170214_MLB_CollabTech_047"                   | 2017-02-14, day      | GSU                  | Equitable Pl side at the corner              | colors (brick against marble in the shade), the sign box's glass by day, the second entrance on Equitable Pl |
| Mapillary 135791758532768 (jackdripper)                              | 2016-05-14           | CC BY-SA 4.0         | the east block in scaffolding                | only that the east block was being redone in 2016                                                            |
| USGS 3DEP lidar (GA statewide 2018)                                  | 2018                 | public domain        | all                                          | the outline (four walls and the split), every height, the ground                                             |
| OpenStreetMap way of building 94                                     | -                    | ODbL                 | -                                            | the old outline (0.3m out at the front, 1.4m short of T Deck)                                                |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295206

- **Newest photos**: March 2026 for the two entrances (close ups), 2022 for the sidewalk, 2019
  for the whole front. Nothing on GSU's map, Commons or Mapillary from 2025-26 shows the whole
  building. Urbanize Atlanta mentions façade improvements for T Deck and 58 Edgewood "in design
  and permitting" (undated); none of the 2026 close ups show anything new outside.
- **Rating**: one camera fit (the 2019 dusk photo), the rest by eye.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the sidewalk at the corner door
(314.4m).

- Ground: the Edgewood Ave sidewalk falls from 314.5m at Equitable Pl to 313.0 at the east block
  and 312.3 at T Deck. Equitable Pl climbs to 315.9 at the back.
- Warehouse: roof 328.75 (14.35), parapet 329.7 (15.3), the strip along the back 332.0 (17.6). The
  front wall at z -42.8, the west wall x -199.6, the back z -85. The canopy's top 318.7.
- The sign box's top 329.75 (15.45), over the corner pier and back along Equitable Pl. The lidar
  has something at that height 10m back from the corner, the 2019 photo a box about 6.5m deep: I
  went with the photo.
- East block from x -162.4 (the split is sharp in the lidar) to T Deck at -139.3: roof 338.2,
  parapet 339.0 (24.6), stair tower on the front west corner 342.7 (28.3, the building's height),
  a cooling unit on the roof 341.5.
- From the fitted 2019 camera, over the sidewalk: basement lights 0.6-1.25, storefronts
  1.55-4.2, canopy 4.2-4.9 (the lidar says its top is 4.3, I split the difference), marble to
  5.65, a stone band, window rows 5.85-8.05, 8.83-11.28, 11.82-14.25 with pale sills under the
  top two. Eight bays of 3.2m windows on Edgewood Ave: a 2.15m corner pier, 0.95m piers but a
  1.95m one after the second bay, a 1.5m end pier. Equitable Pl: nine bays, the same rows.

## What's in the game

- campus/edgewood58.ts. Outline redrawn in build-campus.mjs (EDGEWOOD_58): the front is the
  storefront glass 0.3m behind the marble and brick (Part 22's rule), the east block's ground
  floor is tucked 3.15m in under its granite (the outline goes in with it). The east end goes to
  0.3m off T Deck. The door is at the corner entrance (it moved 1.1m west).
- Two entrances by the corner pier, one on each street, the address over the Edgewood Ave one,
  a fluted pilaster beside it, Greek key panels on the frieze over the corner pier, the wide pier
  and the end pier, a narrow window up the corner pier.
- The sign box: dark blue glass panels (drawn with the metal family, no rooms behind it) with a
  plain blue square where GSU's logo is.

## What still differs

- The sign box isn't lit at night: in the photo it glows blue with GEORGIA STATE UNIVERSITY up
  two faces. Signs can't run vertically, so the letters aren't there, and the metal family has
  no glow. The game's dusk (19:25) is much darker than the photo's long exposure.
- The Greek key panels are three bars in a frame, not the real key.
- The entrances are flat glass on the wall: the real ones are recesses with marble steps up to
  the doors.
- The east block above the ground floor is from two street photos at grazing angles and the
  dusk photo's edge: the brick strip, the blue strips and how far the granite goes up are
  guesses. Its soffit really slopes up toward the street.
- The back (on the alley to the Bell Building) and T Deck's side were never seen: plain brick
  with the front's windows, and white.
- The Equitable Pl ground floor (two storefronts, a door, a roll up door, the second entrance) is
  from the dusk photo by eye.

## Cost

7 parts (brick, marble, granite, white, glass, store, blue) from the library's families, no new
shaders or textures. About 1.8k triangles. Glass and storefronts don't cast; two hidden cores
(warehouse and east block) keep a low sun from going through. Marble and brick are drawn first
when you're close.

Measured after the merge.
