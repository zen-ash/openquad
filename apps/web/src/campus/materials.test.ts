import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  brick,
  clearGlass,
  concrete,
  glass,
  gravelRoof,
  lawn,
  marble,
  metal,
  paving,
  plain,
  precast,
  wood,
} from './materials'

// roughly what three puts in a material's shader cache key (RenderObject
// getMaterialCacheKey): every property in order, numbers only as zero or not, nodes by
// which node they are
function cacheKey(m: THREE.Material) {
  return Object.entries(m)
    .filter(([k]) => !/^(is[A-Z]|_)|^(visible|version|uuid|name|opacity|userData)$/.test(k))
    .map(([k, v]) => {
      if (v?.isNode) return `${k}:${v.id}`
      if (typeof v === 'number') return k === 'side' ? `${k}:${v}` : `${k}:${v !== 0}`
      return `${k}:${v && typeof v === 'object' ? '{}' : String(v)}`
    })
    .join()
}

// two of each family, as different from each other as they get
const families = {
  brick: [brick({ color: '#51433f' }), brick({ color: '#fff', size: 3, uplight: [4, 1] })],
  precast: [
    precast({ color: '#ccc' }),
    precast({ color: '#333', panel: [3, 1], joint: 0, shade: 1, tone: 0, roughness: 0.2 }),
  ],
  concrete: [concrete({ color: '#aaa' }), concrete({ color: '#999', boards: [0.2, 1] })],
  marble: [marble({ color: '#eee' }), marble({ color: '#aaa', veins: 0, bond: 0, dirt: 1 })],
  metal: [
    metal({ color: '#888' }),
    metal({ color: '#222', metalness: 1, roughness: 0, joint: 1.3, ribs: [0.2, 0.3] }),
  ],
  glass: [glass({}), glass({ pane: [1, 2], darkBottom: true, lit: 0, frame: 0, metalness: 0 })],
  clearGlass: [
    clearGlass({ color: '#6f9f96', glow: 0.4 }),
    clearGlass({ color: '#fff', opacity: 1 }),
  ],
  paving: [paving({ color: '#777' }), paving({ color: '#777', size: 1, bump: 0 })],
  lawn: [lawn({ color: '#353' }), lawn({ color: '#353', roughness: 0.5 })],
  roof: [gravelRoof({ color: '#555' }), gravelRoof({ color: '#222', contrast: 0 })],
  wood: [wood({ color: '#853' }), wood({ color: '#853', saturation: 1 })],
  plain: [plain({ color: '#000' }), plain({ color: '#fff', roughness: 0, metalness: 1 })],
}

describe('material library', () => {
  it.each(Object.entries(families))('makes every %s share one shader', (_, [a, b]) => {
    expect(cacheKey(a!)).toBe(cacheKey(b!))
    expect(a!.colorNode ?? null).toBe(b!.colorNode ?? null)
  })

  it('gives each family its own shader', () => {
    const keys = Object.values(families).map(([a]) => cacheKey(a!))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('cuts the see-through hole in everything, and never in the shadows', () => {
    const all = Object.values(families).flat()
    for (const m of all) {
      expect(m.maskNode).toBe(all[0]!.maskNode)
      expect(m.maskShadowNode).toBe(all[0]!.maskShadowNode)
    }
  })

  it('keeps what the building asked for on the material', () => {
    const m = brick({ color: '#ff0000', uplight: [6, 0.5] })
    expect(m.color.getHexString()).toBe('ff0000')
    expect(m.userData.uplight).toEqual(new THREE.Vector2(6, 0.5))
    expect(m.userData.size).toBe(1.4)
  })
})
