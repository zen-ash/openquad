import type { Camera, LightShadow, Material, Object3D, Scene } from 'three'
import { CSMShadowNode } from 'three/examples/jsm/csm/CSMShadowNode.js'
import {
  float,
  Fn,
  If,
  interleavedGradientNoise,
  ivec2,
  Loop,
  max,
  int,
  reference,
  screenCoordinate,
  select,
  texture,
  vogelDiskSample,
} from 'three/tsl'
import type { Node, NodeBuilder, Texture, WebGPURenderer } from 'three/webgpu'

// the sun is half a degree across, so a shadow's edge gets softer the further the ground is
// from what's casting it: about 9mm per meter. a bench leg's shadow is sharp, the end of
// a tower's is soft (percentage closer soft shadows)
const SUN = 2 * Math.tan(((0.53 / 2) * Math.PI) / 180)
// how far behind the ground (along the light) blockers are looked for. the tallest things
// around are ~80m, and further than that the penumbra is too wide to matter
const REACH = 100
// taps for finding blockers and for the soft edge. rotated per pixel, taa smooths them out
const SEARCH = 12
const TAPS = 16

type Args = {
  depthTexture: Texture & { isArrayTexture?: boolean }
  shadowCoord: Node<'vec3'>
  shadow: LightShadow
  depthLayer: Node<'int'>
}

export const pcss = Fn(({ depthTexture, shadowCoord, shadow, depthLayer }: Args) => {
  // a texture read as a plain node (the typings don't know what a depth texture gives back)
  const read = (t: ReturnType<typeof texture>) =>
    (depthTexture.isArrayTexture ? t.depth(depthLayer) : t) as unknown as Node<'vec4'>
  const size = reference('mapSize', 'vec2', shadow) as unknown as Node<'vec2'>
  const camera = (key: string) =>
    reference(`camera.${key}`, 'float', shadow) as unknown as Node<'float'>
  // this cascade's size in meters: across the map, and from its near plane to its far one
  const width = camera('right').sub(camera('left'))
  const depthRange = camera('far').sub(camera('near'))
  const receiver = shadowCoord.z
  const phi = interleavedGradientNoise(screenCoordinate.xy).mul(Math.PI * 2)
  // the plain one-tap shadow. it has to come first: three picks the texture's sampler
  // from the first read, and the compares below need a comparing one
  const center = read(texture(depthTexture, shadowCoord.xy).compare(receiver)).x.toVar()

  // how far away the things in the way are, on average. raw depths (load, no compare)
  const search = float(REACH * SUN).div(width)
  const blockers = float(0).toVar()
  const found = float(0).toVar()
  Loop(SEARCH, ({ i }) => {
    const at = shadowCoord.xy.add(vogelDiskSample(i, int(SEARCH), phi).mul(search))
    const depth = read(texture(depthTexture).load(ivec2(at.mul(size)))).x
    If(depth.lessThan(receiver), () => {
      blockers.addAssign(depth)
      found.addAssign(1)
    })
  })

  // the edge is as wide as the sun makes it at that distance, and at least a couple of texels
  const between = receiver.sub(blockers.div(max(found, 1))).mul(depthRange)
  const texel = float(1).div(size.x)
  const radius = max(between.mul(SUN).div(width), texel.mul(1.5))
  const lit = float(0).toVar()
  Loop(TAPS, ({ i }) => {
    const at = shadowCoord.xy.add(vogelDiskSample(i, int(TAPS), phi).mul(radius))
    lit.addAssign(read(texture(depthTexture, at).compare(receiver)).x)
  })
  // nothing in the way at all: no soft edge to work out
  return select(found.equal(0), center, lit.div(TAPS))
})

// cascaded shadows for the sun, soft edges in the nearest cascade (the first ~70m, where
// you can see them). three works out every cascade's shadow for every pixel and picks one
// afterwards, so soft edges in all three cost 3.5ms. further out plain filtering is fine,
// a penumbra there is about a pixel wide anyway
export class SoftCascades extends CSMShadowNode {
  _init(builder: NodeBuilder) {
    ;(CSMShadowNode.prototype as unknown as { _init(b: NodeBuilder): void })._init.call(
      this,
      builder,
    )
    ;(this.lights[0]!.shadow as LightShadow & { filterNode?: unknown }).filterNode = pcss
  }
}

type Draw = (object: Object3D, scene: Scene, camera: Camera, ...rest: unknown[]) => void

// three draws every caster into a shadow map with one shared material, and copies the
// caster's alphaTest onto it first. going from one with an alpha test (leaves, hair) to one
// without bumps that material's version, and then every shadow draw after it worked out its
// whole cache key again to see if it needed a new shader. it never does (no caster's
// alphaTest ever changes), and it was 1.5ms of cpu a frame at library north. so the shadow
// materials keep the value without the version bump
function keepVersion(material: Material) {
  let value = material.alphaTest
  Object.defineProperty(material, 'alphaTest', {
    get: () => value,
    set: (v: number) => (value = v),
  })
}

// once, when the renderer starts on high (Atmosphere.tsx)
export function lighterShadowPasses(renderer: WebGPURenderer) {
  const r = renderer as unknown as { renderObject: Draw }
  const draw = r.renderObject.bind(renderer)
  const kept = new WeakSet<Material>()
  r.renderObject = (object, scene, camera, ...rest) => {
    const shadow = scene.overrideMaterial as (Material & { isShadowPassMaterial?: true }) | null
    if (shadow?.isShadowPassMaterial && !kept.has(shadow)) {
      kept.add(shadow)
      keepVersion(shadow)
    }
    draw(object, scene, camera, ...rest)
  }
}
