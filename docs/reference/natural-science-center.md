# Natural Science Center: references

What I built the Natural Science Center (50 Decatur St, about 1993: chemistry and physics labs,
classrooms, the instrument shop) from. Everything here is reference only: no photos are in the
repo, the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                             | date                      | license                  | facade                                                                   | used for                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | ------------------------- | ------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esri World Imagery Wayback, release 26334 (zoom 19 and 20)         | 2026-08-05                | Esri, reference only     | roof                                                                     | checking the outline against the lidar, the roof is the same as in 2018                                                                                                                                                                                                                                   |
| GSU campus map (Concept3D, map 1108, location 1135375): `Image_18` | uploaded 2026-03-16       | GSU, all rights reserved | the main entrance                                                        | the three glass doors and sidelite in the recess under a precast soffit, the transom row, the plate sign, the exposed aggregate base on the piers. Camera by eye                                                                                                                                          |
| same map, `20200622_MLB_Research_Stock_001`                        | 2020-06-22, early morning | GSU                      | the whole Decatur St face, from about 19m up across the street, in shade | camera fitted on 13 lidar parapet points (rms 7.5px, probably a stitched pano so only good to about 1m): the bays, all three pylons, the ribbons, the ground floor windows and planters in bay B, the stacks. Side by side and overlay                                                                    |
| same map, `20200622_MLB_Research_Stock_017`                        | 2020-06-22                | GSU                      | the east half from the entrance, very wide lens                          | the entrance pylon's glass and the recessed panel over it, "50" on the pier, the planter along bay C. Not fitted                                                                                                                                                                                          |
| Mapillary 699037638500411 (networklanman, motorcycle camera)       | 2021-01-19 13:30          | CC BY-SA 4.0             | the entrance, the end bay with the sign, the shops on the corner         | the shops are one storey, the dark storefront in the recess. Camera by eye (strong barrel distortion)                                                                                                                                                                                                     |
| Mapillary 2558662824442969 (deirdreedsign)                         | 2019-12-16 15:57          | CC BY-SA 4.0             | the west end bay, bay A and pylon P1, overcast                           | camera fitted on the lidar (rms 3.9px on 4032): every height on the front, the slot window's transoms, the ground floor brick and windows running on under P1, P1 starting 4.45m up on a block, the recessed panel over P1's glass, the grey cap round the parapets, the colors. Side by side and overlay |
| Mapillary 371888917556101 (deirdreedsign)                          | 2019-12-16 15:56          | CC BY-SA 4.0             | the east face over the shops                                             | the precast corner with its glass slot, the brick bay with ribbons and the band over it. Camera by eye                                                                                                                                                                                                    |
| GSU campus map, location 900568 (the dock): `NSC_and_Annex_Dock`   | uploaded 2024-04-16       | GSU                      | the west alley                                                           | dark brick, the dock under its canopy. By eye                                                                                                                                                                                                                                                             |
| USGS 3DEP lidar (GA statewide 2018)                                | 2018                      | public domain            | all                                                                      | every height, the walls, the parapet profiles, the top floor, the wing and the tall bit on the alley, the dock canopy, the roof units, the neighbours' heights, the ground                                                                                                                                |
| USGS EPQS                                                          | -                         | public domain            | -                                                                        | the ground along the front                                                                                                                                                                                                                                                                                |
| OpenStreetMap way 252608892                                        | -                         | ODbL                     | -                                                                        | the old outline (right shape, wrong in the details)                                                                                                                                                                                                                                                       |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/1135375 and #!m/900568):

- https://assets.concept3d.com/assets/1108/Image_18__69b87240d8677.jpeg
- https://assets.concept3d.com/assets/1108/20200622_MLB_Research_Stock_001_6670accc2b60a.jpg
- https://assets.concept3d.com/assets/1108/20200622_MLB_Research_Stock_017_6670accb294c0.jpg
- https://assets.concept3d.com/assets/1108/NSC_and_Annex_Dock_661ee60002f81.jpeg

- **Newest photos**: 2026 (the entrance), 2021 (the entrance end), 2020 (the whole front), 2019
  (the west end, the east face). Esri's 2026 image has the same roof as the 2018 lidar and I
  found nothing about it changing outside.
