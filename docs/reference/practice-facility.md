# Practice Facility: references

What I built the Practice Facility (145 Decatur St, on Piedmont Ave at Decatur St, across from
Petit) from. It was the natatorium next to the Sports Arena and has been GSU's basketball and
volleyball practice gym since 2016. Everything here is reference only: no photos are in the
repo, the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                                                       | date             | license                      | facade                                                             | used for                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esri World Imagery Wayback, release 26334 (zoom 19 and 20)                                                                   | 2026-08-05       | Esri, reference only         | roof                                                               | the outline, the white roof membrane, the box on the roof. The same roof in every release from 2020 to 2026                                                                                                                             |
| GSU campus map (Concept3D, map 1108, location 697326 "Beach Volleyball Complex"): `20230323MLB_beach_volleyball_291`, `_003` | 2023-03-23       | GSU, all rights reserved     | the wing's side toward the volleyball courts                       | board formed concrete with narrow boards, the painted sign (GEORGIA STATE, a red bar, BEACH VOLLEYBALL), the flue over the wing. Side by side, camera by eye (a telephoto shot with no corners in it)                                   |
| same map, location 295230 "Practice Facility": `Practice_Court_002_`                                                         | 2016-04-20       | GSU, all rights reserved     | inside                                                             | a gym with no windows, the official name                                                                                                                                                                                                |
| georgiastatesports.com, "Georgia State Practice Facility Formally Opens"                                                     | 2016-04-26       | text                         | -                                                                  | it was the aquatics building, opened as the practice gym in 2016                                                                                                                                                                        |
| Mapillary 2963438283979970, 820848222171651, 2590666524390633                                                                | 2019-12-19 17:04 | CC BY-SA 4.0 (deirdreedsign) | piedmont ave in shade, the volleyball side and the wing in low sun | **three fitted cameras** (rms 4-5px on 2048): the ribs, the pilasters, the base, every height, the panels of the wall on the volleyball side, the wing, its lamp, the flue, the floodlight pole. Side by side and 50/50 overlay         |
| Mapillary 906759723505394                                                                                                    | 2019-12-19 17:04 | CC BY-SA 4.0 (deirdreedsign) | the south corner                                                   | the stepped corner, the panel joints and the stains on the volleyball side                                                                                                                                                              |
| Mapillary 315302326792066, 314917836906290                                                                                   | 2019-09-02 14:23 | CC BY-SA 4.0 (bjaj1)         | piedmont ave in sun                                                | the ribs' shape (flat fronts, sharp edges), the base set back (the ribs throw a sawtooth of shadow on it), the band under the coping in the coping's shadow. Through a windshield, so not for colors. Side by side with the 2963 camera |
| Mapillary 683993116608684, 554651556676183, 637777354749941                                                                  | 2021-01-20 11:31 | CC BY-SA 4.0 (networklanman) | decatur st, overcast                                               | flat panels, one pier near the corner, the raised planter with red mulch, the colors. A fisheye dashcam, camera by eye                                                                                                                  |
| USGS 3DEP lidar (GA statewide 2018)                                                                                          | 2018             | public domain                | all                                                                | every height, where the walls are, where it meets the arena, the box and duct on the roof, the flue, the floodlight pole                                                                                                                |
| USGS EPQS ground heights                                                                                                     | -                | public domain                | -                                                                  | the ground all round (306.2-307.0m, the volleyball terrace 308.3-308.9m) and at the cameras                                                                                                                                             |
| Overture Maps, release 2026-09                                                                                               | 2026             | ODbL                         | -                                                                  | nothing usable: its 27.5m is the arena's roof, osm's outline overlaps it                                                                                                                                                                |
| OpenStreetMap way 252608902 "Sports Annex"                                                                                   | -                | ODbL                         | -                                                                  | the old outline                                                                                                                                                                                                                         |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/697326 and #!m/295230):

- https://assets.concept3d.com/assets/1108/20230323MLB_beach_volleyball_291_6679cfe982106.jpg
- https://assets.concept3d.com/assets/1108/20230323MLB_beach_volleyball_003_6679cfe8728de.jpg
- https://assets.concept3d.com/assets/1108/Practice_Court_002_.JPG

- **Newest photos**: 2023 (the courts' side of the wing), 2021 (decatur st), 2019 (piedmont ave,
  the volleyball side). Nothing from 2024-2026 except the satellite, which has the same roof as
  the 2018 lidar.
- **Rating**: 1 side with three fitted cameras (piedmont ave and the south corner, 2019), the
  rest by eye.

## Facade breakdown

On the frame, u is meters along piedmont ave from osm's south node toward decatur st and v
meters in from the street. Heights are over the piedmont ave sidewalk (306.5m, the same ground
as Petit across the street).

- **Plan**: osm's shape is right but three walls are off: the decatur st wall is 1.5m further
  in (u 51.1), the party wall with the arena 1-3m further out (v 26.9; the gap between the two
  osm outlines is really arena) and the low wing toward the volleyball courts is longer (v 3.9
  to 25.9, out to u -7). build-campus.mjs draws the lidar's 12 corners in cm. Only building 79
  changed in campus.json.
- **Height**: 10.6m to the coping (b.height), roof 10.3m, the flat wall on the volleyball side
  10.9m, the wing's roof 7.15m and its parapet 7.8m, the box on the roof 13.9m, a duct along
  the party wall 11.5m, the flue 10.8m, the floodlights 19.8m. The game had it 27.5m tall from
  overture; that line is gone from MEASURED_HEIGHTS.
