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

// gsu buildings as they look in photos (commons, gsu's own). the rest get made-up ones
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
  // white with strips of windows along every floor
  'Science Annex': {
    wall: 'concrete',
    color: '#eeede8',
    frame: '#7f858b',
    window: [3, 3.6, 1, 0.38],
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
  // white stone piers and dark glass, all the way up
  '25 Park Place': {
    wall: 'concrete',
    color: '#ebeae5',
    frame: '#2e3134',
    window: [1.6, 3.6, 0.56, 0.74],
  },
  // new glass buildings
  'College of Law': { wall: 'glass', color: '#2a2d30' },
  'Classroom South': { wall: 'glass', color: '#c9ccce' },
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