- **Rating**: one tight camera fit (2019, the west half of the front), one loose one (2020, the
  whole front), the rest by eye.

## Facade breakdown

- **Plan**: osm's outline has the right shape, but its front is 1.2m in, it has bumps for piers
  that aren't there, the east wall is 0.9m in and the wing on the alley is wrong. build-campus.mjs
  redraws it in a frame along Decatur St (u toward Peachtree Center Ave, v in from Decatur St)
  on the lidar's walls. The outline's front is the brick; the precast frame stands 0.25m in
  front of it (the coping's edge in the lidar). A notch in the outline is the recess with the
  doors.
- **Heights**: the coping is 21.85m, the roof behind it 21m. A top floor is set back 13.7m
  from the front, flush with the west wall, to 26.5m (that's the json's height). The units on it
  go to 30m.
- **Decatur St, west to east**: a precast end bay with one tall slot window (5.05-18.9m, two
  lights a floor), then three brick bays between three pylons, the precast band over all of them
  from 17.8m to the coping, and a plain precast end bay with the sign. Each brick bay has three
  ribbon windows (6.6-8.3, 11.6-13.2, 16.6-17.8m) with a narrow light at each end and a mullion
  every 1.05m. The ground floor is one brick band from the west end bay to the entrance pylon,
  with small windows about every 2m, over an exposed aggregate plinth (1.48m, 1.1m by the doors).
- **The pylons**: P1 and P2 start 4.45m up on a block over the ground floor's brick. Their glass
  is two wide lights with a narrow one between, transoms on the slot window's rows, set 0.2m in;
  the recess goes on up as a plain panel to 20.85m. Over the coping each has a thin parapet
  1.5m deep with chamfered corners and shoulders (lidar profiles). P2 only has a shoulder on its
  east side. P3, over the doors, is the tallest (25.05m) and goes down to the ground. A grey cap
  about 0.18m deep runs along the coping and round every parapet.
- **The entrance**: a recess 4.05m wide and 1.3m deep under a precast soffit at 3.6m, the
  storefront at the back (clear glass to 3.3m, a transom over it), "50" on the left pier, the
  white plate sign on the end bay with a plain blue square where GSU's logo is and the red bar.
- **The east wall**: shows over the shops and the annex. A precast corner with a glass slot and
  a parapet (P4, lidar), then a brick bay with the same ribbons under the precast band.
- **The alley (west)**: dark brick under a precast band, a wing and a tall bit by the dock, the
  dock's steel canopy (5.15-5.6m) and the black gate across the alley at Decatur St.
- **Roof**: a light grey membrane, boxes where the lidar has them, six stacks with hoods (their
  tops from the 2019 and 2020 photos; the lidar misses most of them).
- **Planters**: low concrete planters (1.1m) in front of the three brick bays.
- **Colors**: ratios inside the photos. The brick is 0.53 of the precast overcast and 0.49 in
  shade; the game in shade gives 0.48-0.49. The plinth 0.69-0.72, the game 0.69. The glass
  reflects the sky: grey in the overcast photo, blue in the game's clear sky.

### What I changed from the research notes

- The ground floor brick runs on under P1 and P2 (with windows under them). The notes had the
  pylons going down to the plinth; the 2019 photo shows them starting on a block at 4.45m.
- The slot window goes down to 5.05m, not 5.8m (measured again on the fitted camera).
- The pylons' glass is in a recess that goes on up as a plain panel to 20.85m.
- The ribbons' top row is right under the precast band, so the band starts at 17.8m, not 18m.
- The outline's front is the brick (0.25m behind the coping's edge) so the interiors' walls
  aren't in front of anything set back (Part 22).

## Not verified

- Only the west half of the front has a tight camera fit. Bay B, P2, bay C and P3 come from the
  lidar's parapets and the 2020 pano (about 1m). P2 and P3's glass widths are scaled from it.
- The ground floor windows past P2 are by eye (trees in every photo).
- The entrance: the recess depth, the soffit height and the doors by eye from a small 2026 phone
  photo. The game's door is one 2.4m doorway where the real one is three doors and a sidelite.
- The east wall: one photo whose top is cut off, by eye. The upper part of the west wall, the
  wing and the top floor's faces: no photos, drawn plain.