- **Piedmont ave**: a plain base to 2.2m on the outline, then vertical ribs to 9.9m standing
  0.25m out of the wall, 0.4m wide and about 0.62m apart (13 to a bay), flat pilasters 0.65m
  wide every 8.7m (and one at each corner) from the sidewalk to the coping, a plain band set
  back under the coping, and a dark coping that sticks out past the ribs. Small wall lights at
  4.3m, on the nearest rib to where the fitted photos have them. No doors, windows or letters.
  I first made the ribs round (the shady photos look that way) and they came out like pipes;
  flat fronts with the corners taken off match the sunny photo.
- **The volleyball side**: a flat wall in 1.4m by 3.6m panels, the joints 0.42m from the
  piedmont ave end (fitted 2019 photo), standing 0.3m over the piedmont ave coping at the south
  corner. The wing hides its bottom 7m for most of its length.
- **The wing**: ribbed toward piedmont ave like the main face but lower (ribs to 6.5m, coping
  7.2m), board formed concrete on the courts' side (boards about 0.42m wide, a joint every
  1.3m, the 2023 photo), a lamp near the corner, a rusty flue on its roof and the courts'
  floodlight pole in front of its corner.
- **The painted sign** on the courts' side (2023): GEORGIA STATE, a red bar, BEACH VOLLEYBALL.
  Sizes and heights measured on the photo with the wall's height for scale: the letters about
  1m tall, 3.7m wide for GEORGIA, BEACH VOLLEYBALL 0.44m. The letters are the game's label font
  (noto sans bold) squeezed to the photo's widths (Sign `wide`), the bar is painted metal. Plain
  letters, there's no logo in it.
- **Decatur st**: flat panels like the volleyball side, one pier sticking out about 3m from the
  corner, and a raised planter along it (a 0.45m curb, red mulch heaped up to the wall). The
  planter is solid to walk into (game/world.ts, with the floodlight pole).
- **The roof**: a white membrane (gravel roof material), the box and the duct by the party
  wall.
- **Where it meets the arena**: the party wall at v 26.9 is shared. I draw my roof up to it
  and no wall there; the arena draws its wall over my roof and the two end walls that stand on
  it. My inside walls along it are 5cm in, the arena's are on the same line facing the other
  way.
- **Colors**: a neutral light grey, not tan like the arena. The 2021 overcast photo has it 1.8
  times as light as Petit's brick. In the game, with both buildings' walls facing the same way
  in the morning shade, it's 128 against Petit's brick 70 (1.83). The game's light turned the
  grey pinkish, so its color is a bit cool (#8f9597), like Petit's brick's (#545858). Heavy
  dirt for the dark blotches all over it.

## Not verified

- How deep the ribs are (0.25m), how wide (0.4m) and how far the base is set back: by eye
  from the sunny photo through a windshield. The rib spacing is good to about 5cm.
- The pilasters could be wide joints instead.
- The decatur st side has no fitted camera (fisheye dashcam): the pier, the joints and how long
  the planter is are by eye.
- The flue: the lidar and the fitted 2019 photo disagree by 1.5m along the wing, I went with
  the photo.
- Where the painted sign is along the wall (within about 2m), and whether it's still there.
  The real letters are heavier and squarer than noto sans.
- The real way in (below).
- How the arena's two end walls come down inside this building: the lidar only sees their tops.
- Left out: the ramp and its wall in front of the wing, the corner sign on the plaza at
  piedmont ave and decatur st (gsu's logo and a Coca-Cola panel), the flag bracket and the
  camera on the south corner, the street trees, the boardwalk and the volleyball terrace. The
  terrace is 2m over the sidewalk and the game is flat, so the wing shows 2m more wall on the
  courts' side. The sand courts are drawn as lawns (they're osm's), not mine to change.
- Light, not the building: at the fitted photos' time (17:04 in December) the game's shade is
  orange where the photo's is blue-grey (Library South has the same). In the sun, the small
  shadows (in the gaps between the ribs, on the band under the coping) don't show: they're
  smaller than the sun's shadow bias.

## The game's door

campus.json had the door on the ribbed piedmont ave face, where there isn't one. No photo
shows a door on any street side (the gym is reached from the arena). It's on the short wall in
the court off decatur st now, next to the arena's door there, at u 48.6. The spot in front of it
is in that court, outside the arena. The gps route from hurt park gets there (the navgraph test
passes).

## Cost

6 parts: concrete (the flat walls), ribbed (the same concrete for the ribbed faces, panels too
big for a joint to show), metal (copings, lights, the door frame, the floodlights, the ribs'
undersides), roof, brown (the flue and the mulch, plain) and paint (the red bar). All from
families that were already used, so no new shaders. The roof and the paint don't cast shadows;
concrete and ribbed are drawn first when you're close.

The ribs' undersides caught the bright haze under the horizon and every rib had a light line
under it as concrete (like Petit's canopy), so they're the dark metal. The ribbed faces were
first the panel concrete with each rib moved into a panel of its own so no joint crossed it,
but neighbours then read different patches of the texture and the weathering, and the plain
base came out striped. A second material of the same family with no joints fixed that.

About 2k triangles (ribbed 1.2k, metal 0.6k, the rest 0.2k).

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

| spot                                                 | gpu before | gpu now | now - before (paired) |
| ---------------------------------------------------- | ---------- | ------- | --------------------- |
| pf street (piedmont ave, looking up the ribbed face) | 12.23      | 11.32   | -0.94                 |
| pf close (walking past the ribs)                     | 11.71      | 11.59   | -0.08                 |

It's cheaper than the generic 27.5m brick box it replaces: a lot less wall, and no window
shader.
