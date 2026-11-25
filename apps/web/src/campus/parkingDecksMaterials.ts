import * as THREE from 'three'
import { brick, clearGlass, concrete, glass, lawn, metal, precast } from './materials'
import type { BandPart, PaintedPart, SinglePart, SpandrelPart, SteelPart } from './parkingDecks'

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
  // the toll plaza's canopy and booth, painted white: m's cream (the same material, no new
  // shader)
  white: paintedDeckMaterials.cream,
  // the toll plaza's island curbs, painted yellow
  yellow: precast({ color: '#d4ab3c', panel: [12, 12], joint: 0, tone: 0.03, dirt: 0.35 }),
  // the planters' shrubs and the soil under them
  green: lawn({ color: '#3d4b25', size: 1.6, saturation: 1, roughness: 0.95 }),
}

// t: cream precast a little warmer and greyer than m's paint (the 2019 and 2022 street photos,
// gsu's 2018 one in shade is whiter), joints at every column. the street floor is tan brick
// with shops, blue grey glazed tile on auburn ave
export const spandrelDeckMaterials: Record<SpandrelPart, THREE.Material> = {
  cream: precast({
    color: '#e4dac6',
    panel: [5.8, 3.086],
    offset: [0, 0.3],
    joint: 0.01,
    shade: 0.85,
    tone: 0.025,
    dirt: 0.4,
  }),
  brick: brick({ color: '#a88f76' }),
  // long thin glazed tiles, set upright
  tile: precast({
    color: '#727b86',
    panel: [0.11, 0.32],
    joint: 0.006,
    shade: 0.8,
    tone: 0.06,
    dirt: 0.15,
  }),
  // the stair towers' and the shops' glass, light frames
  glass: glass({
    color: '#3a464c',
    pane: [1.4, 1.5],
    mullion: 0.035,
    frame: 0.06,
    frameColor: '#d9d6cc',
    lit: 0.6,
    roughness: 0.1,
    metalness: 0.4,
  }),
  slab: steelDeckMaterials.slab,
  floor: steelDeckMaterials.floor,
  soffit: steelDeckMaterials.soffit,
  // white leds under the floors (gsu's 2018 photo), not the other decks' sodium orange
  lamp: clearGlass({ color: '#fff1d6', frameColor: '#fff1d6', opacity: 0.95, glow: 3 }),
  // the cable rails, steel
  dark: metal({ color: '#55585c', roughness: 0.5 }),
}

// a: cream painted concrete, darker and more tan than m's (the 2018 photo from peachtree
// center ave, side by side at the same time of day), the roof's light grey coating, asphalt
// under it and white tubes
export const singleDeckMaterials: Record<SinglePart, THREE.Material> = {
  tan: precast({
    color: '#bcae8e',
    panel: [9, 4],
    joint: 0.006,
    shade: 0.85,
    tone: 0.03,
    dirt: 0.45,
  }),
  // the pipe rails, poles and the roof's lines, painted white: m's cream is white enough
  rail: paintedDeckMaterials.cream,
  slab: concrete({ color: '#8f969a', roughness: 0.85 }),
  floor: concrete({ color: '#58504a', roughness: 0.9, occlusion: 0.3 }),
  soffit: concrete({ color: '#b5ab99', roughness: 0.9, occlusion: 0.3 }),
  lamp: clearGlass({ color: '#f4f6ff', frameColor: '#f4f6ff', opacity: 0.95, glow: 3 }),
}
