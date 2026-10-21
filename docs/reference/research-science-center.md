# Research Science Center: references

What I built the Research Science Center (157 Decatur St, opened 2016, "Science Park Phase
II": labs for molecular and translational medicine, HOK and Holder) from. It's next to Petit,
which it's joined to by the glass bridge, and since September 2026 the Research Tower stands
15m off its back. Everything here is reference only: no photos are in the repo, the
measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                                         | date                                                          | license                  | facade                                                                                        | used for                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 1009999): `IMG_3440`                                             | uploaded 2026-03-24                                           | GSU, all rights reserved | the doors on Decatur St                                                                       | the double doors under a dark transom with "157", the canopy's dark underside and its grey post, the grey block's brick and soldier course, the sign next to the canopy's end. Camera by eye, side by side |
| same, `IMG_3439`                                                                                               | 2026-03-24                                                    | GSU                      | the doors toward the Research Tower                                                           | a storefront with double doors right by a charcoal brick corner, ribbed metal overhead. Camera by eye, side by side                                                                                        |
| GSU campus map, location 1114553 (Research Tower): `IMG_2804`                                                  | 2025-10-03                                                    | GSU                      | the south corner from the Research Tower's site                                               | the charcoal tower with its glass slot and gsu's flame at the top. By eye                                                                                                                                  |
| GSU campus map, location 1009999: `Research_Science_Center`                                                    | about 2023-24 (the tower's site is dirt), uploaded 2025-03-19 | GSU                      | the whole Decatur St face from a parking deck across the street, 17.6m up                     | camera fitted on the lidar (rms 3.7px, wide lens): the masses, the curtain wall, the fins, the recess, the canopy and pergola, the penthouse's louvres, the sign. Side by side and overlay                 |
| same, `Research_Science_Center_3`                                                                              | before 2020, uploaded 2025-03-19                              | GSU                      | the east corner from Decatur St at Jesse Hill Jr Dr                                           | camera fitted (rms 1.5px): the glass box on the corner, the pier, the fins, the charcoal tower's slot and the flame. Side by side and overlay                                                              |
| Epsten Group project page (photos by Brian Gassel): `GSU-Research-Exterior-018`, `-004`                        | about 2017                                                    | reference only           | the back (in full sun, from the old parking lot) and the Decatur St face from the west corner | 018 camera fitted (rms 1.9px): every height on the back, the ribbons, the columns, the box the bridge comes into, the colors in sun. 004 by eye: the grey block, the recess, the fins, where the sign is   |
| Mapillary 782971989070408 (atze02)                                                                             | 2020-08-29                                                    | CC BY-SA 4.0             | the east corner from across Jesse Hill Jr Dr                                                  | tan brick under the corner box, the louvres along its bottom, the pergola. By eye                                                                                                                          |
| Mapillary 1209434516163454, 747153175977314, 171451738234011, 475585967041025, 209113671020921 (deirdreedsign) | 2019-12-12                                                    | CC BY-SA 4.0             | Decatur St, the Jesse Hill Jr Dr side                                                         | the ground floor set back under the fins, glass by the recess and tan brick on to the corner box, the pergola's posts, the charcoal tower down to the sidewalk. By eye                                     |
| USGS 3DEP lidar (GA statewide 2018)                                                                            | 2018                                                          | public domain            | all                                                                                           | every height and wall, the canopy and pergola, the penthouse, the yard of fans, the box and the bridge, the ground                                                                                         |
| Esri World Imagery Wayback, release 26334                                                                      | 2026-02-02                                                    | Esri, reference only     | roof                                                                                          | the same roof as the lidar, the strip toward the Research Tower still a building site                                                                                                                      |
| OpenStreetMap ways 630328387, 802046231                                                                        | -                                                             | ODbL                     | -                                                                                             | the old outline, the bridge                                                                                                                                                                                |
| Epsten Group, gsfic 2017 Peach awards, GSU history                                                             | -                                                             | text                     | -                                                                                             | the date, the size, the floors                                                                                                                                                                             |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/1009999 and #!m/1114553):

- https://assets.concept3d.com/assets/1108/IMG_3440_69c2faf0cb709.jpg
- https://assets.concept3d.com/assets/1108/IMG_3439_69c2fb01c6752.jpg
- https://assets.concept3d.com/assets/1108/Research_Science_Center_67dae19a12c88.jpg
- https://assets.concept3d.com/assets/1108/Research_Science_Center_3_67dae19b9a99c.jpg
- https://assets.concept3d.com/assets/1108/IMG_2804_68e00e6052c77.jpg
- Epsten: https://epstengroup.com/?p=3123

- **Newest photos**: 2026 (both doors), 2025 (the south corner), about 2023-24 (the whole front).
  The 2026 photos look like the 2016-2019 ones except the doors toward the Research Tower, and
  Esri's 2026 roof is the 2018 lidar's.
- **Rating**: three fitted cameras (the back in sun, the east corner, the front from above), the
  2026 doors by eye.

## Facade breakdown

All in a frame along Decatur St: u toward Jesse Hill Jr Dr, v in toward the Research Tower,
from an osm node on the front. Heights are over 306.5m (see the ground level).

- **Plan**: osm's outline is the right idea but the Petit end is 0.8m too far out, the Jesse
  Hill Jr Dr side 2m short and the recess drawn 5.9m deep (it's 2.7). build-campus.mjs redraws
  it on the lidar's walls as the ground floor: the floors over it overhang Decatur St by 2.7m
  from 5m up and the back by 3m from 5.65m up, on columns.
- **Heights**: the slabs are 4.65m apart (6.3, 11, 15.6, 20.3), the roof 24.9 and the coping
  25.85. The grey block goes to 31.2, the penthouse to 32.7 and the charcoal tower to 32.75
  (the json's height).
- **Decatur St, west to east**: the grey block (no windows, joints at the slabs, a soldier
  course at the bottom, the sign), the recess with glass the whole way up, a sunshade across
  it at 10.75m and a metal box set back over the top, then the main box: curtain wall from 11m
  to the coping, the second floor's glass behind a band of aluminium fins (0.5m deep, every
  0.6m), and the ground floor 2.7m in under a soffit at 5m (storefront from the recess to 15m,
  tan brick on to the corner). A light pier, a dark slot, then the glass box on the corner
  (glass on both faces from 4.95m, louvres under it, tan brick set in under that).
- **The doors**: double glass doors under a dark transom with "157", storefront round them,
  a dark canopy 7m deep at 3.85-4.05m on two thin grey posts, light on top. The sign is on
  the grey block right past the canopy's end, 3.2m up: a white plate, a blue square where
  gsu's logo is, a red bar.
- **The pergola**: dark steel beams across from the curb side to the building every 2.45m at
  4m, a beam along the curb side, posts every other beam (u 3.5-33, lidar).
- **Jesse Hill Jr Dr**: the corner box's glass, then the charcoal tower down to the sidewalk
  with a glass slot (one light a floor, 4.9-26.7m) and the flame at the top (a blue square,
  2.6 x 2.9m).
- **Toward the Research Tower**: tan brick from 5.65m to the coping on six round columns, joints
  at the ribbons' sills. A grey brick panel set 0.3m in with three ribbon windows, each with a
  light shelf across it. A dark stair slot next to the charcoal tower. Under the soffit dark
  brick (2017) and, by the tower, the second doors in a storefront (2026). The stair core is a
  dark slot under the box.
- **The box at the back**: glass all round from 18.6 to 26m over a metal fascia, on two square
  columns (one under Petit's bridge). Petit's bridge comes in along the grey block's back
  into the box's Petit end.
- **Roof**: a silver metal penthouse with ribs across and a band of louvres on Decatur St, a
  lower metal box over the recess, a yard of fans behind it and a ribbed screen along the back,
  metal caps on every parapet.
- **Colors**: ratios inside the 018 photo (full sun): the grey block's brick is about 0.75 of
  the tan, the charcoal tower about 0.7, the ribbon panel 0.9, the columns about the tan. In
  the shade both greys are dark in every photo (2026, the front from above), so the grey is a
  bit darker than the sunny ratio says. The canopy's underside is nearly black.

### What I changed from the research notes

- The door is the middle of the real doors (u -2.7), not 2.4m from the recess's corner.
- The canopy goes out to 7m from the doors (v -4.6), not 2.2: the parking deck photo and the
  2026 door photo both have it and its posts that far out. The lidar only has its inner half,
  maybe its outer part is glass (it's light and in panels from above).
- The sign is 3.2m up, just under the canopy's level (004, the 2026 photo and the overlay all
  have it there), not 1.5-2.5m.
- The tan brick on the ground floor starts 14m past the recess (u 15, the parking deck photo
  and the 2019 Mapillary photos).
- The doors toward the Research Tower: in a storefront right by the charcoal tower's corner,
  where the 2017 photo has dark brick (the courtyard was a parking lot then).
- The ground floor behind the columns is dark brick, not storefront glass (the 2017 photo).

## Not verified

- The doors toward the Research Tower are placed by eye from one 2026 photo; the rest of that
  ground floor is from 2017 and may have changed with the tower's courtyard.
- The canopy's outer half and its posts: two photos and no lidar. Its top is drawn flat, it's
  a row of tilted panels for real.
- The grey block's Petit side and the charcoal tower's back: no photo straight on.
- The fins' spacing and depth, the mullions (about 1.2m) and the spandrels (not drawn, the
  glass is the same all the way up).
- The penthouse's back screen and the fans: lidar and the top edge of one photo.
- The grey brick: light in full sun (2017), dark in every shade photo. The 2026 photos' colors
  are a phone's in the shade.
- Light shelves, the louvres and the small door on the box over the recess are flat.

## The ground level

The ground is 306.5m by Petit and the bridge, 306.65-306.7m at the doors and 307-307.2m at the
east and south corners. I used Petit's 306.5m so Petit's bridge (20.5-25.8m over it) meets the
box at the same numbers. What it costs: the doors sit about 0.2m high, and at the east and
south corners there's about 0.6m more ground floor than real (the soffit over Decatur St is 5m
over 306.5m, so 4.4m over the sidewalk at the corner).

## The game's door

campus.json had it on the charcoal tower's blank brick, inside the new outline. It's in the
real double doors in the recess now: [56.89, 372.68], facing Decatur St. The gps route from
Hurt Park gets there (the navgraph test passes). It's a lab building, so furniture.ts gives it
a lobby by the door like the Natural Science Center (seats and plants within 16m) instead of a
floor of study tables behind the storefront: 17 pieces instead of 62.

The columns at the back, the two under the box and the posts of the canopy and the pergola are
collision (game/world.ts, rscObstacles). osm's Jesse Hill Jr Dr sidewalk runs 0.4-1.1m outside
the charcoal tower, its strip overlaps the wall by up to 0.85m; the path itself is outside.

## Petit's bridge

Petit draws the bridge (building 239, 20.5-25.8m) from osm's outline. Two of its walls are on
this building's: its side along the grey block's back and its end against the box. The grey
block's back and the box's Petit side have holes there instead (petitScience.ts exports the
bridge's heights for that), so there's one wall in each place and the bridge ends in the box.
A test checks nothing of this building is on the bridge's walls between its floor and roof.
The bridge's piece past the grey block's corner (0.86m) is Petit's and stays.

## Cost

6 parts (tan, grey, charcoal, glass, metal, clear), all from the library's families, so no new
shaders and no new textures. About 1.7k triangles: metal 0.8k (the 46 fins are most of it),
glass 0.6k, tan 0.2k, the rest under 0.1k. The three bricks are drawn first when you're close.
Everything casts: the building is empty inside and has glass on both sides. The soffits over
Decatur St and the back, the corner box's and the box's have a ceiling 0.8m up inside for the
shadows only (Part 27), the canopy has one inside it, and there's one inside Petit's bridge over
the column under it.

A few tricks to stay at six parts:

- The canopy's underside, the pergola, the louvres and the transom over the doors are glass
  quads that are all frame (the dark mullion color), like the Natural Science Center's gate.
  The brick stretched flat came out light grey under the canopy, where it's nearly black.
- The soffits, posts and columns are brick with their uvs stretched so far the texture is just
  its average.
- The storefronts at the back and the stair slots are clear glass over a dark back. Window
  glass reflected the bright sky there, the photos have them black in the deep shade.
- The penthouse's ribs run across: the metal's ribs follow its uvs, turned.

Measured on Oct 20 2026 with the other three buildings of this round (how, and the warm-up
count: courtland-north.md). "before" is 4a15920:

| spot                                             | before | now   | gpu now - before |
| ------------------------------------------------ | ------ | ----- | ---------------- |
| rsc street (decatur st, looking along the front) | 11.65  | 11.30 | -0.18            |
| rsc door (in front of the doors in the recess)   | 12.70  | 12.80 | -0.03            |

A 2 minute walk (pnpm walk, hurt park to petit past this building) on the prod build: 0
spikes, 1% and 0.1% low 16.8 ms (vsync), the worst frame 16.8 ms.
