import * as THREE from 'three'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import { cutoutShader } from './cutout'
import { texture } from './textures'

// facade styles, stored per vertex in the aStyle attribute
export const GLASS = 0
export const CONCRETE = 1
export const BRICK = 2
// parking decks: open floors behind a concrete wall at waist height, no glass
export const DECK = 4

// ground floor shop windows, as [left, bottom, right, top] inside each grid cell. shared
// with the inside walls (interiorMaterials.ts) so the holes line up
export const GROUND_WINDOW_WALL = [0.08, 0.1, 0.92, 0.9]
const vec4 = (r: number[]) => `vec4(${r.map((n) => n.toFixed(2)).join(', ')})`

/**
 * Building material. Windows aren't modeled, they're drawn by the shader from the
 * world position: a row every floor, and a column every few meters along the wall.
 * Each building has its own grid and colors (facades.ts). Glass is shiny and reflects the sky, walls get brick/concrete
 * textures. Roofs (anything facing up) get gravel.
 */
// 0 in the day, 1 at night. set by the sky every so often
export const night = { value: 0 }

export function facadeMaterial() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true })
  const uniforms = {
    uBrick: { value: texture('brick', 'color') },
    uBrickNormal: { value: texture('brick', 'normal') },
    uConcrete: { value: texture('concrete', 'color') },
    uConcreteNormal: { value: texture('concrete', 'normal') },
    uRoof: { value: texture('roof', 'color') },
    uNight: night,
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
        attribute vec4 aDoor;
        attribute vec4 aWindow;
        attribute vec3 aFrame;
        varying vec4 vDoor;
        varying vec4 vWindow;
        varying vec3 vFrame;
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
        vDoor = aDoor;
        vWindow = aWindow;
        vFrame = aFrame;
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
        uniform float uNight;
        varying float vStyle;
        varying float vHeight;
        varying float vSeed;
        varying vec4 vDoor;
        varying vec4 vWindow;
        varying vec3 vFrame;
        varying vec3 vWorldNormal;

        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 wn = normalize(vWorldNormal);
        // the doorway of buildings you can walk into. vDoor is (x, z, normal x, normal z)
        if (dot(vDoor.zw, vDoor.zw) > 0.5 && dot(wn.xz, vDoor.zw) > 0.9 && vWorldPos.y < ${DOOR_HEIGHT.toFixed(2)}) {
          vec2 off = vWorldPos.xz - vDoor.xy;
          if (abs(dot(off, vDoor.zw)) < 0.3 && abs(dot(off, vec2(vDoor.w, -vDoor.z))) < ${(DOOR_WIDTH / 2).toFixed(2)}) discard;
        }
        bool isRoof = wn.y > 0.5;
        bool isGlass = false;
        // some windows have the lights on at night
        bool lit = false;
        // along the wall (left to right when you face it) and up
        vec2 along = vec2(wn.z, -wn.x);
        float u = dot(vWorldPos.xz, along);
        float v = vWorldPos.y;
        vec2 wallUv = vec2(u, v) / 4.0;

        if (isRoof) {
          // flat roofs are anything from white membrane to dark gravel
          diffuseColor.rgb = texture2D(uRoof, vWorldPos.xz / 12.0).rgb * mix(vec3(1.25), vec3(0.55), vSeed);
        } else {
          bool brick = vStyle > 1.5 && vStyle < 2.5;
          // the brick texture is red. it's tinted to whatever this building's bricks are
          vec3 brickTex = texture2D(uBrick, wallUv).rgb;
          vec3 wall = brick
            ? mix(vec3(dot(brickTex, vec3(0.3, 0.59, 0.11))), brickTex, 0.25) / 0.174 * diffuseColor.rgb
            // and the concrete one is olive, divided by its average so the tint is the color
            : texture2D(uConcrete, wallUv * 0.5).rgb / vec3(0.179, 0.172, 0.126) * diffuseColor.rgb * 0.6;
          if (vStyle < 0.5) wall = diffuseColor.rgb; // glass towers: color is the metal frame
          bool deck = vStyle > 3.5;

          // each building's own window grid (facades.ts): column, floor, window size
          float colWidth = vWindow.x;
          float floorHeight = vWindow.y;
          vec2 cell = fract(vec2(u / colWidth, v / floorHeight));
          float floorNum = floor(v / floorHeight);

          // window rectangle inside each cell (0-1 on both axes). full width is a strip
          // of windows along the whole floor, with a mullion every column
          vec4 rect = vec4(0.5 - vWindow.z / 2.0, max(0.02, 0.575 - vWindow.w / 2.0),
            0.5 + vWindow.z / 2.0, min(1.0, 0.575 + vWindow.w / 2.0));
          if (vWindow.z > 0.99) rect.xz = vec2(0.0, 1.0);
          // shop windows on the ground floor
          if (floorNum < 1.0 && vStyle > 0.5) rect = ${vec4(GROUND_WINDOW_WALL)};

          // decks: a gap all along each floor between the wall and the next slab, dark
          // inside with a column every bay
          if (deck) rect = vec4(0.0, 0.34, 1.0, 0.9);
          bool win = cell.x > rect.x && cell.x < rect.z && cell.y > rect.y && cell.y < rect.w;
          // solid strip along the top
          if (v > vHeight - 1.0) win = false;

          if (win && deck) {
            // the dark inside, and the columns
            float column = min(cell.x, 1.0 - cell.x) * colWidth;
            diffuseColor.rgb = column < 0.25 ? wall * 0.8 : vec3(0.02, 0.02, 0.022) + wall * 0.02;
          } else if (win) {
            float edge = min(min(cell.x - rect.x, rect.z - cell.x), min(cell.y - rect.y, rect.w - cell.y));
            // some windows darker/lighter, like blinds half down
            float h = hash(vec3(floor(u / colWidth), floorNum, vSeed));
            lit = hash(vec3(floorNum, floor(u / colWidth), vSeed + 7.0)) > 0.55;
            vec3 glass = mix(vec3(0.03, 0.05, 0.07), vec3(0.18, 0.22, 0.26), h * 0.7);
            // windows sit back in the wall, so the top of the glass is in shadow
            if (rect.w - cell.y < 0.12 && vStyle > 0.5) glass *= 0.5;

            if (edge < 0.025) {
              diffuseColor.rgb = vStyle < 0.5 ? wall * 0.8 : vFrame; // frame
            } else {
              diffuseColor.rgb = glass;
              isGlass = true;
            }
          } else {
            diffuseColor.rgb = wall;
            // stone sill under each window
            bool sill = vStyle > 0.5 && vStyle < 3.5 && floorNum >= 1.0 && cell.y < rect.y && cell.y > rect.y - 0.05
              && cell.x > rect.x - 0.03 && cell.x < rect.z + 0.03;
            if (sill) diffuseColor.rgb = vec3(0.78, 0.76, 0.72);
          }
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (isGlass && lit) totalEmissiveRadiance += vec3(1.0, 0.78, 0.48) * 1.6 * uNight;`,
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
          vec3 m = (vStyle > 1.5 && vStyle < 2.5 ? texture2D(uBrickNormal, wallUv) : texture2D(uConcreteNormal, wallUv * 0.5)).xyz * 2.0 - 1.0;
          vec3 T = normalize((viewMatrix * vec4(along.x, 0.0, along.y, 0.0)).xyz);
          vec3 B = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          normal = normalize(mat3(T, B, normal) * m);
        }`,
      )
  }
  return material
}
