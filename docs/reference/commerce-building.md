# Commerce Building: references

What I built GSU's Commerce Building (34 Broad St) from. It went up in 1959-60 for the Commerce
Club, which had its rooms on the top floor until 2010; GSU has it now (IT, facilities, a
cybersecurity lab). It's on Broad St at Marietta St in the Fairlie-Poplar district, across Broad
St from the Robinson College of Business, outside the walking fence. A plain white box of 16
floors: black granite storefronts under a blue canopy that wraps round the Marietta St corner,
white panels over them with a sculpture of Georgia on the Broad St side, the top floor set back on
the two street sides. osm calls it the "Bennett A. Brown Commerce Building"; GSU's map says
"Commerce Building", so build-campus renames it (GSU_NAMES). Everything here is reference only: no
photos are in the repo, the measurements are my own. Photos I downloaded are kept outside the repo.

## Sources

Newest first.

| source                                                                      | date             | license              | facade                         | used for                                                                                       |
| --------------------------------------------------------------------------- | ---------------- | -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| GSU campus map (Concept3D, map 1108, location 295216), "20220325350MLB_GSU" | 2022-03-25, dusk | GSU                  | the Broad/Marietta corner      | side by side: the canopy and its curve, the storefronts, the granite, the white panels, colors |
| Mapillary (SydneyIStroud) on Broad, Walton and Marietta St                  | 2022-09-01       | CC BY-SA 4.0         | the street level round it      | by eye: the canopy along Broad St, the alley on the Walton side                                |
| USGS 3DEP lidar (GA statewide 2018)                                         | 2018             | public domain        | all                            | the outline, the roof, the top floor's setback, the penthouse, the alley, the ground           |
| Esri World Imagery Wayback, release 26334                                   | -                | Esri, reference only | roof, the Marietta side (lean) | rows of windows on the Marietta side, the penthouse                                            |
| OpenStreetMap way 252608870                                                 | -                | ODbL                 | -                              | the old outline (3m short on the Marietta side and not square)                                 |

GSU link (text only): https://map.concept3d.com/?id=1108#!m/295216

- **Newest photos**: March 2022, and only of the ground floor and the first few floors over the
  canopy on Broad St. I found no photo of the whole building (Commons, Mapillary, GSU's map and news
  pages): the floors over about 15m are drawn from the lidar and the satellite only.
- **Rating**: the corner photo's camera lined up by eye. Heights and the outline are lidar, the
  windows are a guess.

## Measurements

Elevations are USGS lidar (2018), heights in the game are over the Broad St sidewalk (320.6m).

- Ground: Broad St 320.1 at the Marietta corner to 320.7 at the alley.
- Outline: a 33.2 x 27.0m box. In a frame along Broad St from osm's south corner (-467.2, -101.1),
  the walls are 2.8m before it to 30.4m along, and from 0.2m out to 26.8m back. A 3m alley on the
  Walton side (ground 321), then a 40m building; 1.9m behind it the next one (osm building 275).
- Roof 383.2 (62.6), parapet 384.3. On the Broad and Marietta sides the walls top out at 376.4
  (55.8), then 379.1 two meters in and the roof three meters in: the top floor is set back there.
  On the alley and the back the roof goes to the wall.
- Penthouse 387.4 and 389.7, about 12 x 8m, 10-22m along Broad St and 6-14m back.

## What's in the game

- campus/commerceBuilding.ts. Outline redrawn in build-campus.mjs (COMMERCE) on the lidar, door
  moved to the gold doors near the alley end of the Broad St side (2022 photo).
- Ground floor: storefronts between black granite piers along Broad St and round the corner onto
  Marietta St, plain granite on the rest of Marietta St.
- The blue canopy (fascia 3.5-4.4m, 2.6m deep) along Broad St, round the corner on a quarter
  circle and 11m along Marietta St, white underneath.
- White panels with rows of narrow windows (a meter wide, one every 3m): from the fifth floor up on
  Broad St (the photo shows it blank over the canopy), from the second on Marietta St, and only
  over the neighbours on the alley and the back.
- The top floor 2.5m back behind a parapet on the two street sides, with wider windows, the roof
  and two penthouse blocks.

## What still differs

- Everything over about 15m is a guess for the windows and the top floor: the lidar gives the
  shape, not the facade. If a photo of the upper floors turns up, the slots and the top floor's
  glass are the first thing to check.
- The Georgia sculpture on the Broad St side isn't there, nor the shop signs, the canopy's lights
  or the gold doors (the door's panels come from Doors.tsx).
- The real panels have dark streaks under each joint; the game's dirt is blotchier.

## Cost

4 parts (white, granite, blue, glass) from the library's families (precast, metal, glass), no new
shaders or textures. About 3.2k triangles. The glass doesn't cast; a hidden core keeps a low sun
from going through the slots. The white panels are drawn first when you're close.

Measured after the merge.
