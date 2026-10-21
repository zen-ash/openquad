# Courtland North: references

What I built Courtland North (106 Courtland St SE, osm says 110) from. It's a 1920s-30s two
storey building of painted cream brick on the Courtland St viaduct, with a later red brick stair
tower and a low link at its north end. Two more floors go down to the alley under the viaduct.
Everything here is reference only: no photos are in the repo, the measurements are my own.
Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                       | date                        | license              | facade                                                           | used for                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | --------------------------- | -------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esri World Imagery Wayback, release 26334 (zoom 20)                                          | 2026-08-05 (image ~2026-02) | Esri, reference only | roof                                                             | the roof and the cooling unit are the same as in the 2018 lidar                                                                                                                                    |
| GSU campus map (Concept3D, map 1108, locations 295218 and 1149052)                           | 2026-03-24                  | GSU                  | none (the two photos on it are the arena's doors and lobby)      | only the text: "entrance facing Courtland Street on ground level ... step-free"                                                                                                                    |
| Wikimedia Commons "Georgia State Sports Arena, Atlanta, GA (40508643653).jpg" (Warren LeMay) | 2019-03-23 10:17            | CC0                  | the whole street front, the tower, the link and canopy, in shade | camera fitted on the lidar (2.2px rms on 1600): every bay, window and height on the front, the tower's plate, the canopy. Side by side and 50/50 overlay, and the colors (ratios inside the photo) |
| Mapillary 312440160329330 and five more (lxmatl3)                                            | 2017-08-28 12:11, overcast  | CC BY-SA 4.0         | the street front along the viaduct                               | camera fitted (4.1px, weak along the street): the bays a second time. Side by side and overlay                                                                                                     |
| Mapillary 222356385940449 and on (deirdreedsign)                                             | 2019-12-19, dusk            | CC BY-SA 4.0         | the street front                                                 | by eye: nothing changed between March and December 2019                                                                                                                                            |
| Mapillary 499432771267193 and on (davegis)                                                   | 2016-12-07                  | CC BY-SA 4.0         | the street front                                                 | by eye: the same in 2016 (tower, glass block, awning)                                                                                                                                              |
| USGS 3DEP lidar (GA statewide 2018)                                                          | 2018                        | public domain        | all                                                              | the outline (the tower is square to true north, 41 degrees off the street), every height, the viaduct deck and the ground under it                                                                 |
| OpenStreetMap ways 252608876, 54032748 (the viaduct), 840362906 (Collins St)                 | -                           | ODbL                 | -                                                                | the old outline (a box 2m short with no tower), the viaduct                                                                                                                                        |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295218

- **Newest photos**: 2019 for the street front (nothing newer on Mapillary, Commons or GSU's
  map), 2026 for the roof (satellite). No photo at all of the south wall, the back or the
  tower's east wall.
- **Rating**: one tight camera fit (LeMay 2019, the whole front), one loose one (2017), the
  rest by eye.

## Facade breakdown

- **Plan**: osm's box was 2m short at the south end, 1m out at the front and had no tower.
  build-campus.mjs redraws it in the sports arena's frame (u along Decatur St, v along Courtland
  St): the cream block 26m along the street, its back 5cm off the arena (osm left a 1.7m slot
  there; the real strip between them is a lower roof nobody sees), and the tower in the game's
  x/z because it's square to north. Its north east corner is rounded (radius 1.5m), drawn as
  four segments in the outline. The outline's front is the ground floor's glass, 5cm behind the
  painted wall, so nothing outside is behind it under the inside's ceiling (Part 22).
- **Heights** (over the sidewalk in the middle of the front, 320.6m): parapet 8.85m, roof 7.9m,
  the course over the pilasters 7.3-7.4m, windows upstairs 4.72-7.05m on a sill ledge
  (4.6-4.72m), ground floor heads 3.45m, plinth 0.3m. The tower's coping is 10.55m (the json's
  height), the link's roof 7.9m, the canopy 2.5-3.9m with its flashing to 4.05m.
- **Street front**: five equal bays (4.96m) between 1.1m corner piers and 1m pilasters that
  stand 12cm out. Upstairs one four-light window per bay in dark bronze frames, set in 12cm.
  Downstairs, north to south: two narrow windows, glass block, the door under a standing seam
  awning with a small glass block window, glass block, glass block. Little blocks on the
  parapet at the edges of every pilaster, the corner piers stepped up a bit.
