# Science Annex: references

What I built the Science Annex (29 Peachtree Center Ave: chemistry, biology, physics and
astronomy labs over a GSU parking level, "I Lot") from. Everything here is reference only: no
photos are in the repo, the measurements are my own. Photos I downloaded are kept outside the
repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                 | date                               | license                  | facade                                                   | used for                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esri World Imagery Wayback, release 63116 (zoom 19 and 20)                             | 2026-02-02 (z19), 2022-09-27 (z20) | Esri, reference only     | roof                                                     | checking the outline against the lidar, the roof is the same as in 2018                                                                                                                                                                                                    |
| Mapillary 3821687431287938 (Hurt Plaza, looking toward Peachtree Center Ave)           | 2019-12-19 16:38                   | CC BY-SA 4.0             | the brick wing from the west                             | the wing's corner pier, the piers and black fences, the glass on its corner, the brick. Camera by eye (Mapillary's pose is inside the garage)                                                                                                                              |
| Mapillary 3027343350873255 (deirdreedsign)                                             | 2019-12-16 15:56                   | CC BY-SA 4.0             | the Decatur St / Peachtree Center Ave corner             | the shops are one storey, only the top of the annex's south wall shows over them. Mapillary's pose, not fitted                                                                                                                                                             |
| GSU campus map (Concept3D, map 1108, location 295234): `20180919MLB_Fall_Stock_052`    | 2018-09-19                         | GSU, all rights reserved | the corner from Hurt Plaza, very wide lens               | the pylon and its sign, the north bay (door, canopy, louvres, the screen in the parapet), the drum, the planter, the brick wing over its colonnade. Camera fitted on the pylon's top, the wing's corner and a window (12.5px rms on 1600, rough). Side by side and overlay |
| Mapillary 626014014988865 and the frames around it (lvl5 dashcam)                      | 2018-07-18                         | CC BY-SA 4.0             | Peachtree Center Ave from the south, blurry              | the front unchanged since 2013, "29" on the pylon's base. Not fitted                                                                                                                                                                                                       |
| Wikimedia Commons "File:Science Annex, GSU.JPG" (Michael Rivera)                       | 2013-12-03 12:51, overcast         | CC BY-SA 3.0             | the whole front and the corner, from across the crossing | the main source: camera fitted on the lidar (7.1px rms on 4320) and the front rectified, every band and window on it. Side by side and overlay                                                                                                                             |
| USGS 3DEP lidar (GA statewide 2018)                                                    | 2018                               | public domain            | all                                                      | every height, the walls, the roof boxes, the garage's and the shops' heights, the ground                                                                                                                                                                                   |
| USGS EPQS                                                                              | -                                  | public domain            | -                                                        | the ground along the front and at the 2013 camera                                                                                                                                                                                                                          |
| OpenStreetMap ways 252608900 (annex), 270880870 (shops), 301958709 (Hurt Plaza Garage) | -                                  | ODbL                     | -                                                        | the old outline, the back against the garage (kept)                                                                                                                                                                                                                        |
| Overture Maps                                                                          | 2026-09-23                         | -                        | -                                                        | no height for the annex. Its 23.9m for the shops is the natural science center's roof                                                                                                                                                                                      |

