# Rialto Center for the Arts: references

What I built GSU's Rialto Center for the Arts (80 Forsyth St NW) from. It's on the corner of Forsyth
St and Luckie St in Fairlie-Poplar, outside the walking fence on the west side of Woodruff Park,
between the Haas-Howell Building (on Forsyth St) and the Theatrical Outfit (on Luckie St). GSU
rebuilt the old Rialto Theatre's site as a concert hall and reopened it in 1996. A tall buff brick
box with cream pilasters, a band of panels and a heavy cornice at the top, the art deco blade sign
and the marquee on the corner, storefronts between brick piers on Forsyth St and the lobby's two
floors of glass on Luckie St. Everything here is reference only: no photos are in the repo, the
measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                  | date             | license       | facade                    | used for                                                                                      |
| ----------------------------------------------------------------------- | ---------------- | ------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295238), "20231023MLB"    | 2023-10-23       | GSU           | the corner from Luckie St | the marquee's Luckie St arm (led screen, gsu panels on its front and end), the lobby's glass  |
| GSU campus map photo "20200420_MLB_Atlanta_GSU_Stock_134"               | 2020-04-20       | GSU           | Forsyth St from Luckie St | the blade (blue, white letters, cream fins), the banners on brackets, the pilasters           |
| Commons "Rialto Center for the Arts at Georgia State University..."     | 2019-03-23       | CC0           | the corner                | the corner, blade, marquee and upper box, the lobby's start, brick color in the sun           |
| Commons "Rialto Center for the Arts.jpg"                                | 2016-09-15       | CC BY-SA 4.0  | the blade at night        | the blade's frame and fins                                                                    |
| Commons "Rialto-Center-Atlanta-01.jpg"                                  | 2007-11-20       | public domain | the corner from across    | the massing, the cornice, panels and pilaster heads, the blade's height (fitted on the lidar) |
| GSU campus map photo "20050724_Rialto_Marquee_072" (and Commons "Best") | 2005-07-24 night | GSU           | the corner                | the marquee's two arms and the chamfer, the piers under it, the lobby's two floors            |
| USGS 3DEP lidar (GA statewide 2018)                                     | 2018             | public domain | all                       | the outline check, the roof, the marquee's height and reach on Forsyth St, the ground         |
| OpenStreetMap way of building 76                                        | -                | ODbL          | -                         | the outline (kept, the lidar's walls are within half a meter of it)                           |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295238

- **Newest photos**: October 2023 for the Luckie St side of the marquee, April 2020 for the blade and
  Forsyth St. The 2023 marquee is the same one as in 2019 (led screens, gsu panels), so I take it
  as today's. Nothing I found says the outside changed since.
- **Which side is which**: the banners and the long blank wall are on Forsyth St (the 2020 photo
  looks along it with Luckie St's sign over the crossing, and Haas-Howell, taller and darker, is
  next along), the lobby's glass is on Luckie St. The 2019 Commons photo is from the far side of
  Luckie St; its exif says 11:43 but the Luckie St face (facing north east) is in sun with long
  shadows, so it's early morning (I used 08:40).
- **Rating**: no full camera fit. The 2007 photo's corner was fitted on the lidar's heights (the
  sidewalk, the marquee's top, the roof) for the blade's top and the frieze; the side by side
  cameras are lined up by eye.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Forsyth St sidewalk at the
corner (322.6m).

- Ground: the corner 322.6, Forsyth St climbs to 322.9 at Haas-Howell, Luckie St falls to 321.6 at
  the Theatrical Outfit.
- Outline: osm's five points match the lidar: Forsyth St face 46m, Luckie St face 27.7m, the back
  27.7m from the corner. The top of the Forsyth St wall is 0.4-0.9m behind osm's line, Luckie St's
  right on it. Kept as it is (the Haas-Howell corner is shared).
- Roof: 343.3 on Forsyth St to 343.7 at the back, the edge on Luckie St 344.0: 21.4m with the
  cornice. No fly tower, one flat roof. A small box on the roof against Haas-Howell (345.4, not
  drawn).
- Marquee: its lid is 6.0m up and reaches 13.6m along Forsyth St from the corner and at least 2.8m
  out (lidar). On Luckie St it's under a tree. From the photos: 2.4m tall faces, a stepped box on
  top by the corner to ~8.3m, 3m out.
- Blade: from 3.2m to ~15.3m (2007 photo fitted on the sidewalk, the marquee's top and the roof),
  about 2.6m wide with its fins, the blue 1.6m, the letters ~1.4m tall.
- By eye: the cornice ~1.3m with a smaller band under it, the panel band 18-20.1m, pilasters in 6
  bays on Forsyth St, two on Luckie St, the lobby's glass from ~7.6m along Luckie St to 24.5m, 0.9m
  of dark tiles under it, a transom at ~4.8m and glass to 9m with a soldier course over it.

## What's in the game

- campus/rialto.ts. Outline is osm's, height 21.4, the door moved from the back alley to the
  doors under the marquee on Forsyth St (6.5m from the corner). DATUM 322.6.
- Forsyth St: brick piers 0.3m out of the storefronts' glass (Part 22's rule), service doors past
  them, a band at 6m, the brick wall 0.5m back above it (the lidar), narrow cream pilasters with
  wide heads across the panel band, the cornice. Four banners (music, dance, theater, film) on
  brackets, square to the wall.
- Luckie St: the doors by the corner, a brick pier, the lobby's two floors of glass with mullions
  and a transom on dark tiles, a soldier course, two pilasters, the panel band and cornice.
- The corner: the marquee's two arms with a chamfer between them (taupe reeded panels, light strips
  top and bottom, led screens, gsu panels with the name and a blue square where the logo is), a
  stepped box on top, the blade on the chamfer (taupe frame, cream fins, blue face, white letters
  "RIALTO" as one stacked label) with a pylon back to the building.
- The back over the Theatrical Outfit and the alley: plain brick to a coping. The side against
  Haas-Howell (taller) isn't drawn.
- Sign got an optional `line` (line spacing for letters) so a stack of single letters can sit as
  tight as the real blade's.

## What still differs

- The blade's letters are plain bold sans with no red outline; the real ones are an art deco serif,
  white with a red edge, lit at night (the game's blade isn't lit).
- The marquee's led screens are plain black (they show text and the gsu panels have the logo),
  and its light strips aren't lit at night. The 2023 photo's upper box is slimmer.
- The corner over the marquee: in the 2007 photo the walls meet in a narrow step behind the blade;
  the game has a plain corner with a wide head at the top.
- The trees in front of the lobby and the corner (in every photo) aren't on osm, so they're missing.
  The sidewalk's brick bands and the planter at the corner aren't drawn.
- The ground floor on Forsyth St past the marquee and the back were never seen up close: the
  storefront rhythm there is by eye.
- The 2023 and 2020 side by sides are by eye, the 2023 camera is a few meters off (the photo is a
  wide lens from close to the lobby).

## Cost

5 parts (brick, stone, metal, dark, glass) from the library's families, no new shaders or
textures. About 650 triangles. Glass and the dark bits don't cast; a hidden core keeps a low sun
from going through the lobby. Brick is drawn first when you're close. 9 signs: the blade's plate
and letters, three gsu panels, four banners (one sided).

Measured after the merge.