- **North end**: the red brick tower with the COURTLAND NORTH plate on its north wall (a white
  plate on a blue one, a plain blue square where GSU's logo is, a red bar), a dark metal
  coping. The link between it and the cream block, 1.7m behind the cream wall: a dark glass
  door with a side light under a cream canopy that goes out to the street line, a tall window
  over it, a dark coping.
- **Roof**: the grey cooling unit by the north end (an open frame with x braces and a pale band
  at the top), the red pipe railing behind the parapet next to it, a white vent near the south
  end. The low unit at the back is hidden by the parapet from the street, not drawn.
- **South wall and back**: plain cream (no photos).
- **Colors**: ratios inside the 2019 photo, where the whole front is in shade, against the
  cream paint: photo / game. Tower brick 0.23 / 0.21, glass block 0.43 / 0.43, the windows
  upstairs (frames and glass) 0.26 / 0.29, the awning 0.11 / 0.10, the viaduct's parapet 0.79 /
  0.86. The cream's red/blue comes out 1.34 in both.

### What I changed from the research notes

- The back goes to 5cm off the arena (u 82.65) instead of the lidar's 81.0, so there's no slot
  between the two.
- The ground floor's glass is 5cm in from the wall, not 15cm: in the photo the glass block's
  right edges line up with the pilasters, which only works if it's nearly flush.
- The game's door is a 2.4m doorway, so it runs from the middle bay's south pilaster to 2.4m
  north of it. The small glass block window next to it is 0.25m narrower than in the notes.
- The red railing is behind the street parapet (u 67.65), not along the roof's north edge: in
  the photo its top is level with the cooling unit's, which only fits close to the front.
- The vent is 1m behind the parapet and its top 10.1m, from the same kind of check.

## Not verified

- Nothing newer than December 2019 shows the street front. The awning, the glass block and the
  windows could have changed since.
- The north end of the cream block (264.4 from the lidar, 264.9 from the photo, about 0.5m).
  How far the pilasters stand out, the parapet's little blocks, the canopy's depth, the link's
  window and door: by eye, about 0.5m.
- The tower's round corner radius, its south and east walls: lidar only, no photo.
- Which door is "the" entrance: the canopy door has the name over it but three steps up from
  the sidewalk; GSU's map says the Courtland St entrance has no steps, which fits the door under
  the awning. The game uses that one.
- The plate's letters are bolder and bigger than the real thin serif ones (the game's plate
  sign has one font).
- The canopy is drawn with the walls' paint: in the photo it's fresher and brighter (1.25 of the
  walls, the game 0.92).

## The ground level

Courtland St here is a viaduct: the sidewalk climbs from 320.2m at the north corner to 321.0m at
the south one, and the ground under and behind it (the void north of the building, the alley,
Decatur St) is 8-9.5m lower. The game is flat, so I picked the sidewalk in the middle of the
front (320.6m), which is also the canopy door's threshold. What it costs:

- the front sits 0.4m high at its north end and 0.4m low at its south end,
- the tower stands on the game's ground in the void, where its real base is 9m down (the
  parapet hides the bottom 1.1m from the street like for real),
- the sports arena behind it is drawn from Decatur St (309.0m), so from Courtland St its wall
  stands about 17m over this building's parapet where the real one is 5.5m. That's the arena's ground, not
  something this building can fix (sports-arena.md, "The ground level").

## The game's door

campus.json had the door on a glass block panel. It's in the middle bay under the awning now
(the real street door), [-133.44, 253.2], facing Courtland St. The gps route from Hurt Park gets
there along the Courtland St sidewalk (the navgraph test passes). furniture.ts gives it 22
pieces (tables, chairs, plants); the glass block and the windows are opaque, so only the doorway
shows them.

## The viaduct's parapet

Every photo has the cream concrete parapet along the sidewalk where the ground falls away: in
front of the void and the tower, across the alley to the Courtland Building and past it to the
fence. courtlandNorth.ts draws all three pieces (1.1m, recessed panels about 3m long) and
game/world.ts makes them walls (courtlandObstacles), so you can't walk off the sidewalk into the
void or the alley any more; they're reached from Decatur St and the back drive, like for real.
None of them crosses a path (there's a test), and the arena's door is still reached from Decatur
St.

## Cost

6 parts (cream, brick, glass, block, metal, concrete), all from the library's families, so no
new shaders and no new textures. The warm-up on the dev server: 805 shader builds and 704
pipelines on main, 802 and 704 with this (and the Courtland Building). The cream and the brick
are drawn first when you're close. The glass and the glass block don't cast shadows: they're set
in the street wall with the building behind them, and the inside's walls shade the ground floor
anyway. The parapet is its own part because it's lighter than anything else here (0.79 of the
paint); the rooftop unit's pale frame shares the glass block's material and the red railing the
tower's brick.

About 950 triangles: cream 410, concrete (the parapet) 300, brick 95, metal 70, block 60, glass 20.

Measured on Oct 20 2026: prod builds in one browser, taking turns, 4 min preheat, 2 rounds
thrown away and 6 measured (1280x800@2, the game look). "before" is the build just before the
four buildings of this round (4a15920: courtland north and building, the research science
center, the science annex). On prod builds the warm-up is 798 shaders and 700 pipelines before
and after. I was running other things on the laptop during rounds 2-4 and some frames went to
20-25 ms, so the frame columns are the median of the last three rounds and the gpu column is
the same round difference over all six (the gpu timestamps don't see the cpu load):

| spot                                            | before | now   | gpu now - before |
| ----------------------------------------------- | ------ | ----- | ---------------- |
| court street (courtland st, looking along both) | 11.40  | 11.10 | -0.31            |
| court door (at the courtland building's doors)  | 12.80  | 12.80 | 0.51             |

## Collins St

Collins St (osm 840362906, a service road) runs under the viaduct, 1.7-4.7m off Courtland St's
centre line, all the way from Decatur St to the back drive. The game is flat, so it lay right
on top of Courtland St and its asphalt covered the yellow centre dashes; they flickered in and
out (striped in low quality, anything from solid to gone with TAA). It was like that before
these buildings too. build-campus cuts it to start where its asphalt stops touching Courtland
St's, so only the end that turns off to the back drive behind the Courtland Building is left.
