# Petit Science Center: references

What I built the Parker H. Petit Science Center (2010, 100 Piedmont Ave, on the corner of
Piedmont Ave and Decatur St) from. Everything here is reference only: no photos are in the
repo, the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                                                    | date                            | license                      | facade                                                                                | used for                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esri World Imagery Wayback, release 26334 (zoom 19 and 20)                                                                | 2026-08-05 (imagery 2026-02-02) | Esri, reference only         | roof                                                                                  | the outline (nothing changed when the research tower went up), the penthouse and the cooling towers on the roof, the courtyard toward the research tower                                                                                                                                                        |
| Wayback releases 22869, 22252, 39767, 12457                                                                               | 2023-2025                       | Esri, reference only         | the back sides, at an angle                                                           | the bands and the louvres on the two back sides                                                                                                                                                                                                                                                                 |
| GSU campus map (Concept3D, map 1108, locations 295224 / 1149149 "Atlanta - Petit Science Center"): `IMG_3436`, `IMG_3438` | uploaded 2026-03-24             | GSU, all rights reserved     | the main doors, the doors on the back                                                 | the canopy over the doors, the round concrete columns, the storefront in dark frames, the cream block base. Side by side (camera by eye)                                                                                                                                                                        |
| same map, location 1114553 "Research Tower": `IMG_2805`                                                                   | uploaded 2025-10-03             | GSU, all rights reserved     | the back toward the research tower and the end of the back drive side, from the south | camera fitted on petit's south corner and the research tower's corners (rms 11px): the slots a floor tall, about one in every 4.5m of a floor, the louvres in the base, the penthouse with its big louvre, the cooling towers, the grey metal at the south end of the back drive side. Side by side and overlay |
| same map, location 1009999 "Research Science Center": `Research_Science_Center_67dae19a12c88`                             | uploaded 2025-03-19             | GSU, all rights reserved     | the bridge, from the research science center                                          | the bridge is a glass box with blue panels under it and a grey fascia, well up off the ground                                                                                                                                                                                                                   |
| same map, location 295224: `20130304MLB_stock_PetePetitScienceCenter_148`                                                 | 2013-03-04                      | GSU, all rights reserved     | the glass tower and the plaza                                                         | the curtain wall, the sign in the plaza ("PARKER H. PETIT SCIENCE CENTER", "100 PIEDMONT", the logo is a blue square in the game)                                                                                                                                                                               |
| Mapillary 2590666524390633                                                                                                | 2019-12-19 17:04                | CC BY-SA 4.0 (deirdreedsign) | piedmont ave and the glass tower                                                      | camera fitted on the tower's corners and three bands (rms 2px): the slots (1m wide, every 2.8m), the colonnade (from 33m, a column every 5m), the long window in the base (23.8-31.8m, 4.15-5.9m up), the base. Side by side and overlay                                                                        |
| Mapillary 1092097824629064, 2828964300679160                                                                              | 2019-12-19 12:31                | CC BY-SA 4.0 (toddwiese)     | decatur st, the wing                                                                  | the stone along the bottom of the wing, the tall window at its plaza end, the dark glass of its side toward the plaza. Side by side (weak camera fit)                                                                                                                                                           |
| Mapillary 480243406424357                                                                                                 | 2019-12-19 12:30                | CC BY-SA 4.0 (toddwiese)     | the plaza from the corner                                                             | checking                                                                                                                                                                                                                                                                                                        |
| Mapillary 133480636153407                                                                                                 | 2021-01-20                      | CC BY-SA 4.0 (networklanman) | the back toward the research tower, before the tower was built                        | 7 bands and the top floor over a tall cream base, the scattered slots, the strip of blue glass at the east end, the louvres in the penthouse                                                                                                                                                                    |
| USGS 3DEP lidar (GA statewide 2018)                                                                                       | 2018                            | public domain                | all                                                                                   | every height, where the walls are, the canopy, the bridge, the research science center (31.4m, the bridge lands on it 21-26m up)                                                                                                                                                                                |
| Overture Maps, release 2026-09-23                                                                                         | 2026                            | ODbL / CDLA                  | -                                                                                     | nothing usable: 39m for petit is osm's tag, 16.4m for the research science center is microsoft's estimate                                                                                                                                                                                                       |
| OpenStreetMap ways 252608895, 802046231, 630328387                                                                        | -                               | ODbL                         | -                                                                                     | the outline, the bridge's outline, the research science center                                                                                                                                                                                                                                                  |
| McCarthy's project page                                                                                                   | ~2010                           | reference only               | the plaza at dusk                                                                     | checking: the canopy along the tower's plaza side on round columns                                                                                                                                                                                                                                              |
| GSFIC, ENR                                                                                                                | 2010                            | text                         | -                                                                                     | "10-story" (nine floors and the penthouse), the architects, the year                                                                                                                                                                                                                                            |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/295224):

