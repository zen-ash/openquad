import * as THREE from 'three'
import {
  COL_GLASS,
  COL_WALL,
  FLOOR_HEIGHT,
  GROUND_WINDOW_GLASS,
  GROUND_WINDOW_WALL,
} from './facade'
import { texture } from './textures'

const vec4 = (r: number[]) => `vec4(${r.map((n) => n.toFixed(2)).join(', ')})`

// the texture is a pale grey oak, a bit dull next to white walls, so it's tinted warmer
export const floorMaterial = new THREE.MeshStandardMaterial({
  map: texture('floor', 'color'),
  normalMap: texture('floor', 'normal'),
  color: '#e2c6a6',
  roughness: 0.6,
})
// brighter pools under each ceiling light (same 4m grid as the panels). without them the
// light indoors is completely even, which just looks flat
floorMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vPos;')
    .replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vPos;')
    .replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      float fromLight = length(fract(vPos.xz / 4.0) - 0.5) * 4.0;
      reflectedLight.indirectDiffuse *= mix(0.75, 1.3, 1.0 - smoothstep(0.2, 2.0, fromLight));`,
    )
}

// office ceiling tiles with a grid of light panels
export const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: '#d9d7d1',
  roughness: 0.9,
})
ceilingMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vPos;')
    .replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vPos;')
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      vec2 tile = fract(vPos.xz / 0.6);
      if (min(tile.x, tile.y) < 0.03) diffuseColor.rgb *= 0.75;
      vec2 cell = fract(vPos.xz / 4.0);
      // under bloom's threshold, otherwise the whole ceiling turns into a glow
      if (abs(cell.x - 0.5) < 0.18 && abs(cell.y - 0.5) < 0.18) totalEmissiveRadiance += vec3(0.75, 0.73, 0.69);`,
    )
}

// the window grid from facade.ts, so the holes line up with the windows outside.
// keepGlass flips it: the glass only keeps the window part
function windows(keepGlass: boolean) {
  return (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aStyle;\nvarying float vStyle;\nvarying vec3 vPos;\nvarying vec3 vN;',
      )
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvStyle = aStyle;\nvPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvN = normal;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vStyle;\nvarying vec3 vPos;\nvarying vec3 vN;',
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        bool isWindow = false;
        if (vStyle > -0.5) {
          // same "along the wall" coordinate the outside uses, from the outward normal
          vec2 outward = -normalize(vN.xz);
          float u = dot(vPos.xz, vec2(outward.y, -outward.x));
          bool glass = vStyle < 0.5;
          float col = glass ? ${COL_GLASS.toFixed(1)} : ${COL_WALL.toFixed(1)};
          vec2 cell = fract(vec2(u / col, vPos.y / ${FLOOR_HEIGHT.toFixed(1)}));
          vec4 rect = glass ? ${vec4(GROUND_WINDOW_GLASS)} : ${vec4(GROUND_WINDOW_WALL)};
          isWindow = cell.x > rect.x && cell.x < rect.z && cell.y > rect.y && cell.y < rect.w;
        }
        if (isWindow != ${keepGlass}) discard;`,
      )
  }
}

// inside walls, with holes where the windows are so you see the real street through them
export const wallMaterial = new THREE.MeshStandardMaterial({
  map: texture('plaster', 'color'),
  normalMap: texture('plaster', 'normal'),
  color: '#efe6d8',
  roughness: 0.95,
})
wallMaterial.onBeforeCompile = windows(false)

// and a faint pane in each hole. mostly it's the sky reflection that sells it
export const glassMaterial = new THREE.MeshStandardMaterial({
  color: '#a9bcc6',
  roughness: 0.05,
  transparent: true,
  opacity: 0.1,
  depthWrite: false,
})
glassMaterial.onBeforeCompile = windows(true)
