# Materials

How every surface in OpenQuad gets made from now on. The next hand-built buildings follow
this, and anything that gets redone should move to it. The code it points to is in
`apps/web/src/campus/landmarkMaterials.ts`.

## Checklist

1. A TSL node material made with `make()`. No `onBeforeCompile`, no `ShaderMaterial`, no
   `customDepthMaterial`: the WebGPU renderer ignores or rejects them (CLAUDE.md has the
   details).
2. The color comes from photos of the real building, not a guess.
3. Every textured surface has all three maps: color, normal and arm (below).
4. Textures follow the sizes and names below, and come from a CC0 source.
5. Irregular surfaces don't show their repeat: `surface()` / `untiled()`.
6. `pnpm visual` shows only the building you meant to change, and `pnpm frametime` doesn't
   go up by more than about 0.3 ms for one building.
7. The new building has its own view in `scripts/visual.mjs`.

## Writing one

Each hand-built building has `campus/<building>.ts` (geometry, with uvs in meters) and
`campus/<building>Materials.ts`, a record from part name to material:

```ts
export const classroomSouthMaterials: Record<Part, THREE.Material> = {
  // the precast panels in the 2020 photos: warm grey, a bit rough
  panels: make({ color: '#cfc8bb' }, (m) => surface(m, 'precast_concrete', 3)),
  glass: windowGlass([1.5, 1.4]),
  metal: make({ color: '#8d9195', roughness: 0.45, metalness: 1 }),
}
```

`make(params, extra)` gives a `MeshStandardNodeMaterial` with the see-through cutout
already set up (`maskNode`) and kept out of the shadows (`maskShadowNode`). `extra` sets
whichever node slots the material needs:

| slot            | what goes in                                                       |
| --------------- | ------------------------------------------------------------------ |
| `colorNode`     | albedo, linear rgb. `materialColor` is the `color` param (and map) |
| `roughnessNode` | 0 mirror to 1 matte                                                |
| `metalnessNode` | 0 or 1, see below                                                  |
| `normalNode`    | view space. for a tangent space map use `normalMap(sample.rgb)`    |
| `aoNode`        | 0-1, only darkens light from the sky/environment                   |
| `emissiveNode`  | light it gives off, times `night` if it's only on after dark       |
| `maskNode`      | false where the surface has a hole. `make()` already uses it       |

Things that bite:

- The uvs are meters along the wall and up (`meters`). Sizes in code are meters too.
- Read textures outside of `If()` and pick with `select()`. WGSL won't sample a texture in
  a branch.
- No uniform arrays and no indexing a vector with a variable. Chrome's shader compiler
  fails on some of those (it happened with three's own `DenoiseNode`), and only in stock
  Chrome, which is why `pnpm visual` runs without `--enable-unsafe-webgpu`.
- At most 8 vertex attributes per mesh. Extra per-vertex numbers get interleaved into one
  buffer (see `buildingsGeometry`).
- It has to work on the WebGL2 fallback too, so nothing that needs compute shaders or
  storage textures.
- Lines thinner than a pixel shimmer from far away. Fade them out with distance like
  `mLine()` does.
- Materials are created once, at module level. Never inside a component.

## Maps

Every textured surface gets three maps, the way Poly Haven ships them:

| map      | holds                                            | color space |
| -------- | ------------------------------------------------ | ----------- |
| `color`  | albedo: the surface color with no light in it    | sRGB        |
| `normal` | bumps, OpenGL style (+Y up, Poly Haven `nor_gl`) | linear      |
| `arm`    | R ambient occlusion, G roughness, B metalness    | linear      |

- **Albedo** has no baked lighting, shadows or dark crevices (that's what `arm.r` is for).
  Real surfaces sit between about 30 and 240 in sRGB: asphalt and dark paint 30-50, old
  concrete 110-140, new concrete 150-180, white marble 220-235. Never pure black or white.
- When the texture's hue is wrong for the building, keep its detail and take the color from
  the photo: `surface()` multiplies by the material's `color`, and for textures with a strong
  color of their own, divide by the texture's average first (like `facade.ts` does with the
  brick and concrete).
- **Metalness** is 0 for stone, brick, concrete, paint, wood and glass, 1 for bare metal.
  Nothing in between except dirty or painted-over metal. The existing `windowGlass()` uses
  0.6 to get the dark, strongly reflecting look of insulated windows from the street; keep
  using it for windows so they match.
- Surfaces without textures (trim, paint, metal) still set `roughness` on purpose. The
  default of 1 is almost never right.

## Sizes and names

| surface                                   | color | normal | arm |
| ----------------------------------------- | ----- | ------ | --- |
| hand-built walls and anything you walk by | 1024  | 1024   | 512 |
| ground, roofs, background buildings       | 512   | 512    | 512 |

- Sources: Poly Haven or ambientCG, CC0 only, downloaded at 1k and saved as webp (color at
  quality 85, normal and arm at 90) into `apps/web/public/textures/<name>_<map>.webp`.
- `<name>` is the material (`precast_concrete`, `red_brick`), not the building, so buildings
  made of the same thing share it.
- Aim for about 256 texture pixels per meter on walls within 10 m of where people walk: a
  1024 texture repeating every 4 m.
- Budget: a full 1024 set is about 0.8 MB to download and about 13 MB of GPU memory with
  mipmaps. Keep `public/textures` under 8 MB. If GPU memory becomes the problem (lots of
  buildings on screen at once), move to KTX2 textures instead of shrinking them.
- `texture()` in `textures.ts` sets repeat wrapping, mipmaps, anisotropy 8 and the color
  space from the map name.

## Hiding the repeat

A texture repeating every few meters makes a grid you can see from far away.

- **Irregular surfaces** (concrete, stone, asphalt, plaster, grass, dirt): `surface()`,
  or `untiled(map, at)` for a single map. It's Inigo Quilez's noise method: each patch of
  about one repeat reads the texture at its own random offset, and neighbouring patches
  blend where they meet. Two texture reads instead of one.
- **Regular patterns** (brick courses, tile and panel grids, windows): not `untiled()`, the
  random offsets break the courses. Use one texture repeat for at least 2 x 2 m of real
  wall and add the variety in code: a slightly different tone per panel or brick
  (`mHash(id)`, like `cladding()` and `marble()`), and low-frequency dirt or staining with
  `mFbm()`, heavier near the ground and under ledges.

## Lights at night

`night` goes from 0 in the day to 1 at night. Lights go in `emissiveNode` times `night`, at
their real brightness compared to each other: a lit office window is about 1, a lamp globe
80 (StreetFurniture.tsx). There's no bloom threshold. A few percent of all light spreads
out as glare (Effects.tsx), so a light glows when it's much brighter than what's around
it, like in a photo. Don't dim a light to stop it glowing, set it to how bright it really
is. Low quality has no glare and anything way over 1 comes out as a flat white shape there,
so give it a low value on low (the lamps use 2.5).

Brightness is judged at noon in Hurt Park, where auto exposure (scene/autoExposure.ts)
leaves the picture alone. Everywhere else it evens things out, so a wall that looks too dark
at 9am or indoors may be fine.

## Checking a change

```sh
git stash && pnpm visual --update && git stash pop   # baseline from before the change
pnpm visual                                          # only your building should change
pnpm frametime                                       # before and after, plugged in
```

Then the usual: screenshots from the same spots as the real photos, side by side, and fix
what's different.
