# 148 Edgewood: references

What I built 148 Edgewood Ave from. It was built in 1926 as a substation for the Georgia Railway
and Power Company, GSU bought it in 1966 (the photography department used it) and it has been
empty for years. GSU decided in August 2025 to tear it down for a Fraternity and Sorority Life
Plaza, after the Georgia Trust put it on its 2025 Places in Peril list, but it's still standing,
so it's in the game as it is: a four storey red brick box with a big brick arch on the front, a
stone belt course and a dentil cornice under the top floor. It's on Edgewood Ave next to GSU's
Greek housing, outside the walking fence. Everything here is reference only: no photos are in
the repo, the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                       | date                     | license              | facade                         | used for                                                                                       |
| ------------------------------------------------------------ | ------------------------ | -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Georgia Trust, Places in Peril 2025, photos 1, 3, 6, 7, 9-12 | winter 2024-25 (no exif) | courtesy, reference  | front, east side, back, inside | the front from a straight on photo on a fitted camera, colors, the east side, the back's doors |
| GSU campus map (Concept3D, map 1108, location 295236)        | -                        | GSU                  | -                              | that it's GSU's (Fraternity & Sorority Life), no photos                                        |
| Axios, Rough Draft, SaportaReport, Georgia Trust press       | 2024-10 to 2025-08       | text only            | -                              | the history and the demolition decision                                                        |
| Mapillary (SydneyIStroud) along Edgewood Ave                 | 2022-09-08 and 09-13     | CC BY-SA 4.0         | west side, east side's front   | by eye: the pale patches and graffiti on the west wall, the greek housing against the east     |
| Esri World Imagery (sat.py default release)                  | -                        | Esri, reference only | roof                           | the two long skylights on the main roof and one on the east strip                              |
| USGS 3DEP lidar (GA statewide 2018)                          | 2018                     | public domain        | all                            | the outline, the heights, the ground, the lower east strip                                     |
| OpenStreetMap way of building 92                             | -                        | ODbL                 | -                              | the old outline (0.8m short of the front)                                                      |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295236

- **Newest photos**: the Georgia Trust's, from the winter before its 2025 list (bare trees, a
  Harris/Walz sign on the greek housing). Nothing newer shows the building; the user (a GSU
  student) says it's still there in fall 2026. The windows are whole, steel framed, with the
  empty rooms behind them painted white.
- **Rating**: the front is a camera fit (the straight on photo, leveled 0.9 deg, level camera at
  a phone's 67.4 deg lens, about 10px rms on 1600). The south east photo is a full pose fit (it's
  pitched up), about 12px rms. The back and the west side are by eye.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Edgewood Ave sidewalk at the
door (303.9m).

- Ground: the sidewalk is 304.0 at the west corner and 303.8 at the east. The drive behind is
  302.7-303.5, the lot on the west 304.2.
- Main block: roof 319.5 (15.6), parapet 319.85 (15.95). The front wall at z -38.3, the west
  wall x 184.7, the back z -64.6.
- East strip (x 196.1 to the east wall, all but the front 3m): roof 316.5 (12.6), parapet 316.8
  (12.9). From the street you see the front's 3m return full height and the strip behind lower.
- The cornice: lidar has its top 0.9m out at 316.2, the photo puts it at 11.55-12.56.
- Skylights: two long ones on the main roof and one on the strip, 0.4m up (lidar), 2.6-2.7m wide
  (Esri).
- From the fitted front camera, over the sidewalk: stucco base to 1.1, the tall side windows
  1.24-7.1 (1.5 wide, centered 5.47m out from the middle, a grey panel at 4.1-5.04), belt course
  8.1-8.55, the windows over them 9.33-10.9, the dentil cornice 11.55-12.56, top floor windows
  12.8-14.3, a stone band 14.5-14.82, the coping to 15.95. The big arch: 2.6 outer and 2.15 inner
  radius, springing at 8.87 (a bit over the belt course), three window columns in it (0.65,
  1.42, 0.65 wide) with grey panels at 4.0-5.04 and 7.4-8.2, the doorway 1.38 wide in a stone
  surround with a hood on brackets to 3.98.
- Width: the lidar has the east wall at 200.3-200.55, the straight on photo fits best at 199.95
  (osm's, shared with the greek housing), the south east photo best at 200.55. I went with
  200.25 (15.55m wide).

## What's in the game

- campus/edgewood148.ts. Outline redrawn in build-campus.mjs (EDGEWOOD_148): a rectangle with
  its front on the windows' glass 0.2m behind the brick, 0.3m behind the lidar's front, or osm's
  Edgewood Ave sidewalk (its center line is at z -38.5 to -38.9 there) would run through the
  building and get cut in two. Its east side stays on the greek housing's wall (199.95), the
  brick is drawn 0.3m further out over the housing's edge. The door moved to the real one in
  the middle of the front.
- The front: the big arch with its ring of header bricks (a lighter tan, standing 4cm out), the
  brick inside it set back 8cm, three columns of steel windows with grey panels, the doorway
  with its stone surround, brackets and hood, the keystone, the tall arched windows each side
  with rings over them, the belt course, the dentil cornice, the top floor and its band, the
  metal coping.
- The east side: plain brick, the front's return full height, the strip behind lower, a pale
  patch where a neighbour once stood against it. The west side: plain brick, the stucco base
  round the corner, a pale patch up to an old roof line. The back: a door, a window, two roll
  up doors, small windows upstairs.
- It's empty: lit 0 on the windows, so they stay dark at night.

## What still differs

- The brick is a little lighter and more orange than the photo's, and the texture is a plain
  running bond: the real one is Flemish bond with dark headers, which makes it darker and
  speckled. The game's exposure is brighter than the phone photo all over, the ratios brick to
  stone are close.
- The stucco base is cleaner than the real one (rust stains, a darker beige).
- The narrow windows in the arch have round heads, the real ones follow the arch. The window
  mullions are a regular grid of small panes.
- The doors are a dark panel, the real ones are glass in black frames.
- The pale patches are a guess at their shape from two photos, the graffiti on the west wall
  isn't drawn.
- The back's ground floor is painted red with a white base for real, brick here, and the back's
  windows are placed by eye from one wide angle photo.
- The width is a compromise (see Measurements).

## Cost

6 parts (brick, old, stone, glass, panel, dark) from the library's families, no new shaders or
textures. About 1.3k triangles. glass, panel, dark and old don't cast; two hidden cores keep a
low sun from going through.

Measured after the merge.
