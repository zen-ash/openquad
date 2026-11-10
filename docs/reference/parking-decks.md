# Parking decks (G, M, N, K, S): references

What I built GSU's five parking decks inside the fence from: G Deck (121 Collins St), M Deck (33
Auditorium Pl) and the N, K and S decks of the "99 Gilmer St" complex. They don't share a look,
so campus/parkingDecks.ts has one builder per style and describes each deck as data (outline,
floors, ramps, towers, ways in, signs):

- **steel** (N, K, S): open light grey steel frames, chain link on every floor, the floors are
  ramps in two halves side by side, white painted block stair towers with one glass side.
- **painted** (M): cream painted precast spandrels between round faced pilasters with a little
  diamond at every floor, open between them, glass stair towers with white mullions.
- **band** (G): exposed aggregate precast in deep two step bands, dark bronze framed screens in
  the openings, so it looks more like an office building than a deck.

Everything here is reference only: no photos are in the repo, the measurements are my own.
Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                                                           | date                       | license              | shows                                                         | used for                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108: G 1124196, M 700817, K 287775, N 287777, S 287779, the stair and rack pins) | text read 2026-10-21       | GSU, reference only  | names, addresses, entrances, elevators, level numbers         | which deck has elevators, "LEVEL 7" on M's roof, the entrances                                             |
| Concept3D photos of M's bike and scooter racks                                                                   | uploaded 2026-08-05        | GSU                  | the sidewalk by M                                             | nothing changed there                                                                                      |
| Concept3D phone photos IMG_3419/3420 (M), IMG_3424/3433 (G)                                                      | uploaded 2026-03-24        | GSU                  | insides: level 1 lobbies, aisles                              | the insides (flat soffit, deep beams), nothing changed                                                     |
| Esri World Imagery Wayback, release 63116 (zoom 19 is from 2026-02-02)                                           | 2026                       | Esri, reference only | roofs                                                         | all five roofs are the same as in the 2018 lidar                                                           |
| Mapillary 759410568279320 and on (deirdreedsign)                                                                 | 2019-12-19 17:01           | CC BY-SA 4.0         | Courtland St viaduct looking SW: G's Courtland side           | G's Courtland side by eye (the pose isn't fitted)                                                          |
| Mapillary 463895054914958 and on (deirdreedsign)                                                                 | 2019-12-19 17:05           | CC BY-SA 4.0         | Piedmont Ave: M's south east side and east tower              | M's floor spacing, side by side (camera refit on the parapet)                                              |
| Mapillary 3004848063167307 (deirdreedsign)                                                                       | 2019-12-11 14:06, sun      | CC BY-SA 4.0         | Jesse Hill Jr Dr: S's south east side and the S DECK lightbox | S's floors, roof poles and sign, side by side (fitted, about 1m)                                           |
| Mapillary 919761192211021 (deirdreedsign)                                                                        | 2019-12-12 12:29, overcast | CC BY-SA 4.0         | Jesse Hill Jr Dr: K's south east side behind trees            | K by eye (raw pose)                                                                                        |
| Concept3D 2018 set (Canon 5D III, 24mm): G (4), M (5), K (2), N (2), S (4)                                       | 2018-11-27 12:19-12:58     | GSU                  | every deck close up and their roofs                           | the look: materials, colors, signs, towers. G's plaza side and N's Decatur St corner side by side (fitted) |
| USGS 3DEP lidar (GA statewide 2018)                                                                              | 2018                       | public domain        | all                                                           | outlines, every floor and roof height, the towers, the ground, the viaduct                                 |
| OpenStreetMap ways (campus.json 60, 65, 70, 71, 77)                                                              | -                          | ODbL                 | -                                                             | the old outlines                                                                                           |

The research notes, fitted cameras and photo copies are in the scratchpad's
research/parking-decks folder (not in the repo).

- **Newest photos**: no outside photo newer than December 2019 (Mapillary) / November 2018
  (GSU). The 2026 GSU photos are insides and racks, the February 2026 satellite shows the same
  roofs. The paint could have been redone since.
- **Rating**: three decent camera fits (G's plaza side, S on Jesse Hill, M on Piedmont), N's is
  rough, G's Courtland one and K's are raw Mapillary poses.

## How a deck is drawn

- Every deck has a box (`landmark.body` in campus.json, its [w, s, e, n] corners): "a" is meters
  in from the north west side, "w" along it from the south west end. Heights in the data are
  meters above sea level like the lidar has them, drawn over the deck's datum (surface.ts
  DATUMS: G 321.3, M 308.4, N 306.55, K 306.45, S 303.95, the floor at the way in).
- The decks are on slopes (G 311.8-322.4 with the viaduct, M 304.7-309.3, N 303.7-306.6, K
  303.3-306.9, S 303.0-304.8). Their floors are drawn at their real heights and their sides go
  down to the ground themselves, so they get no plinth (`open` in landmarks.ts).
- They're still buildings you can walk into (gps, doors, location names), but open:
  interiorGeometry.ts leaves out the inside floor and office ceiling for them (you'd see them
  through the open sides), they have no inside walls, Doors.tsx draws no sliding doors at their
  ways in, and furniture.ts already left decks empty. Inside you stand on the datum like in
  any building, the ramps aren't walked on.
- Materials (parkingDecksMaterials.ts): one set per style, shared by the decks of that style,
  all from the library's families. The floors under other floors and the undersides are
  concrete with `occlusion` 0.3 (new in materials.ts, 1 changes nothing): the ambient
  occlusion only reaches a meter, so without it the floors deep inside reflected the sky and
  the undersides were lit like outside. The sun still lights them where it gets in.

## G Deck (60)

- **Outline**: osm's (every long edge within 0.2-0.7m of the lidar). Its box is lined up with
  the plaza side.
- **Floors**: 3m apart, level 1 on Collins St under the viaduct (312.3), 3 on the toll plaza
  (318.3), 4 on Courtland St (321.3), the roof (8) at 333.3, the parapet 334.9. The roof's ramp
  bay down the middle climbs 330.9 -> 333.2 (6%).
- **Sides**: an upper band flush with the outline over a lower one 0.18m in, the screens 0.35m
  in. The plaza side is three sections like gsu's photo: the north one has a grid of dark
  panels over the top two floors, the middle one stands 0.45m higher with a long screen at the
  top and solid panels under it in places, the south end is lower. Courtland St: solid on the
  sidewalk floor and the top one, screens between (the 2019 photo, by eye). The other sides have
  screens all along (no photo). Under the plaza (levels 1-2) the plaza side is solid: it's
  under the toll plaza's deck now, you only see it from inside g.
- **Towers**: the north one (lift shaft, glass stair facing Library South) to 338.4, the south
  one (glass stair on Collins St) to 338.5, plain precast in 1.5m courses. They stand a bit past
  osm's outline, world.ts walls them in (deckObstacles).
- **Ways in**: Courtland St on level 4 at the north end of that side (where findDoor put the
  door, kept), Collins St on level 1 by the south tower; blue clearance bars, the small G plate.
  The "G DECK" lightbox on the north tower's plaza side at level 5.
- **Roof**: 8 floodlights (two heads on a t) along the ramp bay, low walls along it.
- **The toll plaza**: see below.
- **Courtland St's sidewalk** is ~2m narrower in the game than for real, where it runs up to
  G: G draws a concrete strip at the sidewalk's height in the gap.

## G's toll plaza

The lot on the plaza side, where cars come in off Central Ave and drive into g's third floor.
It's on a structure: the lidar has it at 318.2-318.45m as building and vegetation points, not
ground, the parking under it shows through the windows in g's level 1 wall (gsu's 2026
photo IMG_3433), and round it the ground is 6m lower: a 3.5m wide service alley at 311.9m
along classroom south and its wing, the gap by the 90 central ave garage at 312.5m and the
drive between g and library south at 312.0m. Usgs's bare earth leaves the structure out, so
the game's terrain went down from Central Ave to 312.5m at g.