GSU links (the file behind https://map.concept3d.com/?id=1108#!m/295234):

- https://assets.concept3d.com/assets/1108/20180919MLB_Fall_Stock_052_6670ac66b8130.jpg
- https://commons.wikimedia.org/wiki/File:Science_Annex,_GSU.JPG

- **Newest photos**: 2019 (the brick wing from Hurt Plaza, the top of the south wall), 2018
  (the corner), 2018 dashcam (the front, blurry), 2013 (the whole front, sharp). I found
  nothing newer of the building itself; Esri's 2026 image has the same roof as the 2018 lidar.
- **Rating**: one tight camera fit (2013, the front and the corner), one loose one (2018, the
  corner), the brick wing by eye from two photos.

## Facade breakdown

- **Plan**: osm's front is 1.4m too far in and its corner on Hurt Plaza is rough.
  build-campus.mjs redraws it in a frame along Peachtree Center Ave (a toward Decatur St, v in
  from the street) on the lidar's walls. The front of the outline is 0.25m behind the precast
  face so the ground floor's windows and the parking entrance can be set in. The south wall
  is straight over the shops, the west side is the natural science center's east wall and the
  back is osm's edge shared with the Hurt Plaza Garage.
- **Heights**: the roof is 14.7m, the coping on the front 15.2m with a thin dark blue grey
  metal cap. The north end (the wing and back past the bays) is higher, 16.3m, the bays'
  parapets 16.4m, the drum 16.2m and the pylon 17.1m (that's the json's height). Boxes on the
  roof to 18m; the one flush with the front shows over the coping.
- **Peachtree Center Ave**: light grey precast. From the ground up: the parking entrance at the
  north end (dark, yellow steel over it) with the "I Lot / Recital Hall Parking" sign over it,
  two runs of ground floor windows and a dark door, a white band, a ribbon of dark windows on
  the second floor (two runs with plain wall between, a dark mullion about every 1.95m), a
  blank third floor, a dark reveal along the whole front at 7.55-7.85m, then two rows of 14
  punched windows (1.1 by 1.3m, 0.2m deep) on the same columns. A slot with two deep recesses
  over the side door, each with glass at the back and a blue rail across.
- **The corner**: a blank pylon facing the crossing (cream at the bottom, joints every 2.45m,
  the 2018 sign: a grey plate with a blue top edge, a plain blue square where GSU's logo is,
  a red bar, "SCIENCE ANNEX"; "29" on its side toward the street). On each side of it a bay
  with a column of windows two lights wide, louvres under the lower two and over the upper
  two, a louvred screen through the parapet (the sky shows between the slats). The bay on
  Peachtree Center Ave has the main doors under a precast canopy, cream round them. The north
  bay has a glass door behind a planter, under a smaller canopy.
- **The drum**: a round stair between the north bay and the brick wing, white with a dark cap.
  A low concrete planter runs from the pylon to the wing's corner pier in front of it.
- **The brick wing** (Hurt Plaza, from the drum to the garage): a colonnade 4m high and 2m deep
  with cream piers and black fences between them, a precast beam, red brown brick up to a
  precast coping, and glass on its north east corner (most of Hurt Plaza's side and a meter
  round the corner).
- **The south wall**: plain precast, over the one storey shops.
- **Colors**: ratios inside the photos. In the overcast 2013 photo the front's upper wall is
  light and cool (about 200/205/210), the glass nearly black. The game's sky is always clear,
  so I set the glass dark and only a little reflective; in the 2018 photo (the corner in
  shade) the precast reads warm light grey and the cream warmer.

### What I changed from the research notes

- The brick wing. The notes took the brick and colonnade in the 2018 photo for the garage's
  corner tower, but the lidar has the annex's roof at 16.2m right out to Hurt Plaza from the
  drum to the garage, and the camera puts the brick's top corner and its glass on that spot.
  A 2019 Mapillary photo from Hurt Plaza shows the same corner pier, fences and glass. The
  2013 photo has a plain beige wall there instead, so it was redone (or built) between 2013
  and 2018; I drew the newer one. The garage's beige tower rises behind it.
- The drum is the 2013 photo's fit (a round stair standing out from the bay and the wing,
  r 1.35m), not a quarter circle on the lidar's corner: both photos show it as a round tower
  with its outline against what's behind it.
- The canopy on Peachtree Center Ave is at 2.75-3m, over the game's doorway (the lidar has it
  at 2.7m, the notes had 1.9-2.2 from the photo).
- The parking sign is a blade sticking 1.5m out of the front and facing up the street: it
  reads square on in the 2013 photo while the front is at a slant, and it came out skewed on
  the rectified front.
- The outline's front is 0.25m behind the face (the notes had it on the face).

## Not verified

- Nothing of the front newer than the 2018 dashcam. The punched windows' spacing came out 2.81m
  in the north half and 2.61m in the south (lens distortion), so they're good to about 0.3m.
