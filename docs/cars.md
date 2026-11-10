# Cars

The parked and driving cars. `game/parking.ts` and `game/traffic.ts` say where they are,
`campus/cars.ts` makes the models, `campus/carMaterial.ts` is their one material and
`scene/Cars.tsx` draws them. The interface between the two sides is `game/cars.ts` (kinds
with their real outside sizes, and the `Car` / `Driving` types).

## The models

There's no usable CC0 set of realistic cars (Poly Haven only has a covered car, the
Kenney/Quaternius ones are low poly), so they're built in code like the hand-built buildings.
Five kinds, each one sized like a common car on Atlanta's streets:

| kind    | built like                   | size (m)           | wheelbase | tires     |
| ------- | ---------------------------- | ------------------ | --------- | --------- |
| sedan   | Toyota Camry (XV70, 2018-24) | 4.88 x 1.84 x 1.45 | 2.825     | 215/55R17 |
| compact | Honda Civic sedan (2022-)    | 4.67 x 1.80 x 1.42 | 2.735     | 215/50R17 |
| suv     | Toyota RAV4 (XA50, 2019-)    | 4.60 x 1.86 x 1.70 | 2.69      | 225/65R17 |
| pickup  | Ford F-150 SuperCrew 5.5 ft  | 5.89 x 2.03 x 1.96 | 3.683     | 275/65R18 |
| minivan | Honda Odyssey (RL6, 2018-)   | 5.16 x 1.99 x 1.77 | 3.0       | 235/60R18 |

Sizes, wheelbases and tires are the makers' published numbers (tire diameters 0.67, 0.65,
0.72, 0.82 and 0.74 m, rims 17-18"). Generic shapes, no badges and no copied grilles.

Each body is a loft: cross sections ("stations") from the front bumper to the back one,
right half only, then mirrored. A section is 17 points from the middle of the underbody round
the side to the middle of the roof (the wheel well, the sill or the arch's lip, four feature
lines, the shoulder, the side glass, the roof rail and the roof). The heights come from
profiles along the car drawn from photos (`top`: hood, windshield, roof, back glass, trunk;
`belt`: the fender tops, the belt line, the trunk edge). The ends round off from above as a
superellipse and lean back from the bumper (`End` in the spec), the sides curve in to the sill
and lean in over a shoulder crease, the glass leans in (tumblehome), the wheel arches cut the
sides round the tires a few cm over them, a pickup's bed is an open box behind the cab.

The geometry only knows paint, glass, black trim (window frames, pillars, cladding), tire,
rim and dark (wells, underbody), by which band of the section a face is in and where along the
car. Normals are smooth except along creases (the wheel wells, the glass's edges, the
shoulder). Plus four wheels (tire with rounded shoulders and sidewalls, ten spoke rims),
mirrors (a rounded box on a black foot), door handles close up and roof rails on the suv.

Three versions of each kind:

| kind    | near (< 30 m) | mid (30-90 m) | far (90-400 m) |
| ------- | ------------- | ------------- | -------------- |
| sedan   | 6064          | 1432          | 360            |
| compact | 5936          | 1392          | 384            |
| suv     | 5768          | 1312          | 384            |
| pickup  | 6192          | 1552          | 408            |
| minivan | 5872          | 1432          | 360            |

(triangles, plus 2 for the soft shadow). The mid and far ones are the same loft with fewer
stations and section points, simpler wheels (a disc, a six sided drum), lighter mirrors and
no handles. `cars.test.ts` checks every one is the kind's size within 3 cm, the simpler ones
line up with the full one, every triangle is wound like its normals, there are no broken
numbers, the windows are over the belt line and the lights and grille fit on the body.

## The material

One `MeshPhysicalNodeMaterial` for every car (`carMaterial.ts`), one shader. `aPart` says what
a bit is (and for the wheels where their hub is), the instance attributes `aPaint` (linear
color + metalness) and `aState` (lights, how far the wheels have turned, heading, kind and dark
rims) say the rest.

