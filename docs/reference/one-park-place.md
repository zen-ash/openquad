# One Park Place: references

What I built One Park Place (1 Park Place / 18 Decatur St SE) from: a white marble office block
from the 60s on the Five Points wedge between Edgewood Ave, Park Place and Decatur St, all of it
GSU's. The GSU Police headquarters is on the Edgewood Ave side, across from Woodruff Park.
Everything here is reference only: no photos are in the repo, the measurements are my own.
Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                                         | date                 | license                  | facade                                                                                       | used for                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, locations 295231, 697252, 502064, 504084)                                 | live Oct 2026        | GSU, reference only      | -                                                                                            | the name and address, that the police headquarters is on Edgewood Ave, the basement, the 2026 restoration note (floors 1-8, inside only) |
| Esri World Imagery Wayback 63116 (2026-02-02 WV02 at z19, 2022-09-27 WV03 at z20)                              | 2026, 2022           | Esri, reference only     | roof                                                                                         | the roof is the same as the 2018 lidar's. Both are oblique (the roof is drawn 4m north of its footprint), so nothing was traced on them  |
| Mapillary 599362105261219, 796069348101320, 640700504323994, 605030281313866 (SydneyIStroud)                   | 2022-09-07 / 13      | CC BY-SA 4.0             | Edgewood Ave's ground floor from the park, the curved corner, the west wall over the Olympia | the ground floor: piers, the police door and its plate, the light bars. Blurry phone, poses 5-10m off, not fitted                        |
| Mapillary 509698414376563, 684154036469652 (networklanman, dashcam)                                            | 2021-01-19           | CC BY-SA 4.0             | Decatur St's ground floor                                                                    | the granite's panels and color, the windows, the blue door, the sign. By eye                                                             |
| Mapillary 467347907812893 (toddwiese)                                                                          | 2019-12-19, sun      | CC BY-SA 4.0             | Decatur St from the Olympia end                                                              | colors in sun and shade, the strip of windows over the granite, the sign. Rough camera (view opp-decatur-2019)                           |
| Mapillary 160185089380318 (deirdreedsign)                                                                      | 2019-12-16, overcast | CC BY-SA 4.0             | the corner of Edgewood Ave and Park Place, both faces                                        | the main photo: camera fitted (9.5px rms on 4032), both faces rectified (window strips, rows, the ground floor). View opp-ne-2019        |
| Mapillary 1250060548756768 (deirdreedsign)                                                                     | 2019-12-16           | CC BY-SA 4.0             | the west wall over the Olympia, from Peachtree St                                            | rough camera, the west wall's strips (view opp-west-2019)                                                                                |
| Mapillary 958284108244426, 957946755033586, 2843762619208682, 774085286615041, 773064893583087 (deirdreedsign) | 2019-12-16           | CC BY-SA 4.0             | Park Place, the side door, the corner at Decatur St                                          | the ground floor along Park Place, the side door's recess, the granite, by eye                                                           |
| GSU photo 20140416_GSU_WoodruffPark_AT_4131 (Concept3D 295231)                                                 | 2014-04-16, sun      | GSU, all rights reserved | Edgewood Ave from Woodruff Park                                                              | camera fitted (3.2px rms): the rows, the strips, the "GEORGIA STATE UNIVERSITY" band, the penthouse. View opp-woodruff-2014              |
| GSU photo 20070508_One_Park_Place_GSU_Signage_002                                                              | 2007-05-08           | GSU, reference only      | the sign on the corner at Decatur St                                                         | the "ONE PARK PLACE" plates (the same design in 2019)                                                                                    |
| USGS 3DEP lidar (GA statewide 2018)                                                                            | 2018                 | public domain            | all                                                                                          | the outline (parapet lines), every height, the penthouse, the sign band, the ground                                                      |
| OpenStreetMap ways 252608893 (this), 385744387 (Olympia)                                                       | -                    | ODbL                     | -                                                                                            | the old outlines                                                                                                                         |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/295231):

- https://assets.concept3d.com/assets/1108/20140416_GSU_WoodruffPark_AT_4131_6679da21a9c3a.jpg
- https://assets.concept3d.com/assets/1108/20070508_One_Park_Place_GSU_Signage_002_6679da20d20f8.jpg

Mapillary photos: https://www.mapillary.com/app/?pKey=<id>.

- **Newest photos**: Sept 2022 (Edgewood Ave's ground floor), Jan 2021 (Decatur St). The 2022
  facade is the 2019 one, Esri's 2026 roof is the 2018 lidar's.
- **Rating**: two fitted cameras (the corner in 2019, Woodruff Park in 2014), two rough ones.

## Facade breakdown

Heights are over 318.4m, the Edgewood Ave sidewalk at the police door (see the ground level).

- **Plan**: osm's outline is off on all four sides (Park Place 1.5m and Decatur St 2m too far
  in, the wall against the Olympia 0.4-1.1m too far out, Edgewood Ave 0.5m out into the
  sidewalk). The marble floors are redrawn on the lidar's parapet lines: a trapezoid with a
  sharp 56 degree corner at Edgewood Ave and Park Place. The outline is the ground floor:
  glass 2m back under the marble on Edgewood Ave and Park Place's first 35m, round a curved
  corner (radius 2m), and granite out at the face for the rest of Park Place and Decatur St.
  The side door on Park Place is in a recess 2.5m deep, part of the outline.
