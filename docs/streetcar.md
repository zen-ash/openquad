# The streetcar

The Atlanta Streetcar (MARTA's downtown loop, Siemens S70s) as it runs in 2025-2026.
`game/streetcar.ts` says where the track is, where the stops are and where the cars are at a
time on the clock, `campus/streetcar.ts` makes the car, the stops, the poles and wire and the
rails, `scene/Streetcar.tsx` draws them.

## Sources

| source                                                                                                                      | date           | used for                                                                   |
| --------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| MARTA's GTFS feed (route ATLSC), valid Aug 22 - Dec 11                                                                      | 2026           | stops, their order, the timetable, hours                                   |
| OpenStreetMap (saved answer of 2026-10-21)                                                                                  | -              | which streets have rails (`embedded_rails=tram`), center lines             |
| Siemens' Atlanta S70 data sheet                                                                                             | -              | 24.11 x 2.654 x 3.84 m, three sections, six axles, 4 doors a side          |
| Esri World Imagery Wayback, release 63116 (zoom 19-20)                                                                      | 2026-02-02     | the track's place in Edgewood Ave at Hurt Park, the platform               |
| Mapillary 803891056915232, 770202933641578 (CC BY-SA)                                                                       | Apr / Dec 2019 | concrete trackway, poles with arms on the curb side, one wire, the shelter |
| USGS 3DEP lidar (GA statewide, 2018), ground points: elevation and intensity                                                | 2018           | curbs, the paint and the concrete lanes on Edgewood and Auburn             |
| Commons: "Atlanta streetcar, 2020", "Atlanta Streetcar on a mid-morning run heading east on Edgewood Avenue" (CC BY-SA 4.0) | 2020, 2016     | the car's shape and colors                                                 |

Reference only: nothing from them is in the repo. The track is osm's center lines moved over
(my own numbers), the timetable is a handful of minutes.

## The route and the timetable

The loop only goes one way round: east on Edgewood Ave, west on Auburn Ave. In the map that's
two stretches: Luckie St from Centennial Olympic Park, across Peachtree St, down Park Place
and east on Edgewood past Hurt Park to the Sweet Auburn Market (`EAST`), and Auburn Ave from
Dobbs Plaza past Woodruff Park, up Peachtree St to Peachtree Center, Ellis St, Carnegie Way and
Andrew Young International Blvd (`WEST`). Each is a hand list of points down the middle of the
track: osm's center line moved to the right hand lane (half the road less 1.7 m), and on
Edgewood from Peachtree Center Ave along Hurt Park and on Auburn east of Courtland St the middle
of the lane the streets really have there (below), the corners rounded off by a running mean
(about a 15 m radius at the tightest).

## Edgewood and Auburn

osm draws these as plain secondary/tertiary streets (11 and 9 m). Along Hurt Park Edgewood is
13.8 m curb to curb and osm's line is ~2 m north of its middle; Auburn east of Courtland St is
~12.4 m. Measured on the lidar's ground points (the curbs as steps, the paint and the concrete
as bright returns) and checked on the Feb 2026 satellite image, then set by osm way id in
build-campus.mjs `EDGEWOOD` (the street's middle, width, a hatched median, where the white lines
are). Along Hurt Park, north to south: a 1.4 m bike lane, the westbound lane, a 3.3 m hatched
median between double yellow lines (bars every 4.6 m), the streetcar's lane (concrete curb to
median, 3.9 m) and a 2.3 m parking lane. West of it to Peachtree Center Ave there's a second
westbound lane (to turn left) and only a double yellow line, and the block before Peachtree
Center Ave has a left turn lane next to the streetcar's; from there to Park Place it's 12.4 m
with bike lanes both sides, two lanes west and a double yellow line by the streetcar's lane. The
hatch runs on to the crosswalk at Courtland St (a median's third number: how far along it goes),
and a negative white line number is a double line (between the streetcar's and the parking
lane, like the photos). On Auburn the streetcar's lane is the
westbound one, between parking lanes on both sides. The road shader paints it all from a second
attribute (`aLanes`: the median and the white lines, ground.ts `lanePaint`), the same in all
three looks; the lanes (game/lanes.ts) come from the same numbers. The eastbound lane is the
streetcar's but it isn't only for it: cars drive in it too (the 2019 photo has one in it), behind
the streetcar.

MARTA runs two cars 15 minutes apart, round the loop in 30 minutes with a 4 minute wait at
Centennial Olympic Park, the same every day: car 1 8:17 to 23:15, car 2 8:32 to 23:00 (eastern
time). Each stretch is driven once at load: from the stop before it to the one after, speeding
up at 1 m/s2, braking at 1.1, at most 11 m/s (25 mph), slower round the curves, stopping at
every platform for at least 18 s and till its time, and at red lights (the same `lightAt` as the
cars and the lamps). Half an hour is 30 rounds of the lights, so it's the same run every time
for both cars, and `streetcarsAt(seconds)` just looks it up on the clock. The 30 minutes divide
a day and both time zone offsets, so the cars are at the same place for the same minute past
the hour all year.

## The cars

Three sections each (9.3, 5.51, 9.3 m), every section on the track at both ends, so they bend
round the corners. Built in code: a cross section along the length with the paint changing at
the window line, the sill, the skirt, the doors (one double door near each joint on the end
sections, two on the middle one), a cab with the windshield leaning back and the nose narrowing,
lamps, the destination sign, rubber bellows at the joints, the trucks behind the skirt, roof
equipment under blue covers and the pantograph up to the wire on the middle section. MARTA's
blue and purple, black glass. No logo and none of the livery's teal and green swooshes: plain
blue where they are.

One material for the whole car (`streetcarMaterial`), the colors and how shiny each bit is from
vertex attributes, so a section is one draw. Head lamps on the leading end, tail lamps on the
other, the sign always lit, the windows warm at night. Each section is its own mesh (culled on
its own, they're far apart most of the time).

## Stops, wire, rails

- Platforms: 27 m along the track (Hurt Park's 25, x -12..13 in the parking lane where the
  satellite has it, the shelter where the lidar has its roof), 3 m wide, 0.36 m up (the S70's
  low floor), edge 1.62 m from the middle of the track. They're raised plazas (game/raised.ts, `by: 'streetcar'`): you walk up on
  them, the sidewalk is lifted onto their tops and their sides come from `raisedSides`. A glass
  shelter with a dark steel roof and a bench at the back of each.
- The wire: a pole every 30 m on the curb side, 2.3 m from the track, with an arm out over it at
  6.7 m and the contact wire at 5.6 m over the rails (one wire, no catenary, like the photos).
  Where there's a parking lane they stand behind it, on the sidewalk. Poles that would stand in a
  street or a building are left out, and they're moved to the end of a platform. The ones inside the fence are solid. Poles, arms, wire and the shelters' steel are
  one mesh.
- Rails: the concrete slab they're set in (2.5 m, the whole lane where the street has a parking
  lane next to it) and the two rails' heads, ground layers like
  the roads (just over the asphalt, under the crosswalks' paint; the rails over that), draped on
  the terrain.

## With the traffic

The cars on a lane the streetcar runs along wait behind it (traffic.ts `tramLanes`, the
streetcar as the car ahead). For that the traffic is driven with the streetcars, and it only
counts as repeating on whole half hours (three periods), started on a whole half hour of the
clock: everyone still sees the same. It doesn't stop for cars, so the cars give way: one pulling
into its lane from another street waits while a streetcar is within 60 m back or going by, and
one whose junction curve crosses the track waits while a streetcar is on it or within 25 m.
Curb parking isn't kept within 2.8 m of the track. A streetcar pushes players aside like the
cars do (`World.moving`).

## Still off

- Edgewood from Park Place to Courtland St and Auburn from Peachtree St to Jesse Hill Jr Dr
  have their measured widths. Auburn west of Courtland St is the roughest: one width a way, so
  near Peachtree Center Ave it's ~1.5 m too wide, and the 3-4 m striped zone north of the
  streetcar's lane (hatched or angled parking, the satellite can't tell) is plain asphalt. Auburn
  east of Jesse Hill Jr Dr is osm's 9 m: the lidar's curbs say ~10.5 m, the satellite ~8 m
  (and it's ~2.5 m off the buildings there), so it's left. The bend at Park Place and the
  diagonal by Woodruff Park weren't measured. The Hurt Park platform is from the satellite; the
  lidar has the shelter's roof ~0.6 m nearer the track than the game's.
- The traffic drives with the streetcars all day, also when they aren't running (before 8:15 and
  after 23:15 a car can wait a few seconds behind a streetcar that isn't there).
- The streetcar doesn't wait for cars: where its back end swings round the Park Place corner or a
  car was already going when it came, they can touch. Over half an hour that's ~4 car-seconds
  (23 before the streets were widened and cars gave way; cars queued at a red light ahead of it
  add more on some days, `streetcar.test.ts` keeps it under 20).
- In the game look the concrete lane is a little darker than the light asphalt (it's the
  realistic look's track material, real concrete is lighter than the asphalt).
- The traffic takes about twice as long to drive at load (four periods instead of two before it
  repeats, ~0.3-0.4s in node when the machine is quiet; it's done a few ms a frame).
- Sweet Auburn Market is an island platform in the middle of Edgewood for real; here it's at the
  curb like the others. The other platforms are where the timetable's stop points are, checked on
  the satellite only at Hurt Park.
- The wire is straight between poles (no sag, no zigzag), no pull-off wires on the curves, no
  feeders. No ticket machines or signs at the stops.
- The cars' sides are plainer than the real S70's (no door seams or handles, flat window band).

## Cost

Measured after the merge. Before it (my worktree, `counts.mjs`, `?still` so neither car is in
view, other agents busy so no times): hurt park 434 -> 438-448 draws, park 309 -> 317-322 (two
runs; the traffic in view changes too, it's driven with the streetcars now). Join warm-up 808 /
734 -> 834 / 765 builds / pipelines (the streetcar material, the two ground layers, the stops'
concrete, steel and glass). A car in view is three more meshes in the prepass, the scene and
the shadow cascades it's in. A car is 3.1k triangles (an end 1148, the middle 782). The whole
loop's static meshes: rails and slab (ground layers), platforms 1.1k, steel 13k (92 poles and
arms 3.7k, the wire 8.7k, the shelters 0.6k), the shelters' glass.

The real widths (Nov 26, measured before the merge, other agents busy, so draw counts only): no
new meshes or materials, the road shader is still one shader a look. Join warm-up 849 / 771
before and after. `counts.mjs` hurt-park 376 -> 378 draws, hurt-street 294 -> 297, park 295 ->
304 (the traffic and parked cars in view). Every road, path and crosswalk strip has the extra
`aLanes` attribute (4 floats a vertex).
