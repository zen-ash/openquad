# Materials

How every surface in OpenQuad gets made. Hand-built buildings take all their materials from
one library, `apps/web/src/campus/materials.ts`, and the textures come from
`apps/web/src/campus/textures.ts`. The generic buildings (`facade.ts`), the ground
(`ground.ts`) and the interiors use the same texture files.

## Checklist

1. Every surface comes from a family in `materials.ts`: brick, precast, concrete, marble,
   metal, glass, clear glass, paving, lawn, gravel roof, wood. No
   `new MeshStandardNodeMaterial` in a building's file, no flat colors. `plain()` is only
   for things that really have no texture (water, soil, a cloth banner).
2. The color is the color of the real building in photos, picked as an average: the
   texture only adds the detail around it.
3. A building doesn't get its own texture or its own shader, except for signage and a
   surface that nothing in the library can do (Library North's wavy panel). Say why in a
   comment.
4. `pnpm visual` shows only the building you meant to change, `pnpm frametime` doesn't go
   up by more than about 0.3 ms, and the shader count doesn't go up (below).
5. The new building has its own view in `scripts/visual.mjs`.

## Using the library

Each hand-built building has `campus/<building>.ts` (geometry, uvs in meters) and
`campus/<building>Materials.ts`, a record from part name to material:

```ts
import { glass, marble, metal, precast } from './materials'

export const classroomSouthMaterials: Record<Part, THREE.Material> = {
  // the precast panels in the 2020 photos: warm grey, a bit rough
  panels: precast({ color: '#cfc8bb', panel: [3, 1.5], dirt: 0.3 }),
  glass: glass({ pane: [1.5, 1.4] }),
  frames: metal({ color: '#8d9195', roughness: 0.35, metalness: 1 }),
  base: marble({ color: '#aeaca6', slab: [1.5, 0.8], bond: 0 }),
}
```

Sizes are in meters and colors are css colors (sRGB). Everything is optional except
`color`.

The textured families (brick, precast, concrete, paving, lawn, gravelRoof, wood) all take:

| option       | what it does                                                     | default        |
| ------------ | ---------------------------------------------------------------- | -------------- |
| `color`      | the average color of the whole surface                           | -              |
| `size`       | meters per repeat of the texture                                 | its real size  |
| `roughness`  | the average roughness, the texture varies it around this         | 0.8-0.9        |
| `contrast`   | how strong the texture's light and dark (and shiny and matte) is | 1, precast 0.4 |
| `saturation` | how much of the texture's own color variation to keep, 0 is none | 0.3            |
| `bump`       | how strong the normal map (and its ambient occlusion) is         | 1, precast 0.3 |
| `dirt`       | darker blotches and streaks, more near the ground, 0 to 1        | 0              |

and on top of that:

| family                              | for                                                | its own options                                                                         |
| ----------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `brick`                             | brick walls                                        | `uplight` [spacing, strength]: lights along the bottom at night                         |
| `precast`                           | precast panels, cut stone, smooth concrete         | `panel` [w, h], `offset`, `joint` (m), `shade`, `reveal`, `tone`                        |
| `concrete`                          | concrete cast in place (formwork lines)            | `boards` [height, strength] for board formed                                            |
| `marble`                            | gsu's white marble and the darker bases            | `slab` [w, h], `veins`, `clouds`, `bond` (0.5 like bricks, 0 a grid), `joint` [w, dark] |
| `metal`                             | painted panels, frames, mullions, bare metal       | `metalness` (0 paint, 1 bare), `panel`, `joint`, `tone`, `ribs` [pitch, depth]          |
| `glass`                             | windows, one quad each from `glassQuad()`          | `pane` [w, h], `mullion`, `frame`, `frameColor`, `darkBottom`, `lit`                    |
| `clearGlass`                        | glass you see through: lobbies, railings, canopies | `opacity`, `grid` [w, h], `mullion`, `transom`, `from`, `base`, `glow`, `side`          |
| `paving` `lawn` `gravelRoof` `wood` | flat things on and around buildings                | the common ones                                                                         |

The comments on each function in `materials.ts` say what every option means. Walls built
with `landmark.ts` have uvs in meters, which is what every family expects. Glass needs the
`aPane` attribute, so window glass goes through `glassQuad()` (or `wall()` openings, which
use it).

A variant of a family is just a function in the building's file with the numbers filled
in, like Library North's cut stone:

```ts
const stone = (color: string) =>
  precast({ color, panel: [1.8, 0.9], joint: 0.02, shade: 0.7, tone: 0.04, roughness: 0.8 })
```

### When a family can't do it

- **A new option** for a family (say, a second joint direction): add a number to the
  family's `userData`, read it in its nodes with `f('name')` (`v2()` for pairs, `v3()` and
  `rgb()` for three numbers and colors) and give it a default that changes nothing. Every
  material of the family gets it and it's still one shader.