- The stacks' positions are rough (two photos and some lidar points), the roof units are boxes.
- The parapets' slopes and sills are drawn flat (the sill under P1's glass is sloped for real).
- Ten Park Place next door is the json's 14m generic box, the lidar has it about 25m. It hides
  most of the alley side for real.

## The ground level

Decatur St falls about 1.1m along the front: 315.47m at the west corner, 314.43m at the doors,
314.34m at the east corner. The game is flat, so I picked 315.0m (the sidewalk in the middle, the
fitted 2019 camera's ground) as the game's ground. What it costs: the west end shows 0.47m more
plinth than real, at the doors the building sits 0.57m too high on the sidewalk (the doors are
drawn from the game's ground, so they come out 0.57m short of the real head), and the east end
shows 0.66m less wall. The alley climbs to 317.2m at the back, so the dock canopy is drawn 5.2m
over the game's ground (about 3m over the real alley there).

## The game's door

campus.json had the door on the west end bay, a blank precast wall in every photo. It's at the
back of the recess under P3 now (the real main doors): [-240.83, 83.63], facing Decatur St. The
gps route from Hurt Park gets there along Decatur St (the navgraph test passes). Since it's a lab
building with a small lobby, furniture.ts treats it like the gyms: 20 pieces (armchairs, coffee
tables, plants) within 16m of the door instead of 338 across the whole floor, and the storefront
is only 4m wide.

The planters and the alley gate are collision in game/world.ts (nscObstacles). osm's sidewalk
on this side runs right along the face, over the planters (the real curb is further out than
the game's road edge), so the planters stand on its line; you walk round them.

## The neighbours

- The shops on the corner of Peachtree Center Ave (osm way 270880870, no name, building 150)
  were 14m by default and hid the east wall and the entrance end. The lidar has their roof 4m
  over the sidewalk; build-campus.mjs sets that. The json's facade on them is still the generic
  one (the real ones are dark storefronts with a sign band and awnings).
- The shops and the Science Annex (78) both reached 1.3m into the new east wall. build-campus
  cuts them back to it (same indexes). The NSC draws its east wall from just under the shops'
  roof (3.6m) and from 11.2m along the annex (the annex's real low part is 11.8m, the json has
  the whole annex at 18m), and its inside walls along them are 5cm in.
- The back is against the Hurt Plaza Garage, with a 0.4-2m gap between the two outlines.
- Only 72, 78 and 150 changed in campus.json.

## Cost

6 parts (precast, brick, base, glass, metal, clear), all from the library's families, so no new
shaders and no new textures. The precast and the brick are drawn first when you're close. The
glass casts shadows: the building is empty inside and has windows on two sides, the sun would
come through both rows otherwise. Only the base (the plinth) doesn't cast. The entrance soffit
has a ceiling 0.8m up inside the pylon for the shadows only (Part 27); the dock canopy doesn't
need one (nothing stands right at its edge). The ribbons are one glass quad per four lights, so
the lights at night and the tint vary along them.

About 2.4k triangles: metal 0.9k (the six stacks are most of it), glass 0.6k (the gate's bars
are 0.2k of it, they're all frame in the glass shader), brick 0.55k, precast 0.35k, the rest
under 0.1k.

Level horizontal faces get their uv v moved far from 0: the families read uv y as the height for
the dirt near the ground, and v here is about -200, which made the roof, the soffit and the
planters' tops black.

Measured on Oct 6 2026: prod builds in one browser, taking turns, 4 min preheat, 2 rounds thrown
away and the median of 4 (1280x800@2, the game look, the buildings are the same in both).
"before" is the build just before this (275ef01). The warm-up builds 798 shaders and 700
pipelines before and after. The laptop was on battery for this run, so even spots nowhere near
it moved by up to 0.5 ms of gpu either way; the numbers below are inside that:

| spot                                       | before | now   | gpu now - before |
| ------------------------------------------ | ------ | ----- | ---------------- |
| nsc street (decatur st at park place)      | 10.88  | 11.28 | 0.51             |
| nsc door (in front of the entrance recess) | 13.45  | 13.45 | 0.36             |

The building's own walls are flat brick and precast with six parts; the labs only get a lobby
of furniture by the door (furniture.ts), so the glass doors don't show a hall of tables.
