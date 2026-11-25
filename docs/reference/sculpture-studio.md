# Sculpture Studio: references

What I built GSU's Sculpture Studio (the Welch School of Art and Design's sculpture building, 246
Edgewood Ave NE) from. It's near the east end of Edgewood Ave by Boulevard, across from the
Municipal Market: a one storey red brick store building with a black storefront all along
Edgewood Ave, a false front parapet with a raised middle and GSU's sign on it, and a shallow
crowned roof behind. A gated drive on its west side goes back to the yard. The art school still
starts its iron pour there (December 2024). Everything here is reference only: no photos are in
the repo, the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                         | date             | license              | facade                     | used for                                                                                                     |
| -------------------------------------------------------------- | ---------------- | -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Esri World Imagery Wayback, release 26334                      | -                | Esri, reference only | roof                       | the footprint, the white membrane roof, the gravel lot on the east, the drive on the west                    |
| Mapillary 1220253438428519 and 959703834778156 (deirdreedsign) | 2019-12-12 12:20 | CC BY-SA 4.0         | the front from the east    | camera fitted on the lidar (4px rms on 1024, pitched up 16 deg): the step, the sign, the fence and gate      |
| Mapillary (nhhecker) along Edgewood Ave                        | 2019-04 and 08   | CC BY-SA 4.0         | the storefront, close      | by eye: the same storefront east of the doors, the black fence on the drive                                  |
| USGS 3DEP lidar (GA statewide 2018)                            | 2018             | public domain        | all                        | the outline, the parapet and roof heights, the ground                                                        |
| GSU campus map (Concept3D, map 1108, location 295235) photo    | 2015-12-12, dusk | GSU                  | the west half of the front | frontal, level camera fitted on the lidar's parapet step: every height and width of the storefront, the sign |
| OpenStreetMap way of building 24                               | -                | ODbL                 | -                          | the old outline (1.2m short of the front, a bit skewed)                                                      |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295235

- **Newest photos**: none from 2024-26 show the building. The newest Mapillary in the area is from
  the downtown connector (2025-26, too far). The 2019 street photos show the same front as GSU's
  2015 photo, and the 2024 iron pour still started there.
- **Rating**: two camera fits (2015 frontal, 2019 oblique), the sides and back never seen.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Edgewood Ave sidewalk at the
doors (298.5m).

- Ground: the sidewalk is 298.5 along the front, the lot falls to 297.7 halfway back and 296.8 at
  the back (z -81). The drive on the west is about the same.
- Walls: west x 524.9 (the lidar's coping 524.6-525.4), east 543.6, the front's brick at z -33.7
  (osm had -35), the back about -72.4 (the roof's edge in both the lidar and the satellite).
- Front parapet (the lidar files it as high vegetation, class 5): 305.1 (6.6) at both ends,
  305.65 (7.15, the building's height) from x 530.3 to 538.3. The side walls' coping 304.25
  (5.75). The roof is 303.65 (5.15) inside the side walls, rising to a ridge of 305.1 (6.6) down
  the middle (x ~534.3), so it just shows over the ends of the front parapet.
- Storefront, from the 2015 photo (frontal, 155.9 px a meter on the wall): a brick knee wall to
  0.72, lower lights to 2.95, a black bar, transoms (two panes each) to 3.95, a black band to 4.4.
  The black frame starts 0.75m in from the west corner. Three 1.48m windows west of the doors, a
  2.15m pair of glass doors under a black panel with 246 (2.5-3.05) between 0.35m jambs with a
  light on each, then 1.3m windows: seven to the east end in the game.
- Sign: a white plate from x 531.7 to about 535.6 (past the photo's edge), 5.36-6.0 high, a blue
  band on its west end, GSU's logo, a thin red line, SCULPTURE in thin spaced grey capitals.

## What's in the game

- campus/sculptureStudio.ts. Outline redrawn in build-campus.mjs (SCULPTURE_STUDIO), square to
  the game's axes: the front is the storefront glass 0.15m behind the brick (Part 22's rule).
  It's in GSU_BUILDINGS now, renamed 'Sculpture Studio' (GSU's map says "Atlanta - Sculpture
  Studio"), with the door between the glass doors. The new front cut the end off osm's sidewalk
  in front of it, so that point moves out to the middle of the sidewalk (two paths change).
- The black storefront with its knee wall, bars, transom mullions, the 246 panel and the two
  door lights; the stepped parapet with dark copings; plain brick sides; a back wall with a low
  gable over the ridge; the white roof in two shallow slopes.
- The sign: a white plate with the blue band, a plain blue square where GSU's logo is
  (trademark), the red line and SCULPTURE.
- The black picket fence across the drive on the west (only drawn within 80m).
- furniture.ts: it's a workshop, so it gets the lobby-only furniture like the gyms and labs.

## What still differs

- The sides and the back were never seen in any photo: plain brick, no doors or windows. The
  real yard on the west (the iron pour happens out back) probably has roll up doors.
- The east end of the storefront is past the edge of the 2015 photo and hidden behind a pole in
  the 2019 one: seven equal windows to a 0.5m brick pier is a guess.
- The 2019 photo shows a dark box sticking up over the parapet near the east end (a chimney or a
  vent), and the 2015 photo something pale and sloped over the step (on the roof). Neither is in.
- The 2015 photo's sign has a blue band on its west end, in the 2019 one it's hard to see (shade).
- The sidewalk in front is narrower in the game than the real one (Edgewood Ave's road strip
  comes up close to the building). That's the map's road, not the building.
- Colors: the 2015 photo is a cloudy dusk, the 2019 one cloudy noon, the game's sun makes the
  brick look more orange in full sun. The glass in the photos shows the street and lit rooms,
  in the game it's darker.

## Cost

5 parts (brick, frame, glass, roof, fence) from the library's families, no new shaders or
textures. About 1k triangles (686 of them the fence, which is only drawn within 80m). Glass,
frame and fence don't cast; a hidden core keeps a low sun from going in the storefront. Brick is
drawn first when you're close. 6 small sign planes (shown within 60m).

Measured after the merge.
