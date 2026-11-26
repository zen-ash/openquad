# Research Tower: references

What I built the Research Tower from (153 Decatur St, 9 storeys of labs, HOK, opened Sept 22
2026). It stands between Petit, the Research Science Center and the railroad, with its south
east side on Jesse Hill Jr Dr. It was first drawn in September 2026 from two photos of the side
toward the Research Science Center; this round redid the other sides. Everything here is
reference only: no photos are in the repo, the measurements are my own. Photos I downloaded are
kept outside the repo.

## Sources

Newest first.

| source                                                                      | date                    | license                  | facade                                          | used for                                                                                                                                                          |
| --------------------------------------------------------------------------- | ----------------------- | ------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GSU news, `20260409MLB_GSU_Stock_0033`                                      | 2026-04-09              | GSU, all rights reserved | north east, from the courtyard under the bridge | the glass band and slots (the first round), side by side                                                                                                          |
| GSU, via Urbanize Atlanta (Sept 2026), "under construction next to Petit"   | early 2026 (bare trees) | GSU                      | south east, from across Jesse Hill Jr Dr, high  | the glass v round the east corner, the slots, the storefront, the panels' color. By eye                                                                           |
| GSU campus map, location 1114553: `IMG_2804`, `IMG_2805`                    | uploaded 2025-10-03     | GSU                      | the south corner from Jesse Hill Jr Dr          | the south west side's grid of windows, the brick base, the solid strip by the corner, no brick on the south east end. Camera by angles (`IMG_2805`), side by side |
| same, `GSU_RT_V01_3` (HOK rendering, Aug 2024)                              | 2024-08-22              | GSU                      | south east                                      | camera fitted on the corners: the v's slant and top, the slots, the storefront, the sign                                                                          |
| same, `GSU-RT_Main-Entry-courtyard-HOK` (rendering)                         | uploaded 2025-10-02     | GSU                      | north east                                      | slots 2.86m apart (a 1d perspective fit, 0.9px rms): where the glass, the slots, the canopy and the fins are along the side                                       |
| Esri World Imagery Wayback 63116 / 26334 (zoom 19, zoom 20 tiles are older) | 2026                    | Esri, reference only     | roof                                            | the outline still matches the roof                                                                                                                                |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/1114553):

- https://assets.concept3d.com/assets/1108/IMG_2805_68e00e39e202b.jpg
- https://assets.concept3d.com/assets/1108/IMG_2804_68e00e6052c77.jpg
- https://assets.concept3d.com/assets/1108/GSU_RT_V01_3_22.08.2024-cropped_68e973f75fbee.jpg
- https://assets.concept3d.com/assets/1108/GSU-RT_Main-Entry-courtyard-HOK-1000_68dee38e5b2c2.jpg

- **Newest photos**: the April 2026 GSU photo (north east side, finished) and the early 2026
  one from across Jesse Hill Jr Dr (south east side, cladding done, the yard still a building
  site). The south west side only has the October 2025 construction photo: windows in, the
  cladding not finished.
- **Rating**: the south east side is a camera fit on the 2024 rendering, checked by eye against
  the early 2026 photo. The north east side's positions along the wall are a fit on the
  courtyard rendering, its heights assume the parapet at 37.5m. The south west side is by eye
  from one photo at a grazing angle.

## Facade breakdown

"s" is meters from the south corner, "u" meters along a side from its first corner going round
the outline (west, north, east, south). Heights are over the door's floor.

- **The glass v**: both sides of the east corner have a sheet of glass whose bottom edge slants
  up away from the corner, from 11.5m at the corner. Its top is 31.3m at the corner.
  - Jesse Hill Jr Dr side: the slant goes up at about 42 degrees to 25.1m at s 12.4, then one
    floor of glass carries on to s 8.6; the top slants down a little that way (28m there).
  - The side toward the Research Science Center: the slant is shallower (to 26.8m at u 14.1
    from the north corner), the top steps up to 34.6m over u 14.1-20.9.
- **Slots**: tall thin windows under each slant. Jesse Hill Jr Dr: s 9, 11.9, 14.7, 18, 21.2,
  from 10m up to 23.4, 23.8, 20.3, 16.7, 12.9. Courtyard side: every 2.86m from u 14.5 to the
  corner, 1.1m under the slant; two tall ones near the north corner (u 1.8 and 7.8).
- **Ground floor**: Jesse Hill Jr Dr has two storeys of storefront (to 9.3m) from s 8.6 to the
  corner; the courtyard side has the same behind bronze fins from u 31 to the east corner, then
  one storey of glass under a long canopy (u 11.2-29.4) and light ribbed metal by the north
  corner. The south west side has a tan brick base (4.5m) with two doors, then a solid floor.
- **South west side**: a solid strip 9-10m wide by the south corner, then a grid of 12 columns of
  narrow windows (1 x 2.9m, every 3.6m) on the seven floors over the brick.
- **Sign**: gsu's sign is at the top of the solid end on Jesse Hill Jr Dr (s 3.5, about 35m up);
  it's a plain blue square in the game (no logo).

## What's in the game

- campus/researchTower.ts: the outline is still the one traced in September (NEW_BUILDINGS in
  build-campus.mjs), height 42 (37.5 to the parapet and the screen over it). The glass v is two
  flat glass shapes 5cm in front of the panels (onFace: a polygon on a wall with uvs and aPane
  from its corner, so the glass family draws its mullions) with light trim strips along their
  slanted edges. The slots, windows and storefronts are real holes in the walls.
- campus.json didn't change.

## What still differs

- The main doors are on the courtyard side under the long canopy (hok's rendering and the
  opening photos), but the game's walk-in door is still on the side facing Petit, with glass and
  the name there; that side is really light ribbed metal top to bottom. Moving the door needs a
  path into the courtyard for the GPS (no osm footway there), so I left it.
- The panels are the old flat metal panels. The real ones are a dark grey with a brick-like
  texture (the renderings make them charcoal, the photos medium grey).
- The south west side is from a construction photo; the finished cladding, the window frames
  and the top floor there aren't checked. The heights of its rows come from the same 3.9m floors
  as the rest, not from a fit.
- The screen around the top is one band all round. The renderings have it stepped (taller over
  the north half) and a light ribbed column over the south corner.
- The glass on Jesse Hill Jr Dr follows the 2024 rendering; the early 2026 photo agrees by eye
  but wasn't fitted (it's from high up, and the game's parking deck there is in the way).
- The heights rest on the json's 37.5m parapet: the two renderings agree with each other on that
  scale (the v's corner 11.3-11.6 to 31.1-31.6), but nothing measured the building itself (it's
  newer than the lidar).

## Cost

8 parts (panels, glass, blueGlass, screen, ribbed, metal, brick, roof): one more than before,
the brick (the brick family, no new shader). About 2.1k triangles, one more sign (the blue
square). Draws a frame (counts.mjs, before -> after): a spot on Jesse Hill Jr Dr 364 -> 378,
rsc-street 371 -> 386, quad 457 -> 469. Frame time measured after the merge.
