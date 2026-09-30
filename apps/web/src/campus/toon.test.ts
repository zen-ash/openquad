import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { cheerful } from './toon'

const hsl = (c: THREE.Color) => c.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace)

describe('cheerful', () => {
  it('makes a photo color stronger and lighter, same hue', () => {
    const brick = new THREE.Color('#7a5a4a')
    const toon = cheerful(brick)
    expect(hsl(toon).s).toBeGreaterThan(hsl(brick).s)
    expect(hsl(toon).l).toBeGreaterThan(hsl(brick).l)
    expect(hsl(toon).h).toBeCloseTo(hsl(brick).h, 3)
  })

  it('keeps greys grey', () => {
    expect(hsl(cheerful(new THREE.Color('#808080'))).s).toBe(0)
  })
})
