import * as THREE from 'three'
import { fract, sin, smoothstep } from 'three/tsl'
import type { Part } from './libraryNorth'
import {
  brick,
  clearGlass,
  glass,
  gravelRoof,
  lawn,
  metal,
  meters,
  paving,
  precast,
  wood,
} from './materials'

// the stone band and the limestone block: cut stone in slabs
const stone = (color: string) =>
  precast({ color, panel: [1.8, 0.9], joint: 0.02, shade: 0.7, tone: 0.04, roughness: 0.8 })

// the wavy white panel: rows of waves in low relief, just shading. the only surface here
// that's its own shader
const panel = precast({
  color: '#ebe7de',
  shade: 1,
  tone: 0,
  contrast: 0.15,
  bump: 0.1,
  roughness: 0.6,
})
{
  const wave = fract(meters.y.div(1.6).sub(sin(meters.x.mul(1.75)).mul(0.28)))
  panel.colorNode = panel.colorNode!.mul(
    smoothstep(0, 0.35, wave)
      .mul(0.16)
      .add(0.84)
      .sub(smoothstep(0.85, 1, wave).mul(0.12)),
  )
}

const dark = { color: '#1d252e', roughness: 0.1, metalness: 0.6, frame: 0 }

export const libraryNorthMaterials: Record<Part, THREE.Material> = {
  // a dull brown brick. at night lights along the bottom shine up the walls, every 6m
  brick: brick({ color: '#51433f', saturation: 0.38, uplight: [6, 0.5] }),
  stone: stone('#87816a'),
  limestone: stone('#8c8162'),
  panel,
  // the row of small windows up top, all lit at night
  windows: glass({ ...dark, pane: [1.2, 0.7], mullion: 0.07, frameColor: '#1d252e', lit: 1 }),
  // the lobby: glass with metal frames, and lit up inside at night
  lobbyGlass: clearGlass({
    color: '#6f9f96',
    opacity: 0.5,
    grid: [1.5, 3.6],
    mullion: 0.026,
    transom: 0.07,
    from: 3.4,
    base: 0.25,
    glow: 0.4,
    roughness: 0.04,
    metalness: 0.5,
  }),
  darkGlass: glass({ ...dark, pane: [100, 100], mullion: 0, lit: 0 }),
  railing: clearGlass({ color: '#c8d6dc', opacity: 0.25, side: THREE.DoubleSide }),
  white: metal({ color: '#f1f0eb', roughness: 0.6 }),
  wood: wood({ color: '#84532b', size: 2, saturation: 1, roughness: 0.7 }),
  roof: gravelRoof({ color: '#2e3c5c', roughness: 0.85 }),
  terrace: paving({ color: '#736757', size: 1.5, saturation: 1 }),
  green: lawn({ color: '#32370e', size: 2, saturation: 1, roughness: 1 }),
  metal: metal({ color: '#9ca2a8', roughness: 0.5, metalness: 0.5 }),
  pavers: paving({ color: '#7a6951', size: 1.2, saturation: 1 }),
}
