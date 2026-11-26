# Alumni Center: references

What I built GSU's Alumni Center (60 Piedmont Ave SE) from. It's on Piedmont Ave between Auburn
Ave and John Wesley Dobbs Ave, outside the walking fence. A three storey red brick block, probably
1940s, with its narrow end on Piedmont Ave (two steel windows a floor in light cast stone panels),
a one storey brick wing beside it with the doors under a blue canopy, and a lower block at the back
with a round window. Everything here is reference only: no photos are in the repo, the
measurements are my own.

## Sources

| source                                                | date    | license       | facade                      | used for                                                       |
| ----------------------------------------------------- | ------- | ------------- | --------------------------- | -------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295208) | 2025-03 | GSU           | Piedmont Ave from the south | everything on the front and the south side, the colors         |
| Esri World Imagery (Wayback, newest)                  | -       | reference     | roof                        | the roofs, the trees over the wing                             |
| USGS 3DEP lidar (GA statewide 2018)                   | 2018    | public domain | all                         | the outline, the roofs and parapet, the back block, the ground |
| OpenStreetMap way of building 30                      | -       | ODbL          | -                           | the outline (matches the lidar, squared up)                    |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295208

- Only one photo of it (GSU's, uploaded March 2025). Mapillary has nothing on this block of
  Piedmont Ave newer than 2016, so the north and west sides are guesses.
- I found nothing about its history beyond the address.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Piedmont Ave sidewalk (302.0m).

- Ground: Piedmont Ave 301.75 (wing) to 302.1 (block), the lot behind 302.4-303.1.
- Block: x 251.6-280, z -215.8 to -207.6 (28.4 x 8.2m). Roof 313.6, parapet 314.45: 11.6 / 12.45m.
- Wing: x 256-280 to z -194.5, roof 306.8 (4.8m).
- Back block over the wing: x 256-266, 3m deep, 312.8 (10.8m).
- By eye: floors 3.9m, the front's windows 2.25 x 1.8m, the stone panels round them 6.3m wide, the
  canopy ~1.9m out at 3.1m, three steps up to the doors.

## What's in the game

- campus/alumniCenter.ts. Outline in build-campus (ALUMNI_CENTER) is osm's squared up; height 12.45,
  the door moved from the west end to the doors on Piedmont Ave. DATUM 302.0. Its MEASURED_HEIGHTS
  entry is gone.
- Front: brick with three stone panels holding two steel windows each, a coping. The wing's front:
  the doors (glass, "60 Piedmont Ave" over them), the blue canopy on two posts, two steps, a window
  in a stone frame, a stone band. The south side over the wing: narrow windows like the photo's.
  North and west sides: plain windows on a regular spacing (guessed). The back block with a round
  window in a stone ring.

## What still differs

- The canopy's red and white stripes, the railings at the steps, the flower beds and the street
  lamp aren't drawn.
- The north and west sides are guesses (no photos).
- The camera for the side by side is by eye; the photo is closer to the building with a wider lens.
- The brick in the game is a little brighter and more even than in the photo.

## Cost

4 parts (brick, stone, glass, blue) from the library's families, no new shaders or textures.
About 860 triangles. Glass and the canopy don't cast; a hidden core keeps a low sun out. Brick is
drawn first when you're close. 1 sign (the address letters).

Measured after the merge.