- **A unique surface**: make it from the closest family and change one node, like the wavy
  panel: `panel.colorNode = panel.colorNode!.mul(wave)`. That's one more shader, so only
  when nothing else works.
- **A new family**: `once(() => nodes)` and a function that calls `material()`, like the
  others. Only when no family fits, and it goes in `materials.ts`, not in a building's
  file.
- **A new texture**: add it to `textures.json` and run `pnpm textures` (below).

## One shader per family

The shaders are what costs, not the triangles. three builds a shader (and the GPU makes a
pipeline) for every different material the first time it's drawn, once for each pass and
quality setting. The join screen builds all of them in advance (`WarmUp.tsx`), and a
first visit with nothing in the browser's shader cache already takes about half a minute.

three decides whether two materials can share a shader from their cache key
(`RenderObject.getMaterialCacheKey`): the ids of their nodes, and every property of the
material, with numbers only counted as zero or not zero. So:

- Two materials with their own copies of the same code are two shaders. Each family's
  nodes are made once (`once()`) and every material of the family gets the same ones.
- The see-through cutout (`maskNode`) and the whole shadow (`maskShadowNode`) are one node
  each for the whole library. Before, each `make()` built its own, which made every
  material its own shader.
- What's different from one material to the next goes in `userData`, which isn't in the
  key. The shader reads it through a uniform that updates for each object
  (`uniform().onObjectUpdate()`). The material's own `roughness` and `metalness` are never
  set, `metalness: 0` on one and `1` on another would be two shaders.
- The shadow pass builds its own nodes per material. `shareShadowShaders()` (called in
  `App.tsx`) gives materials with the same nodes the same shadow nodes, so they share those
  shaders too.
- Other things that make a new shader: a different `side`, `transparent`, geometry with
  different attributes, a new light, an `InstancedMesh` (its uuid is in the key).

`materials.test.ts` checks that two very different materials of each family come out with
the same key. To count what the warm-up builds, open the game with `?debug` and in the
console:

```js
quad.perf.start() // right away, before the warm-up starts
// ...once Join is up
const r = quad.perf.stop()
r.names.flat() // one name per shader built: "<family>:<mesh>"
```

Library materials are named after their family. Adding a building made from the library
should add nothing but its geometry. When I moved the four landmarks and the fountain onto
the library (Sept 2026), the warm-up of the production build went from 1366 shader builds
to 877 and from 1051 pipelines to 790, and Join came up after 6.8-7.1 s instead of 9.4-9.5
(browser shader cache warm). The landmarks and the fountain alone went from 499 builds (46
materials, each its own shader) to 163 (about 11 per family: high and low, color and
shadow passes).

## Textures

