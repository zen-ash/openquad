# Courtland Building: references

What I built the Courtland Building (120 Courtland St SE) from. Red brick with cast stone trim,
two storeys over the Courtland St viaduct, about two more floors down to the alley and the back
drive, and a lower brick part at the back with GSU's "Courtland South" loading dock. GSU's map
says it has maintenance departments and the ROTC units (ROTC's own site has them at 755 Hank
Aaron Dr now). Everything here is reference only: no photos are in the repo, the measurements
are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                             | date                        | license              | facade                                                      | used for                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | --------------------------- | -------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esri World Imagery Wayback, release 26334 (zoom 20)                                | 2026-08-05 (image ~2026-02) | Esri, reference only | roof                                                        | the roof, the penthouse and the parapets are the same as in the 2018 lidar                                                                                                                          |
| GSU campus map (Concept3D, map 1108, location 900495 "Docks - Courtland South")    | uploaded 2024-04-16         | GSU                  | the back, the dock on the drive                             | the low part with the dock, its canopy and doors, the brick shaft, the stepped back of the two storey part with its louvre. By eye                                                                  |
| GSU campus map, location 295233                                                    | -                           | GSU                  | none                                                        | the text (what's in it)                                                                                                                                                                             |
| Wikimedia Commons "Courtland Street, Atlanta, GA (40508643613).jpg" (Warren LeMay) | 2019-03-23 10:18            | CC0                  | the street front (in shade) and the north wall (in low sun) | camera fitted on the lidar (2.9px rms on 1600): the seven bays, every window, sill, lintel, band, tablet and the coping, the entrance and the plate. Side by side and 50/50 overlay, and the colors |
| Mapillary (lxmatl3 2017, deirdreedsign 2019, davegis 2016)                         | 2016-2019                   | CC BY-SA 4.0         | the street front along the viaduct                          | by eye: the same front 2016-2019                                                                                                                                                                    |
| USGS 3DEP lidar (GA statewide 2018)                                                | 2018                        | public domain        | all                                                         | the outline, every height, the two levels (street and drive), the projections and the penthouse on the back                                                                                         |
| OpenStreetMap way 252608875                                                        | -                           | ODbL                 | -                                                           | the old outline (right to about a meter)                                                                                                                                                            |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/900495 and #!m/295233):

- https://assets.concept3d.com/assets/1108/Courtland_South_661ede710894e.jpeg
- https://assets.concept3d.com/assets/1108/Courtland_South_Pt_2_661ede7007b13.jpeg

- **Newest photos**: 2019 for the street front, 2024 for the back, 2026 for the roof
  (satellite). No photo of the south wall.
- **Rating**: one tight camera fit (LeMay 2019, the front), the back by eye.

## Facade breakdown

- **Plan**: osm's box was right to about a meter. build-campus.mjs redraws it in the sports
  arena's frame like Courtland North. The json outline is only the two storey part (16.45 x
  31.15m): the front on the windows' glass (10cm behind the brick) with a notch 1m deep for the
  entrance. The low part behind it (14.75m deep, with the brick shaft by the dock sticking out)
  is drawn and walled in courtlandBuilding.ts (`WING`, `wingWalls` in game/world.ts), because
  the inside's ceiling (3.3m) covers the whole outline and would stand over a low roof.
