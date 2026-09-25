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

| family                              | for                                                | its own options                                                                |
| ----------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `brick`                             | brick walls                                        | `uplight` [spacing, strength]: lights along the bottom at night                |
| `precast`                           | precast panels, cut stone, smooth concrete         | `panel` [w, h], `offset`, `joint` (m), `shade`, `reveal`, `tone`               |
| `concrete`                          | concrete cast in place (formwork lines)            | `boards` [height, strength] for board formed                                   |
| `marble`                            | gsu's white marble and the darker bases            | `slab` [w, h], `veins`, `bond` (0.5 like bricks, 0 a grid)                     |
| `metal`                             | painted panels, frames, mullions, bare metal       | `metalness` (0 paint, 1 bare), `panel`, `joint`, `tone`, `ribs` [pitch, depth] |
| `glass`                             | windows, one quad each from `glassQuad()`          | `pane` [w, h], `mullion`, `frame`, `frameColor`, `darkBottom`, `lit`           |
| `clearGlass`                        | glass you see through: lobbies, railings, canopies | `opacity`, `grid` [w, h], `mullion`, `transom`, `from`, `base`, `glow`, `side` |
| `paving` `lawn` `gravelRoof` `wood` | flat things on and around buildings                | the common ones                                                                |

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
  family's `userData`, read it in its nodes with `f('name')` (`v2()` for pairs, `rgb()` for
  colors) and give it a default that changes nothing. Every material of the family gets it
  and it's still one shader.
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

All textures are from [Poly Haven](https://polyhaven.com) (CC0). The list is
`apps/web/src/campus/textures.json`, the name is the material, not the building:

| name       | Poly Haven asset       | real size | maps               | read as   | size (kb)      |
| ---------- | ---------------------- | --------- | ------------------ | --------- | -------------- |
| `brick`    | `red_brick`            | 1.4 m     | color, normal, arm | courses   | 73 / 132 / 109 |
| `precast`  | `granular_concrete`    | 2.4 m     | color, normal, arm | irregular | 69 / 131 / 123 |
| `concrete` | `concrete_wall_004`    | 2 m       | color, normal, arm | tiled     | 55 / 126 / 110 |
| `roof`     | `gravel_concrete`      | 2.1 m     | color, normal      | irregular | 71 / 134       |
| `sidewalk` | `concrete_pavement`    | 1.8 m     | color, normal      | tiled     | 70 / 130       |
| `asphalt`  | `asphalt_02`           | 3 m       | color, normal      | irregular | 74 / 133       |
| `grass`    | `grass_ground`         | 2.5 m     | color, normal      | irregular | 70 / 136       |
| `floor`    | `laminate_floor_02`    | 1.7 m     | color, normal      | tiled     | 64 / 45        |
| `plaster`  | `painted_plaster_wall` | 2 m       | color, normal      | irregular | 62 / 118       |

Marble uses precast's normal and arm for its grain, the color is done in the shader (Poly
Haven has nothing like gsu's white georgia marble). Metal and glass are all shader.

### KTX2

The files are `apps/web/public/textures/<name>_<map>.ktx2`: basis universal ETC1S, which
stays compressed on the GPU (a quarter to an eighth of the memory of a png) and turns into
whatever format the GPU has when it loads: BC7 or ETC2 on WebGPU, ETC2/BC/ASTC on the
WebGL2 fallback, plain RGBA where there's none of those (CI's SwiftShader). Everything is
512 x 512 with its mipmaps made when it's encoded. Mapped at their real size that's 200-370
texture pixels per meter, more than you see from where people walk. All 21 files are about
2 MB, plus three's transcoder (0.6 MB, 0.26 MB gzipped) in `public/basis`.

- `color` is sRGB, quality 80 (a fifth smaller than 100 and I couldn't see a difference).
- `normal` (OpenGL style, Poly Haven's `nor_gl`) keeps x in rgb and y in alpha, since
  ETC1S keeps those two apart and mixes up three channels. z is worked out in the shader:
  `unpackNormal()`, or `packedNormalMap` as the `normalNode` of a material with a
  `normalMap`. Quality 100.
- `arm` keeps ambient occlusion in rgb and roughness in alpha, same reason. Metalness is
  left out, these are all stone and paint.
- They're flipped at encode time so the uvs line up with the images three used to load.

To rebuild them, or after adding one to `textures.json`:

```sh
brew install basis_universal   # basisu, once
pnpm textures                  # all of them, or: pnpm textures brick grass
```

It downloads the 1k jpgs from Poly Haven into `~/.cache/openquad/textures` (only once),
encodes them with basisu and copies three's transcoder into `public/basis`. After a three
upgrade run it again, the transcoder has to come from the same three version
(`textures.test.ts` checks). `textures.test.ts` also checks there's a file for every map in
the list and nothing else, and that each one is 512 square ETC1S with its mipmaps.

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
- The library divides each texture by its own average (its 1x1 mipmap), so the material's
  `color` is what the surface comes out as, whatever color the photo on Poly Haven was.
  `saturation` decides how much of the texture's own hue variation stays (a red brick
  texture on a brown brick wall wants little of it).
- **Metalness** is 0 for stone, brick, concrete, paint, wood and glass, 1 for bare metal.
  The window glass uses 0.6 to get the dark, strongly reflecting look of insulated windows
  from the street; keep using it for windows so they match. Some of the older metal parts
  of the landmarks still have in-between numbers from before the library.
- Surfaces without textures (metal, glass) still get their roughness on purpose. The
  default of 1 is almost never right.

## Hiding the repeat

A texture repeating every couple of meters makes a grid you can see from far away. Each
texture in the list says how it's read:

- **irregular** (concrete, gravel, grass, plaster): `untiled()`, Inigo Quilez's noise
  method. Each patch of about one repeat reads the texture at its own random offset, and
  neighbouring patches blend where they meet. Two reads per map instead of one.
- **courses** (brick): `coursed()`. Every pair of courses reads a random pair of the
  texture's courses, shifted a random amount along. The cuts are in the mortar so they don't
  show. `courses` in the list is how many the texture has and where its first bed joint is.
- **tiled** (paving slabs, formwork, planks): read as it is, the pattern has to line up.
  Add variety in the family: a tone per panel or slab (`mHash(id)`, like precast and
  marble), and low-frequency variation with `mFbm()`.

Thin lines (joints, mullions) fade to their average once they're thinner than a pixel or
they flicker (`joint()`, `mLine()`).

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
