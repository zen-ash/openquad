# Arts & Humanities: references

What I drew the Peachtree Center Ave side of Arts & Humanities from (10 Peachtree Center Ave,
the white marble building with the Florence Kopleff Recital Hall at the Gilmer St corner). The
rest of the building is still the September 2026 version (gsu's event photos and one 2013 photo
on Commons). GSU's addition on the quad side starts in June 2027, so this is the building as it
is now. Everything here is reference only: no photos are in the repo, the measurements are my
own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                                             | date                | license                  | facade                                                    | used for                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------- | ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GSU campus map, location 1098661 (Florence Kopleff Recital Hall): `IMG_2815`, `IMG_2816`           | uploaded 2025-10-06 | GSU, all rights reserved | Peachtree Center Ave by the Gilmer St corner              | the banners, the wide dark window between them, the "ARTS & HUMANITIES / RECITAL HALL" plate, the marble. By eye, side by side                                                              |
| GSU campus map, location 295210: `Image_34` (a recessed side door), `20220420MLB_campus_stock_247` | 2022, 2026-03       | GSU                      | a side door; the corner with banners                      | looked at, not placed or fitted                                                                                                                                                             |
| Mapillary 3880607562058560, 4021622224572403, 2936418979962644 (deirdreedsign)                     | 2019-12-16 and -19  | CC BY-SA 4.0             | Peachtree Center Ave, looking north east along the street | the narrow windows set deep in the marble, every other column half a floor up, the dark openings along the sidewalk. Same pose in the game (Mapillary's position and heading), side by side |
| Mapillary 2022 (SydneyIStroud) at Edgewood / Peachtree Center                                      | 2022-09             | CC BY-SA 4.0             | -                                                         | none of them look at the building                                                                                                                                                           |

GSU links: https://assets.concept3d.com/assets/1108/IMG_2815_68e3f86e6f74a.jpeg and
https://assets.concept3d.com/assets/1108/IMG_2816_68e3f86e71a86.jpeg

- **Newest photos**: GSU's October 2025 pair, by the corner only. For the length of the side the
  newest are Mapillary's December 2019 photos. GSU's 2026 renderings (location 1115725) are the
  2027 addition, not used.
- **What changed from the old version**: the side didn't have three long bands of windows (that
  was a misread of the 2013 photo). It has a staggered grid of narrow windows, and the banners
  and the plate are on this side, not on the quad side.
- **Rating**: by eye on Mapillary's poses and one GSU photo, no camera fit.

## Facade breakdown

- Narrow windows 0.75 x 2.2m in 0.45m deep reveals, columns every 3m, rows every 3.2m from 4.8m
  up, every other column 1.6m higher. They stop 31m in from the long south west side.
- Dark openings 1.6m wide, 0.4-3m up, every 4.5m along the sidewalk.
- By the corner (the last ~9m): a banner 1.5m from the end, a dark three pane window (3.2 x 1.7m,
  6.3-8m up, dark frames), another banner past it, the plate under the window at 2.9m.

## What still differs

- The entrance at the corner: GSU's photo shows a separate lower block with the glass doors set
  back under the canopy and a big "GEORGIA STATE UNIVERSITY / SCHOOL OF MUSIC · RECITAL HALL"
  sign on it facing Peachtree Center. The game's corner is the old outline with the canopy and no
  such sign (I couldn't tell from one photo where the block's faces are).
- The window grid is by eye: the photos are at a grazing angle, so the column spacing and the
  number of rows are close, not measured. The real panels are bigger squares on this side.
- Only two banners; GSU's 2022 photo shows four in a row (I couldn't place which wall it is).

## Cost

Same 9 parts as before, no new shaders. About 1.8k triangles, one more sign (the plate). Draws
a frame on Peachtree Center Ave (counts.mjs) 314 -> 308, within the run to run spread of the
shadow cascades. Frame time measured after the merge.
