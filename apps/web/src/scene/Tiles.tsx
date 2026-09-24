import { TilesAttributionOverlay, TilesPlugin, TilesRenderer } from '3d-tiles-renderer/r3f'
import { GoogleCloudAuthPlugin, ReorientationPlugin } from '3d-tiles-renderer/plugins'
import type { TilesRenderer as TilesRendererImpl } from '3d-tiles-renderer/three'
import { FENCE, fenceDistance } from '@quad/shared'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { night } from '../campus/facade'
import { fenceGlsl, fenceMapUniforms } from '../campus/fenceShader'
import { groundHeight } from '../campus/terrain'
import { REORIENT, STRETCH } from '../campus/tilesFrame'
import { TILES_KEY, useSettings } from '../settings'

// a little below our ground, so where the two overlap at the fence theirs stays under
// ours instead of flickering through it
const SINK = 0.15

const DAY = new THREE.Color('#ffffff')
const NIGHT = new THREE.Color('#1c2433')
// every tile's material, to darken them at night. they're photos with the daylight
// baked in, our lights do nothing to them
const materials = new Set<THREE.MeshBasicMaterial>()

// plugin settings. these have to stay the same objects: TilesPlugin makes a new plugin
// whenever its args change, and a new google plugin starts a new session halfway through
const AUTH = [{ apiToken: TILES_KEY ?? '', autoRefreshToken: true, useRecommendedSettings: false }]
const FRAME = [REORIENT]

const fenceOn = { value: 1 }

