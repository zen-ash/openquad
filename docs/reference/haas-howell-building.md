# Haas-Howell Building: references

What I built GSU's Haas-Howell Building (75 Poplar St at Forsyth St in Fairlie-Poplar, 1920, the
School of Music's offices and studios, GSU's since 1994) from. Eight floors: the ground floor and
the second are limestone, with tall glazed arches on Forsyth St, blind arches on Poplar St and the
entrance arch with "HAAS · HOWELL · BLDG" carved over it. Over a stone belt, five floors of dark
red brick with white double hung windows, a band, an attic floor and a deep white cornice on
modillions. The Rialto is built against its back. GSU's map spells it "Hass-Howell". Everything
here is reference only: no photos are in the repo, the measurements are my own. Photos I
downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                    | date                   | license              | facade                          | used for                                                                 |
| ------------------------------------------------------------------------- | ---------------------- | -------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| GSU campus map (Concept3D, map 1108, location 295220), the door and lobby | 2026-03 (upload date)  | GSU                  | the entrance doors              | the black double doors in the stone vestibule                            |
| GSU campus map photos "haas-howell" and "haas-howell2"                    | 2025-03 (upload date)  | GSU                  | Poplar St, the entrance arch    | the arch, the vestibule, the round fanlight with the 75, the carved name |
| Mapillary (deirdreedsign 2019-12-19, SydneyIStroud 2022-09-01)            | 2019, 2022             | CC BY-SA             | Poplar St, both directions      | where the entrance and the blind arches are along Poplar St              |
| Wikimedia Commons "Haas-Howell Building, Atlanta, GA" (4 photos)          | 2019-03-23 11:38-11:39 | CC0                  | the corner, Poplar St, entrance | floor count, window layout on both streets, colors, the camera fit below |
| Esri World Imagery Wayback, release 26334                                 | -                      | Esri, reference only | roof                            | the footprint and the roof boxes (the tower leans a lot in it)           |
| USGS 3DEP lidar (GA statewide 2018)                                       | 2018                   | public domain        | all                             | the outline, every height, the ground                                    |
| OpenStreetMap way 252608881 (building 62)                                 | -                      | ODbL                 | -                               | the outline (on the lidar walls within 0.3m), 9 levels (it's 8)          |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295220

- **Newest photos**: GSU's 2025-2026 ones are of the entrance only. The whole building is from the
  2019 Commons photos and 2019-2022 Mapillary. Nothing on GSU's news says it changed outside since.
- **Rating**: one rough camera fit (the 2019 corner photo, by hand on the corner and the cornice),
  floors counted on three photos. The alley side and the back over the Rialto were never seen.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over Poplar St at the entrance (322.0m).

- Ground: Poplar St 321.7-321.9, Forsyth St 322.3-322.6 (the game's terrain has the same).
- Walls: osm's box is within 0.3m of the lidar: 28.0m along Poplar St, 16.2m deep to the Rialto.
  The cornice reaches 0.7m past Poplar St's face and 1m past Forsyth St's. The alley side has no
  cornice (the lidar stops at 27.6m).
- Roof 353.0 (31.0), the cornice's top about 353.4. A penthouse against the Rialto side, 6-17.5m
  from Forsyth St, at 358.1 (36.1, the building's height). A lower plant room 19-27.3m at 355.6.
  The Rialto's roof next to it is about 343.5 (21.5).
- Floors from the photos on the lidar's heights: ground floor to 6.6 (arches to 5.5), the second
  floor's windows 7-8.9, the belt 9.55-10.1, five brick floors of 3.36m (windows 2.1m tall, 0.7m
  over each floor), the band 26.95-27.25, the attic's windows 27.5-28.95, the cornice 29.25-31.35.
  The elevator shows 8, osm says 9 levels (likely counting the mezzanine in the arches).
- Forsyth St: six windows a floor, the three arches under them in pairs. Poplar St from Forsyth St:
  two single windows, then five pairs (1.15m windows), the entrance arch between the third and
  fourth pair, a glass arch under the fifth, blind arches under the singles and the first two pairs.

## What's in the game

- campus/haasHowell.ts, drawn square in its own frame and turned into place (Poplar St and Forsyth
  St aren't on the game's x/z). osm's outline is kept, with a notch for the entrance's vestibule:
  the doors are 1.2m in from the glass line (build-campus.mjs HAAS_HOWELL). The door moved from the
  alley side to the real entrance on Poplar St.
- The two street faces stand 0.3m out of the outline (the outline is the glass line, Part 22's
  rule). Round headed arches (arch() in the kit: stone over the curve, soffit, glass or a panel at
  the back), the entrance with a keystone, a round fanlight over the doors with the 75, the carved
  name. Stone sills, the belt, the band, the cornice with modillions on both streets.
- The alley side and the Rialto side are plain brick; the Rialto side has windows only over the
  Rialto's roof.
- A hidden core keeps a low sun from shining through (the windows don't cast), behind the
  entrance's vestibule so it doesn't show in the arch.

## What still differs

- The vent grilles under the brick floors' windows are flat dark panels (a near-only part,
  drawn within 80m), the real ones are louvers set in the brick.
- The garlands and the cartouche over the entrance, the carved scrolls by the name and the lamps
  aren't drawn; the keystone is a plain block.
- Where along Poplar St the entrance and the glass arch are is from Mapillary positions and two
  photos, not a camera fit: maybe a meter or two off.
- The Forsyth St arches have brown blinds inside and doors under a transom; in the game they're
  brown glass in bronze frames.
- The second floor's windows and the arches may be a little low: the 2019 corner photo has the
  stone base slightly taller than the game.
- The brick in the game's sun is a bit redder than the photo's.
- The alley side and the back over the Rialto are guesses.

## Cost

6 parts (brick, stone, white, glass, store, grille) from the library's families, no new shaders
or textures. About 4.6k triangles. glass, store and grille don't cast, grille is only drawn within
80m; a hidden core keeps the low sun out.
stone and brick are drawn first when you're close. 2 signs (the name, the 75).

Measured after the merge.
