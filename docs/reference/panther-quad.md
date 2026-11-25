# Panther Quad: references

What I rebuilt the Panther Quad from. GSU opened the Atlanta Campus Panther Quad on Nov 19 2026
where Sparks Hall stood (torn down late 2025), with Gilmer St closed between Peachtree Center Ave
and Courtland St. Before this the game's quad was laid out by eye from GSU's 2025 rendering and
construction photos that showed dirt. Everything here is reference only: no photos are in the
repo, the layout and measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                | date              | license              | what it shows                                                                      | used for                                                                      |
| --------------------------------------------------------------------- | ----------------- | -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Rough Draft Atlanta, "GSU Panther Quad opens", 4 photos (Meg Buscema) | 2026-11-21        | press, reference     | the quad from library north (high up), from the stair, the column at dusk, bronzie | layout by eye, a camera lined up on the skyline (students), materials, colors |
| GSU news, opening story, 3 photos                                     | 2026-11-16 to 19  | GSU                  | the column by day (close), the ribbon cutting, the ceremony on the plaza           | the column's size and shape, steps and rails by it, flags, the brick          |
| GSU campus map (Concept3D 1098374), 7 renderings of the design        | 2025-10           | GSU                  | bird's eye, plaza and gilmer promenade, lawn, grove, library porch, column         | where things are (plaza at the corner, lawn, promenade, grove), bands         |
| Esri World Imagery Wayback, release 3692                              | listed 2026-11-18 | Esri, reference only | still Sparks Hall (the tiles are older than the release)                           | nothing: too old                                                              |
| USGS 3DEP bare earth (the game's terrain)                             | 2018              | public domain        | the ground with sparks hall filled in                                              | the heights the quad sits on                                                  |

GSU links (text only): https://news.gsu.edu/2026/11/16/georgia-state-to-celebrate-opening-of-atlanta-campus-panther-quad/,
https://map.concept3d.com/?id=1108#!m/1291555

- **Newest photos**: Nov 13-21 2026 (the first day of classes on it and the opening). Nothing
  on Commons or Mapillary yet, and the newest satellite tiles still have Sparks Hall.
- **Rating**: one camera lined up on the skyline (the high photo from library north), the rest
  by eye. No camera fit with known 3d points, so the layout is good to a few meters at best.

## Measurements

The game's frame for the quad (build-campus.mjs pantherQuad()): u along Courtland St from the
old Gilmer corner (-3, 78) toward library north, v in toward Arts & Humanities.

- Ground (the game's terrain, y over Hurt Park): the Courtland sidewalk climbs from 5.1 at the
  corner to 7.9 by library north (u 90). The Sparks Hall site in the middle is flat at about
  3.3, the corner plaza at 5.1, the bank between them falls 2-4m over the first 16m from Courtland.
  The photos agree: the plaza by the column is higher than the lawn, with steps down, and the
  Courtland side is terraced.
- The column: about 1.6m square marble shaft with steel in the cut corners, 5m tall over a
  0.8m marble plinth and three concrete steps (2.2/1.85/1.5m half widths, 0.17 rises), a
  stepped cornice. From the face width against its height in GSU's close photo (3.2 : 1 with
  perspective taken out), the plinth "1913" in the ceremony photo.
- The lawn: u 25-74, v 19-47 with 8m round corners, from the renderings and the high photo
  (its curved near end and how far it reaches toward library north).
- Bronzie: a block about 0.75m high, the panther about 1.4m long nose to hips with a 1m tail,
  by the person next to it in the Rough Draft photo.
- Brick: about 10 x 20cm in a herringbone, light concrete bands about 0.6m wide at 45 degrees
  every ~9m (the high photo, the plaza photos).
- Colors (second round, from the high photo in sun): brick 124 104 90, bands 159 154 148, mulch
  119 87 55, concrete 146 144 137, lawn 125 115 70 (sRGB). The game at 11:30 on the same view:
  brick 129 109 95, bands 161 155 148, mulch 124 89 62. The pavers' colors are bluish in the
  code because the sidewalk texture under them is tan. The lawn is the map's grass (greener
  than the new November sod), not changed.

