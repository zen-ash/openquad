import { readdirSync, readFileSync } from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  texture,
  textureAverage,
  textureList,
  textureUrl,
  type MapKind,
  type TextureName,
} from './textures'

const pub = new URL('../../public/', import.meta.url)
const files = Object.entries(textureList).flatMap(([name, t]) =>
  t.maps.map((kind) => [name as TextureName, kind as MapKind] as const),
)

describe('textures', () => {
  it('has a ktx2 file for every map in the list and nothing else', () => {
    const wanted = files.map(([name, kind]) => textureUrl(name, kind).split('/').pop())
    expect(readdirSync(new URL('textures/', pub)).sort()).toEqual(wanted.sort())
  })

  // basisu writes the mipmaps, nothing makes them later. etc1s is basis lz (scheme 1)
  it.each(files)('%s %s is square etc1s with all its mipmaps', (name, kind) => {
    const file = readFileSync(new URL(`textures/${name}_${kind}.ktx2`, pub))
    expect(file.subarray(1, 7).toString()).toBe('KTX 20')
    const header = (at: number) => file.readUInt32LE(at)
    const size = textureList[name].size ?? 512
    expect([header(20), header(24)]).toEqual([size, size])
    expect(header(40)).toBe(Math.log2(size) + 1)
    expect(header(44)).toBe(1)
  })

  it('knows the average of every color and arm map', () => {
    for (const [name, kind] of files) {
      if (kind !== 'color' && kind !== 'arm') continue
      const average = textureAverage[name]?.[kind]
      expect(average, `${name} ${kind}`).toHaveLength(kind === 'color' ? 3 : 2)
      for (const v of average!) expect(v).toBeGreaterThan(0)
    }
  })

  it('serves the transcoder from the same three version', () => {
    const three = new URL('../../node_modules/three/examples/jsm/libs/basis/', import.meta.url)
    for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm'])
      expect(readFileSync(new URL(`basis/${f}`, pub)).equals(readFileSync(new URL(f, three)))).toBe(
        true,
      )
  })

  it('gives everyone the same texture for the same file', () => {
    expect(texture('brick', 'color')).toBe(texture('brick', 'color'))
    expect(texture('brick', 'color')).not.toBe(texture('brick', 'normal'))
  })

  it('only decodes color maps from srgb', () => {
    expect(texture('precast', 'color').colorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture('precast', 'normal').colorSpace).toBe(THREE.NoColorSpace)
    expect(texture('precast', 'arm').colorSpace).toBe(THREE.NoColorSpace)
    expect(texture('marble', 'mask').colorSpace).toBe(THREE.NoColorSpace)
  })

  it("won't make a texture that isn't in the list", () => {
    expect(() => texture('asphalt', 'arm')).toThrow()
  })
})
