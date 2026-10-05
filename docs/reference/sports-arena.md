# GSU Sports Arena: references

What I built the GSU Sports Arena (1973, 125 Decatur St, on Decatur St at Courtland St) from.
It's Georgia State Athletics' offices and the home of the volleyball team. Everything here
is reference only: no photos are in the repo, the measurements are my own. Photos I
downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                                   | date                            | license                               | facade                                               | used for                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esri World Imagery Wayback, release 26334 (zoom 19 and 20)                                               | 2026-08-05 (imagery 2026-02-02) | Esri, reference only                  | roof                                                 | the outline (the same roof as the 2018 lidar), the towers, the pavilion at the north corner, the two bridges over Decatur St. The roof has a big painted flame logo, left out                                                     |
| GSU campus map (Concept3D, map 1108, location 516039 "Single Stall Restroom - Sports Arena"): `IMG_3434` | uploaded 2026-03-24             | GSU, all rights reserved              | today's main doors                                   | the blue arched "Welcome to the GEORGIA STATE Sports Arena" awning on two posts, sliding glass doors, a dark curtain wall two floors over them, glass on the left and a plain wall on the right. Side by side by eye, not fitted  |
| same map, location 906375 "Docks - Sports Arena": `Sports_Arena_663cc9e87daab`                           | uploaded 2024-05-09             | GSU, all rights reserved              | the loading dock on the back drive                   | cream precast, the dock with a rail, the sloping well in front of it. Not fitted (rotated phone photo)                                                                                                                            |
| same map, location 286964 "GSU Sports Arena"                                                             | text, 2025-2026                 | GSU                                   | -                                                    | what it is today (athletics offices)                                                                                                                                                                                              |
| Mapillary 455851626671236, 1360712914667088, 172056365499076                                             | 2021-01-20                      | CC BY-SA 4.0 (networklanman, dashcam) | Decatur St at street level                           | the ticket office, the glass pavilion, the arcade under the terrace (square columns, wide steps, dark windows), the plaque and the flagpole on the east tower, the canopy in the court by the practice facility. By eye (fisheye) |
| Mapillary 546003933064682                                                                                | 2019-12-12 14:25                | CC BY-SA 4.0 (deirdreedsign)          | Decatur St from the north end                        | camera fitted on the east tower and bridge 1 (rms 15px on 4032, weak along the street): the towers, the louvre boxes, the panel wall, the terrace, bridge 1, the ticket office. Side by side and overlay                          |
| Mapillary 251509560092882, 3768408549937597                                                              | 2019-12-12 14:25                | CC BY-SA 4.0 (deirdreedsign)          | the north corner, from under the Courtland St bridge | the glass pavilion and its standing seam roof sloping up to the north tower, the tower's dark glass slot, the bridges' piers on the far side. By eye                                                                              |
| Mapillary 2590666524390633 (Petit's fitted camera)                                                       | 2019-12-19 17:04                | CC BY-SA 4.0 (deirdreedsign)          | the side over the practice facility                  | the ribs going down into the practice facility's roof, the color next to Petit's base. Side by side                                                                                                                               |
| Wikimedia Commons "Georgia State Sports Arena, Atlanta, GA (40508643653).jpg" (Warren LeMay)             | 2019-03-23                      | CC0                                   | Courtland St side, from the bridge                   | the ribs, the double pilasters near the ends, the plain band, the beam and the dark recess under the ribs, the end walls' blades. Weak camera (4 points)                                                                          |
| Wikimedia Commons "GSU Sports Arena Exterior.jpg" (Skapunkskatedude)                                     | 2011-11-05 18:02                | CC BY-SA 3.0                          | the panel wall, from bridge 1                        | camera fitted on the panel wall's corners and the lidar's box tops (rms 5.6px): the panel joints, the sign, the soffit, the two boxes, the landing and its stairs, the lobby glass. Side by side and overlay                      |
| USGS 3DEP lidar (GA statewide 2018)                                                                      | 2018                            | public domain                         | all                                                  | every height, where the walls are, the end walls, the towers, the louvre boxes, the terrace, the bridges, the pavilion roof, the ground all round                                                                                 |
| OpenStreetMap ways 252608904, 270880915, 780276692, 780276693                                            | -                               | ODbL                                  | -                                                    | the old outline, the loading dock well, the two footbridges                                                                                                                                                                       |
| Atlanta History Center, Wikipedia, georgiastatesports.com                                                | 1973-2026                       | text                                  | -                                                    | history, still in use (volleyball's 2025 schedule)                                                                                                                                                                                |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/516039 and #!m/906375):

- https://assets.concept3d.com/assets/1108/IMG_3434_69c2ce15ebf5e.jpg
- https://assets.concept3d.com/assets/1108/Sports_Arena_663cc9e87daab.jpeg

- **Newest photos**: 2026 (the doors), 2024 (the dock), 2021 (Decatur St, dashcam), 2019
  (Decatur St, Courtland St, Piedmont Ave). Nothing newer than 2021 shows the Decatur St or
  Courtland St sides. Esri's 2026 satellite image has the same roof as the 2018 lidar, and I
  found no news of anything changing.
- **Rating**: 2 angles with fitted cameras (2011 panel wall, 2019 Decatur St), 2 weak (2019
  Courtland St, Petit's camera at the edge of its frame), the rest by eye.

## Facade breakdown

- **Plan**: osm's outline is the right shape but 1-3m off nearly everywhere and has no
  blades, so build-campus.mjs redraws it in a frame along Decatur St (u toward Piedmont Ave,
  v in from Decatur St) on the lidar's walls, cm precision. Two corners differ from the
  research's outline: the pavilion's back corner is cut on the diagonal (the lidar has the
  passage open there) and the landing behind the east tower is left out (open ground a few
  steps over the court).
- **Height**: osm and Overture have none. Over the Decatur St sidewalk under the terrace:
  the hall's roof 24.85m with its coping at 25.7m, the end walls 26.45m, the panel wall
  26.1m, the stair towers 29.5m and the louvre boxes on them 30.7m (campus.json's height).
- **The hall**: a box between two end walls 1.3m thick that stick out past both long sides,
  2.7m on Courtland St and 2.25m over the practice facility's roof. On both long sides thin
  ribs every 0.6m (30 counted on the practice facility side) between a beam at 11.9-12.7m and
  a plain band up top, and a pair of deeper ribs near each end that go down through the
  beam and up into the band. On Courtland St a dark recess under the beam, then plain wall
  to the ground. Over the practice facility the ribs go down into its roof.
- **The panel wall**: 32m wide over the lobby, panels in rows (joints at 17.3, 19.8, 21,
  23.5 and 24.75m) and narrow and wide in turn (0.6 and 1.19m), measured on the 2011 photo.
  Every real panel gets exactly one cell of the precast's joint grid, so its joints are
  where the real ones are. Little fins hang off its bottom row. Under it the lobby: dark
  bronze glass two floors high, 1.7m back under a soffit, with plain piers, the widest one
  between the two panelled boxes. A landing between the boxes, a stair either side of it up
  to doors in the lobby.
- **The sign** (still up in December 2019): a light bar standing off the wall with
  "GEORGIA STATE UNIVERSITY", the flame logo at its end as a plain blue square (it's GSU's
  trademark), "SPORTS ARENA" on the wall under it.
- **The towers**: four stair towers at the ends of the long sides, plain precast. The two
  on Decatur St only go 7.5m back (the lidar has the hall's roof behind them) and have a
  tall dark glass slot toward Courtland St. Louvre boxes on all four, with dark slats on the
  side toward the panel wall (or the back's middle) coming down the tower's face (2011
  photo) and on top. The west one has a lower corner by the end wall (lidar).
- **The terrace**: a deck at 5.45m over the sidewalk on square columns, a solid parapet
  along the front. Under it a deep arcade: big dark windows over wide steps (2021 dashcam).
- **The bridges**: two footbridges over Decatur St from the terrace, deck 5.45m, deep
  fascias down to 4m, solid parapets either side of the walkway.
- **The north corner**: the ticket office, a box of cream blocks with a deep flat canopy and
  taller ends, its window, poster case and blue sign. Next to it the glass pavilion: light
  grey framed storefront, a flat canopy over the front, a standing seam roof sloping up to
  the north tower (a plane through the lidar rows, within about a meter). Behind it the
  passage to today's doors.
- **Colors**: a warm beige, yellower than Petit's cream. In Petit's 2019 photo the side
  over the practice facility (in shade, ribbed) is about as bright as Petit's base; the game
  had it 0.89 as bright, so I lightened it. The deep undersides (the terrace's soffit and the
  arcade's back wall, the bridges' undersides, the soffit under the panel wall) are a darker
  copy of the precast: the game's ambient occlusion only reaches about a meter, and they
  came out as bright as the walls in the sun.

## Not verified

- Nothing newer than 2021 shows the Decatur St or Courtland St sides, so I don't know if
  the 2011 sign is still up today (it was in 2019).
- The doors under the awning: placed by elimination (glass on the left, the plain end wall
  on the right, a dark curtain wall over them), not from a fitted photo. They could also be
  in the pavilion itself.
- The pavilion: its plan and the roof's slope come from the lidar only, the glazing is by
  eye. The real roof isn't a plane, the game's is up to about a meter off.
- The red strip under "STATE" on the sign bar is left out (it would be one more material).
- The Courtland St photo has a weak camera, and in the game Courtland North is a generic
  14m box from the game's ground while the real one stands on the bridge, so that view
  doesn't line up past the first few meters of ribs.
- Rib width and depth, the pilasters, the brackets, the column spacing under the terrace,
  the lobby's depth and its piers, the stairs from the landing: by eye.
- The back: one close photo of the dock. The panels and the dock door are made up, the
  four big skyline banners and the faded letters are left out. The west and south towers'
  faces aren't in any photo.
- The banner on bridge 1 ("GEORGIA STATE PLAYS HERE", 2019), the flag on the pole and the
  low planter walls in front of the ticket office are left out.

## The ground level

The ground drops 2.7m along Decatur St, the back drive is a floor up, the Courtland St bridge
is 11-12m over Decatur St, and the practice facility next door and Petit stand on ground
2.5m lower. The game is flat, so I picked one height for the arena's ground: the Decatur St
sidewalk under the terrace (309.0m). That puts the bridges right over the game's Decatur St
and the main doors within 1.3m. What it costs:

- the back shows about 3.5m more base than real (that bit is buried under the back drive),
- the Courtland St side shows its whole height from the game's ground, where in reality the
  Courtland St bridge hides everything under about 11m,
- the arena sits 2.5m low next to the practice facility and Petit: over the practice
  facility's roof 2.5m of the ribs are hidden that show in the Piedmont Ave photo,
- the court by the practice facility is 2.2m down in reality, in the game it's at the
  ground with the canopy over the door at 4.5m.

The practice facility (drawn by itself) draws everything under its roof at 10.3m. The
arena's walls and the end walls' blades over it start at 10m, so they meet its roof with no
gap. Inside walls along the party wall sit 5cm in.

## The game's door

campus.json had the door on the east tower's front, a blank wall. It's in the passage between
the pavilion and the end wall now, on the north tower's side facing Courtland St, where the
2026 photo has the doors under the "Welcome" awning: [-94.82, 249.69], facing northwest. The
gps route from Hurt Park gets there along Decatur St and the passage (the navgraph test
passes).

## Building 166

osm's way 270880915 is a 14m box at the back that isn't a building: the lidar has nothing
over the back drive there, it's the loading dock's sunken well. Deleting it would shift every
later building's index (and their made up facades), so it keeps its place in campus.json with
`landmark: {with: 'GSU Sports Arena'}` and a height of 1.1m. The arena draws a low concrete
wall with a rail round it, and you still can't walk into it.

## The bridges

osm has the two footbridges as footways on the ground (bridge=yes), so in the game they were
paths across Decatur St where there's no crosswalk. build-campus.mjs leaves those two ways
out now and the arena draws the bridges up in the air, no collision under them. On the far
side they land on the Urban Life plaza, a deck about 4.3m up that the game draws on the
ground. So each bridge ends at the plaza's edge (where osm's plaza starts) with its end
closed, on two pairs of square piers: one at the back of the sidewalk and one at the
plaza's edge, both in the 2019 photo. The piers, the terrace's columns, the steps under the
terrace and the flagpole are collision circles and a wall in game/world.ts
(arenaObstacles). The star in the game look that was under the terrace moved 3.6m out of the
steps.

## Cost

7 parts (precast, shade, glass, clear, metal, dark, blue), all from the library's families,
so no new shaders and no new textures. The glass, the dark bits (louvre slats, doors, the
recess under the ribs) and the blue (the logo's square, the awning) don't cast shadows:
they're in or on walls with the building behind them. The clear glass doesn't either. The
precast is drawn first when you're close. The terrace and the bridges have a ceiling inside
their decks for the shadows only, like Petit's colonnade (the shadow lookup is pushed out
past a soffit's edge, Part 27).

About 2.7k triangles (precast 2.2k, metal 0.3k, shade 0.1k, the rest under 0.1k each). The
ribs are geometry (3 faces each and a strip of wall between), the sign wall's panels are a
quad each.

Measured with the sports arena and the practice facility in together (Oct 5 2026), prod builds
in one browser, taking turns, on AC, 3-4 min preheat, 2 rounds thrown away and the median of 4
(1280x800@2, the game look, the buildings are the same in both). "before" is the build just
before the two (7d839e0). The warm-up builds 798 shaders and 700 pipelines before and after.
The laptop had other heavy tabs open in Chrome for these runs, so whole frames jumped around by
several ms between rounds; the gpu numbers (timestamps on every pass, paired by round) held
steady and are the ones to go by.

The first run found the arena costing +2.5 ms of gpu at its doors and on decatur st: the door
moved within 20m of both, so the building's furniture loaded, and furnish() had filled the whole
arena (377 pieces) with study tables that the pavilion's clear glass showed from the street.
The arena, the practice gym and the rec center are courts inside, so furniture.ts now only puts
seats and plants in a lobby within 16m of their doors (15, 8 and 14 pieces). After that:

| spot                                        | gpu before | gpu now | now - before (paired) |
| ------------------------------------------- | ---------- | ------- | --------------------- |
| arena decatur (decatur st at the north end) | 10.91      | 11.07   | 0.54                  |
| arena door (in front of the awning doors)   | 13.56      | 14.43   | 1.07                  |

What's left at the doors is the scene pass (+0.6 ms): the arena's own walls filling the screen
close up, about what the other hand-built buildings cost there.
