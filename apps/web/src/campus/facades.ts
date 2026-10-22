import { BRICK, CONCRETE, DECK, GLASS } from './facade'

// what the outside of a building looks like, for the facade shader. window is
// [column width, floor height, window width, window height] in meters and fractions of
// the column and the floor. a window width of 1 is a strip of windows all along the floor
export type Facade = {
  style: number
  // the wall's color (brick and concrete), or the metal between the glass (towers)
  color: string
  frame: string
  window: [number, number, number, number]
}

type Look = {
  wall: 'glass' | 'concrete' | 'brick'
  color: string
  frame?: string
  window?: [number, number, number, number]
}

// gsu buildings and the towers you see from campus, as they look in photos (commons, gsu's
// own). the rest get made-up ones
const LOOKS: Record<string, Look> = {
  // buff brick, big windows, tall floors
  'Helen M. Aderhold Learning Center': {
    wall: 'brick',
    color: '#dcc8a3',
    frame: '#34383b',
    window: [3.4, 5.4, 0.68, 0.62],
  },
  // old tan brick warehouse, lots of steel windows
  '58 Edgewood': {
    wall: 'brick',
    color: '#d6c29c',
    frame: '#3a3d40',
    window: [2.3, 4.1, 0.64, 0.6],
  },
  // tan concrete with bands of glass
  'Centennial Hall': {
    wall: 'concrete',
    color: '#dccfb6',
    frame: '#5d6266',
    window: [3, 3.4, 1, 0.5],
  },
  // red brick high rises with white trimmed windows
  'Haas-Howell Building': {
    wall: 'brick',
    color: '#9c4b39',
    frame: '#ebe8e0',
    window: [2.1, 3.5, 0.52, 0.56],
  },
  'Standard Building': {
    wall: 'brick',
    color: '#8d4838',
    frame: '#ebe8e0',
    window: [2, 3.5, 0.5, 0.56],
  },
  // the old university center: a white box with hardly any windows
  'Student Center West': {
    wall: 'concrete',
    color: '#e8e5de',
    frame: '#55595c',
    window: [4.5, 4.3, 0.12, 0.34],
  },
  // tan and pinkish, with big dark windows
  'Student Center East': {
    wall: 'concrete',
    color: '#d9b799',
    frame: '#3b3e41',
    window: [3.4, 4.2, 0.72, 0.62],
  },
  // tan precast, rows of dark punched windows
  'Urban Life Building': {
    wall: 'concrete',
    color: '#d1c4aa',
    frame: '#3d3f42',
    window: [3, 3.5, 0.52, 0.5],
  },
  // dark brown brick, mostly blank with tall narrow slots
  'Library South': {
    wall: 'brick',
    color: '#7a5443',
    frame: '#2f3134',
    window: [5, 3.5, 0.16, 0.9],
  },
  // new glass buildings
  'College of Law': { wall: 'glass', color: '#2a2d30' },
  'Classroom South': { wall: 'glass', color: '#c9ccce' },

  // the skyline round campus, from commons/mapillary photos (2015-2026)
  // warm gray granite, punched windows and tall glass bays
  '191 Peachtree Tower': {
    wall: 'concrete',
    color: '#c9bdb0',
    frame: '#3f4347',
    window: [4.1, 4.1, 0.45, 0.6],
  },
  // dark bronze glass, a mullion every 2.7m (the white piers aren't drawn)
  'State of Georgia Building': { wall: 'glass', color: '#4a4037', window: [2.7, 3.7, 0.9, 0.85] },
  // nearly black bronze metal, ribbon windows
  'Equitable Building': { wall: 'glass', color: '#4b4039', window: [2.25, 4, 1, 0.6] },
  // white aluminum grid, blue-gray glass
  '34 Peachtree': { wall: 'glass', color: '#d8dadb', window: [1.9, 3.5, 0.9, 0.55] },
  // portman's cream precast, narrow deep window slots
  'Peachtree Center International Tower': {
    wall: 'concrete',
    color: '#c9bfb0',
    frame: '#3d3a36',
    window: [1.9, 3.7, 0.45, 0.62],
  },
  // the older one, darker exposed aggregate
  'Peachtree Center South Tower': {
    wall: 'concrete',
    color: '#b5ab9c',
    frame: '#3d3a36',
    window: [1.7, 3.55, 0.42, 0.62],
  },
  // rose granite, a row of bay windows every floor
  'The Ritz-Carlton, Atlanta': {
    wall: 'concrete',
    color: '#c49a86',
    frame: '#4a4440',
    window: [4.3, 3.1, 0.72, 0.5],
  },
  // student tower, blue glass and white balcony slabs (only one photo, ask)
  'The Mix': { wall: 'glass', color: '#dadcdc', window: [3, 3.2, 0.9, 0.62] },
  // light gray concrete bands, blue ribbon windows
  '55 Marietta': {
    wall: 'concrete',
    color: '#cfcbc2',
    frame: '#5d6670',
    window: [1.5, 3.7, 1, 0.42],
  },
  // pale cream precast, deep-set windows
  '55 Park Place': {
    wall: 'concrete',
    color: '#d3d0c6',
    frame: '#3a3d40',
    window: [3.2, 3.7, 0.55, 0.55],
  },
  // taupe walls with small windows (the white end walls aren't drawn)
  'The Landmark': {
    wall: 'brick',
    color: '#9b8679',
    frame: '#e8e6e1',
    window: [2.4, 2.95, 0.4, 0.5],
  },
  // pale gray glazed brick, buff terra cotta under the windows
  'Hurt Building': {
    wall: 'brick',
    color: '#c6c6c2',
    frame: '#e0dbcc',
    window: [2.7, 3.7, 0.5, 0.7],
  },
  // southern bell: buff art deco stone, small windows, tall switching floors
  'AT&T': {
    wall: 'concrete',
    color: '#cfc5b2',
    frame: '#4a4a48',
    window: [3.2, 4.9, 0.32, 0.45],
  },
  // the old rhodes-haverty building: buff brick, white framed pairs
  'Residence Inn Atlanta Downtown': {
    wall: 'brick',
    color: '#c9c0b0',
    frame: '#ebe8e0',
    window: [2, 3.4, 0.5, 0.55],
  },
  // white marble, windows in pairs
  'Candler Building': {
    wall: 'concrete',
    color: '#d6d0c2',
    frame: '#e6e0d2',
    window: [3.4, 3.9, 0.48, 0.62],
  },
  // cream concrete, a curved sunshade slab over every floor
  'Five Points Plaza': {
    wall: 'concrete',
    color: '#d9cfb0',
    frame: '#3a3b38',
    window: [3, 4.2, 1, 0.5],
  },
  // white concrete grid, dark square windows
  '100 Edgewood': {
    wall: 'concrete',
    color: '#d3d5d2',
    frame: '#2a3036',
    window: [2.9, 3.6, 0.8, 0.8],
  },
  // white stone, narrow recessed windows
  'Bennett A. Brown Commerce Building': {
    wall: 'concrete',
    color: '#dcdad3',
    frame: '#2f3235',
    window: [4, 3.7, 0.3, 0.6],
  },
  // orange-red brick apartments, white window frames
  'Bethel Towers': {
    wall: 'brick',
    color: '#a8765c',
    frame: '#e9e7e2',
    window: [5, 2.9, 0.36, 0.6],
  },
  // white terra cotta, big chicago windows
  'Healey Building': {
    wall: 'concrete',
    color: '#e3e1da',
    frame: '#f0eee8',
    window: [2.3, 3.9, 0.7, 0.65],
  },
  // dark blue-gray panels from the 60s recladding
  'The Metropolitan Condos': { wall: 'glass', color: '#3e4a54', window: [2.8, 3.9, 0.45, 0.6] },
  // light stucco, dark panels between the windows
  'One 12 Courtland': {
    wall: 'concrete',
    color: '#d4ccc0',
    frame: '#3b3f43',
    window: [4.6, 3, 0.42, 0.55],
  },
  // buff art deco stone, white framed windows
  'William-Oliver Building': {
    wall: 'concrete',
    color: '#cfc3ab',
    frame: '#e8e2d4',
    window: [2.3, 3.8, 0.55, 0.55],
  },
  // white stone fins and dark glass, all the way up (replaces the old one)
  '25 Park Place': {
    wall: 'concrete',
    color: '#e0e0dc',
    frame: '#2e3134',
    window: [1.7, 3.8, 0.62, 0.7],
  },
  // rose granite (its height is 50 in campus.json, real 206)
  'Georgia-Pacific Tower': {
    wall: 'concrete',
    color: '#c9a08a',
    frame: '#3a3a3e',
    window: [1.5, 4, 0.55, 0.42],
  },
  // bronze-gray mirror glass (needs the cylinder part first)
  'The Westin Peachtree Plaza, Atlanta': {
    wall: 'glass',
    color: '#3d4852',
    window: [1.5, 3, 0.95, 0.9],
  },
  // charcoal panels, narrow blue glass slots between the balconies (2022)
  'Reflection Student Apartments': {
    wall: 'concrete',
    color: '#4f5256',
    frame: '#41566b',
    window: [3, 3.1, 0.3, 0.8],
  },
}

