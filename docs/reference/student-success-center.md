# Student Success Center: references

What I built GSU's Student Success Center (25-27 Auburn Ave, home of the National Institute for
Student Success) from. It's the old Southern Bell telephone exchange, two buildings from 1907 and
1922 that stood empty for decades and were renovated by GSU, opened Oct 7 2025. The 1907 one is on
the Equitable Pl corner: a limestone ground floor with fluted columns, two tall floors of red brick
with stone quoins and keystones, and a deep bracketed cornice. Its long side down Equitable Pl is
plainer darker brick with four rows of paired arched windows. The 1922 one east of it is cream
terra cotta: a tall ground floor, two floors of paired windows with medallions, a parapet of little
piers. osm (and the game until now) called it the Bell Building. Everything here is reference only:
no photos are in the repo, the measurements are my own. Photos I downloaded are kept outside the
repo.

## Sources

Newest first.

| source                                                                                 | date                         | license              | facade                                 | used for                                                                                                               |
| -------------------------------------------------------------------------------------- | ---------------------------- | -------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 1058924), "student-success-center-front" | 2025-09/10                   | GSU                  | the entablature, close up              | the fluted columns, the carved frieze, the address letters, the blue blade sign on its pole                            |
| Lord Aeck Sargent project page / Georgia Trust award page (Jonathan Hillyer)           | summer 2025 (day and dusk)   | reference only       | Auburn Ave front and Equitable Pl side | the dusk photo: camera fitted on the lidar (two passes, see below), the 1922 building, its parapet, the side's windows |
| GSU campus map photo "07-04-2025_StudentSuccessBuilding"                               | 2025-07-04 (upload date)     | GSU                  | Auburn Ave front and Equitable Pl side | camera fitted on the lidar: bays, rows, the party wall, colors (ratios in the shade)                                   |
| Georgia Trust award page, before photos                                                | before 2020, and a 1920s one | reference only       | the front painted white, the old photo | that the 1922 building and the plain side were there all along, nothing added outside                                  |
| Esri World Imagery Wayback, release 45134                                              | 2022-12                      | Esri, reference only | roof                                   | the dark roof, the seam between the two buildings, the boxes on the roof                                               |
| USGS 3DEP lidar (GA statewide 2018)                                                    | 2018                         | public domain        | all                                    | the outline, every height, the ground                                                                                  |
| OpenStreetMap way of building 197                                                      | -                            | ODbL                 | -                                      | the old outline (a little skewed and 0.6m short on Equitable Pl)                                                       |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/1058924

- **Newest photos**: all from 2025 after the renovation (GSU's and the architects'). No Mapillary
  or Commons photos of it from 2025-26 that I found.
- **Rating**: two camera fits on the front (GSU's photo, the dusk photo), the side and the 1922
  building by eye from the same photos. The back and the east side were never seen.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Auburn Ave sidewalk at the door
(318.1m).

- Ground: Auburn Ave 318.4 at Equitable Pl, 317.8 at T Deck. Equitable Pl falls to 316.0 at the
  back, the alley behind is 315.8.
- Walls: Equitable Pl x -198.1, Auburn Ave z -146.7 (the brick and stone; the cornice reaches to
  -147.5), the back z -89, T Deck's side x -170.1 (its round stair is 0.3m off).
- 1907 building: x -198.1 to -184.5 on Auburn Ave and back to z -104 along Equitable Pl, roof 335.3,
  the cornice's top 336.36 (18.3). The lidar's party wall parapet is at x -186 to -183.5; both
  camera fits liked -184.5, so that's where the 1922 front starts.
- 1922 building: an L round the back of the 1907 one, roof 335.8, its front parapet 336.95 (18.85,
  the little piers stand over that, from the photos), the back's parapet 337.7.
- Penthouses on the roof (new in the renovation, they straddle the party wall): plant rooms at
  339.0 and 340.4, the elevator 342.3 (24.2, the building's height).
- From the fitted cameras: the stone ground floor and entablature to 8.3 with the address at about
  6.95, window rows 8.55-11.1 and 13-15.7 in four bays (1.7m windows), quoins 1m, cornice 17-18.3
  with brackets every 0.85m. The corner block's side has the same four bays (12.6m), then the plain
  side: ten pairs of windows in four rows. The 1922 front: three bays of two windows, rows
  8.25-10.8 and 12.3-15.

## What's in the game

- campus/studentSuccess.ts. Outline redrawn square in build-campus.mjs (STUDENT_SUCCESS) and the
  building renamed to GSU's name (GSU_NAMES 'Bell Building' -> 'Student Success Center'), index kept.
  The front is the ground floor's glass 0.3m behind the stone (Part 22's rule). The door moved 13.9m
  west to the real doors in the 1907 building's east bay.
- Fluted columns (three quarters round, faceted), the corner pier, the entablature with "25-27
  AUBURN AVENUE", quoins on three corners, sills and keystones, the bracketed cornice on the front
  and the corner block's side. The 1922 front with moulded frames round the ground floor glass, the
  frieze and ledge, medallions (round and diamond in turn), piers up into the parapet.
- GSU's blue blade sign on its pole at the curb, both faces, no logo (it's plain blue).
- A hidden core keeps a low sun from shining through (the windows don't cast).

## What still differs

- The columns only read when the sun is on the front: in the shade (GSU's photo) the game's ground
  floor is a flat pale wall, the real one has deep shadows in the flutes and the recessed glass.
- The side's windows have a stepped head where the real ones are segmental arches with brick
  headers.
- The cornice's brackets are plain blocks, the real ones are scrolled; the carved panels on the
  frieze over the columns and the 1922 frieze ornament aren't there.
- The real 1922 building's terra cotta has a rough block texture and is a little greyer in the
  shade; its piers and parapet are from the photos only (the lidar has the parapet, not the piers).
- The two camera fits disagree by about a meter on the cornice at the party wall end (the corner
  fits); the heights are the lidar's.
- The window lettering on the door bay's glass, the hanging flower baskets and the gas meter gate
  aren't drawn. The back on the alley and the east side on T Deck are guesses (the same brick and
  windows as the side).
- The game's dusk is darker and redder than the long exposure blue hour photo.

## Cost

7 parts (brick, dark, stone, cream, metal, glass, store) from the library's families, no new
shaders or textures. About 5.7k triangles. glass and store don't cast; a hidden core keeps the low
sun out. stone and cream are drawn first when you're close. 3 signs (the address, the blade sign's
two faces).

Measured after the merge.