- https://assets.concept3d.com/assets/1108/IMG_3436_69c2f6af034e8.jpg
- https://assets.concept3d.com/assets/1108/IMG_2805_68e00e39e202b.jpg
- https://assets.concept3d.com/assets/1108/20130304MLB_stock_PetePetitScienceCenter_148.jpg
- https://assets.concept3d.com/assets/1108/Research_Science_Center_67dae19a12c88.jpg

- **Newest photos**: 2026 (the doors), 2025 (the back from the south, the bridge), 2021
  (the back), 2019 (piedmont ave, decatur st). Esri's 2026 satellite image has the same roof
  as the 2018 lidar.
- **Rating**: 2 angles with fitted cameras (2019 piedmont ave, 2025 the back), 2 by eye or
  with a weak fit (2019 decatur st, 2026 the doors).

## Facade breakdown

- **Plan**: osm's outline is right except two walls: the lidar has the piedmont ave wall
  0.45m further out and the one toward the research tower 1m out. build-campus.mjs redraws
  the outline on those lines (cm, from the lidar's corners on piedmont ave). The colonnade
  at the decatur st end of piedmont ave is open in the game (you can walk under it), the
  little recess at the south corner is only on the ground floor.
- **Height**: osm's 39m is too low. Over the piedmont ave sidewalk the lidar has the coping
  at 44.5m, the glass tower's and the wing's parapet at 45.9m, the penthouse at 55m (its
  roof 53.8m), the stairs at the west corner at 49.7m and the cooling towers at 62.6m. The
  fitted 2019 camera puts the tower's top on 45.9m within 2px.
- **Up the slab**: a cream base to 6.9m with a sill, then dark grey brick with a cream band
  at every lab floor, 4.5m apart (12.5 to 39.5m, the lidar has ledges at 17 and 21.5m), and
  a cream coping. The bands are thin, 0.22m (they read as fine light lines in the 2019
  photo).
- **Piedmont ave**: tall glass slots, 1m wide, every 2.8m, from the base to the coping, the
  bands cross them (measured with ticks of the fitted camera along the wall). In the base a
  long window, then the colonnade: round columns 1m thick every 5m with the shops set back
  2.4m under a soffit at 5m.
- **The back sides**: the slots are a floor tall and scattered, about one in every 4.5m of a
  floor, some in pairs. Big louvres in the base. On the side toward the research tower a
  strip of blue glass the whole way up at the east end (2021). The back drive side is grey
  metal the whole way up for its first 16m from the south corner (the 2025 photo sees it
  past the corner), brick like the rest after that.
- **The penthouse**: grey blue metal in tall panels, set back 3.35m from piedmont ave and
  flush with both back sides, a big louvre over the side toward the research tower, the
  cooling towers on it (2025 photo, lidar).
- **The glass tower**: light blue grey curtain wall that shows the sky, a pane a floor with
  a thin light line at every floor's edge, storefront on the ground floor. As dark shiny
  glass it came out teal and a fifth as bright against the stone as in the 2019 photos; now
  it's about half (the photos' sky is brighter than the game's). Its side in the gap next to
  the brick, the lobby at the end of the plaza and the wing's side toward the plaza you see
  into: clear glass with the slab edges, a grey wall a meter behind it (2019).
- **The shop windows**: clear glass you see into the ground floor through, up to just
  under the inside's ceiling (3.2m), a dark band over that (the ducts in the 2026 photo).
- **The plaza**: the main doors are on the tower's side toward the plaza, under a canopy
  along that whole side that gets deeper toward the lobby, on round columns (lidar has it at
  4.85m, the 2026 photo has it over the doors). Its underside is nearly black. A revolving
  door of clear glass with a round grey top, a swing door next to it, two round grey tubes
  lying on the canopy (2026 photo). The sign is a white pillar in the plaza.
- **The wing**: curtain wall on decatur st, light stone along the bottom from the east corner
  to a tall window in a deep frame at the plaza end, dark glass you see the floors through
  on its side toward the plaza. A box of machinery on its roof.
- **The bridge**: osm has it as a 14m box on the ground. It's a glass box from 20.5m to
  25.8m with blue panels under the glass and a grey fascia, open ground under it (lidar, the
  2025 photo). Drawn with petit, no collision. The research science center it lands on was
  17.5m in the game (osm's 5 floors), the lidar has 31.4m, so build-campus uses that now.
- **Colors**: in the shade the brick is about half as bright as the cream base (0.47, 2019);
  in gsu's 2025 photo in the sun the brick is 120-130 and the penthouse 125/145/165, a blue
  grey. The game's sunny brick came out 140 and was darkened.

## Not verified

- The back drive side: the 2025 photo sees it almost edge on. The satellite images taken at
  an angle have something grey at its west end instead, which could be the stairs. I went
  with the photo.
- The research tower in the game is shorter and further from petit than in the 2025 photo,
  so that camera is fitted on petit only; the tower doesn't line up.
- The glass tower's mullions (1.5m by eye) and which floors have spandrels.
- The canopy: lidar has a flat one at 4.85m along the tower and a sloping one 5.9 to 7.5m
  somewhere over the plaza; the 2013 photo has a dark sloping one. I drew one flat canopy.
  The tubes on it are placed by eye; in the photo they cross it at an angle on short posts.
- The revolving door: the game's sliding doors are inside it, behind a dark back (they
  showed through the clear glass as a pale glowing block). There are no wings in it.
- The 2026 doors photo has no camera fit (no exif, cropped), and in the game the plaza is
  in shade there at every time I tried, where the photo has sun on it.
- The wing's tall window: from the weakly fitted 2019 camera, its top could be 2m lower.
- The colonnade's depth, the back sides' slots (made up, seeded) and the louvres hidden
  behind the research tower in the 2025 photo.
- The doors on the back (gsu's "accessible entrance"): storefront along the back by the
  bridge, not placed from a photo.
- The restaurant signs at the colonnade and the tower (2019) are left out.

## The game's door

campus.json had the door on the glass tower's side toward piedmont ave, which isn't a way
in. It's on the tower's side toward the plaza now, 14m from its north corner, under the
canopy, where the 2026 photo has the revolving door. The gps route from hurt park gets there
along decatur st (the navgraph test passes).

## Cost

6 parts (brick, precast, glass, clear, metal, dark). All but the clear glass cast shadows:
the glass is the walls of the tower and the wing. The see-through bits have a wall behind
them that casts (with nothing there the sun came through the wing in stripes), and the
shop windows only go up to the inside's ceiling. Brick and precast are drawn first when
you're close. Everything is one of the library's families, so no new shaders. The canopy's
underside is the dark metal with its uvs stretched so its ribs fade out.

The tops of the colonnade's columns came out sunlit under the soffit: the shadow lookup is
pushed out along the surface's normal (normalBias 0.2), so it looked past the soffit's
edge. A ceiling a bit higher up, facing down and hidden inside the building, fixes it for
the shadows (the same over the canopy).

About 4k triangles (brick 1.8k, precast 1.1k, glass 0.7k, metal 0.3k, dark 0.1k, clear
0.06k).

Measured with the other two buildings from the same day (petit science center, the college of
education and the bookstore went in together): prod builds in one browser, taking turns, hot
plateau on AC, 4 min preheat, 2 rounds thrown away and the median of 4 (ms at 1280x800@2, the
game look, the buildings are the same in both). "before" is the build just before the three (3faae0e). The warm-up builds 798
shaders and 700 pipelines before and after. The 12 old spots all moved -0.83..+0.03 ms (noise),
petit's own:

| spot                                                         | before | now   | now - before |
| ------------------------------------------------------------ | ------ | ----- | ------------ |
| petit street (decatur st at the wing, looking at the corner) | 10.30  | 10.43 | 0.15         |
| petit close (at the main doors)                              | 12.15  | 13.30 | 1.20         |

At the doors it's the scene pass (+0.9) and the prepass (+0.24): the game's door is there now,
so the building's furniture loads (Furniture.tsx, within 20m of the door), and the lobby's clear
glass shows it. Same camera with the player 30m from the door, in a run of its own: 12.6 ms
against 14.1-14.5 with the furniture (that run was hotter, only numbers from the same run
compare). Petit gets 255 pieces of furniture, about like student center west (219) or dahlberg
(253), so it's the see-through lobby, not the building. It stays under 14 ms in the main run.
