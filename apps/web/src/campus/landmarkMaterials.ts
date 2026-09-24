import * as THREE from 'three'
import { cutoutShader } from './cutout'
import { night } from './facade'
import { texture } from './textures'

// material helpers for the buildings drawn by hand (landmark.ts)

type Shader = THREE.WebGLProgramParametersWithUniforms

// uvs are in meters, this makes a texture repeat every `meters`
export function tiled(name: string, kind: 'color' | 'normal', meters: number) {
  const t = texture(name, kind)
  t.repeat.set(1 / meters, 1 / meters)
  return t
}

// the see-through hole like every other building, plus whatever else the material needs.
// three caches shaders by the onBeforeCompile source, which is the same function for all
// of these, so each one needs its own key or they'd share a shader
export function make(
  key: string,
  params: THREE.MeshStandardMaterialParameters,
  extra?: (shader: Shader) => void,
) {
  const m = new THREE.MeshStandardMaterial(params)
  m.onBeforeCompile = (shader) => {
    cutoutShader(shader)
    extra?.(shader)
  }
  m.customProgramCacheKey = () => `landmark-${key}`
  return m
}

// our own copy of the uvs (three only passes them along when there's a texture)
export function withUv(shader: Shader, fragment: string, after = '#include <color_fragment>') {
  shader.uniforms.uNight = night
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vMeters;')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMeters = uv;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vMeters;\nuniform float uNight;')
    .replace(after, `${after}\n${fragment}`)
}

const NOISE = `
float mHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mHash(i), mHash(i + vec2(1.0, 0.0)), f.x),
    mix(mHash(i + vec2(0.0, 1.0)), mHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float mFbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * mNoise(p);
    p = p * 2.03 + 1.7;
    a *= 0.5;
  }
  return v;
}`

// how much of a thin line at distance e (meters) shows, fading out far away where it
// would just flicker
const LINE = `
float mLine(float e, float width, float px) {
  return (1.0 - smoothstep(width, width + px, e)) * (1.0 - smoothstep(0.02, 0.06, px));
}`

/**
 * White georgia marble in slabs: each slab a slightly different tone, cloudy, with faint
 * grey veins. poly haven doesn't have one like it, so it's done in the shader. bond is
 * how far each row of slabs is shifted (0.5 like bricks, 0 for a straight grid)
 */
export function marble(key: string, color: string, slab = [1.6, 0.75], veins = 1, bond = 0.5) {
  const [w, h] = slab.map((n) => n.toFixed(2))
  return make(key, { color, roughness: 0.4 }, (shader) => {
    withUv(
      shader,
      `float row = floor(vMeters.y / ${h});
      float sx = vMeters.x + mod(row, 2.0) * ${w} * ${bond.toFixed(2)};
      vec2 slab = vec2(floor(sx / ${w}), row);
      vec2 q = vMeters + slab * 3.1;
      float vein = abs(sin(q.x * 1.1 + q.y * 0.6 + mFbm(q * 1.4) * 6.0));
      float vein2 = abs(sin(q.x * 0.4 - q.y * 1.7 + mFbm(q * 2.3 + 4.0) * 5.0));
      vec3 stone = diffuseColor.rgb * (0.88 + 0.12 * mHash(slab)) * (0.86 + 0.2 * mFbm(q * 0.8));
      // grey clouds and veins, a little bluer than the stone
      vec3 grey = stone * vec3(0.74, 0.76, 0.79);
      float veined = 1.0 - smoothstep(0.0, 0.14, vein) * mix(0.55, 1.0, smoothstep(0.0, 0.06, vein2));
      stone = mix(stone, grey, min(1.0, veined * ${veins.toFixed(2)}));
      // the joints between slabs
      vec2 j = vec2(fract(sx / ${w}) * ${w}, fract(vMeters.y / ${h}) * ${h});
      float px = length(fwidth(vMeters));
      float joint = max(mLine(min(j.x, ${w} - j.x), 0.006, px), mLine(min(j.y, ${h} - j.y), 0.006, px));
      diffuseColor.rgb = stone * (1.0 - 0.25 * joint);`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      'uniform float uNight;',
      `uniform float uNight;\n${NOISE}\n${LINE}`,
    )
  })
}

