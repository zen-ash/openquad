# Accuracy checklist

For every building with an info card: is the name GSU's official one, is our door the real
main entrance, and is the route there the way a person would walk. Checked Nov 28 2026
against GSU's own pages (gsu.edu sites and GSU's campus map), reference only. The card text
in `apps/web/src/campus/places.json` is our own words.

Route = walking route from Hurt Park (where you start) / the straight line, in meters.

| Building                          | Name | Door                    | Route from Hurt Park |
| --------------------------------- | ---- | ----------------------- | -------------------- |
| Student Center East               | ok   | ok (Unity Plaza doors)  | 204 / 133            |
| Student Center West               | ok   | ok (Courtland St)       | 235 / 159            |
| University Bookstore              | ok   | unsure                  | 228 / 153            |
| Student Success Center            | ok   | unsure                  | 371 / 239            |
| Library North                     | ok   | ok (2022 lobby)         | 333 / 157            |
| Library South                     | ok   | **wrong**               | 410 / 249            |
| Langdale Hall                     | ok   | ok (Peachtree Center)   | 263 / 201            |
| Classroom South                   | ok   | ok (Decatur St lobby)   | 329 / 255            |
| Helen M. Aderhold Learning Center | ok   | ok (Luckie St)          | 573 / 416            |
| 25 Park Place                     | ok   | ok (Park Place plaza)   | 406 / 259            |
| Urban Life Building               | ok   | ok (plaza doors)        | 304 / 205            |
| 75 Piedmont Avenue                | ok   | ok (Piedmont Ave)       | 565 / 410            |
| Piedmont Central                  | ok   | ok (faces W Lot)        | 575 / 366            |
| Piedmont North A                  | ok   | unsure                  | 877 / 635            |
| Piedmont North B                  | ok   | unsure                  | 925 / 666            |
| Piedmont North Dining Hall        | ok   | unsure                  | 924 / 659            |
| University Commons                | ok   | ok (Piedmont Ave)       | 645 / 467            |
| Patton Hall                       | ok   | ok (Edgewood Ave)       | 324 / 281            |
| Centennial Hall                   | ok   | ok (north porch, W Lot) | 390 / 258            |
| Student Recreation Center         | ok   | ok (Piedmont Ave)       | 328 / 236            |
| Petit Science Center              | ok   | ok (Decatur St plaza)   | 509 / 343            |

## To fix

- Library South: our door is at street level under the plaza (the loading dock side). The
  public ways in are on the plaza / bridge level facing Library North, through Classroom
  South, and from G Deck.
- Unsure doors (Bookstore, Student Success Center, Piedmont North A, B and the dining hall):
  no source says which door is the main one. Ours were placed from photos.
- Arts & Humanities (no card yet): GSU's main door is on Peachtree Center Ave, ours is on the
  Gilmer St / Panther Quad face.
- Names: the Urban Life Building's own sign says "Urban Life Center", and GSU's map calls the
  bookstore the "Bookstore Building". We kept the names GSU's map uses for the building.

## Routes

Routes were checked from Hurt Park, Library North and Langdale Hall. All of them stay under
about 1.6 times the straight line except where something real is in the way:

- Library North to Student Center West or the bookstore goes up to where the Courtland St
  viaduct meets the ground and back along it (the doors are on the viaduct, 5m above Decatur
  St). Before Nov 2026 the route went straight through the viaduct's wall.
- North of Library North the old osm footpath runs through the library stair's guard rails
  and the quad's planters, so routes to Woodruff Park go round. Whether our stair matches the
  real one is worth a look.
