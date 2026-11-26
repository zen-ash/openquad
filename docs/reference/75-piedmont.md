# 75 Piedmont Avenue: references

What I built 75 Piedmont Ave from. It's the old Citizens Trust Bank building (OSM still calls it
that), now GSU office space: Undergraduate Admissions, the Registrar, the Counseling and Testing
Center, Panther's Pantry. A slab on Piedmont Ave with tan precast fins at every bay and dark glass
over taupe spandrels, "GEORGIA STATE UNIVERSITY" on a light grey band at the top, and a granite
annex on its east side that holds the lobby. The lobby opens onto J Deck's roof. Everything here is
reference only: no photos are in the repo, the measurements are my own. Photos I downloaded are
kept outside the repo.

## Sources

Newest first.

| source                                                              | date                | license              | facade                                   | used for                                                                                        |
| ------------------------------------------------------------------- | ------------------- | -------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, J Deck 700814) "piedmontdeck2" | uploaded 2026-04-29 | GSU                  | the deck side (east), the annex          | camera placed by eye: fins, spandrels, glass in the sun (colors as ratios), the annex, canopies |
| GSU campus map (location 295207) "Piedmont_Front", "image1/2/5"     | 2026-04-24          | GSU                  | the Piedmont Ave ramp, the annex's doors | the ramp under the canopy with tan columns, red granite at the entrances                        |
| GSU campus map photo "20210818MLB_Housing_Stock_063"                | 2021-08-18          | GSU                  | Piedmont Ave side and the south end      | bays (22) and rows (12) counted on a pixel profile, the sign band, letters, logo, red bar       |
| GSU campus map photo "20200823_MLB_First_Day_044"                   | 2020-08-23, dusk    | GSU                  | Piedmont Ave side, top half              | two panes a bay, the band's proportions                                                         |
| Mapillary 185565750088473 (deirdreedsign)                           | 2019-12-15 16:30    | CC BY-SA 4.0         | Piedmont Ave side from the south         | by eye: the entrance canopy's deep fascia, the second floor over the sidewalk, the storefronts  |
| Mapillary (SydneyIStroud) on Piedmont Ave                           | 2022-09-13          | CC BY-SA 4.0         | the ground floor on Piedmont             | by eye: the restaurant terrace on the south half (not drawn)                                    |
| USGS 3DEP lidar (GA statewide 2018)                                 | 2018                | public domain        | all                                      | the outline, every height, the ground                                                           |
| Esri World Imagery Wayback                                          | -                   | Esri, reference only | roof                                     | the roof and the annex                                                                          |
| OpenStreetMap way of building 53                                    | -                   | ODbL                 | -                                        | the old outline (with the canopies in it)                                                       |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295207

- The campus map's "75piedmont.jpg" (bike rack location) is a Google Street View screenshot. Not
  used.
- **Newest photos**: April 2026 for the deck side and the entrances, 2021 for the whole Piedmont
  side. Nothing newer shows the top.
- **Rating**: no camera fit, cameras placed by eye on the lidar. Bays and rows counted.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the lobby floor, which is J Deck's
roof (303.8m).

- Tower: x 308.0 to 329.8, z -304 to -234 (21.8 x 70m). Roof 354.6, the band's top 355.3 (51.5).
  No penthouse in the lidar.
- Annex on the east side: x 329.8 to 343.8, z -297.8 to -266.4, top 312.6 (8.8). A low strip on the
  north end (osm's, z -308.9 to -304) at 312.4.
- The drop off canopy over the deck roof by the annex: top 307 (3.2). The canopy over the ramp to the
  Piedmont Ave doors: x 301.6 to 308, z -282 to -265, top 308.6 (4.8). The second floor out over
  the sidewalk north of it: x 306.4 to 308, z -309 to -279, top 312.4 (8.6).
- Ground: the Piedmont Ave sidewalk falls from 303.6 at the north end to 302.0 at the south end. J
  Deck's roof is 303.8 all over.
- From the 2021 photo: 22 bays on the long sides (3.18m), two panes a bay with a dark mullion, a
  fin on every bay line. 12 rows of windows between the ground floor (4.8m) and the band (3.575m
  floor to floor), window about 55% of it. The band is about 1.1 rows tall (3.5m).

## What's in the game

- campus/piedmont75.ts. Outline redrawn in build-campus.mjs (PIEDMONT_75): the tower, the north
  strip and the annex. The canopies and the second floor over the sidewalk stand outside it. The
  door moved from osm's spot to the tower's west face under the ramp's canopy (the Piedmont Ave
  doors). The drop off canopy's notch went to J Deck's outline.
- Long sides: spandrels on the wall line, the glass 5cm behind, tan fins 0.45m out, wider ones at
  the corners. Storefronts between the fins on Piedmont Ave, a tan wall with two windows on the
  deck side (Kenley's). Ends: tan with ribs, two shop windows on the south end.
- The band all round, "GEORGIA STATE UNIVERSITY" on the Piedmont Ave side in three words, red under
  STATE, plain blue squares where the logo is (Piedmont Ave side and the south end).
- The annex and north strip: red granite with a tan fascia, the lobby doors under the drop off
  canopy.

## What still differs

- The ends (north and south) are drawn as solid tan with ribs: the 2021 photo sees the south end at
  a grazing angle and looks solid, but it could be glass behind deep fins.
- No photo of the east side's band: no letters there (I don't know if there are any).
- The ground floor on Piedmont Ave is storefront glass all along. The real south half has a
  restaurant terrace with a cable rail and a hedge in front, recessed storefronts and awnings.
- The ramp up to the Piedmont Ave doors, its rails and the planters aren't drawn (the game's
  sidewalk is a slope there).
- The real tower reads darker and browner in GSU's photos (bronze spandrels); in the game's sun the
  fins come out a little warm.
- The deck side's small concrete canopy over the freight door, the rooftop units over it and the
  accessible spaces' blue paint aren't drawn.

## Cost

5 parts (fin, spandrel, glass, granite, band) from the library's families (precast, glass,
marble), no new shaders or textures. About 750 triangles. Glass and the band don't cast; a hidden
core keeps a low sun from going through. The fins are drawn first when you're close.

Measured after the merge.
