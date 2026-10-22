# University Lofts: references

What I built the University Lofts (135 Edgewood Ave, about 2002, Lord Aeck Sargent: GSU's loft
apartments, 231 units round a courtyard, with shops on Edgewood Ave) from. Its parking deck
is its own building, see lofts-parking.md. Everything here is reference only: no photos are
in the repo, the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                      | date                       | license                  | facade                                                        | used for                                                                                                                                                    |
| ------------------------------------------------------------------------------------------- | -------------------------- | ------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 287174): `image12`, `image13`, `image14`      | uploaded 2026-08-19        | GSU, all rights reserved | the entrance on Edgewood Ave, the lobby                       | the round granite block columns, the curved white band with "UNIVERSITY LOFTS", the recess with glass doors and sidelights. Camera by eye, side by side     |
| same: `20231023MLB_Fall_Stock_0577`                                                         | 2023-10-23                 | GSU                      | the whole stepped massing from far off, long lens             | checking the steps, the arched row under the top floor, the cornice, the rooftop boxes; from far the shingles read white                                    |
| same: `20210818MLB_Housing_Stock_101`, `20160407MLB_Housing_Stock_054`                      | 2021-08-18, 2016-04-07     | GSU                      | the courtyard, from the ground and from a high floor          | the courtyard's shape, the low wing's faceted curve, the shingles up close, windows on the courtyard sides                                                  |
| Wikimedia Commons "University Lofts, Atlanta, GA (46559470355).jpg" and "(46559470405).jpg" | 2019-03-23 10:11-10:12     | CC0 (Warren LeMay)       | Auditorium Pl: the tower, the step, the 6 floor wing          | the main source: two cameras fitted on the lidar (rms 3.0 and 4.5px): every window column, the floors, the cornice, the base, the "135" door and the grille |
| Mapillary 919298278636350, 182048333785021 and the frames round them (deirdreedsign)        | 2019-12-16 15:41, overcast | CC BY-SA 4.0             | Auditorium Pl from the west                                   | the base and the "135" canopy, the shingles in flat light. Mapillary's poses, by eye                                                                        |
| Mapillary 3983093325108905 (deirdreedsign)                                                  | 2019-12-19 17:07           | CC BY-SA 4.0             | the blank wall over the deck and the east wing, from Piedmont | camera fitted on the tower's corner and the chamfer (rough, 9px): the blank wall's window column and louvres, the rooftop box, the east wing. Side by side  |
| Mapillary 476840406921687, 894945248017034, 1202766900156509 (nhhecker)                     | 2019-04-23 17:16, sun      | CC BY-SA 4.0             | Edgewood Ave                                                  | the storefronts between split face piers, the blue canopy on brackets with struts. Mapillary's pose, heading by eye, side by side                           |
| Mapillary 342265904163583, 323283112706025 (lvl5)                                           | 2018-07-18                 | CC BY-SA 4.0             | the west end on Edgewood Ave                                  | the blank west end, the canopy's west end                                                                                                                   |
| USGS 3DEP lidar (GA statewide 2018)                                                         | 2018                       | public domain            | all                                                           | every wall, roof and height, the courtyard, the canopy's line, the penthouse and boxes, the ground                                                          |
| USGS EPQS                                                                                   | -                          | public domain            | -                                                             | the ground at the doors (304.4m)                                                                                                                            |
| Esri World Imagery Wayback, release 63116 (zoom 19 and 20)                                  | 2026-02 (z19), 2022 (z20)  | Esri, reference only     | roofs                                                         | the same roofs as the lidar                                                                                                                                 |
| OpenStreetMap way 252608914                                                                 | -                          | ODbL                     | -                                                             | the old outline                                                                                                                                             |
| Lord Aeck Sargent, Brookwood Group, GSU housing pages                                       | -                          | text                     | -                                                             | the date, the courtyard, the units, the entrance on Edgewood Ave                                                                                            |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/287174):

- https://assets.concept3d.com/assets/1108/image12_6a85e813b58b6.jpeg
- https://assets.concept3d.com/assets/1108/20231023MLB_Fall_Stock_0577_6660d3b554b9a.jpg
- https://commons.wikimedia.org/wiki/File:University_Lofts,_Atlanta,_GA_(46559470355).jpg

- **Newest photos**: 2026 (the entrance only, close up), 2023 (the massing from far), 2019
  (every street side, sharp). Nothing suggests a change since 2019; the 2026 satellite image
  and the 2018 lidar have the same roofs.
- **Rating**: two tight camera fits on Auditorium Pl, one rough one from Piedmont Ave, the
  Edgewood Ave side by eye. The east side on the drive and the courtyard have no street photos.

## Facade breakdown

- **Plan**: two grids. A bar along Edgewood Ave (n, v in from the street) steps up to the east:
  6 floors, 10 floors, then 14 floors to the east side. A block on Auditorium Pl's grid (a along
  it, b in from it) does the same toward Piedmont Ave: a 6 floor wing, one column of 10, the 14
  floor tower. The 14 floor arm runs from the tower back to the bar along the deck, and turns
  into an east wing with a chamfered corner over the deck. A 2 storey wing (8.6m) fills the
  west corner and curves into the courtyard in 3m facets. build-campus.mjs redraws osm's box
  on the lidar walls: osm's Edgewood Ave side was the canopy (the wall is 2.3m in) and its east
  side was 4m out over the drive.