All textures are from [Poly Haven](https://polyhaven.com) (CC0), or made from noise by
`pnpm textures`. The list is `apps/web/src/campus/textures.json`, the name is the material,
not the building:

| name       | from                        | one repeat | maps               | used by           | px   | size (kb)       |
| ---------- | --------------------------- | ---------- | ------------------ | ----------------- | ---- | --------------- |
| `brick`    | `red_brick`                 | 1.4 m      | color, normal, arm | brick, facades    | 512  | 73 / 131 / 109  |
| `precast`  | `granular_concrete`, varied | 2 x 2.4 m  | color, normal, arm | precast, marble   | 1024 | 196 / 387 / 288 |
| `concrete` | `concrete_wall_004`         | 2 m        | color, normal, arm | concrete, facades | 512  | 54 / 125 / 109  |
| `roof`     | `gravel_concrete`           | 2.1 m      | color, normal      | facades           | 512  | 70 / 134        |
| `gravel`   | `gravel_concrete`, varied   | 2 x 2.1 m  | color, normal      | gravelRoof        | 512  | 64 / 125        |
| `sidewalk` | `concrete_pavement`         | 1.8 m      | color, normal      | paving, ground    | 512  | 70 / 129        |
| `asphalt`  | `asphalt_02`                | 3 m        | color, normal      | ground            | 512  | 74 / 133        |
| `grass`    | `grass_ground`              | 2.5 m      | color, normal      | ground            | 512  | 70 / 135        |
| `lawn`     | `grass_ground`, varied      | 2 x 2.5 m  | color, normal      | lawn              | 512  | 65 / 129        |
| `floor`    | `laminate_floor_02`         | 1.7 m      | color, normal      | wood, interiors   | 512  | 63 / 45         |
| `plaster`  | `painted_plaster_wall`      | 2 m        | color, normal      | interiors         | 512  | 62 / 118        |
| `marble`   | made here                   | 8 m        | mask               | marble            | 1024 | 182             |
| `grime`    | made here                   | 40 m       | mask               | every family      | 512  | 84              |

Poly Haven has nothing like gsu's white georgia marble, so its clouds and veins are made
from noise in `scripts/textures.mjs` (the math the shader used to do, see below), and its
grain is precast's normal and arm. Metal and glass have no textures except the grime.

"varied" is baked as 2 x 2 repeats of the Poly Haven texture without the repeat inside
(`vary` in the list, see "Baked and live" below). `roof` and `grass` are the same pictures
as `gravel` and `lawn` kept as they were, for the generic buildings and the ground, which
read them their own way.

### KTX2

The files are `apps/web/public/textures/<name>_<map>.ktx2`: basis universal ETC1S, which
stays compressed on the GPU (a quarter to an eighth of the memory of a png) and turns into
whatever format the GPU has when it loads: BC7 or ETC2 on WebGPU, ETC2/BC/ASTC on the
WebGL2 fallback, plain RGBA where there's none of those (CI's SwiftShader). They're 512 x
512 unless the list says `size` (the ones that cover more ground), with their mipmaps made
when they're encoded. Mapped at their real size that's 128-370 texture pixels per meter,
more than you see from where people walk. All 27 files are 3.5 MB, plus three's
transcoder (0.6 MB, 0.26 MB gzipped) in `public/basis`. On the GPU the whole city's
textures (these, the trees, people and furniture) are about 158 MB.

