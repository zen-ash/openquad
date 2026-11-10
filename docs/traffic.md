# Cars: parking and traffic

Where the cars are. game/parking.ts places the parked ones, game/lanes.ts and game/traffic.ts
drive the rest. The car models and drawing are separate (campus/cars.ts, scene/Cars.tsx); they
only read `parkedCars()` and `drivingAt(seconds)`.

## Sources

| source                                             | date                         | used for                                                             |
| -------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| Esri World Imagery Wayback, release 63116, zoom 19 | 2026-02-02 (a Monday, ~11am) | which curbs have cars, how full each lot and deck roof was, lot rows |
| the same release, zoom 20                          | 2022-09-27                   | curbs and rows where the 2026 image is in shadow                     |
| OpenStreetMap (saved answer of 2026-10-21)         | -                            | streets, `oneway`, `lanes`, `lanes:forward`, signals, lots           |
| campus/parkingDecks.ts, campus/loftsParking.ts     | -                            | the decks' floors, ramps, columns and towers (from the lidar)        |

Reference only: nothing from the images is in the repo, the positions are my own.

## Parked cars

- **Decks**: rows of 90 degree spaces (2.7 x 5.5m) backing onto the faces and the lines of
  columns, three spaces a bay, on every level the deck draws. The steel decks' floors are the
  helix halves (the cars sit on the slope), m's ramp bay has spaces on the ramp. The ends of the
  helixes and m's end bays are left for turning. Roofs as full as on the satellite (n 10%, k 4%,
  s 5%, m 5%), the covered levels fuller further down (75% to 35%, a guess). G Deck has none:
  its roof was empty and its covered floors aren't drawn (dark screens).
- **University Lofts Parking**: rows backing onto its 8.7m column grid, ground floor to roof.
  The roof's real spaces are angled (about 60 degrees), the game's are square.
- **Lots**: two rows and an aisle every 18m along the lot's longest side, only spaces wholly in
  the lot and off its drives, islands, paths and trees. 20-40% full like the satellite. Not in
  the lots up north out of sight, l26 (a paved court), l27/l28 (a building site with a tower
  crane) or l30 (built on). Three lots osm doesn't have are in MORE_LOTS.
- **G Deck's toll plaza** (game/raised.ts) is a lot too: a row along g's plaza side, two back
  to back past the aisle, one along the north east edge past the pergola, all between g and the
  booth's lanes and clear of the booth, planter, bowls, light poles and canopy/pergola posts
  (deckObstacles). GSU's 2018 photo from Central Ave has cars there beyond the bowls; the 2026
  satellite has a few by g, in its shadow. They stand on the plaza (surfaceAt).
- **Curbs**: the stretches the satellite has cars along (Gilmer St, Pryor St, Wall St,
  Coca-Cola Pl, MLK Jr Dr, Washington St, Courtland St and Edgewood Ave at Hurt Park, Jesse Hill
  Jr Dr, Decatur St east, Auburn Ave), 6.4m a space, clear of crosswalks (6m), lights (9m past
  the cross street), drives and side streets. Not on bridges. The lanes next to them are
  narrowed so the traffic keeps clear.
- They're solid where you walk: on the ground, and on the floor you walk on inside a deck (not
  the levels over your head, collisions are flat).

## Traffic

- **Lanes** (lanes.ts): the streets 7m and wider within 120m of the fence and
  25m more, cut where they leave that area: cars come in and leave there. Lanes from `lanes`,
  `oneway` and `lanes:forward` (build-campus.mjs keeps them on the roads now), squeezed to fit
  the drawn road (2.4m at least). Pieces of osm way that just carry on are one stretch;
  junctions with no room for a car between them are one junction. Curves from each lane to the
  lanes it can turn into, made as the routes need them.
- **Driving** (traffic.ts): the Krauss car following model (never closer than it could stop),
  1s steps. Red lights and late yellows stop them, stop signs on the smaller street where
  there are no lights. In a junction a car waits while anyone on a curve that crosses its own
  isn't past the crossing, while someone's committed to going, or for a car with the right of
  way (bigger street, then straight over turning; after 20s of waiting it stops giving way),
  and for room past the junction. Routes go mostly straight, two turns at most.
- **Lights**: game/signals.ts `lightAt(offset, road, seconds)` is the one function both the
  lamps (scene/Signals.tsx) and the cars use: a minute round, 25s green, 3s yellow, 32s red,
  the junction's two roads half a round apart. The lamps now read the real clock every frame
  (they used to add up frame times, which stopped while the tab was hidden).
- **Same for everyone**: the cars come in on a timetable that repeats every 600s. The traffic is
  driven once, period after period, until a period ends exactly like the one before (two
  periods today) or like one two or three periods back. That last stretch is kept as each car's
  distance along its route at every second; `drivingAt` looks it up by the clock. Only sums,
  products, sqrt and comparisons go into the driving, so another browser gets the same numbers.
  The first call drives a few ms a frame till it's done (no cars for about the first half
  second).
- **Players**: the cars can't wait for anyone (everyone sees the same traffic), so a driving
  car pushes you out of its way (World.moving in collision.ts).

## Numbers (Nov 8 2026, measured with other agents busy, so rough)

- Parked: 1129 (M 319, N 167, K 163, S 92, lofts 97, lots 207, G's toll plaza 11, curbs 73). Worked out once,
  ~55ms.
- Driving: ~73 on the streets at once (62-83), 0 towed, 0 red lights run. The timetable seed
  in use settles after 4 periods into repeating every 2 (20 minutes).
- Network ~25ms, driving it ~45-70ms (both done in slices), drivingAt ~0.01ms a frame.

Collins St (the service alley under the viaduct) has no traffic: the ground there drops 6.8m in
about 17m at (-88, 185)-(-104, 204) (an old terrain.json bug), cars on it nosedived.

## What's still off

- Cars pop in and out where the streets leave the area (~145m from the fence, 25m past it).
- Five Points and the two big merged junctions (Courtland St/Edgewood Ave/Auditorium Pl and
  Edgewood Ave/Peachtree Center Ave) are crossed on long curves; cars there follow one curve
  rather than the real lane markings.
- The demand is set just under what the junctions take: more cars, longer curves or another
  timetable seed and some periods never settle into repeating, or a car gets stuck and towed
  (the tests catch both). Longer bezier handles on the merged junctions' curves (so they keep
  to the street longer instead of cutting the corner) made it tow cars, so they're as before.
- Decatur St's ground comes up to a meter under Courtland St's deck near (-86, 181) and dips
  20 degrees under the viaduct by (-99, 198) (terrain.json): cars follow it. Washington St's
  deck ends 3m over the street at the edge of the area.
- The lofts deck's roof spaces are square, not angled. Deck levels under the roof: fill is a
  guess. Grady Piedmont Deck (east of Piedmont Ave) is a 14m box in the game, the satellite has
  a parking surface with about 40 cars there.
- No turn lanes, buses, trucks or the streetcar on Edgewood Ave. Nobody parks or leaves a space.
