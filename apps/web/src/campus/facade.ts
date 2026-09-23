import * as THREE from 'three'
import { cutoutShader } from './cutout'
import { texture } from './textures'

// facade styles, stored per vertex in the aStyle attribute
export const GLASS = 0
export const CONCRETE = 1
export const BRICK = 2

// real floors are ~3.5m
const FLOOR_HEIGHT = 3.5

/**
 * Building material. Windows aren't modeled, they're drawn by the shader from the
 * world position: every FLOOR_HEIGHT up there's a row, and a column every few meters
 * along the wall. Glass is shiny and reflects the sky, walls get brick/concrete
 * textures. Roofs (anything facing up) get gravel.
 */
export function facadeMaterial() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true })
  const uniforms = {
    uBrick: { value: texture('brick', 'color') },
    uBrickNormal: { value: texture('brick', 'normal') },
    uConcrete: { value: texture('concrete', 'color') },
    uConcreteNormal: { value: texture('concrete', 'normal') },
    uRoof: { value: texture('roof', 'color') },
  }

  material.onBeforeCompile = (shader) => {
    cutoutShader(shader)
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aStyle;
        attribute float aHeight;
        attribute float aSeed;
        varying float vStyle;
        varying float vHeight;
        varying float vSeed;
        varying vec3 vWorldNormal;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vStyle = aStyle;
        vHeight = aHeight;
        vSeed = aSeed;
        vWorldNormal = normal;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uBrick;
        uniform sampler2D uBrickNormal;
        uniform sampler2D uConcrete;
        uniform sampler2D uConcreteNormal;
        uniform sampler2D uRoof;
        varying float vStyle;
        varying float vHeight;
        varying float vSeed;
        varying vec3 vWorldNormal;

        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 wn = normalize(vWorldNormal);
        bool isRoof = wn.y > 0.5;
        bool isGlass = false;
        // along the wall (left to right when you face it) and up
        vec2 along = vec2(wn.z, -wn.x);
        float u = dot(vWorldPos.xz, along);
        float v = vWorldPos.y;
        vec2 wallUv = vec2(u, v) / 4.0;

        if (isRoof) {
          // flat roofs are anything from white membrane to dark gravel
          diffuseColor.rgb = texture2D(uRoof, vWorldPos.xz / 12.0).rgb * mix(vec3(1.25), vec3(0.55), vSeed);
        } else {
          bool brick = vStyle > 1.5;
          vec3 wall = brick
            ? texture2D(uBrick, wallUv).rgb
            : texture2D(uConcrete, wallUv * 0.5).rgb * diffuseColor.rgb * 1.6;
          if (vStyle < 0.5) wall = diffuseColor.rgb; // glass towers: color is the metal frame

          float colWidth = vStyle < 0.5 ? 2.4 : 3.0;
          vec2 cell = fract(vec2(u / colWidth, v / ${FLOOR_HEIGHT}));
          float floorNum = floor(v / ${FLOOR_HEIGHT});

          // window rectangle inside each cell (0-1 on both axes)
          vec4 rect = vStyle < 0.5 ? vec4(0.04, 0.1, 0.96, 1.0) : vec4(0.22, 0.3, 0.78, 0.85);
          // shop windows on the ground floor
          if (floorNum < 1.0 && vStyle > 0.5) rect = vec4(0.08, 0.1, 0.92, 0.9);

          bool win = cell.x > rect.x && cell.x < rect.z && cell.y > rect.y && cell.y < rect.w;
          // solid strip along the top
          if (v > vHeight - 1.0) win = false;

          if (win) {
            float edge = min(min(cell.x - rect.x, rect.z - cell.x), min(cell.y - rect.y, rect.w - cell.y));
            // some windows darker/lighter, like blinds half down
            float h = hash(vec3(floor(u / colWidth), floorNum, vSeed));
            vec3 glass = mix(vec3(0.03, 0.05, 0.07), vec3(0.18, 0.22, 0.26), h * 0.7);
            // windows sit back in the wall, so the top of the glass is in shadow
            if (rect.w - cell.y < 0.12 && vStyle > 0.5) glass *= 0.5;

            if (edge < 0.025) {
              diffuseColor.rgb = vStyle < 0.5 ? wall * 0.8 : vec3(0.72, 0.72, 0.7); // frame
            } else {
              diffuseColor.rgb = glass;
              isGlass = true;
            }
          } else {
            diffuseColor.rgb = wall;
            // stone sill under each window
            bool sill = vStyle > 0.5 && floorNum >= 1.0 && cell.y < rect.y && cell.y > rect.y - 0.05
              && cell.x > rect.x - 0.03 && cell.x < rect.z + 0.03;
            if (sill) diffuseColor.rgb = vec3(0.78, 0.76, 0.72);
          }
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = isGlass ? 0.06 : 0.9;`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = isGlass ? 0.85 : (vStyle < 0.5 ? 0.6 : 0.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        // bumps from the brick/concrete normal maps. the wall's own directions, moved
        // into view space since that's what normal is in here
        if (!isRoof && !isGlass && vStyle > 0.5) {
          vec3 m = (vStyle > 1.5 ? texture2D(uBrickNormal, wallUv) : texture2D(uConcreteNormal, wallUv * 0.5)).xyz * 2.0 - 1.0;
          vec3 T = normalize((viewMatrix * vec4(along.x, 0.0, along.y, 0.0)).xyz);
          vec3 B = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          normal = normalize(mat3(T, B, normal) * m);
        }`,
      )
  }
  return material
}
