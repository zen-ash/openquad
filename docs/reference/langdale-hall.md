# Langdale Hall: references

What I built Langdale Hall (the old General Classroom Building, 1971, 38 Peachtree Center
Ave) from. Everything here is reference only: no photos are in the repo, the measurements
are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first. "Facade" is which side of the building it shows.

| source                                                                                                                                                                                       | date                      | license                      | facade                                                    | used for                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GSU campus map (Concept3D, map 1108, location 295227 "Atlanta - Langdale Hall"): `Image_32` ("accessible bridge entrance")                                                                   | uploaded 2026-03-16       | GSU, all rights reserved     | the doors on the plaza (south east side), close up        | the plaza entrance: canopy, black storefront, the name plate, slot windows in the pier next to it                                          |
| same location: `Image_31` ("accessible entrance"), `Image_33` (elevators)                                                                                                                    | uploaded 2026-03-16       | GSU, all rights reserved     | the ramp by the Peachtree Center Ave doors, inside        | checking only                                                                                                                              |
| GSU campus map, location 900563 "Docks - Langdale": `Langdale`                                                                                                                               | uploaded 2024-04-16       | GSU, all rights reserved     | the loading dock, inside                                  | checking only (not drawn)                                                                                                                  |
| same location 295227: `20230424MLB_Grilling_on_the_Greenway_121`                                                                                                                             | 2023-04-24                | GSU, all rights reserved     | south east side and the bay, from the Courtland St end    | slot windows (two columns), the bay's glass side, band. Side by side D                                                                     |
| same location 295227: `20220902MLB_GSU_Stock_009`                                                                                                                                            | 2022-09-02                | GSU, all rights reserved     | the new front (north east) and Peachtree Center Ave       | the new front rectified on a meter grid, the band's rows and ledges, piers on Peachtree Center Ave, the canopy's north end. Side by side A |
| same location 295227: `20180605MLB_Summer_Semester_015`                                                                                                                                      | 2018-06-05                | GSU, all rights reserved     | south east and Decatur St, from the roof of Library South | the band (ledges, fins, solid bits), the pylons, piers on the south east side, the penthouse, the plaza entrance. Side by side B           |
| Mapillary 799837787620723 (and 485196292533828, 936775537113248, 1202310806874145, 2926378700974602, 834880060793123, 895260911051471)                                                       | 2019-12-12 and 2019-12-16 | CC BY-SA 4.0 (deirdreedsign) | the Decatur St / Peachtree Center Ave corner              | the pylons, the base under the brick, the doors under the pylons, the canopy's south end, heights (band bottom 29.5m). Side by side C      |
| Commons: File:Kell Hall, Georgia State University, Atlanta, GA (40508268973).jpg, https://commons.wikimedia.org/wiki/File:Kell_Hall,_Georgia_State_University,_Atlanta,_GA_(40508268973).jpg | 2019-03-23                | CC0, Warren LeMay            | Peachtree Center Ave, the north end                       | the north end of that side (no doors there), the low brick planter wall                                                                    |
| Esri World Imagery Wayback, releases 26334 (2026-08-05), 13192 (2025-12-18), 16453 (2024-12-12), 44873 (2023-03-15)                                                                          | 2023-2026                 | Esri, reference only         | roof                                                      | footprint (osm's outline matches the new front's bay), the band all round, penthouse and units                                             |
| GSU Magazine, "Campus Connector" (spring 2020), https://news.gsu.edu/magazine/spring2020/campus-connector                                                                                    | 2020                      | GSU                          | text                                                      | new facades on Langdale Hall where Kell Hall adjoined it (Kell came down in 2019)                                                          |
| Overture Maps 2026-09-23                                                                                                                                                                     | 2026                      | ODbL/CDLA                    | -                                                         | 28.8m, which is wrong (see below)                                                                                                          |