- The brick wing: the piers' spacing, the colonnade's depth, the glass's size and the fence at
  its east end are by eye from two photos on rough cameras. Its west end against the garage
  and the garage's own ground floor (which seems to have the same piers and fences) aren't
  drawn.
- The pylon and the drum to about half a meter. The slot's depth, the ground floor openings
  behind the parked cars, the parking entrance's width and the canopies by eye.
- The back, the side against the natural science center and the north end's roof: no photos.
  The roof boxes are the lidar's, as boxes.
- The north bay's door and the shrubs in the planter (drawn as dark soil) by eye.
- The billboard on the shops' roof (2019) isn't drawn; I don't know if it's still there.

## The ground level

Peachtree Center Ave climbs about 1m along the front: 311.65m at the corner on Hurt Plaza,
312.01m in the middle, 312.61m at the shops. The natural science center next door sits on
315.0m, which would bury the whole parking level, so the annex has its own ground: 312.0m, the
sidewalk in the middle of the front. What it costs: at the corner the building stands 0.35m
too high on the sidewalk (the doors come out 0.35m short of the real head), and the south end
shows 0.6m more wall than real. Hurt Plaza climbs west to about 312.8m, so along the brick
wing the game's ground is up to 0.8m under the real sidewalk.

## The game's door

campus.json had the door on the front about 2m from the corner (on osm's face). It's in the
bay on Peachtree Center Ave now, under the canopy where the real glass doors are: [-165.52,
42.3], facing the street. The gps route from Hurt Park gets there (the navgraph test passes).
It's labs, so furniture.ts gives it a lobby like the natural science center: 16 pieces by the
door.

The planter and the colonnade's piers and fences are collision in game/world.ts
(annexObstacles), so you can't walk into the colonnade or the planter.

## The neighbours

- The shops on the corner of Decatur St (osm way 270880870, building 150) went a meter in and
  out of the annex's new straight south wall. build-campus puts their points within 1.5m of it
  on it (same index, still 4m).
- The Hurt Plaza Garage (osm way 301958709, building 183) was 14m by default. The lidar has its
  deck parapets at 338.0-338.2m, 25m over Hurt Plaza, so build-campus sets 25m by its way id.
  Its corner tower on Hurt Plaza goes to about 31m; that's not drawn (it would need a building
  of its own, and new buildings can't go at the end of the list without moving indexes). In
  the 2013 view it's the beige wall rising to the top of the photo, the game's deck stops
  about 6m lower.
- The natural science center (72) is unchanged: the annex's west side is on its east wall (its
  test still checks that). Its east wall is drawn from 11.2m along the annex, which now ends
  inside the annex (the annex's roof is 14.7m over its own ground); you can't see it.
- 'Science Annex' left MEASURED_HEIGHTS (it was a floor count) and the facades.ts look (it's not
  in the regular buildings mesh any more); geometry.test.ts checks the strip windows on
  Centennial Hall instead.
- Only 78, 150 and 183 changed in campus.json.

## Cost

5 parts (precast, cream, metal, glass, brick), all from the library's families, so no new
shaders and no new textures. The precast is drawn first when you're close. Every part casts
shadows: the glass too, the building is empty inside and has windows on the front, the bays
and the wing's corner, the sun would come through. The colonnade has a ceiling 0.8m over its
soffit inside the wing, for the shadows only (Part 27). The ribbons are one glass quad per
four lights with dark metal mullions in front, so the lights at night vary along them.

About 1.85k triangles: precast 0.93k, metal 0.55k (the fences' bars are most of it), glass
0.28k, cream and brick under 0.1k. The signs are 17 small meshes (the parking sign is 8 of
them).

Level faces get their uv v moved far from 0, like the natural science center: the families
read uv y as the height for the dirt near the ground.

Measured on Oct 20 2026 with the other three buildings of this round (how, and the warm-up
count: courtland-north.md). "before" is 4a15920:

| spot                                           | before | now   | gpu now - before |
| ---------------------------------------------- | ------ | ----- | ---------------- |
| annex street (peachtree center ave, the front) | 10.40  | 10.00 | 0.46             |
| annex door (in front of the doors in the bay)  | 13.10  | 12.90 | -0.22            |
