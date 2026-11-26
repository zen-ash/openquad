# Centennial Hall: references

What I built GSU's Centennial Hall (100 Auburn Ave NE) from. It's on Auburn Ave between Courtland
St and Piedmont Ave, outside the walking fence north of the Courtland St buildings. It was built
around 1980 as the offices of the Atlanta Life Insurance Company and GSU bought it in 2013 (its
centennial year). Now it has the president's and the provost's offices, the Honors College, the
Welcome Center and an auditorium. Pink tan stone panels, ribbon windows on the long sides, and on
Auburn Ave a big stone frame: a corner block, a glass atrium under the top floor with GSU's name on
it, a stone tower through the roof, the auditorium's drum in front of a recessed curtain wall.
Everything here is reference only: no photos are in the repo, the measurements are my own.

## Sources

Newest first.

| source                                                            | date       | license       | facade                         | used for                                                                 |
| ----------------------------------------------------------------- | ---------- | ------------- | ------------------------------ | ------------------------------------------------------------------------ |
| GSU campus map (Concept3D, map 1108, location 295232), door photo | 2026-04    | GSU           | a side door under a soffit     | the stone panels, the soffits, the dark door frames                      |
| GSU campus map photo "20181107CPR_Fall_Admissions050"             | 2018-11-07 | GSU           | the atrium from the plaza      | the atrium's glass and colored panels, the corner block, the name, logo  |
| Mapillary (SydneyIStroud)                                         | 2022-09    | CC BY-SA      | west steps, north side, lot    | the steps to the atrium, the north side's ribbons and columns, the porch |
| Mapillary (networklanman dashcam on Auburn Ave)                   | 2021-01-20 | CC BY-SA      | Auburn Ave                     | the drum, the tower's slot, the lawn falling to the street               |
| Commons "Centennial Hall, GSU.jpg"                                | 2020-10-10 | CC BY-SA 4.0  | Auburn Ave from the south east | the whole south side: drum, curtain wall, top floor, the end pier        |
| Commons "Centennial Hall, Georgia State University.jpg"           | 2020-03-04 | CC BY-SA 4.0  | the atrium from the plaza      | the corner block, the top floor over the atrium, the stone's color       |
| USGS 3DEP lidar (GA statewide 2018)                               | 2018       | public domain | all                            | the outline, the roof, parapet, tower, drum, porch, the ground           |
| OpenStreetMap way of building 91                                  | -          | ODbL          | -                              | the outline (matches the lidar's roof)                                   |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295232

- **Newest photos**: the 2026 door photo and 2022 street photos; the 2020 Commons photos are the
  newest of the whole Auburn Ave side. I found nothing about outside changes since 2013 (the sign
  and the logo went up then).
- **Which side is which**: the name over the atrium and the drum are on Auburn Ave (south). The
  atrium is at the west end (the Courtland St plaza), the porch on the north runs out to the drive
  by the lot.
- **Rating**: no camera fit. The side by sides are lined up by eye on the corners.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the plaza at the atrium (307.5m).

- Ground: the plaza and the lawn by the drum 307.4-307.8, the lot on the north 307.5, the east side
  305.8-306.9, Auburn Ave's sidewalk ~305 (the lawn falls to it).
- Box: x 137.2-202.5, z -206.9 to -177.3 (65.3 x 29.6m, osm's outline is the same). Roof 326.4,
  parapet 327.5 on the long sides: 18.9 / 20m.
- Tower: x 155.5-168 on the face, back to z -187, 328.1 (20.6m).
- Drum: x 169.8-192.6, out to z -164, a 6.5m round corner at the south west, its parapet 313.3
  (5.8m).
- Porch on the north: x 150-157 from the wall to z -225, its roof 311.2-311.45 (3.9m).
- By eye from the photos: five floors (a 4.5m ground floor, then 3.7m), the top floor's band
  13.9-16, ribbon 16-17.4, fascia to the parapet, the band and fascia ~1.2m out; the atrium 3.5m in,
  the curtain wall 2.5m in, the free pier in front of the atrium ~1.6m square; ribbons on the
  north 1.75m tall in every floor.

## What's in the game

- campus/centennialHall.ts. Outline redrawn in build-campus (CENTENNIAL_HALL): the box's ground
  floor, the atrium's glass and the curtain wall's recess, the north glass 2m in behind its columns,
  the drum. Height 20, the door moved from the east side to the atrium's revolving door. DATUM
  307.5. Its facades.ts look and its MEASURED_HEIGHTS entry are gone.
- Auburn Ave: the corner block, the atrium (teal glass, its sides, a soffit, the free pier, a
  frame over the doors), the tower with one dark slot, the curtain wall behind the drum, the pier at
  the south east and the recess at the end; the top floor's band and fascia stand out over all of
  it, the name on a light grey band over the atrium with the red bar, a blue square where the logo
  stands on the corner. "CENTENNIAL HALL" plate by the doors.
- North, west, east: ribbons in every floor over a ground floor; the north one is glass 2m in
  behind square columns, the porch out to the drive.
- Roof with the parapet's inside, the tower's top, a hidden core (two blocks) for the low sun.

## What still differs

- The Auburn Ave side is the best seen, and it's still only by eye: the top floor's overhang and
  the end pier's position along the face are guesses that look about right in the 2020 photo, the
  real top floor stands out further over the curtain wall.
- The atrium's blue, red and teal panels inside are only a teal tint on the glass; the revolving
  door is a frame.
- The west and east sides' ground floors were never seen up close (by eye, windows in stone), the
  east side's door from the old map isn't drawn.
- The north side's porch has 4 columns, the photo shows more; its shape over the drive is simple.
- The lawn's planting beds, the "100 Auburn Ave" sign, the steps up to the atrium from the corner
  and the trees in the 2020 photo aren't drawn.
- The stone reads a little warmer and whiter than in the overcast photos at noon in the game.

## Cost

5 parts (stone, shade, ribbon, atrium, metal) from the library's families (precast, glass, metal),
no new shaders or textures. About 670 triangles. Glass and the sign band don't cast; two hidden
cores keep a low sun from going through the ribbons. Stone is drawn first when you're close. 4
signs (the letters, the red bar, the blue square, the plate by the doors).

Measured after the merge.
