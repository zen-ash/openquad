import * as THREE from 'three'
import {
  abs,
  dot,
  exp,
  float,
  fract,
  materialColor,
  mix,
  normalMap,
  select,
  sin,
  smoothstep,
  vec3,
  vec4,
} from 'three/tsl'
import { night } from './facade'
import { make, meters, textured, tiled } from './landmarkMaterials'
import { unpackNormal } from './textures'
import type { Part } from './libraryNorth'

// the texture is a warm red brick, the real one is a duller brown
const brick = make(
  {
    color: '#aa9c98',
    roughness: 0.9,
  },
  (m) => {
    const c = tiled('brick', 'color', 4).rgb.mul(materialColor.rgb)
    m.normalNode = normalMap(unpackNormal(tiled('brick', 'normal', 4)))
    m.colorNode = mix(vec3(dot(c, vec3(0.3, 0.59, 0.11))), c, 0.38)
    // at night lights along the bottom shine up the walls, every 6m
    const beam = float(1).sub(
      smoothstep(0, meters.y.mul(0.12).add(1.4), abs(fract(meters.x.div(6)).mul(6).sub(3))),
    )
    m.emissiveNode = vec3(1, 0.72, 0.42)
      .mul(night)
      .mul(beam)
      .mul(exp(meters.y.div(-5)))
      .mul(0.5)
  },
)

// concrete texture comes out dark, brightened into a light stone
const stoneLike = (color: string) =>
  make({ color, roughness: 0.8 }, (m) => {
    // joints between the stone slabs
    const joint = fract(meters.y.div(0.9))
      .lessThan(0.02)
      .or(fract(meters.x.div(1.8)).lessThan(0.012))
    m.colorNode = tiled('concrete', 'color', 3)
      .rgb.mul(materialColor.rgb)
      .mul(1.8)
      .mul(select(joint, 0.8, 1))
  })

// the wavy white panel: rows of waves in low relief. just shading, no real bumps
const panel = make({ color: '#ebe7de', roughness: 0.6 }, (m) => {
  const wave = fract(meters.y.div(1.6).sub(sin(meters.x.mul(1.75)).mul(0.28)))
  m.colorNode = materialColor.rgb.mul(
    smoothstep(0, 0.35, wave)
      .mul(0.16)
      .add(0.84)
      .sub(smoothstep(0.85, 1, wave).mul(0.12)),
  )
})

// the lobby: glass with metal frames, and lit up inside at night
const lobbyGlass = make(
  { color: '#6f9f96', roughness: 0.04, metalness: 0.5, transparent: true, depthWrite: false },
  (m) => {
    const frame = fract(meters.x.div(1.5))
      .lessThan(0.035)
      .or(meters.y.lessThan(0.25))
      .or(abs(meters.y.sub(3.4)).lessThan(0.07))
      .or(abs(meters.y.sub(7)).lessThan(0.07))
    m.colorNode = select(frame, vec4(0.62, 0.65, 0.67, 1), vec4(materialColor.rgb, 0.5))
    m.emissiveNode = select(frame, vec3(0), vec3(1, 0.86, 0.62).mul(night).mul(0.4))
  },
)

// the row of small windows up top has the lights on at night
const windows = make({ color: '#1d252e', roughness: 0.1, metalness: 0.6 }, (m) => {
  m.emissiveNode = select(
    fract(meters.x.div(1.2)).greaterThan(0.12),
    vec3(1, 0.85, 0.6).mul(night),
    vec3(0),
  )
})

export const libraryNorthMaterials: Record<Part, THREE.Material> = {
  brick,
  stone: stoneLike('#e0dbd0'),
  limestone: stoneLike('#e8dcc2'),
  panel,
  windows,
  lobbyGlass,
  darkGlass: make({ color: '#1d252e', roughness: 0.1, metalness: 0.6 }),
  railing: make({
    color: '#c8d6dc',
    roughness: 0.05,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  white: make({ color: '#f1f0eb', roughness: 0.6 }),
  wood: textured({ color: '#d9a878', roughness: 0.7 }, 'floor', 2),
  roof: make({ color: '#2e3c5c', roughness: 0.85 }),
  terrace: textured({ color: '#e6e2da', roughness: 0.9 }, 'sidewalk', 1.5),
  green: textured({ color: '#7d9a55', roughness: 1 }, 'grass', 2),
  metal: make({ color: '#9ca2a8', roughness: 0.5, metalness: 0.5 }),
  pavers: textured({ color: '#f4e6cc', roughness: 0.9 }, 'sidewalk', 1.2),
}
