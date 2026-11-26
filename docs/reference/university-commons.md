# University Commons: references

What I built University Commons from (141 Piedmont Ave, GSU housing since 2007, about 2000
students). It's four apartment buildings in a C round courtyards: 15 floors on the north west, 9 on
the south west, 12 on the north east and 8 on the south east ("eight to 15 stories" on GSU's map).
The two on Piedmont Ave stand on the ground with the gap to the courtyards between them, the two
on the east stand on a parking deck whose roof is the big courtyard and whose open floors face J W
Dobbs Ave, Jesse Hill Jr Dr and the Ellis St ramp. Beige precast with white topped bays, small
windows in white frames, a brick ground floor of shops on Piedmont and J W Dobbs, a glass cylinder
over the main doors on the corner. Everything here is reference only: no photos are in the repo,
the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                             | date                   | license       | facade                                   | used for                                                                                     |
| ------------------------------------------------------------------ | ---------------------- | ------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 287173), text        | 2026                   | GSU           | -                                        | four buildings A-D, 8 to 15 storeys, front entrance on Piedmont Ave, the deck's address      |
| GSU campus map photos "image8/9/11/12"                             | uploaded 2026-08       | GSU           | the shops on J W Dobbs, the gate, inside | by eye: brick piers, white framed storefronts, blue canopy fascias                           |
| GSU campus map photo "20221007MLB_Presidental_Scholars_0140"       | 2022-10-07             | GSU           | the east courtyard's plaza               | by eye: plain grey precast, concrete planters (and gsu's blue swooshes painted on the plaza) |
| Mapillary (SydneyIStroud) at Piedmont / J W Dobbs                  | 2022-09-13             | CC BY-SA 4.0  | the corner from across Piedmont          | by eye: the corner doors, the "141" pylon, the planter                                       |
| Mapillary (sherbets) along the Ellis St ramp                       | 2021-06-14             | CC BY-SA 4.0  | north faces                              | by eye: the north faces are the same beige precast, windows in rows                          |
| Mapillary (atze02, toddwiese) along J W Dobbs Ave                  | 2019-12-19, 2020-08-29 | CC BY-SA 4.0  | the deck, the terrace wall               | the deck's corner, the concrete wall with a rail along the sidewalk under the shops          |
| Mapillary (deirdreedsign) along Jesse Hill Jr Dr and J W Dobbs Ave | 2019-12-11/12          | CC BY-SA 4.0  | east faces, the deck                     | by eye: four open deck floors, slender piers, the residential floors over them               |
| GSU campus map photo "20200603_MLB_Downtown_099"                   | 2020-06-03             | GSU           | the east courtyard looking west          | the courtyard faces, the panel joints, light top floors and tan middle on the 15 floor one   |
| GSU campus map photo "20191126CPR__University_Commons_002"         | 2019-11-26             | GSU           | the Piedmont / J W Dobbs corner          | the cylinder, the brick shops and canopies, the white top two floors, colors                 |
| GSU campus map photo "University_Commons_Deck_Atlanta_Campus_"     | undated (winter)       | GSU           | the deck on J W Dobbs Ave                | the deck's bays, spandrels, piers and the way in                                             |
| USGS 3DEP lidar (GA statewide 2018)                                | 2018                   | public domain | all                                      | every roof height, the penthouses, the deck's roof, the ground round it                      |
| OpenStreetMap way of building 88                                   | -                      | ODbL          | -                                        | the outline (it fits the lidar roofs), all four buildings in one ring                        |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/287173

- **Newest photos**: GSU's 2026 uploads show only the ground floor and inside. Nothing says the
  outside changed since 2019-2022.
- **Rating**: no camera fits, every side by side is by eye (the cameras are placed by hand).

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the sidewalk at the Piedmont Ave /
J W Dobbs Ave corner (305.0m).

- Ground: Piedmont Ave is level at 305.0-306.0, the Ellis St side 306 at the west end down to
  ~301.5 under the north east one, Jesse Hill Jr Dr 294.5-295.5, J W Dobbs Ave 304.8 at the corner
  falling to 296 at Jesse Hill. The west courtyards are 306.3-307.3, the gap between the two west
  buildings climbs from 306 to 311.2 into the east courtyard, which is the deck's roof at 311.3.