- `color` is sRGB, quality 80 (a fifth smaller than 100 and I couldn't see a difference).
- `normal` (OpenGL style, Poly Haven's `nor_gl`) keeps x in rgb and y in alpha, since
  ETC1S keeps those two apart and mixes up three channels. z is worked out in the shader:
  `unpackNormal()`, or `packedNormalMap` as the `normalNode` of a material with a
  `normalMap`. Quality 100.
- `arm` keeps ambient occlusion in rgb and roughness in alpha, same reason. Metalness is
  left out, these are all stone and paint.
- `mask` is two numbers that aren't colors, in rgb and alpha like `arm`: marble's clouds
  and veins, grime's blotches and brick batches.
- They're flipped at encode time so the uvs line up with the images three used to load.

To rebuild them, or after adding one to `textures.json`:

```sh
brew install basis_universal   # basisu, once
pnpm textures                  # all of them, or: pnpm textures brick grass
```

It downloads the 1k maps from Poly Haven into `~/.cache/openquad/textures` (only once; pngs
for the ones it bakes), bakes the varied and made ones there, encodes everything with
basisu and copies three's transcoder into `public/basis`. Running it again gives the same
files for anything that didn't change. It also writes `textureAverages.json` (below).
After a three upgrade run it again, the transcoder has to come from the same three
version (`textures.test.ts` checks). `textures.test.ts` also checks there's a file for
every map in the list and nothing else, that each one is square ETC1S at its size with
its mipmaps, and that every color and arm map has its average.

`texture(name, map)` gives the one texture object for a file, shared by everything that
uses it, so never change its `repeat` or `offset`: scale the uvs instead. The materials
are made when the page loads, before there's a renderer to ask which compressed formats
the GPU has, so it starts out empty and `loadTextures()` (from `App.tsx`, once the
renderer is ready) fills it in. The loading manager stays busy until they're all in, so
the warm-up waits for them.

A texture only a building would use (a sign, a mural) doesn't go in this list. Signs are
drawn on a canvas or with `Label`.

## Maps

- **Albedo** has no baked lighting, shadows or dark crevices (that's what ambient
  occlusion is for). Real surfaces sit between about 30 and 240 in sRGB: asphalt and dark
  paint 30-50, old concrete 110-140, new concrete 150-180, white marble 220-235. Never pure
  black or white.
- The library divides each texture by its own average (its 1x1 mipmap, which
  `pnpm textures` reads back out of the ktx2 file into `textureAverages.json`), so the
  material's `color` is what the surface comes out as, whatever color the photo on Poly
  Haven was. `saturation` decides how much of the texture's own hue variation stays (a
  red brick texture on a brown brick wall wants little of it).
- **Metalness** is 0 for stone, brick, concrete, paint, wood and glass, 1 for bare metal.
  The window glass uses 0.6 to get the dark, strongly reflecting look of insulated windows
  from the street; keep using it for windows so they match. Some of the older metal parts
  of the landmarks still have in-between numbers from before the library.
- Surfaces without textures (metal, glass) still get their roughness on purpose. The
  default of 1 is almost never right.

## Baked and live

Everything that doesn't change from one building to the next is baked into the textures
by `pnpm textures`. The shaders do one read per map and only cheap things per pixel. When
it was all live (Sept 2026), a library wall filling the screen cost about 1.5 ms more than
a flat color. Baking it took about 1 ms off the close up of Student Center West's grilles
(a precast wall filling the screen), and a precast wall is now a bit cheaper per pixel than
the generic building shader.

Baked, in `scripts/textures.mjs`:

- **The repeat inside a texture** (`vary: 2`): 2 x 2 repeats of the Poly Haven texture,
  each patch of about one repeat read at its own random offset and blended into the next
  (Inigo Quilez's "texture repetition", the noise version). The shader used to do that for
  every pixel, two reads per map. Now it's one read of a texture twice the size.
- **Marble's clouds and veins** (`marble_mask`): 4 octaves of noise three times over, per
  pixel, before. Baked 8 m across, tileable (the vein directions are whole waves across it).
- **The weathering** (`grime_mask`): the dark blotches of `dirt` and brick's slow drift in
  tone between batches, two octaves each per pixel before. 40 m across, so it never shows
  a repeat on one wall. Metal reads it too, squashed, for its smudges.
- **Each texture's average** (`textureAverages.json`): the shaders used to read the 1x1
  mipmap for every pixel. It goes on the material (`average`, `armAverage`), not in the
  shader as a constant, so the surfaces that only differ in their texture (paving and
  wood) still come out as the same shader code and pipeline.

Live, because it's cheap and depends on the building:

- **One spot per panel or slab**: `scatter(mHash(id))` gives each precast panel and each
  marble slab its own random offset into the texture (and turns half the marble slabs on
  their side), from the one hash that also gives its tone. Neighbours never show the same
  bit, so the repeat can't line up across a wall. The cut is in the joint.
- **Brick courses**: `coursed()`. Every pair of courses reads a random pair of the
  texture's courses, shifted a random amount along, cut in the mortar. Two hashes and one
  read per map. `courses` in the list is how many the texture has and where its first bed
  joint is.
- **Joints, grids, windows, ribs, uplights, the ground band of `dirt`**: they depend on the
  building's numbers (panel size, joint width...), and they're a few multiplies each.
- **tiled** textures (paving slabs, formwork, planks) are read as they are, the pattern
  has to line up.

Thin lines (joints, mullions) fade to their average once they're thinner than a pixel or
they flicker (`joint()`, `mLine()`).

### A new baked texture or variant

- A Poly Haven texture with no repeat inside: add it to `textures.json` with `"vary": 2`
  (and `"size": 1024` if it's seen close up and should keep its detail), read it with
  `repeats(name, size)`, which knows it covers two repeats.
- Something made from noise: a function in `MADE` in `scripts/textures.mjs` that draws two
  numbers per pixel into r and g, an entry in the list without `polyhaven`, with `meters`
  and `"maps": ["mask"]`. Make it tile: whole numbers of noise cells (and waves) across it.
- Then `pnpm textures <name>` (or plain `pnpm textures`), check `textureAverages.json`
  changed only where you meant, and run `pnpm visual` and `pnpm frametime`.

## Lights at night

`night` goes from 0 in the day to 1 at night. Lights go in `emissiveNode` times `night`, at
their real brightness compared to each other: a lit office window is about 1, a lamp globe
80 (StreetFurniture.tsx). There's no bloom threshold. A few percent of all light spreads
out as glare (Effects.tsx), so a light glows when it's much brighter than what's around
it, like in a photo. Don't dim a light to stop it glowing, set it to how bright it really
is. Low quality has no glare and anything way over 1 comes out as a flat white shape there,
so give it a low value on low (the lamps use 2.5).

Brightness is judged at noon in Hurt Park against a photo of a sunny day, with the pbr
neutral tone mapping (Effects.tsx). Auto exposure (scene/autoExposure.ts) gives that spot a
quarter stop more, which is what matched the photos. Everywhere else it evens things out, so
a wall that looks too dark at 9am or indoors may be fine. The debug panel (`?debug`) can turn
each effect off, to see if a color comes from the material or from the effects.

## Checking a change

```sh
git stash && pnpm visual --update && git stash pop   # baseline from before the change
pnpm visual                                          # only your building should change
pnpm frametime                                       # before and after, plugged in
```

Then the usual: screenshots from the same spots as the real photos, side by side, and fix
what's different. And the shader count from above: a new building made from the library
shouldn't add any.

## Frame budget

The rule: every view under 14 ms on my M4 Air (a 1280x800 window at 2x, plugged in, after
it's been drawing for a few minutes), and no view more than 1 ms over what it cost before
the material library (commit 546ae05).

It's the GPU that sets the frame everywhere. What each pass costs (ms, hot, Sept 2026,
from GPU timestamps on every render pass):

| pass                           | street view | close to a wall |
| ------------------------------ | ----------- | --------------- |
| shadow maps (three cascades)   | 0.7-1.3     | 0.6-0.7         |
| prepass (depth and normals)    | 0.6-1.1     | 0.6-1.0         |
| ambient occlusion              | 1.0-1.7     | 2.4-3.4         |
| scene pass                     | 2.4-3.0     | 2.5-2.9         |
| haze (aerial perspective)      | 1.0-1.3     | 1.1-1.3         |
| taau, sharpen, glare, the rest | 3.2         | 3.2             |

About 4.5 ms of every frame (the haze and everything after it) is the same whatever you
look at. The ambient occlusion is the biggest single thing close to a wall: it runs for
every pixel that isn't sky.

The JavaScript side is 4.5-6.5 ms a frame, mostly three's work for each draw (about 15-20
µs). A mesh can be drawn five times a frame: the prepass, the scene pass and three shadow
cascades. So:

- keep a building's parts few, merge the ones that look alike
- `noShadow` for parts set into a wall (glass, frames), each casting part is up to three
  more draws. A caster is only drawn into the cascades its shadow can reach
  (`softShadows.ts`), so a far away one is cheaper than it looks
- close up it's pixels: a textured library wall filling the screen costs 0.3-0.5 ms more
  than a flat color, and deep window reveals add ambient occlusion work

The scene pass starts from the prepass's depth, so nothing hidden behind a wall gets
shaded twice (the cutout's discard stops the GPU from skipping those pixels by itself).

### Measuring it

Every earlier A/B disagreed with itself by 1-2 ms. What made it steady (rounds within
0.1-0.3 ms of each other):

- Plugged in. On battery the same frame took up to 50% longer.
- Hot on purpose. The Air runs at full speed for about a minute, then holds the chip at
  about 72°C and the GPU gets 15-20% slower. Draw the heaviest view for a few minutes
  first, then measure, and compare builds in the same run.
- Take turns: each round every build gets a fresh page that visits every spot, and the
  order changes every round. Compare the rounds pairwise, not single numbers.
- One page at a time. A second page in the same browser, even paused, made the first one
  4 ms slower.
- `?keepquality` so the page doesn't drop itself to low quality halfway.
- GPU timestamps per render pass (WebGPU timestamp queries) say where the time goes. The
  frame time is still the number that counts: passes overlap on the GPU, and the time the
  JavaScript spends in WebGPU calls includes waiting for the GPU.
- A tiny window (640x400 at 1x) leaves the GPU almost nothing to do, then the frame time
  is the CPU's.