/**
 * Window glass with mullions, one quad per window (landmark.ts pane() gives it uvs from
 * the corner and its size). pane is how big each piece of glass is, roughly. darkBottom
 * makes the bottom row a black panel like big storefront windows have
 */
export function windowGlass(
  key: string,
  pane: [number, number],
  darkBottom = false,
  color = '#34444e',
) {
  const [pw, ph] = pane.map((n) => n.toFixed(2))
  return make(key, { color, roughness: 0.05, metalness: 0.6 }, (shader) => {
    withUv(
      shader,
      `vec2 n = max(vec2(1.0), floor(vPane.xy / vec2(${pw}, ${ph}) + 0.5));
      vec2 cellSize = vPane.xy / n;
      vec2 f = mod(vMeters, cellSize);
      vec2 e = min(f, cellSize - f);
      vec2 outer = min(vMeters, vPane.xy - vMeters);
      vec2 px = fwidth(vMeters);
      float bar = max(
        max(1.0 - smoothstep(0.025, 0.025 + px.x, e.x), 1.0 - smoothstep(0.025, 0.025 + px.y, e.y)),
        max(1.0 - smoothstep(0.06, 0.06 + px.x, outer.x), 1.0 - smoothstep(0.06, 0.06 + px.y, outer.y))
      );
      float panel = ${darkBottom ? '1.0 - smoothstep(cellSize.y - px.y, cellSize.y, vMeters.y)' : '0.0'};
      // a bit of variety between windows, like blinds or lights inside
      vec3 glass = diffuseColor.rgb * (0.75 + 0.5 * vPane.z);
      glass = mix(glass, vec3(0.04, 0.045, 0.05), panel);
      diffuseColor.rgb = mix(glass, vec3(0.74, 0.76, 0.77), bar);
      float lit = step(0.45, fract(vPane.z * 13.7));`,
    )
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aPane;\nvarying vec3 vPane;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvPane = aPane;')
    shader.fragmentShader = shader.fragmentShader
      .replace('uniform float uNight;', `uniform float uNight;\nvarying vec3 vPane;\n${NOISE}`)
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.45, bar);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.3, bar);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.8, 0.55) * lit * uNight * (0.5 + 0.4 * fract(vPane.z * 7.3)) * (1.0 - bar) * (1.0 - panel);`,
      )
  })
}

/**
 * Flat panels in a grid with lighter joints, each panel a little different. for metal or
 * fibre cement cladding
 */
export function cladding(key: string, color: string, panel = [1.5, 1.25], joint = 1.35) {
  const [w, h] = panel.map((n) => n.toFixed(2))
  return make(key, { color, roughness: 0.55, metalness: 0.2 }, (shader) => {
    withUv(
      shader,
      `vec2 size = vec2(${w}, ${h});
      vec2 g = mod(vMeters, size);
      float e = min(min(g.x, size.x - g.x), min(g.y, size.y - g.y));
      float px = length(fwidth(vMeters));
      float joint = mLine(e, 0.012, px);
      vec2 id = floor(vMeters / size);
      diffuseColor.rgb *= (0.96 + 0.06 * mHash(id)) * mix(1.0, ${joint.toFixed(2)}, joint);`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      'uniform float uNight;',
      `uniform float uNight;\n${NOISE}\n${LINE}`,
    )
  })
}

// corrugated or ribbed metal, grooves running up and down every `pitch` meters
export function ribbed(key: string, color: string, pitch: number) {
  return make(key, { color, roughness: 0.45, metalness: 0.5 }, (shader) =>
    withUv(
      shader,
      `float r = fract(vMeters.x / ${pitch.toFixed(2)});
      float fade = 1.0 - smoothstep(0.02, 0.08, length(fwidth(vMeters)));
      diffuseColor.rgb *= 1.0 - 0.22 * fade * smoothstep(0.35, 0.5, abs(r - 0.5) * 1.0 + 0.2);`,
    ),
  )
}