- Roofs: north west 352.65 (47.65), south west 335.0 (30.0), north east 346.8 (41.8), south
  east 335.0 (30.0). Penthouses: 357.9 over x 365-381 z -438.5..-426.5 (where the north two meet),
  340.1 over x 370-386.5 z -382..-369.5 (where the south two meet), three small ones 2.8-3.2m. The
  cylinder's top is 338.5 (33.5).
- Floors: 15 floors over the ground at 3m (a 4.6m ground floor), 9 at 2.95 (a 5m brick ground
  floor), 12 at 2.9 and 8 at 2.85 from the deck's roof (6.3). They're counted from the heights and
  GSU's 8 to 15, and the 2019 photo (8 floors over the brick on J W Dobbs).
- Split: west of x 379 the two on Piedmont (split at z -398, the gap), east of it the deck's two
  (split at z -416, where the north east roof steps down at x 455).
- Windows: about one every 2.8m of wall, 1.15 x 1.45m, 0.8m over each floor (the 2020 photo).
- The deck: floors every 3.2m down from its roof, spandrels about 1.05m, piers about 9.6m apart
  (the deck photo shows 6 bays across its J W Dobbs front).
- The cylinder: osm's quarter circle round the corner (middle 311.8, -358.2, radius 5.65).

## What's in the game

- campus/universityCommons.ts, osm's outline kept. build-campus.mjs (UNIVERSITY_COMMONS) only
  swaps the corner's 1m bits of quarter circle for 3 facets, so the doors (in the middle one, under
  the cylinder, facing the corner) have a wall to be in, and sets the height and `landmark`.
- Every outline edge is split where it crosses the two cut lines and belongs to the building its
  middle is in. Each building's roof is the outline clipped to its corner (the order of the two
  clips matters, see roofOf), and where a taller one stands over a lower one there's a wall on the
  cut line.
- Streets get the beige precast with the top two floors white and a cornice on each wide bay. The
  courtyards get the same without the cornices. Piedmont Ave and J W Dobbs (south west) get the
  brick shops: storefront glass, the white band over them, blue canopies on the south west one.
- The deck's streets get dark open floors with concrete spandrels and piers standing out from them,
  down to the low streets. A terrace along J W Dobbs in front of the shops with its concrete wall
  along the sidewalk.
- The windows are flat glass quads on the walls (about 2900 of them), the walls behind them are
  whole, so they cast for the floors behind and no shadow core is needed.
- The glass cylinder: a true quarter circle of curtain glass a floor a pane, a white band round the
  top and a lid 3.5m over the roof, a curved canopy over the doors.
- furniture.ts: University Commons only gets seats in the lobby by the door (the outline is all four
  buildings, it was rows of study tables across the whole block).

## What still differs

- The windows are single and evenly spaced; the real ones come in pairs per panel. They're flat on
  the wall (no reveal) with a white frame drawn by the glass shader.
- The real precast has darker recessed strips between the bays and a darker middle band on the 15
  floor one; here it's one beige with a white top on every face.
- The north east building's last 5m at the east end is lower in the lidar (340.9 vs 346.8): drawn
  at the full height.
- The game's ground in front of the deck on J W Dobbs is ~2.5m higher than the street (the
  terrain fills the deck's footprint from round it and blurs it out), so the deck's street floor and
  its way in are buried. The courtyards' ground is a gentle mound instead of the flat lawn and plaza
  on the deck. Not this building's code (terrain.json).
- The courtyards' trees, planters, the lawn's walkway, the blue swooshes on the plaza (left out, it
  reads as gsu's flame) and the turnstile gate in the gap aren't drawn.
- The ground floor under the cylinder is brick with a glass door; the real one is a deep dark
  entrance under a white canopy. The "141" pylon and its planter on the corner aren't drawn.
- No rail on the terrace wall, no shops' inside behind the storefronts (opaque glass).
- The Ellis St and Jesse Hill faces are only checked by eye from dashcam frames.

## Cost

8 parts (tan, light, glass, curtain, brick, concrete, dark, metal) from the library's families
(precast, glass, brick, concrete, metal), no new shaders or textures. About 10k triangles: glass
~5.5k (the windows), concrete ~2.4k (the deck, roofs, plinth), light ~0.9k, tan ~0.5k, the rest
small. Glass, curtain and metal don't cast, the canopies (metal) are only drawn within 80m.

Measured after the merge.