## What's in the game

- build-campus.mjs pantherQuad(): brick (campus.quad.pavers) over the Sparks Hall site, the old
  Gilmer St (now a promenade, two rows of trees) and on to library north's lobby. The lawn
  (a park), planting beds, terraces, the column, three flags and bronzie's spot. Osm's old
  grass bits and plaza in there are dropped, the old sidewalks are kept for the gps but not
  drawn over the brick (Campus.tsx offQuad). No new trees on or round the lawn: the real ones
  are young and thin and the game's trees are full grown, they hid the quad.
- game/raised.ts: 'Panther Quad plaza' (the corner, flat at 313.8, the courtland sidewalk's
  height there) and 'Panther Quad steps' down to the lawn at 312.25, so you walk up them.
- game/raised.ts also has 'Panther Quad library stair' (from the quad at 314.1 up 2.5m to the
  Courtland sidewalk, 4m wide, beside library north's wall south of its lobby) and a landing at
  the top, so you walk up it.
- campus/pantherQuad.ts draws it all: the column (marble, steel corners, a plain blue square
  where GSU's flame is on two faces), flagpoles, the plaza's walls with a coping, the steps and
  the library stair with steel rails (sides and middle), seat steps along the lawn's whole far
  side (u 24-74), mulch beds with low shrubs that follow the ground (the Courtland bank, a strip
  along the lawn's far side, the greenway by library north, one at the foot of the planters),
  five raised planters with level tops stepping down the slope at the library end with rails
  where they stand over 0.8m, young trees (a thin trunk and three leaf lumps, the map's trees are
  all full grown), bronzie (a plain shape, not the sculpture) on its block. scene/PantherQuad.tsx gives them library materials, the flags are one mesh.
- ground.ts quadBrick(): the herringbone and bands, the same pattern in all three looks.
- Library North's paver patch out front is gone (the quad's brick covers it).
- Collision: bronzie's block, the raised planters, the column, the poles (game/world.ts).

## What still differs

- The layout is from the renderings plus the photos by eye. The photo from the stair by library
  north (rd-greenway) shows the lawn sitting further toward Courtland and wider than mine, and
  the stair's foot on a grey paved porch with benches (no porch here). Where the long stair
  goes and how high (2.5m here, it looks more like 4m in the photo, the game's ground is 2m
  high there) is my reading of one photo; I couldn't line a camera up on the stair itself.
- The planters at the library end are placed by eye from the high photo; the real ones are
  lower with more of them and steps between.
- The ground is the 2018 bare earth with Sparks Hall filled in: it rises 2m at the library end,
  where the real quad looks flat. The lawn follows the terrain (±0.3m).
- The high photo (rd-students) shows the near end of the lawn closer to the camera, blue
  umbrellas and Adirondack chairs and light poles. Not there. It's in sun in the photo; the
  game's Library North shades that part of the plaza at any time I tried (11:30-14:00).
- The lawn was still fenced off (blue mesh) at the opening for the new sod: not drawn.
- The column's lettered steel strip (GEORGIA STATE UNIVERSITY up one corner) and its blue lights
  at night aren't there (signs can't run vertically, no glow). Its cornice is simpler.
- Bronzie is a rough shape. Where it stands (in front of library north's lobby, side on to
  the glass) is from one telephoto photo by eye.
- The Ground Crew Grove's place (in front of Arts & Humanities by the plaza) and its plaque are
  from the rendering, no photo of it yet. The grey pavers under its trees aren't drawn.
- Shrubs and the young trees' leaves are 8 triangle lumps (they read a bit like green
  diamonds close up); the real young trees are bare or yellow in November.

## Cost

Measured after the merge. 7 meshes (concrete, marble, metal, blue, bronze, soil, shrub) plus one
for the three flags, from the library's families (no new shaders except the brick pattern, which
replaced the old paver pattern in the same three ground materials). About 8k triangles (3.5k
of them shrubs and leaves, 2.3k concrete) after the second round (was 5.5k). Only concrete, marble and bronze cast shadows. The brick pattern looks at four
nearby repeats per pixel on the pavers layer only.
