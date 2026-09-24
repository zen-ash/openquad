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