- Everything on the paint is drawn per pixel from the car's own position and normal (the
  `position` and `normal` attributes, so it works in every pass and in the toon look): the
  head lights (chrome inside, black at the bottom, the running light strip along the top,
  sweeping back along the fender), the grille in its chrome or gloss black frame (black mesh,
  or the pickup's chrome bars), the lower intake, the fog lights in their pockets, a black
  lower bumper, the hood's shut line across the front and along the fenders, the doors' shut
  lines, the minivan's sliding door track, and at the back the tail lights wrapping onto the
  sides (a brighter stripe, a white reverse light), the trunk lid or tailgate's shut lines,
  the plate in its recess and a black lower bumper. The shapes are numbers per kind (`Face` in
  `cars.ts`, picked by kind in the shader). It's crisp close up, fades its mesh pattern far
  away and is the same at every level of detail.
- Paint: the US mix (white 25%, black 20%, grey 18%, silver 10%, blue 9%, red 9%, a few
  brown, beige, green, orange), each car a little lighter or darker, under a clear coat
  (roughness 0.03) so it reflects the sky and the street. Metallic paints are only a bit
  metallic, more looks like bare metal.
- Glass: black, with a clear coat (strong reflections at grazing angles), and a made up
  inside traced per pixel: the view goes into a box the size of the cabin, with the seat
  backs and headrests of two rows in it, the roof lining, and the windows on the far side
  bright by day (like the rooms behind building windows). Fades with the glass's reflection
  and goes dark at night.
- Rims bright aluminium (a quarter dark), tires dark rubber, trim black satin plastic.
- Lights through `emissiveNode`: driving cars have running lights by day and head and tail
  lights at night (`night` from facade.ts), brake lights when braking. Parked cars are dark.
  Brightness goes by a uniform per quality (low has no glare), never a material number.
- The wheels turn: the material overrides `setupPosition` and turns the wheel's vertices
  round their hub before the car is placed (like the leaves' sway in Trees.tsx).
- The underbody and the wheel wells aren't in the shadow maps (`castShadowPositionNode`
  moves them away there). A floor a hand's width over the ground is about as high as the
  point the ground's shadow lookup is taken from (the light's normal bias, 0.2 m), so its
  shadow came out as jagged teeth in front of the bumpers, and lifting the bottom of the car
  instead left stripes in the shadow beside it. The sides and wheels still cast, and the soft
  shadow under each car darkens the ground under it.
- `select()` is a real `if` in the shader, and three r186 sets a shared value (its own
  `normalView` too) wherever it's first used. With the glass's inside in a `select()` that was
  inside the glass's `if`, so the rest of the car was lit with a zero normal and came out
  black, no error anywhere. The inside's fresnel uses the car's own normal now, and the inside
  is only traced on the glass. A `toVar()` doesn't carry over between outputs either (it's set
  to 0 again in each), so the paint is worked out once in the color output into two
  `property()`s that roughness, metalness, clear coat and the lights read. Before that every
  output worked the paint's shapes out again: the fragment shader was 222k characters, now
  113k. Check a change like this in the generated wgsl (`renderer.debug.getShaderAsync`).

Under each car there's a soft shadow: a quad a bit bigger than its footprint, darkest in the
middle and fading out (a second mesh sharing the cars' buffers, transparent, no depth
write). It's the shadow on low quality and far away, and the dark under the car close
up.

## Drawing them

On WebGPU the parked cars are one mesh and the driving ones another, each with an indirect
draw for each kind at each level of detail (`geometry.setIndirect`): one draw call a pass in
three, up to 15 indirect ones inside it. The shadow passes only draw the near ones
(`onBeforeRender` swaps the indirect offsets when the scene's override material is the
shadow material). The soft shadows are one more mesh for each, scene pass only. The WebGL2
fallback has no indirect draws, there it's a mesh per kind and level of detail with both, and
the levels of detail come in to half the distance.

They aren't three's `InstancedMesh`es any more: those went up to the gpu whole every frame,
~3.6 MB. Matrices that fit in 64 KB go in a uniform buffer that's written again for every
render object every frame, and for TAA three keeps a copy of last frame's matrices that goes
up whole whenever one changed. Now each car is four numbers in each of four instanced
attributes: `aNow` (where it is and its heading), `aWas` (where it was last frame), `aPaint`
and `aState` (lights, wheel turn, pitch, kind). The material places it (`moved()` in
carMaterial.ts, which also gives the motion vectors from `aWas`). A car's numbers are only
written when they change, one update range per group: the parked ones when they're sorted
again, the driving ones while they move. Not `DynamicDrawUsage`: three uploads those whole
every time they're used, 17 times a frame here.

