# J Deck: references

What I built J Deck (75 Piedmont Deck) from. It's GSU's deck behind 75 Piedmont Ave, and most of
it is under its own roof: the roof is an open lot at the Piedmont Ave sidewalk's grade, the same
level as 75 Piedmont's lobby. Cars come up onto the roof by a short ramp off John Wesley Dobbs Ave,
or go down a drive next to it into the level under the roof. The east side stands over a lower lot
and shows two levels. Everything here is reference only: no photos are in the repo, the
measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                               | date                | license              | facade                       | used for                                                                                             |
| -------------------------------------------------------------------- | ------------------- | -------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 700814) "piedmontdeck" | uploaded 2026-04-29 | GSU                  | the roof, the level under it | the roof's grey concrete, rows of cars, poles; white block walls and blue columns inside (not drawn) |
| GSU campus map, "Lower J Deck bike rack" (1242043)                   | uploaded 2026-08-05 | GSU                  | inside                       | that there's a lower level                                                                           |
| GSU campus map, "J_Deck_Atlanta_Campus" (3 photos)                   | 2018-12-11 13:12    | GSU                  | the way in, the roof         | the ramp and the drive down, "CLEARANCE 6'6"", the J DECK sign, the parapet and its black rail       |
| Mapillary (deirdreedsign, lvl5) on John Wesley Dobbs Ave             | 2019                | CC BY-SA 4.0         | the north side               | by eye: the tan wall along the drive                                                                 |
| USGS 3DEP lidar (GA statewide 2018)                                  | 2018                | public domain        | all                          | the roof, the ground round it, the way in                                                            |
| Esri World Imagery Wayback                                           | -                   | Esri, reference only | roof                         | the rows of cars                                                                                     |
| OpenStreetMap way of building 199                                    | -                   | ODbL                 | -                            | the outline                                                                                          |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/700814

- **Rating**: no camera fit. Everything that shows is from the lidar; the east side was never
  photographed.

## Measurements

Elevations are USGS lidar (2018).

- Roof: 303.78m everywhere (x 328 to 384, z -301.6 to -197). That's the datum (303.8) and 75
  Piedmont's lobby floor.
- The lot east of the north wing (x 370 to 395): 295.5, so that side is 8.3m tall. East of the
  south wing 300.1, south of it 300-303, west of it 301.5-303.
- John Wesley Dobbs Ave side: the drive down at x 357 to 365 is 300.6 at the deck, the ramp up to
  the roof at x 344 to 356 starts at about 301.5.
- osm's 13.9m was the drop from the roof to the low lot; the outline is osm's but its west side
  goes along 75 Piedmont's tower and annex.

## What's in the game

- A new style `buried` in campus/parkingDecks.ts, drawn from the outline: the roof slab, a 1.05m tan
  parapet with a black rail on posts, walls down to the ground where it falls away, open bands with
  columns behind them for each level that's out of the ground (levels at 300.6 and 297.4, guessed),
  the way in off John Wesley Dobbs Ave with the blue "CLEARANCE 6'6"" bar, no parapet where the
  ramp comes onto the roof or along 75 Piedmont.
- Light poles, white lines and 7 rows of spaces on the roof (game/parking.ts puts cars in them, 60%
  full, its own random numbers), the J DECK sign with a plain blue square where the logo is.
- build-campus.mjs PARKING_DECKS 'J Deck': the outline, the box, height 1.05 (the parapet), the
  door on the roof where the ramp comes up. 'J Deck' left MEASURED_HEIGHTS.

## What still differs

- The east side was never seen in a photo: two open levels over a solid base is a guess, and so are
  the levels' heights.
- The game's ground (usgs bare earth on a 4m grid) has no drive down to the way in: it's a slope from
  the street to the roof, so the way in's bottom starts at the ground and the ramp isn't its own
  thing. The real one has a tan wall between the ramp and the drive.
- No booth island, gate arms, sign posts or blue accessible paint on the roof.
- The roof's concrete is darker and cooler since Nov 26 2026 (#7a8288 -> #6c747e), matched with
  ratios inside each picture: on GSU's 2026 roof photo the sunlit roof is 1.17x the annex's tan
  fascia (luminance), the game had 1.33 and has 1.19 now; on the satellite the roof is as neutral
  as the white roofs round it, the game's top view went from R/B 1.09 to 1.03 (the game look 1.13
  to 1.08, it's warmer everywhere). The photo's roof in shade is much bluer than the game's shade:
  that's the light, not the concrete.

## Cost

5 parts (tan, slab, soffit, rail, dark): A Deck's materials, a cool grey roof concrete (same shader)
and T Deck's dark metal. No new shaders. About 3.2k triangles, 1.4k of them the rail (only drawn
within 80m). Soffit, lines and rail don't cast.

Measured after the merge.