// inside the fence it's our own buildings and streets (see packages/shared/src/fence.ts),
// so the tiles throw away everything there. in the strip just past it (the far sidewalk)
// they keep their ground and buildings but not their trees, cars and lamp posts
function fenced(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fenceMapUniforms(), { uFenceOn: fenceOn })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTileWorld;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvTileWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTileWorld;
        uniform float uFenceOn;
        ${fenceGlsl}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float fd = fenceDistance(vTileWorld.xz);
        bool clutter = fd > -FENCE_BAND && vTileWorld.y > 0.4 && !onBuilding(vTileWorld.xz);
        if (uFenceOn > 0.5 && (fd > 0.0 || clutter)) discard;`,
      )
  }
  material.customProgramCacheKey = () => 'tile-fence'
}

// tile pieces that are all the way inside the fence. every bit of them would get thrown
// away, so they aren't drawn at all (unless the debug box says tiles inside the fence)
const insideMeshes = new Set<THREE.Mesh>()
const allInside = (x0: number, z0: number, x1: number, z1: number) =>
  [x0, x1].every((x) => [z0, z1].every((z) => fenceDistance(x, z) > 1)) &&
  !FENCE.some(([x, z]) => x > x0 && x < x1 && z > z0 && z < z1)

// the bits of a tile we need from its bounding box. it's an oriented box in the tileset's
// own frame, points are its 8 corners
type Tile = { engineData?: { boundingVolume?: { obb?: { points: THREE.Vector3[] } | null } } }
const corner = new THREE.Vector3()

// tiles whose box is all the way inside the fence would only get thrown away (see fenced),
// so they're never asked for at all. you're always inside the fence, so near you that's
// most of what used to get downloaded
class SkipInsidePlugin {
  tiles: TilesRendererImpl | null = null
  // tiles and the fence don't move, so the answer never changes
  inside = new WeakMap<object, boolean>()

  init(tiles: TilesRendererImpl) {
    this.tiles = tiles
  }

  isInside(tile: Tile) {
    const points = tile.engineData?.boundingVolume?.obb?.points
    if (!points) return false
    const group = this.tiles!.group
    group.updateWorldMatrix(true, false)
    const m = group.matrixWorld
    let [x0, z0, x1, z1] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const p of points) {
      corner.copy(p).applyMatrix4(m)
      if (fenceDistance(corner.x, corner.z) < 1) return false
      x0 = Math.min(x0, corner.x)
      z0 = Math.min(z0, corner.z)
      x1 = Math.max(x1, corner.x)
      z1 = Math.max(z1, corner.z)
    }
    // all the corners inside can still have a corner of the fence poking into it
    return !FENCE.some(([x, z]) => x > x0 && x < x1 && z > z0 && z < z1)
  }

  // returning true with inView false keeps it from loading, false means "no opinion"
  calculateTileViewError(tile: Tile, target: { inView: boolean }) {
    if (fenceOn.value < 0.5) return false
    let inside = this.inside.get(tile)
    if (inside === undefined) {
      inside = this.isInside(tile)
      this.inside.set(tile, inside)
    }
    if (!inside) return false
    target.inView = false
    return true
  }
}

// for shadows, or the tile buildings inside the fence would still cast them
const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
fenced(depthMaterial)

// for window.quad (net/debug.ts)
let renderer: TilesRendererImpl | null = null
const ray = new THREE.Raycaster()
const down = new THREE.Vector3(0, -1, 0)

// TilesRenderer.stats and lruCache.cachedBytes are in the docs but not in its types
type Stats = Record<'visible' | 'loaded' | 'failed' | 'queued' | 'downloading' | 'parsing', number>
type Cache = { cachedBytes: number }

// null without a key. settled = nothing left to download
export function tilesStats() {
  if (!TILES_KEY) return null
  const stats = (renderer as unknown as { stats: Stats } | null)?.stats
  if (!stats) return { visible: 0, loaded: 0, failed: 0, settled: false, mb: 0 }
  const { visible, loaded, failed, queued, downloading, parsing } = stats
  // what the tiles it's holding on to take up
  const mb = Math.round((renderer!.lruCache as unknown as Cache).cachedBytes / 1e6)
  return { visible, loaded, failed, settled: queued + downloading + parsing === 0, mb }
}

// height of the tiles at a spot, ground or roof. only the loaded ones count
export function tileHeightAt(x: number, z: number) {
  if (!renderer) return null
  ray.set(new THREE.Vector3(x, 300, z), down)
  return ray.intersectObject(renderer.group, true)[0]?.point.y ?? null
}

const floats = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * 3)
  for (let i = 0; i < a.count; i++) out.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3)
  return new THREE.BufferAttribute(out, 3)
}

const toWorld = new THREE.Matrix4()
const toLocal = new THREE.Matrix4()
const p = new THREE.Vector3()

// the game is flat but downtown isn't, so every tile gets flattened as it loads: each
// point goes down by how much higher the real ground is there than at hurt park. the
// streets end up at y = 0 like ours and the buildings keep their shape
class FlattenPlugin {
  tiles: TilesRendererImpl | null = null

  init(tiles: TilesRendererImpl) {
    this.tiles = tiles
  }

  processTileModel(scene: THREE.Object3D) {
    const group = this.tiles!.group
    group.updateWorldMatrix(true, false)
    // the tile isn't in the group yet, so this is its transform inside the group
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      toWorld.multiplyMatrices(group.matrixWorld, mesh.matrixWorld)
      toLocal.copy(toWorld).invert()
      let pos = mesh.geometry.getAttribute('position')
      // google's are plain floats so far. quantized ones couldn't move far enough
      if (!(pos.array instanceof Float32Array)) {
        pos = floats(pos)
        mesh.geometry.setAttribute('position', pos)
      }
      let x0 = Infinity
      let z0 = Infinity
      let x1 = -Infinity
      let z1 = -Infinity
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(toWorld)
        p.y -= groundHeight(p.x, p.z)
        x0 = Math.min(x0, p.x)
        z0 = Math.min(z0, p.z)
        x1 = Math.max(x1, p.x)
        z1 = Math.max(z1, p.z)
        p.applyMatrix4(toLocal)
        pos.setXYZ(i, p.x, p.y, p.z)
      }
      if (allInside(x0, z0, x1, z1)) {
        insideMeshes.add(mesh)
        mesh.visible = fenceOn.value < 0.5
      }
      pos.needsUpdate = true
      mesh.geometry.computeBoundingBox()
      mesh.geometry.computeBoundingSphere()
      mesh.castShadow = true
      mesh.customDepthMaterial = depthMaterial
      fenced(mesh.material as THREE.Material)
      materials.add(mesh.material as THREE.MeshBasicMaterial)
    })
  }
}

function Tint() {
  useFrame(() => {
    const k = 1 - night.value * 0.92
    for (const m of materials) m.color.copy(NIGHT).lerp(DAY, k)
    const on = useSettings.getState().tilesInside ? 0 : 1
    if (on !== fenceOn.value) {
      fenceOn.value = on
      for (const m of insideMeshes) m.visible = !on
    }
  })
  return null
}

export default function Tiles() {
  const quality = useSettings((s) => s.quality)
  if (!TILES_KEY) return null
  return (
    // our map is a little squeezed compared to real meters (campus/tilesFrame.ts)
    <group scale={[STRETCH.x, 1, STRETCH.z]} position-y={-SINK}>
      <TilesRenderer
        // screen-space error in pixels: lower is sharper. up close a tile covers lots of
        // pixels so it gets the detailed version, far away the falloff lets it stay coarse
        errorTarget={quality === 'high' ? 6 : 12}
        errorFalloff={quality === 'high' ? 10 : 20}
        errorFalloffDensity={2e-3}
        // keeps up to 430mb of tiles by default, 300 here. a whole view would want over 1gb,
        // so it's always full and the far side of downtown is as sharp as what's left over
        // allows. much less than that and it gets stuck: at 200mb a busy view never loaded
        // past one blurry tile. low quality needs about as much, it's the same cap
        lruCache-minBytesSize={200e6}
        lruCache-maxBytesSize={300e6}
        onDisposeModel={({ scene }: { scene: THREE.Object3D }) => {
          scene.traverse((o) => {
            materials.delete((o as THREE.Mesh).material as THREE.MeshBasicMaterial)
            insideMeshes.delete(o as THREE.Mesh)
          })
        }}
        onLoadError={({ tile }: { tile: unknown }) => {
          // no root tileset means no tiles at all (bad key, no network): back to our own
          if (!tile) useSettings.setState({ tiles: false, extruded: true })
        }}
        ref={(t: TilesRendererImpl | null) => {
          renderer = t
        }}
      >
        <TilesPlugin plugin={GoogleCloudAuthPlugin} args={AUTH} />
        <TilesPlugin plugin={ReorientationPlugin} args={FRAME} />
        <TilesPlugin plugin={FlattenPlugin} />
        <TilesPlugin plugin={SkipInsidePlugin} />
        {/* google's terms: the data credits for whatever tiles are on screen */}
        <TilesAttributionOverlay
          // same look as the osm credit, bottom left under the chat box
          style={{
            left: 16,
            bottom: 5,
            padding: 0,
            fontSize: 11,
            textShadow: '0 1px 2px rgb(0 0 0 / 0.5)',
          }}
        />
        <Tint />
      </TilesRenderer>
    </group>
  )
}
