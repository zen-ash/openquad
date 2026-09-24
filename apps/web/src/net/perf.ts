import type { WebGPURenderer } from 'three/webgpu'
import { tilesStats } from '../scene/Tiles'

// what went on in each frame, for scripts/walk.mjs: how long it took and how many shaders
// were built, pipelines made and textures/buffers uploaded in it (the usual causes of a
// hitch the first time something comes into view). ?debug only

const count = {
  builds: 0,
  buildMs: 0,
  pipelines: 0,
  pipelineMs: 0,
  textures: 0,
  textureMs: 0,
  bufferKb: 0,
}
// what got a new shader, so a hitch can be traced to the thing that came into view
const built: string[] = []

type Fn = (...args: unknown[]) => unknown
function time(
  obj: object,
  name: string,
  after: (ms: number, args: unknown[], out: unknown) => void,
) {
  const target = obj as Record<string, Fn>
  const fn = target[name]
  if (!fn) return
  target[name] = function (this: unknown, ...args: unknown[]) {
    const start = performance.now()
    const out = fn.apply(this, args)
    after(performance.now() - start, args, out)
    return out
  }
}

export function instrument(renderer: WebGPURenderer) {
  const backend = renderer.backend as unknown as object
  time(backend, 'createNodeBuilder', (_ms, [object], builder) => {
    // post processing passes build shaders without an object
    const o = object as {
      name?: string
      type?: string
      material?: { name?: string; type?: string }
    } | null
    const label = o ? `${o.material?.name || o.material?.type}:${o.name || o.type}` : 'pass'
    for (const name of ['build', 'buildAsync'])
      time(builder as object, name, (ms) => {
        count.builds++
        count.buildMs += ms
        built.push(label)
      })
  })
  for (const name of ['createRenderPipeline', 'createComputePipeline'])
    time(backend, name, (ms) => {
      count.pipelines++
      count.pipelineMs += ms
    })
  for (const name of ['createTexture', 'updateTexture', 'generateMipmaps'])
    time(backend, name, (ms) => {
      count.textures++
      count.textureMs += ms
    })
  for (const name of ['createAttribute', 'createIndexAttribute', 'updateAttribute'])
    time(backend, name, (_ms, [attribute]) => {
      count.bufferKb += ((attribute as { array?: ArrayBufferView }).array?.byteLength ?? 0) / 1024
    })
}

type Loaf = { start: number; ms: number; blocking: number; scripts: string[] }

let frames: number[][] | null = null
let loafs: Loaf[] = []
let names: string[][] = []
let observer: PerformanceObserver | null = null

// one row per frame: time, frame ms, then the counts above for that frame, tiles loaded
// and the js heap in mb (a drop is a garbage collection)
export function startRecording() {
  for (const k of Object.keys(count) as (keyof typeof count)[]) count[k] = 0
  built.length = 0
  frames = []
  loafs = []
  names = []
  let last = performance.now()
  let tiles = tilesStats()?.loaded ?? 0
  const tick = (now: number) => {
    const rows = frames
    if (!rows) return
    const loaded = tilesStats()?.loaded ?? 0
    const heap = (performance as { memory?: { usedJSHeapSize: number } }).memory
    rows.push([
      now,
      now - last,
      count.builds,
      count.buildMs,
      count.pipelines,
      count.pipelineMs,
      count.textures,
      count.textureMs,
      count.bufferKb,
      loaded - tiles,
      (heap?.usedJSHeapSize ?? 0) / 1048576,
    ])
    names.push(built.splice(0))
    for (const k of Object.keys(count) as (keyof typeof count)[]) count[k] = 0
    last = now
    tiles = loaded
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  // chrome's long animation frames say which scripts the time went to
  observer = new PerformanceObserver((list) => {
    for (const e of list.getEntries() as (PerformanceEntry & {
      blockingDuration: number
      scripts: {
        sourceURL: string
        sourceFunctionName: string
        invoker: string
        duration: number
      }[]
    })[])
      loafs.push({
        start: e.startTime,
        ms: e.duration,
        blocking: e.blockingDuration,
        scripts: e.scripts.map(
          (s) =>
            `${Math.round(s.duration)}ms ${s.invoker} ${s.sourceFunctionName} ${s.sourceURL.split('/').pop()}`,
        ),
      })
  })
  observer.observe({ type: 'long-animation-frame', buffered: false })
}

export function stopRecording() {
  observer?.disconnect()
  const out = { frames, names, loafs }
  frames = null
  return out
}