// anything taller than ~14 floors (in real life) is a glass tower
const TOWER_HEIGHT = 50
// concrete comes out of the texture pretty gray, these warm it up a bit per building
const CONCRETE_TINTS = ['#d8d2c4', '#c9c6be', '#e2dccd', '#bfc3c6', '#d6c8b0']
const BRICK_TINTS = ['#8f6852', '#9a5a45', '#7c5645', '#a86f55', '#c9a27c']
const FRAME_TINTS = ['#8e98a3', '#5f6873', '#b8bfc6', '#7d7466']
const WINDOW_FRAMES = ['#2f3235', '#e4e2dc', '#4a4038', '#6d7277']

// same "random" 0-1 number for a building every time
export const seedOf = (i: number) => {
  const n = Math.sin(i * 12.9898) * 43758.5453
  return n - Math.floor(n)
}

const pick = <T>(list: T[], r: number) => list[Math.floor(r * list.length) % list.length]!

export function facadeOf(b: { name?: string; height: number; deck?: boolean }, i: number): Facade {
  const seed = seedOf(i)
  // concrete, a column every 8m, floors 3m apart
  if (b.deck)
    return {
      style: DECK,
      color: pick(CONCRETE_TINTS, seed),
      frame: '#000000',
      window: [8, 3, 1, 1],
    }
  const look = b.name ? LOOKS[b.name] : undefined
  if (look) {
    const style = look.wall === 'glass' ? GLASS : look.wall === 'brick' ? BRICK : CONCRETE
    return {
      style,
      color: look.color,
      frame: look.frame ?? look.color,
      window: look.window ?? (style === GLASS ? [2.4, 3.5, 0.92, 0.9] : [3, 3.5, 0.56, 0.55]),
    }
  }
  if (b.height >= TOWER_HEIGHT)
    return {
      style: GLASS,
      color: pick(FRAME_TINTS, seed),
      frame: pick(FRAME_TINTS, seed),
      window: [2.4, 3.5, 0.92, 0.9],
    }
  // everything else: made up, but not all the same
  const r = (salt: number) => seedOf(i * 7 + salt)
  const brick = seed < 0.4
  return {
    style: brick ? BRICK : CONCRETE,
    color: pick(brick ? BRICK_TINTS : CONCRETE_TINTS, r(1)),
    frame: pick(WINDOW_FRAMES, r(2)),
    window: [2.4 + r(3) * 1.2, 3.5, 0.42 + r(4) * 0.26, 0.48 + r(5) * 0.18],
  }
}
