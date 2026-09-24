import * as THREE from 'three'
import { cutoutShader } from './cutout'
import { night } from './facade'
import type { Part } from './libraryNorth'
import { texture } from './textures'

type Shader = THREE.WebGLProgramParametersWithUniforms

// uvs are in meters, this makes a texture repeat every `meters`
function tiled(name: string, kind: 'color' | 'normal', meters: number) {
  const t = texture(name, kind)
  t.repeat.set(1 / meters, 1 / meters)
  return t
}

// the see-through hole like every other building, plus whatever else the material needs.
// three caches shaders by the onBeforeCompile source, which is the same function for all
// of these, so each one needs its own key or they'd share a shader
function make(
  key: string,
  params: THREE.MeshStandardMaterialParameters,
  extra?: (shader: Shader) => void,
) {
  const m = new THREE.MeshStandardMaterial(params)
  m.onBeforeCompile = (shader) => {
    cutoutShader(shader)
    extra?.(shader)
  }
  m.customProgramCacheKey = () => `library-north-${key}`
  return m
}

// our own copy of the uvs (three only passes them along when there's a texture)
function withUv(shader: Shader, fragment: string, after = '#include <color_fragment>') {
  shader.uniforms.uNight = night
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vMeters;')
    .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMeters = uv;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vMeters;\nuniform float uNight;')
    .replace(after, `${after}\n${fragment}`)
}

// the texture is a warm red brick, the real one is a duller brown
const brick = make(
  'brick',
  {
    map: tiled('brick', 'color', 4),
    normalMap: tiled('brick', 'normal', 4),
    color: '#aa9c98',
    roughness: 0.9,
  },
  (shader) => {
    withUv(
      shader,
      `diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), diffuseColor.rgb, 0.38);`,
      '#include <map_fragment>',
    )
    // at night lights along the bottom shine up the walls, every 6m
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float beam = 1.0 - smoothstep(0.0, 1.4 + vMeters.y * 0.12, abs(fract(vMeters.x / 6.0) * 6.0 - 3.0));
      totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * uNight * beam * exp(-vMeters.y / 5.0) * 0.5;`,
    )
  },
)

// concrete texture comes out dark, brightened into a light stone
const stoneLike = (color: string) =>
  make(color, { map: tiled('concrete', 'color', 3), color, roughness: 0.8 }, (shader) =>
    withUv(
      shader,
      `diffuseColor.rgb *= 1.8;
      // joints between the stone slabs
      if (fract(vMeters.y / 0.9) < 0.02 || fract(vMeters.x / 1.8) < 0.012) diffuseColor.rgb *= 0.8;`,
      '#include <map_fragment>',
    ),
  )

// the wavy white panel: rows of waves in low relief. just shading, no real bumps
const panel = make('panel', { color: '#ebe7de', roughness: 0.6 }, (shader) =>
  withUv(
    shader,
    `float wave = fract(vMeters.y / 1.6 - 0.28 * sin(vMeters.x * 1.75));
    diffuseColor.rgb *= 0.84 + 0.16 * smoothstep(0.0, 0.35, wave) - 0.12 * smoothstep(0.85, 1.0, wave);`,
  ),
)

// the lobby: glass with metal frames, and lit up inside at night
const lobbyGlass = make(
  'lobby',
  {
    color: '#6f9f96',
    roughness: 0.04,
    metalness: 0.5,
    transparent: true,
    depthWrite: false,
  },
  (shader) => {
    withUv(
      shader,
      `bool frame = fract(vMeters.x / 1.5) < 0.035 || vMeters.y < 0.25 ||
        abs(vMeters.y - 3.4) < 0.07 || abs(vMeters.y - 7.0) < 0.07;
      diffuseColor = frame ? vec4(0.62, 0.65, 0.67, 1.0) : vec4(diffuseColor.rgb, 0.5);`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      if (!frame) totalEmissiveRadiance += vec3(1.0, 0.86, 0.62) * uNight * 0.4;`,
    )
  },
)

// the row of small windows up top has the lights on at night
const windows = make('windows', { color: '#1d252e', roughness: 0.1, metalness: 0.6 }, (shader) =>
  withUv(
    shader,
    `if (fract(vMeters.x / 1.2) > 0.12) totalEmissiveRadiance += vec3(1.0, 0.85, 0.6) * uNight;`,
    '#include <emissivemap_fragment>',
  ),
)

export const libraryNorthMaterials: Record<Part, THREE.Material> = {
  brick,
  stone: stoneLike('#e0dbd0'),
  limestone: stoneLike('#e8dcc2'),
  panel,
  windows,
  lobbyGlass,
  darkGlass: make('dark-glass', { color: '#1d252e', roughness: 0.1, metalness: 0.6 }),
  railing: make('railing', {
    color: '#c8d6dc',
    roughness: 0.05,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  white: make('white', { color: '#f1f0eb', roughness: 0.6 }),
  wood: make('wood', { map: tiled('floor', 'color', 2), color: '#d9a878', roughness: 0.7 }),
  roof: make('roof', { color: '#2e3c5c', roughness: 0.85 }),
  terrace: make('terrace', {
    map: tiled('sidewalk', 'color', 1.5),
    color: '#e6e2da',
    roughness: 0.9,
  }),
  green: make('green', { map: tiled('grass', 'color', 2), color: '#7d9a55', roughness: 1 }),
  metal: make('metal', { color: '#9ca2a8', roughness: 0.5, metalness: 0.5 }),
  pavers: make('pavers', {
    map: tiled('sidewalk', 'color', 1.2),
    color: '#d99a80',
    roughness: 0.9,
  }),
}
