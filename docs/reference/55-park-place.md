# 55 Park Place: references

What I built 55 Park Place NE (GSU's Andrew Young School of Policy Studies, also some Robinson
College of Business units and the AI Innovation Lab) from. It's a 19 floor office block across
Park Place from Woodruff Park, Auburn Ave on its south side. The GSU Foundation bought it in 2013
(news from then calls it the former Georgia-Pacific Plaza). Cream precast all round with deep set
windows, two wings on Park Place with the entrance between them, the middle's top floors stepping
back. Everything here is reference only: no photos are in the repo, the measurements are my own.
Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                               | date                | license              | facade                                     | used for                                                                                                  |
| -------------------------------------------------------------------- | ------------------- | -------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295205), "55park"      | 2026-03 (phone)     | GSU                  | the north wing's Park Place front, from it | the round columns and the ground floor glass, the red awning, banners, the planter, by eye                |
| GSU campus map, location 295205, "Image 1/2"                         | 2026-03             | GSU                  | a side door with blue film                 | nothing (couldn't tell which door)                                                                        |
| Esri World Imagery Wayback (newest)                                  | 2026-11 release     | Esri, reference only | roof                                       | the penthouse, the notch, the atrium skylight (the tower leans ~10m north in it)                          |
| Mapillary (SydneyIStroud), Park Place and Auburn Ave                 | 2022-09-07 to 09-13 | CC BY-SA 4.0         | the south west corner, Auburn Ave          | by eye: the planter in front of the south wing, the stairs into the middle, same windows round the corner |
| GSU campus map photos "20190410CPR_Spring_Admissions_021/022"        | 2019-04-10          | GSU                  | the Park Place front from the south west   | the wings, the middle (ribbons, the glass wall, the stepped top), the canopy, the "55", colors            |
| Commons "25 Park Place in downtown Atlanta, view from Woodruff Park" | 2017-05-20          | CC BY-SA 4.0         | the corner at the edge of the frame        | only that the columns and windows carry on round the corner                                               |
| USGS 3DEP lidar (GA statewide 2018)                                  | 2018                | public domain        | all                                        | the outline, every height, the stepped top, the ground                                                    |
| OpenStreetMap way of building 146                                    | -                   | ODbL                 | -                                          | the old outline (1.2m short on Park Place, the notch at the top floor's depth)                            |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295205

- **Newest photos**: March 2026 (one phone photo along the north wing), the rest 2019. Nothing
  from 2025-26 shows the whole tower, and nothing ever shows the north or east faces up close.
- **Rating**: one rough camera fit (the 2019 front photo 022, 4 points, ~40px rms on 1600, but
  Georgia-Pacific's tower behind it lands in the same place). A fit on the very wide 2019 photo
  looking up (021) put the camera on the wing's face, so that one and the 2026 one are cameras I
  placed by eye.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the terrace in front of the doors
(321.7m).

- Ground: the Park Place sidewalk is 321.1-321.7 along the front, the terrace in front of the
  doors 321.7, Auburn Ave falls from 318.7 at Park Place to 317.1 at the east end (4.6m under the
  terrace), the drive on the east 317.5, the north side 321.
- Faces (game coords): Park Place front x -198.2, north z -223.5, Auburn Ave z -167.3, east x
  -137 with small corners cut out at the north east (x -140.2, z -218) and south east (x -142.4,
  z -172.6).
- Roof 400.0 (parapet 400.1, 78.4 up), the penthouse on the back x -154 to -138.5, z -218 to
  -173: 406.1 (84.4, the building's height).
- The middle between the wings, z -203.5 to -188.5: its tops step 383.5, 387.5, 391.5, 395.4 and
  the roof 400.0 going in from x -196 to -190 in 1.5m steps. So it's 2.2m behind the wings up to
  the 15th floor and its top four floors step back. The canopy over the doors is 326.5 and reaches
  x -200.5.
- Floors from the steps: 4.0m, the lobby 5.3m (19 floors to the roof). In the middle the lobby
  is two floors of glass (8.7m) up to the band with the "55" on it (the 2019 photos: the "55" is
  well over the canopy's 4.8m, three ribbons over it, then the glass wall).
- The atrium skylight at x -176 to -166 (the lidar goes through it).
- Windows: 12 in a row on Auburn Ave (the 2019 photo and the satellite's leaned south face
  agree on about 4.4m bays), so 4.43m bays everywhere: 4 on each wing's front, 10 on the east, 13
  on the north. Each is a 3.4m box 0.6m deep with a 0.65m sloped sill (the bright wedge in every
  photo), glass from 1.15m to 3.35m over the floor.

## What's in the game

- campus/parkPlace55.ts. Outline redrawn in build-campus.mjs (PARK_PLACE_55): it's the ground
  floor glass, 0.7m behind the precast on Park Place (round columns stand out of it flush with
  the face) and 1.5m behind the middle's face for the doors. The door moved from the south face
  near Park Place to the main doors under the canopy.
- Window boxes with sloped sills on the west, south and east faces. The north face (only seen
  from far off) has the glass flat on the wall.
- The middle: a two floor glass lobby, then three bronze ribbon windows 1.2m deep behind thick
  sloped spandrels, a three floor glass wall (floors 6-8, a pane a floor), ribbons up to the 15th
  floor, then the four stepped floors with terraces. The wings' sides in the notch have a window
  a floor (narrow ones where they're only 2.2m deep).
- The ground floor: glass behind round columns on both wings, a red awning over the north wing's
  second bay (the cafe), shop windows flat on the precast round the other sides, the canopy, the
  "55" over the doors, four plain blue banners (GSU's have a logo, left out).

## What still differs

- The window boxes in the photos have a raised frame round each and the spandrel between floors
  projects as a band: here they're plain holes in a flat face. A frame round 800 windows would
  double the triangles.
- The north and east faces were never seen up close: the same windows as the south face, a guess.
- Auburn Ave is up to 4.6m below the terrace: the walls just carry on down (sink()), the real
  building probably has a lower floor with doors on Auburn Ave.
- No steps, planters, the "55 PARK PLACE" monument or the big "55" carved in the planter wall
  (the terrain is a smooth slope there).
- The 2019 photo looking up has the middle's top further back and lower against the wings than
  the lidar's four 1.5m steps give: maybe more floors step back by less, I went with the lidar.
- The glass wall on floors 6-8 has a rail in front of it in the photos, not drawn.
- The canopy is a flat dark metal disc; the real one is glass in a dark frame with rods up to the
  wall.
- The atrium skylight and the roof clutter (cooling tower, screens) aren't drawn.

## Cost

5 parts (precast, glass, bronze, dark, red) from the library's families, no new shaders or
textures (bronze is a second glass() material). About 8.4k triangles (precast ~6.6k, glass
~1.7k). Glass, bronze, the canopy and the awning don't cast;
two hidden cores (the block and the middle's lower floors) keep a low sun from going through.
The awning is only drawn within 80m. Precast is drawn first when you're close.

Measured after the merge.
