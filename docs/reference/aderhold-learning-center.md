# Helen M. Aderhold Learning Center: references

What I built GSU's Helen M. Aderhold Learning Center (60 Luckie St, opened 2002) from. It's GSU's
big classroom building on the whole block between Luckie St, Forsyth St, Poplar St and the little
plaza at Peachtree St, just west of Woodruff Park and outside the walking fence. It was built new
on a block of old buildings that were torn down for it (there was a fight about that in 1997). Buff
brick with cast stone at the bottom, two tall floors of windows under metal eyebrows over a tall
ground floor: an arcade along Luckie St (the streetcar street) and shops on the plaza side. A glass
bay on the corner at Peachtree, a roof terrace behind the parapet with a grey pergola all round on
brick posts, and a dark brown fifth floor set back behind the terrace. Everything here is
reference only: no photos are in the repo, the measurements are my own. Photos I downloaded are
kept outside the repo.

## Sources

Newest first.

| source                                                            | date               | license              | facade                           | used for                                                                                       |
| ----------------------------------------------------------------- | ------------------ | -------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295221), two photos | 2026-03 (uploaded) | GSU                  | the doors, the lobby             | the storefront frames (dark grey aluminium), the cast stone blocks next to the doors           |
| GSU campus map photo "20231023MLB_Fall_Stock_0047"                | 2023-10-23         | GSU                  | Luckie St from Peachtree         | the arcade: piers with stepped cast stone feet, eyebrows, the stone back wall with storefronts |
| Mapillary (SydneyIStroud) round the block                         | 2022-09-01 to 13   | CC BY-SA 4.0         | Luckie St, the corner, Poplar St | by eye: the corner bay, the window rows, the pergola from the street, Poplar St's ground floor |
| GSU campus map photo "20210112_MLB_Back_To_School_167"            | 2021-01-12         | GSU                  | the corner from 55 Park Place    | the whole massing: rows, columns, slot, bay, terrace, pergola, fifth floor, the name, colors   |
| GSU campus map photo "20200420_MLB_Atlanta_GSU_Stock_140"         | 2020-04-20         | GSU                  | the corner bay from below        | the bay's grey bands and glass, the pergola's beams out past the brick                         |
| USGS 3DEP lidar (GA statewide 2018)                               | 2018               | public domain        | all                              | the outline, every height, the terrace, the pergola's reach, the ground                        |
| Esri World Imagery Wayback, release 3692                          | 2026               | Esri, reference only | roof                             | the pergola round the edge, the blocks on the roof                                             |
| OpenStreetMap way of building 63                                  | -                  | ODbL                 | -                                | the old outline (about 1m in all round)                                                        |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295221

- **Newest photos**: March 2026 for the doors (close up), October 2023 for Luckie St. The newest
  photo of the whole building is GSU's January 2021 one from above Woodruff Park. Nothing I found
  says the outside changed since it opened.
- **Rating**: no fitted camera. The 2021 photo's camera is in 55 Park Place (the only tower in that
  direction); cameras for the side by sides were lined up by eye. Heights and the outline are
  lidar, the columns and rows are counted on the photos.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Luckie St sidewalk (322.6m).

- Ground: Luckie St 322.5-322.7, Forsyth St 322.6-323.0, Poplar St 323.0 at Forsyth falling to
  321.4 at the plaza, the plaza side 322.0 at the corner bay falling to 321.0 at Poplar St.
- Outline: a rectangle turned ~49 degrees, the brick 54m along Luckie St and Poplar St and 60.6m
  along Forsyth St and the plaza side, 2.3m cuts on all four corners (the innermost ground points
  round the walls). The game's outline is the ground floor's glass: the back of the arcade 3m in
  on Luckie St, 0.3m behind the brick elsewhere.
- Terrace 337.5 (14.9), the pergola's top 342.0 (19.4) reaching 1.3m out past the brick, the
  fifth floor 3m back from the brick with its roof at 344.7 (22.1), a block over the middle
  toward Poplar St at 348.3 (25.7, the height) and 347.3 (24.7) next to it, a smaller one at
  347.3 nearer Luckie St.
- By eye: the arcade 4.6m tall, the second floor from 5.3, window rows 6.0-9.3 and 10.7-14.0, the
  parapet to 15.9. Luckie St has six columns of 3.7m, the grey slot (4.4m, the entrance at its
  foot) and six more; Poplar St and Forsyth St 3.7m columns too, the plaza side 5m columns with
  wider windows.

## What's in the game

- campus/aderhold.ts, laid out in (a, b): along Luckie St from the corner at Peachtree and in
  toward Poplar St. Outline redrawn in build-campus.mjs (ADERHOLD). The door moved from osm's
  spot on Forsyth St to the entrance in the slot on Luckie St.
- Luckie St: the arcade, piers 1.2m wide and 0.9m deep with stepped cast stone feet, eyebrows over
  each opening, a stone ceiling, a stone back wall with a storefront in each bay. The grey slot
  set back 0.6m with a window per floor. The name in dark letters on the parapet over the first
  five columns.
- The plaza side: shops between stone piers, wide windows over them, the porch under the corner
  bay. Poplar St and Forsyth St: a window in every column on the ground floor too.
- The glass bay on the corner from over the porch to the parapet, grey bands at the floors.
- Brown downpipes down every other pier on Luckie St and the plaza side.
- The coping, the terrace, brick posts on the parapet between the columns, grey beams from the
  fifth floor out past the brick. The fifth floor in dark brown cladding with tall windows (none
  on the plaza side), the blocks on its roof.

## What still differs

- No camera was fitted: the side by sides are lined up by eye, so the proportions are checked but
  not measured. The window rows' heights are by eye.
- The eyebrows are flat boxes; the real ones are curved metal hoods. The windows have a transom
  and more lights than the game's glass.
- Poplar St and Forsyth St were only seen in passing (Mapillary 2022): their ground floors are
  more varied (deep set doors, a loading door) than the window in every column here.
- The corner bay's top: the 2022 street photo seems to show a glass box on the fifth floor's
  corner over it. Not done.
- The fifth floor's cladding is a dark shingle; here it's dark brown panels. The terrace's
  railing and planters aren't drawn.
- The blue GSU banners on the piers and the logo discs on the lamp posts aren't drawn (the logo is
  GSU's trademark).

## Cost

5 parts (brick, stone, metal, brown, glass) from the library's families, no new shaders or
textures. About 8.0k triangles (stone 1.7k, brick 2.0k, metal 2.0k, brown 1.9k, glass 0.4k).
Glass doesn't cast; the metal part casts because it has the roofs and the pergola. Hidden cores
(the ground floor's top, the floors under the terrace, the fifth floor) keep a low sun from
going through. Brick and stone are drawn first when you're close.

Measured after the merge.
