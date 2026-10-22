# University Lofts Parking: references

What I built the University Lofts' parking deck (34 Piedmont Ave, built with the lofts about
2002, 268 spaces, for the lofts and some staff) from. It shares its north west side with the
lofts (university-lofts.md). It's not like GSU's other decks (brown precast spandrels): open
levels behind cable rails. Everything here is reference only: no photos are in the repo, the
measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                | date                       | license                  | facade                             | used for                                                                                                                                            |
| ------------------------------------------------------------------------------------- | -------------------------- | ------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 900564 "Docks - Lofts"): `Loft_s_Gate`  | uploaded 2024-04-16        | GSU, all rights reserved | the dock gate on Auditorium Pl     | the loading dock's drive between the lofts and the deck behind a green chain link gate, the deck's second level edge low over the street there      |
| Mapillary 3983093325108905, 466611037779210, 471744294111034 (deirdreedsign)          | 2019-12-19 17:07, dusk     | CC BY-SA 4.0             | Piedmont Ave                       | the levels and cable rails, the storefront and green awnings, the two car doors and the open bay. One camera fitted on the lofts, side by side      |
| Mapillary 503421650785958, 765825770964937 and the frames before them (deirdreedsign) | 2019-12-16 15:41, overcast | CC BY-SA 4.0             | Auditorium Pl and the south corner | the stair's glass lobby and its mesh screens, the low wall and chain link on Auditorium Pl, the posts and cables. Mapillary's poses, heading by eye |
| USGS 3DEP lidar (GA statewide 2018)                                                   | 2018                       | public domain            | all                                | the outline, the roof (9.1-9.7m, a strip of parked cars 11.1m), the stair (12.9m) and the elevator tower (15.85m), the ground                       |
| Esri World Imagery Wayback, release 63116                                             | 2026-02                    | Esri, reference only     | roof                               | the same deck as the lidar                                                                                                                          |
| OpenStreetMap way 252608889                                                           | -                          | ODbL                     | -                                  | the old outline (1-3m off)                                                                                                                          |
| GSU parking and housing pages, Brookwood Group                                        | -                          | text                     | -                                  | the date, the spaces, the bike room on Piedmont Ave, the dock                                                                                       |

- **Newest photos**: 2024 (the dock gate), 2019 (Piedmont Ave and Auditorium Pl). Nothing newer of
  the deck itself; the 2026 satellite image matches the 2018 lidar.
- **Rating**: one rough camera fit (Piedmont Ave), the rest by eye on Mapillary's poses, whose
  headings were 13-18 degrees off.

## Facade breakdown

- **Plan**: on the lofts' Auditorium Pl grid, from the lofts' long wall to Piedmont Ave, wrapping
  round the lofts' east wing and the elevator tower in the notch. build-campus.mjs redraws osm's
  outline on the lidar. The lofts' loading dock is a drive 4m wide between the two from
  Auditorium Pl, behind a gate: it's left out of the outline (it's outdoors, the second level
  stops at it, the third level and the roof go over it).
- **Levels**: the ground floor, two levels and the roof: decks at 3.35, 6.38 and 9.4m with
  0.45m slab edges, a cable rail 1.1m tall on each (about nine cables, galvanised posts every
  4.5m), square columns 1.5m in on an 8.7m grid. The roof is drawn flat; the lidar has it a bit
  lower on the Auditorium Pl half and a strip 2m higher in the middle, which is parked cars.
- **Ground floor**: on Auditorium Pl a low concrete wall and green chain link up to the second
  level (the street is 0.3-1.2m over the deck's floor there, so it looks low); on Piedmont Ave a
  storefront with white mullions and green awnings, two slatted car doors and an open bay with a
  chain link gate. The red and white "EXIT ONLY" bar over the doors isn't drawn.
- **The stair**: on the corner, a glass lobby with white frames over a block base, then a
  concrete frame with green wire mesh screens on the two street sides to 12.9m, flights inside.
  The real screens have green X bracing, left out.
- **The elevator tower**: a concrete box in the notch by the lofts' east wing to 15.85m (it's
  painted blue block inside, not drawn).
- **Colors**: weathered light grey concrete (overcast 2019 photos), the decks' undersides darker,
  galvanised steel, dark green awnings and chain link.

### What I changed from the research notes

- The dock drive is cut out of the outline (the notes had the deck right up to the lofts' wall
  there): with the second level over it the gate in the 2024 photo wouldn't fit, and the inside's
  ceiling would have shown over the drive.
- The elevator tower is in the deck's outline (the notes left the notch out of both buildings).
- The door is in the stair's lobby on Piedmont Ave (osm's was 1.3m inside the new wall).

## Not verified

- The levels' heights and the ramps: only the roof is measured; the second and third levels are
  spaced evenly, and the second is just over the inside's ceiling (3.3m) so that doesn't show.
- The post spacing, the column grid, the storefront's bays, the car doors' and the open bay's
  widths, the stair's flights.
- The north east side on the drive: no photos, a low wall and chain link like Auditorium Pl.

## The game's door

The door is in the stair's glass lobby on Piedmont Ave, facing the street. Parking decks stay
empty inside (furniture.ts). The inside's walls are see through all the way round (they're
5cm in off the lofts' wall so the two don't fight), and a concrete floor 12cm up covers the
inside's floor. The gate across the dock drive, the columns and the two towers' walls are
collision (game/world.ts parkingObstacles).

## The ground level

Same as the lofts, 304.3m (DATUMS), the two share the wall and the dock. Piedmont Ave is 0-0.1m
off that, Auditorium Pl climbs from 0.2m at the corner to 1.2m at the dock gate.

## Cost

7 parts (concrete, soffit, steel, cables, mesh, glass, green), all from the library's families,
no new shaders. The cable rails and the chain link are see through glass (clearGlass): one quad
per level and side, the cables are its transom lines, so no geometry per cable. The soffit is
the same concrete darker for the decks' undersides: lit by the sky's light from under the
horizon they came out as bright as the street. Steel and glass don't cast shadows.

About 2.5k triangles: steel 1.7k (the posts), concrete 0.6k, the rest under 0.1k each.

Measured after the merge.