- **In the game** it's a raised plaza (game/raised.ts, the three 'G Deck toll plaza' ones):
  flat at 318.33m, traced on the lidar in g's own frame, its south west side in line with g's
  end, the north east one 36.3m along g's plaza side (40.5m at g's wall). heightAt() and so
  surfaceAt(), the ground's drawing (the terrain's squares and every ground layer are cut
  along its edges and lifted onto it, campus/drape.ts) and the cars all go by it. Under it
  the terrain is untouched.
- **Where it meets Central Ave**: the street goes down the hill along the plaza's end (lidar
  318.9m at the south west end, 317.5m at the north east one), the plaza is level. The last
  5m out to the sidewalk are two planes from the plaza's 318.33m to the street's line (the
  'apron' ones), so the plaza meets osm's bridge sidewalk along Central Ave within 0.2m all
  along and there's no step for cars or people (before: 0.5-1.3m, the bare earth's blur).
- **Its surface**: the plaza's own concrete (the ground layer under everything), osm's
  asphalt service roads are cut out on it (Campus.tsx), the lanes are drawn by
  parkingDecks.ts: two islands with curbs painted yellow, concrete on top, following the
  apron down to the street, white arrows (in on the clearance lane, out on the two others).
- **The canopy** (gsu's 2018 photo from Central Ave, side by side, and the lidar): a thin
  white beam (0.28m deep) on four slim posts, 45m out from g, 2.75m up, the 6'-6" clearance
  bar over the way in and "DO NOT ENTER" over the two ways out. White is m's cream material.
- **The island by the booth**: the booth 9m past the canopy (its size from the photo), the red
  lightbox on its post, the blue "FACULTY & STAFF PARKING ONLY / STUDENT PARKING AFTER 4PM"
  sign, gate arms in red and white over two lanes, a tall dark light with a box head. Two
  more of those lights by the pergola and the planter.
- **The sides**: the walls are g's own exposed aggregate precast (its panel joints), with a
  band along the top that stands out 6cm like g's floors, a base step at the bottom and a
  coping on the 1m parapets (the alley, the gap, the short bit at the north end). Collision
  along the parapets (world.ts raisedWalls). The south west parapet is the outside of a
  planter 2.6m deep with big round shrubs (the photo's right side), the north east side has
  concrete bowls with flowers and the white pergola along the alley (the photo's left side,
  the lidar's posts every 3m). The booth, planter, bowls and posts are collision
  (deckObstacles).
- G's own walls: the frame's ground is the terrain itself (terrainAt), so its lower floors
  on the plaza side are still drawn, under the plaza.
- **Not verified**: the walls round the structure aren't in any photo (no mapillary or gsu
  photo of the gap or the alley), they're drawn like g's own lower floors. The pergola, the
  bowls, the lights other than the one in the photo and where the islands start and end are
  from the lidar and by eye.

## M Deck (70)## M Deck (70)

- **Outline**: redrawn on the lidar (osm was 0.3-1m off): the box, the elevator tower on the
  Dahlberg Hall drive, the pedestrian entrance's tower 1m out on Gilmer St. 'M Deck' left
  MEASURED_HEIGHTS (Overture's 25.7).
- **Floors**: 3.1m apart from 308.4, the roof is level 7 at 327.0 (lidar 326.8-327.3). The
  south east bay is the ramp, it climbs a floor from w 16 to 72 (lidar on the roof: 324.0 ->
  327.0). Parapet 328.6.
- **Sides**: spandrels from 0.5m under each floor to 1.05m over it with a sloped top, 0.3m
  behind round faced pilasters every ~8.2m with a diamond at every floor and a cap over the
  parapet. The ground floor: a cream base along the street and black steel screens, the way in
  off the Dahlberg Hall drive open with "M PARKING DECK" over it and the 7'-0" bar.
- **Towers**: cream, a band at every floor and glass between in white mullions (4 x 3 a floor),
  white louvres along the bottom of the glass. The pedestrian entrance's tower has the passage
  under "M DECK PEDESTRIAN ENTRANCE" with the open stair over it behind white rails. That's the
  game's door.
- **Inside**: floors, undersides, columns and lights you see through the openings.

## N Deck (71) and K Deck (65)

- **Outline**: redrawn on the lidar, osm had them 1-2m north west (N 1.5m too wide). The
  notes' outlines had a zero width spike at the west corner, left out.
- **Floors**: a double helix, each half climbs one tier (2.8m) over the deck's length, the
  north west one to the north east and the other back, so the halves meet at both ends and in
  the middle. The top floor's halves stop in the middle (N: 320.55 -> 322.0 and 322.0 <-
  320.65, K 0.1m lower). Tiers that are under the ground aren't drawn, the lowest one is drawn
  in 3m squares kept just over the ground's own shape.
- **Sides**: steel columns every bay (9 along), a beam band at every floor, chain link (see
  through, posts and two rails drawn by the material) and a galvanized w beam rail. The floor
  people can reach from the street has chain link up to the next floor. X braces in some bays
  of the north west side (gsu's photos). Curbs and pipe rails between the halves, open at the
  ends where cars turn across.
- **Towers**: white painted block, glass on the Decatur St side (and round the corner) of the
  south west one, the "N"/"K" plate on its north west side. Tops 323.6 / 323.3.
- **Roof**: white square poles with box lanterns on the curb between the halves.
- **Door**: the opening next to the south west tower (N off Decatur St, K off the drive
  between the two).

## S Deck (77)

- **Outline**: the lidar's (osm's was fine), with the notch at the north corner.
- **Floors**: one helix, each half climbs half a tier (1.4m) over the length, so each end has
  a 1.4m step between them. North west half 303.65 + 2.8k (to 317.65), south east half 303.95
  - 2.8k (to 315.15) at the south west end.
- **Stair**: inside the box on the north west side, white block with glass, top 319.8.
- **Signs**: the S DECK lightbox hung on the top floor's rail at the south corner (the 2019
  photo), "Enter" and a blue clearance bar over the way in on the south west end (the door).
- **Roof**: six poles with box lanterns along Jesse Hill Jr Dr (fitted photo), x braces across
  the south east half.

## What still differs from the photos

- **G's toll plaza**: no parking stalls painted (the cars come from elsewhere), no cones,
  the yellow paint is only on the islands' curbs, the shrubs are smooth round balls and the
  bowls' flowers green mounds. The realistic look's concrete is the ground everywhere's,
  darker and greyer than the plaza in the 2018 photo. The walls round it are guesses (see
  above).
- G's Courtland St side is by eye from an unfitted photo; the north east and south west sides
  have no photo at all. The panels are lighter in the game than in the plaza photo.
- M's Auditorium Pl side and its way in: no photo, drawn like Piedmont Ave. Its floodlight
  poles and the elevator lobby on the roof (blue awning) are simplified or left out.
- No cars anywhere. The real decks are full of them and they're most of what you see through
  the openings.
- The lights under the floors only glow at night (the material has no day glow), in the photos
  they're on at noon too.
- The steel decks' undersides come out a little warm brown (light bounced off the sunlit
  sidewalk), the photos' are grey.
- K's and N's far ends and south east sides are only seen from far away or behind trees.
- Inside a deck you walk on its datum, not on the ramps.

## Cost

Measured after the merge. 0 new shaders: on the dev server's join warm-up, 802 shader builds
and 707 pipelines with the decks drawn and with them hidden (the same run). Parts per deck
(each is a draw call in every pass): steel 8 (slab, floor, soffit, steel, mesh, lamp, block,
glass; mesh and lamp are see through and cast no shadows), M 7 (cream, dark, slab, floor,
soffit, lamp, glass), G 8 (precast, screen, glass, slab, pole, and for the toll plaza white
(the canopy, booth, pergola and arrows: m's cream material), yellow (the island curbs, no
shadows) and green (shrubs and soil, the library's lawn family)). Triangles: N 8.8k, K 9.0k,
S 6.8k, M 4.7k, G 8.4k (3.9k before the toll plaza: its walls, shrubs and dressing are 4.5k,
the shrubs 2.1k of them), plus 37 signs on g (the toll plaza's bars, signs, lightbox and gate
arms are 26 plates). The chain link is a see through material (two faces, out and in), not
geometry. No new shaders: every new part is a library family already built.