GSU links (the files behind https://map.concept3d.com/?id=1108#!m/295227 and #!m/900563):

- https://assets.concept3d.com/assets/1108/20220902MLB_GSU_Stock_009_6670a678240aa.jpg
- https://assets.concept3d.com/assets/1108/20230424MLB_Grilling_on_the_Greenway_121_6670a62190008.jpg
- https://assets.concept3d.com/assets/1108/20180605MLB_Summer_Semester_015_6670a62381c26.jpg
- https://assets.concept3d.com/assets/1108/Image_31__69b87ef8ca8c4.jpeg
- https://assets.concept3d.com/assets/1108/Image_32__69b87efa51182.jpeg
- https://assets.concept3d.com/assets/1108/Image_33__69b87efbaac45.jpeg
- https://assets.concept3d.com/assets/1108/Langdale_661ee29c2667f.jpeg

- **Mapillary**: 354 images in a 180m box round it through the Graph API (the public token
  mapillary.com's own viewer uses). The newest are 2021-01-19/20 (a dash cam on Decatur St,
  looking along the street, no use). The good ones are 2019-12-12/16 from the corner of
  Decatur St and Peachtree Center Ave. The 2018 dash cam run on Peachtree Center Ave has
  wrong headings and looks at the other side of the street.
- **Newest photos**: GSU's, 2022 and 2023 for the new front and the plaza side, 2026 for the
  plaza doors close up. **Flag**: Decatur St and the south end of Peachtree Center Ave are
  only in the 2019 Mapillary photos, and the south east side face on only in GSU's 2018
  photo (the 2023 one sees it at an angle). Nothing newer shows those sides changed.
- **Rating**: 4 angles I could fit a camera to (GSU 2022, GSU 2018, Mapillary 2019, GSU
  2023), plus the 2026 close up of the plaza doors and the 2019 Commons photo.

## Facade breakdown

- **Floors and height**: 11 floors. A tall ground floor (about 4.25m), then floors 2-8 as
  one window per floor in each slot, then floors 9-11 in the band at the top, which sticks
  out all round. 44m to the top of the band (the bay's new front goes 1.4m higher). The old
  campus.json height was 28.8m from Overture, which would be 7 floors; the photos say 44,
  so build-campus.mjs sets it by hand.
- **Plan**: a box 56 by 36m (osm's outline, the brick panels are on it and the piers stand
  0.3m in front), plus a 21 by 5m bay on the north east side where Kell Hall was built
  against it until 2019.
- **Materials**: light precast, a warm beige grey in the sun and a neutral grey in the shade
  (piers, base, band), a dull grey brown brick in the recessed panels, a lighter grey brown
  brick on the new front, small white marble panels under the slot windows (drawn with the
  precast, see Cost), dark bronze frames. Flat white roof, a long penthouse in the dark
  brick. Picked by comparing ratios inside each photo: the brick is about 0.5 as bright as
  the precast beside it in the same light (2018, 2019, 2022 shade), 0.63 in the 2026 close
  up, the grey brick about 0.75 (2022).
- **Old sides (Peachtree Center Ave, Decatur St, the plaza)**: tall brick panels set 0.3m
  back between precast piers, a 1.3m precast base under the brick. Each pier is really two
  piers with a slot between them: narrow windows one per floor, two columns (three on
  Decatur St), half a floor apart in each column, a marble panel under every window.
  Stepped brackets under the band on every pier.
  - Peachtree Center Ave (55.9m): six piers, 3.4m wide, 8.15m apart (the 2022 photo and the
    2019 one agree within a meter). The main doors are in two panels under a long canopy
    (3.9-5.3m up, 2.6m out) from the second pier to the fourth, with the name on it: the
    2022 photo has its north end, the 2019 one its south end.
  - Decatur St (35.9m): two wide pylons (5m) that go on up through the band to the roof,
    with a door at the foot of each under a small canopy (2019 photo).
  - The plaza (56.3m): six narrower piers (2.9m), the doors under a canopy with the name
    under the fifth panel (2018 photo, the 2026 close up).
- **The band (floors 9-11)**: a 1.7m beam, three rows of windows 3.35m high with 0.5m
  ledges between them, a 1.4m fascia. The ledges and fascia stick out 1.2m past the piers
  under them and throw a shadow line across each row; the windows sit between wedge shaped
  fins 1.3m apart, set back, with solid bits over the piers below (much wider over the
  first pier from the south corner, 2018 photo).
- **The new front (north east, 2020)**, rectified on a meter grid from the 2022 photo:
  glass on the ground floor behind a screen of thin posts, then a part that sticks out a
  little with four rows of grey brick panels in a precast grid (three columns, the middle
  one wide) up to 23.3m, two rows of the old dark brick (a small window in the first), then
  three rows of six windows in the middle column and blank panels either side, up to 45.4m.
  The bay's two short sides are glass with dark panels at each floor, the band over them.
- **Roof**: white membrane, a long dark brick penthouse set back from Peachtree Center Ave,
  a metal duct and a few units (2018 photo, satellite).
- **Signage**: brushed aluminium plates with a blue edge, the GSU logo (a plain blue square
  here, trademark) and "LANGDALE HALL" in dark grey letters, on the canopies.

## Not verified

- The north east side of the box either side of the bay, and the bay's south east side:
  only edge on in the 2022 and 2023 photos. Drawn like the rest (a brick panel between
  piers; glass like the bay's other side).
- The plaza side's piers: two ways of measuring the 2018 photo disagree by 1-2m, I used
  the average spacing.
- The canopy on Peachtree Center Ave: each end is from a different photo, and where the
  doors are under it is from the 2019 photo only.
- The doors at the foot of the pylons on Decatur St (one 2019 photo from across the
  street), the penthouse (plus or minus 2m), the canopies' heights (plus or minus 0.5m).
- The streets slope (Decatur St drops toward Peachtree Center Ave); the game's ground is
  flat, so the base is the same height all round.

## Cost

5 parts (precast, brick, the grey brick, glass, frames), 6.0k triangles, no new shaders:
the warm-up still builds 877 shaders and 790 pipelines. The roof and the white marble panels
in the slots are drawn with the precast, as their own parts they cost a draw call in every
pass for things you hardly see. The glass and the frames don't cast shadows (they're all
set into the walls, `noShadow` in landmarks.ts).

Prod builds in one browser, taking turns, 2 rounds thrown away and the median of 4 (ms at
1920x1200, on AC). "before" is the build from before the library (546ae05), "pre" the one
just before Langdale Hall (b95d9fa), "now" this:

| spot            | before | pre   | now   | now - before | now - pre |
| --------------- | ------ | ----- | ----- | ------------ | --------- |
| sce             | 9.55   | 10.50 | 10.60 | 1.05         | 0.10      |
| park            | 10.50  | 10.35 | 10.30 | -0.20        | -0.05     |
| scw view        | 10.15  | 11.15 | 11.35 | 1.20         | 0.20      |
| scw grilles     | 11.85  | 12.35 | 12.35 | 0.50         | 0.00      |
| library north   | 9.90   | 10.30 | 10.85 | 0.95         | 0.55      |
| dahlberg        | 11.45  | 10.00 | 10.20 | -1.25        | 0.20      |
| langdale street | 10.80  | 12.00 | 12.20 | 1.40         | 0.20      |
| langdale close  | 11.65  | 11.45 | 11.45 | -0.20        | 0.00      |

Langdale Hall itself adds 0 to 0.55 ms (most where it's at the edge of the library north
view). The three spots over +1 ms against "before" were already that far over at "pre".
At the street spot, hiding every other hand-built building in the page takes 1.15 ms off
and hiding the street lamps and benches 0.65 ms, even though almost none of them are in
view; hiding Langdale Hall takes off 0.6 ms (in-page toggles on the dev build).
