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
  on Commons or Mapillary yet, and the newest satellite tiles still have Sparks Hall. Looked
  again on Nov 26: Urbanize Atlanta's story (Nov 18) leads with a crop of the same high photo,
  GSU's map still has only the 2025 renderings, Mapillary's newest there is from 2019.
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
- The library stair (the stair photo, people for scale): three flights with two landings and a
  deck at the top, about 6, 8 and 9 risers going down, treads with perforated steel nosings,
  a guard of steel posts with thin horizontal cables on the open side, a handrail down the
  middle and one on the wall side, lush planting along library north's wall beside it. About
  4.5m wide. The game's ground gives it 2.55m to climb, so it has 4, 5 and 6 risers of 0.17m
  and 0.33m treads, landings 1.6 and 2.6m long and a 3m deck.
- The porch at its foot: grey stone pavers in a few shades, two rows of three long backless
  black benches (about 3m), blue bins, a bike rack.
- Lights: slim grey poles about 5.5m tall with a flat round head (every photo), round the
  lawn, along the promenade and round the plaza.
- Movable things: blue adirondack chairs and closed blue market umbrellas at the lawn's
  library end and by the seat steps, blue bins.
- The column at dusk: blue light lines down both sides of each steel corner and round the
  top under the cornice.
- Planting: small round shrubs about a meter apart in rows with mulch between them (they went
  in this fall), some grassy clumps, young trees bare or nearly bare.
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
- game/raised.ts also has the library stair (from the porch at 314.06 up 2.6m to the
  Courtland sidewalk, 4m wide, beside library north's wall south of its lobby) in six pieces
  and a landing at the top, so you walk up it.
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
- Third round (Nov 26): the library stair is six raised.ts pieces (deck, three flights, two
  landings, all `stairs` so the ground isn't draped over them) drawn by pantherQuad.ts with
  the cable guard and two handrails. The porch (two pieces of grey pavers round the lobby's
  corner, 3cm over the brick) with six benches; 25 light poles (their heads use the street
  lamps' glass material, so they light up with them, and their pools of light on the ground
  are added to the park lamps' instanced pools in StreetFurniture.tsx); seven chairs, five umbrellas, four bins;
  three concrete seat walls along the promenade side of the lawn; the column's blue lines
  (one small emissive material faded in at night like the lamps). Beds are about twice as
  dense with grass clumps and a few bigger shrubs among the small ones, the young trees are
  bare branches. The stair's treads have dark nosings, a planter runs up between it and
  library north's wall, and its sides are walls for walking (the guard 1.07m, the planter
  0.35m) so you can't step off it. The column's cornice got its underside: from below you
  saw sky through the overhang and it looked like it floated.

## What still differs

- Third round: the stair photo can't be lined up with the game's layout. From the photo's
  camera (by library north's lobby, up a floor) the stair and the lawn are about 45 degrees
  apart and the stair's top is just in front of student center west; in the game they're 95
  degrees apart from anywhere outside the building. So either the real stair sits several
  meters further toward the quad than mine (along courtland) or osm's library north outline is
  off there. I kept the stair where it was and only fixed what it looks like. The side by
  sides of the stair and the porch are the same things from roughly the same side, not a
  fitted camera.
- In the high photo the library end is a level brick plaza with a wide stair (three rails)
  down to a lower plaza at the lawn's end, where the chairs and umbrellas are, and the raised
  planters step down beside it. Not built: in the game it's the terrain's slope.
- Also not built: the small fenced lawn at the stair's foot, the dark round medallion in the
  brick by the porch, bike racks, a wooden seat platform at the far end of the promenade,
  food truck spots (none in any photo, only in the 2025 renderings).
- In the stair photo the flags stand to the left of the column (north of it from there); in
  the game they're on its other side. One photo, not changed.

- The layout is from the renderings plus the photos by eye. The photo from the stair by library
  north (rd-greenway) shows the lawn sitting further toward Courtland and wider than mine.
  Where the long stair goes and how high (2.55m here, about 23 risers = 3.7m in the photo, the
  game's ground is 2m high there) is my reading of one photo; I couldn't line a camera up on
  the stair itself (third round, above).
- The planters at the library end are placed by eye from the high photo; the real ones are
  lower with more of them and steps between.
- The ground is the 2018 bare earth with Sparks Hall filled in: it rises 2m at the library end,
  where the real quad looks flat. The lawn follows the terrain (±0.3m).
- The high photo (rd-students) shows the near end of the lawn closer to the camera. It's in
  sun in the photo; the
  game's Library North shades that part of the plaza at any time I tried (11:30-14:00).
- The lawn was still fenced off (blue mesh) at the opening for the new sod: not drawn.
- The column's lettered steel strip (GEORGIA STATE UNIVERSITY up one corner) isn't there
  (signs can't run vertically). Its cornice is simpler. Its blue lines are (third round).
- Bronzie is a rough shape. Where it stands (in front of library north's lobby, side on to
  the glass) is from one telephoto photo by eye.
- The Ground Crew Grove's place (in front of Arts & Humanities by the plaza) and its plaque are
  from the rendering, no photo of it yet. The grey pavers under its trees aren't drawn.
- Shrubs are 8 triangle lumps (they read a bit like green diamonds close up). The young trees
  are bare now; the ones along the promenade in the photos still have yellow leaves.

## Cost

Third round (Nov 26): frame time measured after the merge. Draws on the dev server
(counts.mjs, before = the same server with my changes stashed): quad 84/167/180 ->
88/171/179 (prepass/scene/shadow), library-north 110/141/221 -> 114/145/219, hurt-park
70/146/205 -> 76/155/208. Warm-up on the dev server 818 builds / 737 pipelines -> 827 / 746.
11 meshes plus the flags (was 7 plus the
flags): the new ones are grass (plain), paving (the surface family, the same shader as the
other pavings), lamp (the street lamps' own glass material) and glow (the column's lines, a
plain standard material like the lamp glass). Concrete, marble, bronze and blue cast shadows
(blue: chairs and umbrellas), the rest don't. About 16k triangles (shrubs 5k, grass tufts and
rails 2-3k each).

Second round: 7 meshes (concrete, marble, metal, blue, bronze, soil, shrub) plus one
for the three flags, from the library's families (no new shaders except the brick pattern, which
replaced the old paver pattern in the same three ground materials). About 8k triangles (3.5k
of them shrubs and leaves, 2.3k concrete) after the second round (was 5.5k). Only concrete, marble and bronze cast shadows. The brick pattern looks at four
nearby repeats per pixel on the pavers layer only.
