import * as THREE from 'three'
import { clearGlass, concrete, glass, metal, precast } from './materials'
import type { BandPart, PaintedPart, SteelPart } from './parkingDecks'

// one set per style, every deck of a style shares it (each part is a draw call in every
// pass, the materials are shared so it's no more shaders). colors from gsu's 2018 photos
// (noon, sun) as ratios: the steel is 0.65 of the painted block, the chain link 0.5

// n, k and s: the open steel decks
export const steelDeckMaterials: Record<SteelPart, THREE.Material> = {
  // the floors' concrete, light grey, darker under them where the sun doesn't get
  slab: concrete({ color: '#adaeab', roughness: 0.85 }),
  // the floors under other floors and their undersides: the same concrete, but the sky's
  // light and reflections only get a little way in (0.45 of the painted steel in the
  // photos). the ambient occlusion only reaches a meter, so it's set here. the sun still
  // lights them. what light gets in is the blue sky on the floors and the warm sidewalk under
  // them, so the floors are a little warmer and the undersides a little cooler, to come out
  // the photos' grey
  floor: concrete({ color: '#a79e90', roughness: 0.9, occlusion: 0.3 }),
  soffit: concrete({ color: '#8a919b', roughness: 0.9, occlusion: 0.3 }),
  // light grey painted steel, a lot greyer than the block in the 2019 photo in sun
  steel: metal({ color: '#999ca1', roughness: 0.55 }),
  // galvanized chain link, a see-through grey with its posts and rails (every POST along,
  // two rails) as the frame lines. both sides are drawn, so FrontSide
  mesh: clearGlass({
    color: '#6a6964',
    opacity: 0.55,
    grid: [2.75, 0.485],
    mullion: 0.04,
    transom: 0.022,
    frameColor: '#a2a5aa',
    roughness: 0.7,
    metalness: 0.3,
  }),
  // the lights under every floor, sodium orange (lit in every one of the photos, the 2018
  // ones at noon too, but only night gets a glow here)
  lamp: clearGlass({ color: '#ff9b3d', frameColor: '#ff9b3d', opacity: 0.95, glow: 3 }),
  // white painted block in 0.4 x 0.2m courses
  block: precast({
    color: '#dcdfdd',
    panel: [0.4, 0.2],
    joint: 0.008,
    shade: 0.86,
    tone: 0.02,
    dirt: 0.2,
  }),
  // the stair towers' curtain walls, a pane a floor tall in thin dark frames
  glass: glass({
    color: '#34414b',
    pane: [1.45, 2.8],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#2c3035',
    lit: 0.6,
  }),
}

// m: cream painted precast, smooth (#f2e9d8 in sun, the base a little darker with the street's
// dirt), the floors and lamps like the steel decks'
export const paintedDeckMaterials: Record<PaintedPart, THREE.Material> = {
  cream: precast({
    color: '#efe5d2',
    panel: [8.2, 3.1],
    offset: [0, 0.35],
    joint: 0.012,
    shade: 0.82,
    tone: 0.02,
    dirt: 0.35,
  }),
  // black steel screens on the ground floor and the floodlight poles
  dark: metal({ color: '#2b2c2e', roughness: 0.6, ribs: [0.1, 0.5] }),
  slab: steelDeckMaterials.slab,
  floor: steelDeckMaterials.floor,
  soffit: steelDeckMaterials.soffit,
  lamp: steelDeckMaterials.lamp,
  // the towers' glass in white mullions, 4 x 3 to a floor (gsu's 2018 photo), dark green grey
  glass: glass({
    color: '#36403a',
    pane: [1.0, 0.85],
    mullion: 0.035,
    frame: 0.06,
    frameColor: '#ecebe4',
    lit: 0.6,
    roughness: 0.1,
    metalness: 0.4,
  }),
}

// g: exposed aggregate precast, a warm mid grey (darker and browner where it's weathered),
// big panels, the screens dark bronze
export const bandDeckMaterials: Record<BandPart, THREE.Material> = {
  precast: precast({
    color: '#8a8478',
    panel: [3, 1.5],
    offset: [0, 0.15],
    joint: 0.03,
    shade: 0.6,
    tone: 0.05,
    contrast: 0.7,
    bump: 0.6,
    dirt: 0.6,
  }),
  // dark mesh and tinted panels in bronze frames, they read as dark windows. no rooms lit
  // behind them at night
  screen: glass({
    color: '#1f1e1c',
    pane: [2.7, 1.5],
    mullion: 0.04,
    frame: 0.07,
    frameColor: '#4a4038',
    lit: 0,
    roughness: 0.85,
    metalness: 0.05,
  }),
  // the stair towers' glass, dark mullions
  glass: glass({
    color: '#3d4a52',
    pane: [1.5, 1.5],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#2c2f33',
    lit: 0.7,
  }),
  slab: steelDeckMaterials.slab,
  // the floodlight poles and the dark inside of the ways in
  pole: metal({ color: '#3a3530', roughness: 0.6 }),
}
