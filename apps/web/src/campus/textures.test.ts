import { readdirSync, readFileSync } from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { texture, textureList, textureUrl, type MapKind, type TextureName } from './textures'

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
  it.each(files)('%s %s is 512 square etc1s with all its mipmaps', (name, kind) => {
    const file = readFileSync(new URL(`textures/${name}_${kind}.ktx2`, pub))
    expect(file.subarray(1, 7).toString()).toBe('KTX 20')
    const header = (at: number) => file.readUInt32LE(at)
    expect([header(20), header(24)]).toEqual([512, 512])
    expect(header(40)).toBe(10)
    expect(header(44)).toBe(1)
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
  })

  it("won't make a texture that isn't in the list", () => {
    expect(() => texture('asphalt', 'arm')).toThrow()
  })
})