- **The courtyard**: open to the sky. An outline can't have a hole, so it's cut out through a
  slot 10cm wide in the low wing (from its wall on the yard by the Baptist Student Center): the
  courtyard is outside the building, the inside gets no floor or ceiling across it, and its
  walls are walls you can't walk through like the outside ones (the slot is too thin to walk
  into). The inside has walls along the slot's two sides, a partition 10cm thick. The
  courtyard's ground is the game's plain paving, about 0.5m higher than the real one (the
  terrain under the old footprint was filled in from the streets).
- **Heights**: a 4.75m ground floor, then 3.09m floors (the 2019 fit hits all three lidar roofs
  with it). 6 floor parts 20.8m to the parapet, 10 floor 33m, 14 floor 44.93m to the top of a
  light concrete cornice that sticks out 0.9m from 43.8m up. The cornice runs round the outside
  of the 14 floor parts, on the deck side only over the bay at the south corner (Piedmont Ave
  photo). The penthouse on the bar is 50.06m, two boxes on the tower 48.2 and 49.2m.
- **The shingles**: stamped stainless shingles in 0.4m courses, bare metal that takes the
  sky's color, a patchwork of lighter and darker ones. 13th floor windows are round arched on
  the 14 floor parts, the 14th floor's are shorter with white panels between them.
- **Windows**: 1.8m square, white frames, four lights, nearly flush. On the module the 2019
  photos give (3.17m on the tower, 2.85m on the 6 floor wing), spread on it where no photo shows
  the face (the east side, the courtyard).
- **Edgewood Ave**: storefronts between grey split face piers, a band of block up to the second
  floor, a dark blue steel canopy 2.7m out at 4.4m on brackets with struts, wrapping 6m round
  the corner onto the drive. The entrance is a recess 1.5m deep between two round granite
  columns, with the curved white band and the name over them. The storefront glass is on the
  outline (the inside's walls are there), the piers stand 0.3m out.
- **Auditorium Pl**: the street climbs from 1.28m over the ground floor at the south corner to
  2.13m at the west one. A split face base 0.15m proud to 3m, tall ground floor windows going up
  into the shingles, the blue "135" doors under a blue canopy hung on two rods (the number gold
  on a blue plate; the real one has GSU's flame at each end, left out), the garage's roll up
  grille two storeys high by a block pier, no second floor windows over it.
- **The deck side**: blank cream, a column of windows by the south corner, louvres on every
  other floor 8m in. The deck stands against the bottom 10m of it. Round the deck's elevator
  tower, in the notch by the east wing, plain cream.
- **Colors**: ratios inside the 2019 photos. In the morning shade on Auditorium Pl the shingles
  read blue grey where they face the sky and warm silver low down; the game's reflections are
  of its sky only, so the bottom stays cooler than the photo.

### What I changed from the research notes

- The courtyard's walls are at round numbers on the two grids (b 17 and 17.5, a 23.2, v 17.3
  and 17.5) instead of the lidar's roof edges, so the steps between parts line up.
- The door is at the back of a recess 1.5m in (the notes had it on the face): the doors are in
  a vestibule behind the columns in the 2026 photo. [161.95, -17.6], facing Edgewood Ave.
- The deck's elevator tower in the notch is the deck's (its outline goes round it), not left
  out of both.
- The rooftop boxes moved toward the deck side, where the Piedmont Ave photo has one over the
  blank wall.

## Not verified

- The north side's window columns and storefront bays (no straight on photo, the module is
  spread on the face), the canopy's bracket spacing, the entrance's width and depth.
- The east side on the drive and every courtyard face: no photos. Windows on the module, a
  service door and two windows on the drive by eye.
- The cornice depth (0.8-1m) and where it runs on the deck side and the steps.
- The low wing's walls and windows (one window to a facet, by eye from the 2021 photo).
- The shingles' stamped chevrons and highlights aren't drawn: they're a patchwork of tones with
  shadow lines along the courses (the metal family's ribs, turned).
- The vestibule glass's blue graphics, the shops' signs, the vent hoods by the windows, the
  FDC sign, the courtyard's lawn and paths aren't drawn.

## The ground level

The lofts and their deck have their own ground, 304.3m (DATUMS in game/surface.ts): the
Edgewood Ave sidewalk at the doors, which is also where the game's terrain is there. Edgewood
Ave falls 0.7m along the front (the storefronts' sills follow it), Auditorium Pl is 1.3-2.1m
higher along the south west side, so that side is drawn from its sidewalk: the base, the
windows, the "135" door and the grille start at the street.

## The game's door

campus.json had it on osm's east side, 4m out over the drive. It's at the back of the entrance
recess on Edgewood Ave now, where the real glass doors are. The route test to every GSU door
passes. The ground floor is shops and flats, so furniture.ts gives it seats in the lobby only
(29 pieces). The entrance's columns and the Edgewood Ave base (0.3m out) are collision in
game/world.ts (loftsObstacles).

## Cost

6 parts (shingle, cream, base, glass, blue, dark), all from the library's families, no new
shaders and no new textures. The shingles are the metal family with its ribs turned into the
courses (the uvs are swapped), the dark part is the garage's grille and the louvres. Everything
casts: the building is empty inside with windows on both sides of every wing, the sun would
come through. The shingles are drawn first when you're close.

About 12k triangles: shingle 8.6k (every window's reveal), glass 2.1k, base 0.5k, blue 0.4k,
cream 0.4k. 3 sign meshes for "1 3 5" and one for the name.

Measured after the merge.
