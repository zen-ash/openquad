import * as THREE from 'three'
import { dot, materialReference, max, normalMap, sqrt, vec2, vec3 } from 'three/tsl'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import type { Node, WebGPURenderer } from 'three/webgpu'
import list from './textures.json'

// the textures from poly haven (CC0), as ktx2 files that stay compressed on the gpu. made by
// `pnpm textures` from textures.json, see docs/materials.md

export type TextureName = keyof typeof list
export type MapKind = 'color' | 'normal' | 'arm'

export const textureList: Record<TextureName, { meters: number; maps: string[] }> = list

export const textureUrl = (name: TextureName, kind: MapKind) => `/textures/${name}_${kind}.ktx2`

const textures = new Map<string, THREE.CompressedTexture>()
let loader: KTX2Loader | null = null

/**
 * One texture per file, shared by everything that uses it, so never change its repeat or
 * offset (scale the uvs instead). The materials are all made when the page loads, before
 * there's a renderer to ask which compressed formats the gpu has, so this is an empty
 * texture that gets filled in once loadTextures() has run
 */
export function texture(name: TextureName, kind: MapKind) {
  const url = textureUrl(name, kind)
  let tex = textures.get(url)
  if (tex) return tex
  if (!textureList[name]?.maps.includes(kind)) throw new Error(`no texture ${url}`)
  tex = new THREE.CompressedTexture([], 1, 1)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 8
  // normal and arm hold numbers, not colors
  if (kind === 'color') tex.colorSpace = THREE.SRGBColorSpace
  textures.set(url, tex)
  if (loader) load(url, tex)
  return tex
}

// once the renderer is ready (App.tsx)
export function loadTextures(renderer: WebGPURenderer) {
  loader = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer)
  for (const [url, tex] of textures) load(url, tex)
}

function load(url: string, tex: THREE.CompressedTexture) {
  // the loading manager only counts the download. this keeps it busy until the texture is
  // ready too, so the warm-up (WarmUp.tsx) waits for it
  const manager = THREE.DefaultLoadingManager
  manager.itemStart(`${url}#ready`)
  loader!.load(
    url,
    (loaded) => {
      tex.image = loaded.image
      tex.mipmaps = loaded.mipmaps
      tex.format = loaded.format
      tex.type = loaded.type
      tex.needsUpdate = true
      manager.itemEnd(`${url}#ready`)
    },
    undefined,
    (e) => {
      console.error(`couldn't load ${url}`, e)
      manager.itemError(`${url}#ready`)
      manager.itemEnd(`${url}#ready`)
    },
  )
}

// normal maps are stored as x in rgb and y in alpha (etc1s keeps those apart, see
// scripts/textures.mjs), z is whatever makes it length 1. packed back to 0-1 like a normal
// map, for normalMap()
export function unpackNormal(sample: Node<'vec4'>) {
  const xy = vec2(sample.r, sample.a).mul(2).sub(1)
  const z = sqrt(max(0, dot(xy, xy).oneMinus()))
  return vec3(xy, z).mul(0.5).add(0.5)
}

// the normal for a material with a normalMap from here. one node for every such material,
// so the ones that are the same apart from their textures still share a shader
export const packedNormalMap = normalMap(
  unpackNormal(materialReference('normalMap', 'texture') as unknown as Node<'vec4'>),
)
