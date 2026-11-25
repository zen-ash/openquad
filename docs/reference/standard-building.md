# Standard Building: references

What I built GSU's Standard Building (95 Luckie St at Fairlie St in Fairlie-Poplar, 1923, School
of Music classrooms, rehearsal rooms and studios, GSU's since 1984) from. Eleven floors: the ground
floor and the second are cream painted stone, with the entrance on Fairlie St ("SCHOOL OF MUSIC" on
the transom). Over a white belt, eight floors of red brown brick with white double hung windows
(one, two, one, two, one across Fairlie St), a white band, an attic floor and a deep white cornice
on big brackets on the two streets. The back over the Theatrical Outfit and the alley side are
plain lighter brick. Everything here is reference only: no photos are in the repo, the
measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                       | date                   | license       | facade                       | used for                                                                |
| ---------------------------------------------------------------------------- | ---------------------- | ------------- | ---------------------------- | ----------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295228), the door and lobby    | 2026-03 (upload date)  | GSU           | the Fairlie St entrance      | the recessed double doors, the SCHOOL OF MUSIC transom, cream stone     |
| GSU campus map, School of Music stock photo 257 (dusk, from the deck)        | shot 2022-01-27        | GSU           | Fairlie St, from 5 floors up | the window layout, floor height (3.2m by the front's width), cornice    |
| Mapillary (SydneyIStroud 2022-09-01/08 along Fairlie St, networklanman 2021) | 2021, 2022             | CC BY-SA      | Fairlie St and Luckie St     | the ground floors: cream walls, big windows, the Luckie St corner       |
| Wikimedia Commons "Standard Building, Atlanta, Georgia.jpg"                  | 2020-01-12             | CC BY-SA 4.0  | Luckie St and Fairlie St     | the corner, the stone base, colors                                      |
| Wikimedia Commons "Standard Building, Atlanta, GA" (3 photos)                | 2019-03-23 11:41-11:42 | CC0           | Luckie St, the back          | floor count, the back's plain brick and the cornice only on the streets |
| USGS 3DEP lidar (GA statewide 2018)                                          | 2018                   | public domain | all                          | every height, the depth, the ground                                     |
| OpenStreetMap way 252608905 (building 81)                                    | -                      | ODbL          | -                            | the outline, 11 levels                                                  |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295228

- **Newest photos**: GSU's 2026 ones are of the entrance only; the 2022 dusk photo is the newest of
  the whole front. Nothing on GSU's news says it changed outside since.
- **Rating**: rough camera fits by hand (the dusk photo, the 2020 corner photo); floors counted on
  four photos. The back is from one 2019 photo over the Theatrical Outfit, the alley side unseen.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over Fairlie St at the doors (320.5m).

- Ground: 320.4-321.0 all round.
- Walls: osm's outline is right on Fairlie St (28.5m) and Luckie St, but the lidar has the back
  wall 12.5-12.6m from Fairlie St, not osm's 11.2m: a 1.3m strip over the Theatrical Outfit's roof.
  The cornice reaches about 0.7m out on both streets.
- Roof 360.5 (40.0), the cornice's top about 362.2 (41.7). The elevator's penthouse at the alley end
  (1.5-8.5m from the alley, 2.5-12m in) at 365.1 (44.6, the building's height), a plant room 9.5-19m
  at 363.7.
- Floors: 11 (osm and the photos agree). From the dusk photo scaled by the front's width: 3.2m
  floors, the band at about 36, the attic's windows 36.5-38.3 right under the cornice (38.6-41.7).
  So the stone base is about 9.8m: a tall ground floor and the second floor's windows 6.4-8.6.
- Fairlie St: a single at 3.3m, pairs at 8.5 and 20.04, a single at 14.27 (the middle, over the
  entrance), a single at 25.23. Windows about 1.8m wide in the dusk photo, the pairs 0.6m apart.
  Luckie St: two pairs.

## What's in the game

- campus/standardBuilding.ts, drawn square in its own frame like the Haas-Howell (it shares the
  helpers in haasHowell.ts). osm's outline is kept with a notch for the entrance (the doors are 1m
  in, build-campus.mjs STANDARD_BUILDING); the door moved from the alley end to the real entrance in
  the middle of Fairlie St.
- The back wall is drawn where the lidar has it (12.5m), past the outline: that strip stands in the
  Theatrical Outfit's generic box below 14m, the outline (collision, inside) stays osm's.
- The two street faces stand 0.3m out of the outline. Big windows on the ground floors, the
  recessed entrance with the lettered transom, stone sills, the belt and band, the bracketed
  cornice on Fairlie St and Luckie St only.
- The penthouse and the plant room have their walls from the inside too: the shadow pass only draws
  faces turned away from the sun, and a hollow box on the roof let the low sun in (the sun test
  failed on it). A hidden core keeps the low sun out of the floors, with a lid at the ceiling over
  the strip behind osm's back line (there's no inside ceiling there).

## What still differs

- The back's last 4.7m to Luckie St steps out 0.9m (the lidar and the 2019 photo); the lidar's
  shallow recess at 18-21m isn't drawn. Its windows (four columns a floor) are a guess from one
  photo.
- The black tile base at the Luckie St corner, the GSU banners and the street level details aren't
  drawn.
- The brackets are plain blocks, the real ones are scrolled and bigger.
- The Theatrical Outfit (not GSU, not mine) is a 14m generic box in the game: from Luckie St it
  hides the Standard's lower floors that the real 2 storey building shows.
- Window positions on Luckie St are from photos at an angle, maybe 0.5m off.
- The game's blue hour is darker than GSU's long exposure dusk photo.

## Cost

6 parts (brick, common, stone, white, glass, store) from the library's families, no new shaders or
textures. About 3.8k triangles. glass and store don't cast; a hidden core keeps the low sun out.
stone and brick are drawn first when you're close. 1 sign (SCHOOL OF MUSIC).

Measured after the merge.