- **Heights**: the two storey part over the sidewalk at the doors (322.0m): stone coping
  8.7-8.95m (a block on it at the north corner), the north and south parapets 8.6m and the back
  8.4m with metal copings, roof 7.6m, the penthouse 11m (the json's height). Overture's 16.8m
  was the roof over the ground at the back, it's gone from MEASURED_HEIGHTS.
- **Street front**: seven bays 4.19m apart. Upstairs a pair of tall one-over-one windows per
  bay (1.05 x 2.3m) on stone sills, tight under the stone band (7.25-7.5m). Downstairs a wide
  three-light window (2.95m) under a stone lintel in six bays, the entrance in the middle one: a
  recess 2.4m wide and 1m deep up to 3.4m, a stone soffit, the plate over it (white, a plain
  blue square at its north end where GSU's logo is), "120" beside it. Two stone tablets in the
  brick over the band, over the piers between bays 2|3 and 5|6. A grey concrete base 0.45m.
- **Windows**: upstairs light warm glass in dark frames (white blinds behind most of them in
  2019). Downstairs dark glass in light aluminium frames: they had big ROTC pictures in them in
  2019, and ROTC has moved out.
- **North and south walls**: plain brick to the metal coping.
- **The back** (from the 2024 photo and the lidar): the two storey part's back over the low
  roof with two stair towers on it and the penthouse with a black louvre. The low part is a
  brick box 1m tall (roof 0.6m, parapets 1m on the north and south and 0.9m on the back, see
  "The ground level"), with the dock as a low concrete wall along its back and the brick shaft
  as a bump of the same height. The dock's doors and canopy, and the shaft's opening, don't fit
  at that height and aren't drawn.
- **Colors**: ratios inside the 2019 photo against the viaduct's parapet (it's in both photos,
  that's how the two buildings were compared): photo / game. Brick 0.18 / 0.19, the lintels
  0.71 / 0.68, so lintel over brick 3.9 / 3.6, the base over the brick 2.3 / 2.2. The windows
  upstairs are 5x the brick in the photo (the blinds), 2x in the game.

### What I changed from the research notes

- The low part isn't drawn from the back drive like the notes suggested: it's lowered so it
  hides behind the viaduct's parapet from Courtland St (below).
- The penthouse's east wall is flush with the back wall (83.85) instead of 0.15m past it.
- The windows downstairs are dark glass with light frames, upstairs light glass with dark
  frames: one glass for both looked wrong either way, so they're two materials.

## Not verified

- Nothing newer than 2019 shows the street front. What's in the windows downstairs since ROTC
  left is a guess (dark glass).
- The south wall (no photo): plain brick.
- The back is by eye from one photo (the stair towers, the penthouse, the louvre). The dock's
  roll up door, open bay and canopy, the gantry crane, the white duct, the fence and the shed
  are left out, and the dock's face is grey concrete where the real one is painted yellow.
- The window mullions are small in every photo: three lights downstairs, one over one upstairs.
- A floodlight on the north wall and the wall lamp over the doors aren't drawn.

## The ground level

The sidewalk runs from 321.5m at the north corner to 322.35m at the south one; the alley, the
back drive and the ground south of the building are 8.7-9.4m lower (312.6-313.3m). The game is
flat, so I picked the sidewalk at the doors (322.0m). The low part's real roof is 3.3m under
that and you can't see it from Courtland St, it's under the viaduct's parapet. I first drew it
from the back drive (313.3m, 5.4m roof, 6.55m parapets), but then it stood 6.5m tall past the
north and south walls from the street, where the 2019 photo has sky and the parapet. The street
is where people walk and the drive is a service drive at the edge of campus, so the low part is
now a box whose top (1m) is just under the parapet's (1.1m): from Courtland St it's hidden like
the real one. What it costs:

- from the back drive it's much lower than real: 1m tall where the real one is 6.5m over the
  drive (the drive is 8.7m below Courtland St and the game is flat), the dock is only its low
  concrete face, and the two storey part's back and the stair towers rise straight up from it,
  8.4m where the real back is 17m over the drive,
- from a high camera on Courtland St you can see its roof over the parapet,
- the front sits 0.5m high at its north end (more base shows in the photo there),
- the arena (drawn from 309.0m) is 11.6m too tall next to it, and its shadow covers the whole
  north wall in the morning where the photo has only a diagonal one.

## The game's door

campus.json had the door 12.6m south on a blank pier. It's at the back of the entrance recess
now, [-162.67, 287.79], facing Courtland St; the recess is a notch in the outline, so the
doorway is the whole back of it. The gps route from Hurt Park gets there along the Courtland St
sidewalk (the navgraph test passes). furniture.ts gives it 25 pieces (the inside is only the
two storey part now); the windows are opaque, so only the doorway shows them.

The viaduct's parapet in front of the alley and south of the building is drawn with Courtland
North (courtland-north.md).

## Cost

6 parts (brick, stone, base, glass, dark, metal), all from the library's families, so no new
shaders and no new textures (the warm-up count is in courtland-north.md, measured with both,
before the low part was lowered; that only removed geometry). The brick is drawn first when
you're close. The glass doesn't cast shadows, it's all set in
walls with the building behind it. The entrance soffit has a ceiling 0.8m up inside, for the
shadows only (Part 27). The light frames of the windows downstairs are thin metal strips over
the dark glass, so the glass can keep the dark frames the windows upstairs have.

About 890 triangles: stone 350, brick 270, metal 155 (the frames are most of it), glass 55,
base 40, dark 15.

The frame numbers are in courtland-north.md, both buildings are in both spots.