- **Heights**: the ground floor up to the soffit at 4.75 (323.15m). Eight rows of windows,
  sills from 7.38 (325.78m) every 3.361m, glass 1.68m tall, the last head at 32.59. The roof
  at 34.1, the parapet at 35.15 (353.55m). The penthouse (32.5 x 13.8m) to 39.4, the box on it
  to 41.5 (the json's height). campus.json had 21.2m from Overture, it's 35.7m to the parapet
  over the corner.
- **The floors**: white marble with soft grey clouds in slabs a window or a spandrel tall, the
  windows in strips set 0.15m in from the floor of the first row to the head of the last, a
  wide pier between strips. In each strip the panes (1.18-1.48m) sit between thin aluminium
  mullions that run up the whole strip, with veined marble between the rows. Edgewood Ave 4
  strips of 4 (5.63m, 2.07m of marble at both ends), Park Place 6 of 4 (5.92m, every 7.48m),
  Decatur St 5 of 3, the west wall 5 of 4 from the 4th floor up (under that the Olympia).
  A plain marble band over the top row, another over the ground floor.
- **The sign band**: a light grey box 0.8m out from the top of the Edgewood Ave face (s 6.3-
  24.3m from Park Place), "GEORGIA STATE UNIVERSITY" in dark grey, red under STATE, and gsu's
  flame at its east end (a plain blue square here).
- **Edgewood Ave's ground floor** (from Park Place): the curved glass, a dark granite pier, an
  entrance in dark granite (the city map in front of it), storefront bays between dark granite
  piers on the column lines (8.6, 16.1, 23.6, 31.1m), the police door in the last bay with the
  blue POLICE plate over it and a blue light bar on the piers either side (2022), dark granite
  to the Olympia. A small "ONE PARK PLACE" plate on the marble by the corner.
- **Park Place's ground floor**: storefront like Edgewood Ave's to 35m, then warm grey brown
  granite out at the face with a strip of windows over it (3.5 to the marble), the side door's
  recess with a light granite surround (40-42.7m), four small windows and a louvre, the
  "ONE PARK PLACE" plate at 55m. The corner at Decatur St has a strip of dark granite.
- **Decatur St's ground floor**: the same granite and strip of windows, the plate 6m from Park
  Place, four windows with posters in them (2021), a blue door with a sidelight.
- **Banners**: gsu's blue banners on brackets off the marble at 6-8.4m, three on Edgewood Ave
  and three on Park Place.
- **Colors** (overcast 2019, ratios in the photo): the marble about 0.8 of the sky, the granite
  0.55 of the marble, the dark granite and the soffit near black. In sun the glass is teal, under
  cloud a pale grey.

### What I changed from the research notes

- The windows are strips with veined marble between the rows, not separate windows with marble
  mullions: gsu's 2014 photo shows the aluminium mullions running up through the spandrels.
- The sign band goes from the top row's heads to 34.3 (the photo has its bottom at the heads,
  the lidar 0.5m higher) and is 0.6m further east.
- The small windows on Park Place moved 1m south so the first one clears the side door's
  surround.
- No frosted film on the storefront (2019 and 2022, a tenant's): couldn't do it without a new
  material.

## Not verified

- The storefront's setback (2m) and the curve's radius (2m): by eye, the lidar sees at least 1m
  under the soffit. +-0.7m.
- The ground floor's layout along Edgewood Ave (+-1m) and Park Place (+-1.5m): bearings from 2-3
  photos. The piers are put on the column lines.
- Decatur St's strips: groups of 3, but the count (5) and their spacing are guesses, only its
  east half is in a photo. The west wall's north half is behind trees in the only photo.
- The sign band: in the 2014 photo and the 2018 lidar, no newer photo shows the top of that face
  (I kept it, the lidar is the newest measurement and Esri's 2026 roof has the same edge).
- The doors on Decatur St (dashcam, +-2m), the second white one isn't drawn.
- The transom over the storefront is drawn dark granite, it's glass with a bar for real (it
  reads dark in every photo, and see-through glass there let the view and the sun through the
  empty building).
- The roof's units, the rust colored patch and the four ribbed panels at the south end aren't
  drawn.

## The ground level

The block falls 1.9m from the Olympia end of Edgewood Ave (318.56m) to the corner of Park Place
and Decatur St (316.74m). It's drawn from 318.4m, the Edgewood Ave sidewalk at the police door
(DATUMS in game/surface.ts: the terrain there is 0.25m low). The walls on Park Place and Decatur
St go on down to 2.2m under that, under the ground everywhere: the granite there is the real
wall, not the plinth. On Edgewood Ave the storefront's dark granite base shows 0-0.5m.

## The game's door

campus.json had it on osm's Park Place edge, 1.5m inside the real wall. It's the police
headquarters' glass door now: [-332.53, -23.25], facing Woodruff Park. The gps route from Hurt
Park gets there (the navgraph test passes). Furniture: 61 pieces behind the storefront, offices,
so no lobby-only rule.

The piers stand 0.15m out from the glass and the side door's surround 0.08m out from the
granite, so nothing's added to game/world.ts.

osm's sidewalks along Park Place and Decatur St met at a node under the real walls (they ran
along osm's wall lines), so the new outline cut both out of the map. build-campus moves that
node out to the corner of the sidewalk.

## The Olympia Building

The two storey Olympia (building 208) on the Five Points corner shares the west wall. It stays a
regular building, but its two corners on that wall go onto this building's corners, so there's
one wall in each place, and it's 10.4m tall now (the lidar has its roof and cornice at
328.9-329.3m, osm's two floors made it 7m). This building's west wall starts at 10.2, just under
its roof.

## Cost

8 parts (marble, veined, glass, clear, granite, dark, grey, blue), all from the library's
families, so no new shaders and no new textures. About 1.35k triangles: the strips are one hole
each in the marble, the panes are one quad a row. The marble is drawn first when you're close.
Everything casts but the banners: the building is empty inside and has glass on every side. The
soffit has a second sheet 0.8m up inside for the shadows (part 27).

Measured after the merge.