Every car is placed on the cpu: parked ones are sorted again when the camera has moved 5 m or
turned 11 degrees (tested against a frustum 30 degrees wider than the camera's), driving ones
every frame. Only cars on screen go in (a mesh is culled as one), the close ones even off
screen for their shadows. Driving cars are known by their paint, which is unique to each trip
(the list's order changes as trips start and end).

`Places` (cars.ts) keeps every car in the same place while it stays, so it isn't written
again: one that leaves leaves a hole (moved far under the ground), a new one fills a hole.
Where a driving car was last frame is in its own numbers, so it keeps its motion when it moves
to another level of detail.

The join warm-up draws them: while warming each mesh draws at least one car (under the ground
if there's none in view).

Not drawn with `?nocity`. Works in the game look, realistic, toon and the WebGL2 fallback.
Toonify swaps the material but copies `positionNode`, so the placing, the normals and the
wheel turn are all in there.

## Sources

Reference only, nothing copied (all Wikimedia Commons, CC BY-SA):

- 2019 Toyota Camry LE front left / rear left (Aug 2019, CC BY-SA 3.0)
- 2021 Toyota Camry, Taiwan police, left side (Sep 2021, CC BY-SA 4.0)
- 2023 Toyota Camry XSE front left (Jun 2026, CC BY-SA 4.0)
- 2022 Honda Civic Sedan EX front left / rear left (Mar 2023, CC BY-SA 3.0)
- 2020 Toyota RAV4 XLE front left (Sep 2020, CC BY-SA 4.0), 2019 RAV4 XLE rear left
  (Nov 2024, CC BY-SA 4.0)
- 2021 Ford F-150 XL front left (Nov 2022, CC BY-SA 4.0), 2021 F-150 SuperCrew rear
  (Apr 2021, CC BY-SA 4.0)
- 2024 Honda Odyssey Elite front left (Aug 2024, CC BY-SA 3.0), 2018 Odyssey rear (Mar 2018,
  CC BY-SA 4.0)
- Mapillary 3004848063167307 (Dec 11 2019, CC BY-SA), Jesse Hill Jr Dr by S deck, for the
  look on the street.

Paint mix: roughly Axalta's yearly global color popularity report (North America). No pure
side photos of the Civic, RAV4, F-150 or Odyssey under CC were found; their sides were
checked against the 3/4 photos.

## Still off

- The bodies are smoother and plainer than the real ones: no sculpted fender flares or
  second character line, the bumpers have no relief of their own (the grille and intake are
  drawn on, not set in).
- The fascias are each kind's general layout, not the real car's exact shapes (the Camry's
  big lower grille is a trapezoid, its head lights a slanted band).
- The cabin seen through the glass is boxes: seat backs, headrests, the roof lining. No
  dashboard, steering wheel or people.
- Head lights don't light the road at night.
- The suv and minivan are raked and rounded at the back now, but still plainer than the RAV4
  and Odyssey (no separate spoiler piece, the tail lights are bands).
- With the underbody out of the shadow maps, the sun shows some light under the cars between
  the wheels and under the front or back when it's behind them (the soft shadow covers most
  of it, not all from a low camera).

## Cost

Measured after the merge. Before it (my test data: lot 11 full, every level of M deck full, a
few cars driving on Decatur St, the game look, `counts.mjs`): one more draw in the prepass,
two in the scene pass (the cars and their soft shadows) and three in the shadow passes (the
near cars in each cascade), 5-15 indirect draws inside them. Join warm-up: the clean snapshot
766-794 builds / 668-699 pipelines (two runs), with the cars 803 / 705 ("car" 11 builds, "car
shadow" 6). On main after the merge (real parking and traffic) 846 / 748 before and after the
last round of changes.

Round 4 (Nov 9, my worktree, 09:00, `uploads.mjs` over 60 frames, whole page): before,
4110 / 4303 / 4108 KB went up a frame at library north / hurt park / g deck, ~3.6 MB of it
the cars. Now 546 / 741 / 543 with the traffic standing (`?still`), the same build without
the cars 545 / 740 / 543: the cars are ~1 KB (their per-object uniforms). Driving traffic adds
1.2-1.6 KB (20 small writes), the camera going 30 m/s through G deck ~4 KB (parked cars sorted
again). Cars' js (`cpuprof.mjs` on an unminified build, traffic driving): 0.08 / 0.09 / 0.09
ms a frame, 0.10 with the camera moving, about 0.05 of it `drivingAt` (traffic.ts). Draws
(gpu level, indirect ones each counted, with minus without cars): prepass +7 / +16 / +9,
scene +14 / +32 / +18, shadows 0 there (no car within 30 m); my lot view +12 / +24 / +6, a
close street view +18 / +36 / +9. Warm-up 846 / 746 ("car" 11, "car shadow" 6), nothing
built after joining while going round the car spots.

Round 5 (Nov 9, battery, hot, in-page swaps on one page so only the cars change, 4 rounds):
the cars cost 1.5 / 0.86 / 0.5 / 0.17 ms of gpu at n deck / m deck / langdale close / hurt
park (all hidden vs shown), 1.1 of it in the scene pass at n deck, then the prepass and the
shadows. The paint worked out once and the inside only on the glass: -0.18 / -0.04 / -0.07 /
-0.05, the same look (close ups differ only on the edges taa moves anyway). Not the triangles:
mid out to 50 m instead of 90, or no far ones at all, changed nothing (+-0.15). Every car at
the far level of detail: -0.93 at n deck (the 7 near and ~60 mid cars inside 50 m, their 2-3
pixel triangles shade whole 2x2 blocks), and a plain material on the same cars -0.6. Full
detail only inside 15 m saves 0.26-0.35 (mostly their shadows), not done: the cars 15-30 m
away would lose their sun shadows.
