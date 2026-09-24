import { useGLTF, useProgress } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { Object3D } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { AVATARS, type Avatar as AvatarInfo } from '../game/avatars'
import { hideCity, useSettings } from '../settings'
import { modelUrl } from './Character'
import { effects } from './fx'

// three builds a shader (and the gpu a pipeline) the first time something is drawn. that
// took 50-200ms every time something new came into view while walking around (pnpm walk).
// so while the join screen is up this draws everything once, with nothing left out for
// being off screen, in each state that needs its own shaders: high quality, then low (so
// dropping to it later doesn't rebuild anything), and back. plus every avatar, under the
// ground, and some furnished rooms (Furniture.tsx). join waits for it

// frames per step: the first one builds, the others catch anything that showed up late
const FRAMES = 3
// seconds, don't wait forever on a download that never finishes
const MAX_WAIT = 20

type Step = 'loading' | 'high' | 'low' | 'back' | 'last'

// three's pipeline cache (renderer._pipelines). while warming it asks the gpu for them
// without waiting (createRenderPipelineAsync), so the gpu process compiles them all at once
// on its own threads. one at a time, as they came up, took almost two minutes on a mac with
// nothing in its shader cache yet (a first visit). whatever isn't ready yet just isn't drawn
type Pipelines = {
  updateForRender(object: unknown): void
  getForRender(object: unknown, promises: Promise<unknown>[]): void
}
export default function WarmUp() {
  const warming = useSettings((s) => s.warming)
  return (
    <>
      {warming && <Warming />}
      {/* drawn while warming, then kept but hidden: three throws a shader away once
          nothing uses it, and other people's avatars come and go */}
      {!hideCity && (
        // and left out of the world matrix updates once it's hidden (all those bones)
        <group position={[0, -50, 0]} visible={warming} matrixWorldAutoUpdate={warming}>
          {AVATARS.map((a) => (
            <Suspense key={a.id} fallback={null}>
              <Avatar avatar={a} />
            </Suspense>
          ))}
        </group>
      )}
    </>
  )
}

function Warming() {
  const { active } = useProgress()
  const busy = useRef(true)
  useEffect(() => {
    busy.current = active
  }, [active])
  const step = useRef<Step>('loading')
  const frames = useRef(0)
  const started = useRef(0)
  const culled = useRef<Object3D[]>([])
  const pending = useRef<Promise<unknown>[]>([])
  // pipelines asked for and done, for the join button. counted as they're asked for and
  // shown on a timer: while the gpu is busy compiling, frames hardly come at all
  const count = useRef({ asked: 0, done: 0 })
  // how many of the counted ones were already taken out of pending
  const counted = useRef(0)
  const countNew = () => {
    for (const p of pending.current.slice(count.current.asked - counted.current)) {
      count.current.asked++
      void p.finally(() => count.current.done++)
    }
  }
  useEffect(() => {
    let shown = ''
    const timer = setInterval(() => {
      countNew()
      const { asked, done } = count.current
      if (`${done}/${asked}` === shown) return
      shown = `${done}/${asked}`
      useSettings.setState({ built: [done, asked] })
    }, 250)
    return () => clearInterval(timer)
  }, [])
  const waiting = useRef(false)
  const plain = useRef<{ pipelines: Pipelines; update: Pipelines['updateForRender'] } | null>(null)
  // back to the normal way if this goes away halfway
  useEffect(
    () => () => {
      if (plain.current) plain.current.pipelines.updateForRender = plain.current.update
    },
    [],
  )

  useFrame(({ scene, clock, gl }) => {
    started.current ||= clock.elapsedTime
    countNew()
    // the gpu is still compiling the last step's pipelines, the frames keep going
    if (waiting.current) return
    // nothing is left out for being off screen while it builds
    if (step.current !== 'loading')
      scene.traverse((o) => {
        if (o.frustumCulled) {
          o.frustumCulled = false
          culled.current.push(o)
        }
      })
    frames.current++
    const atmosphere = useSettings.getState().atmosphere
    const pipelines = (gl as unknown as { _pipelines: Pipelines })._pipelines
    const next = (to: Step | 'done') => {
      frames.current = 0
      if (to === 'done') {
        for (const o of culled.current) o.frustumCulled = true
        useSettings.setState({ warming: false })
        return
      }
      // the last frames are drawn the normal way, anything missing gets made there
      if (to === 'last' && plain.current) {
        pipelines.updateForRender = plain.current.update
        plain.current = null
      }
      step.current = to
      if (to === 'low') useSettings.setState({ quality: 'low' })
      if (to === 'back') useSettings.setState({ quality: 'high' })
    }
    // on to the next step once every pipeline asked for so far is made
    const settle = (to: Step) => {
      waiting.current = true
      const asked = pending.current.splice(0)
      counted.current += asked.length
      void Promise.allSettled(asked).then(() => {
        waiting.current = false
        next(to)
      })
    }

    if (step.current === 'loading') {
      // from the first frame, or what's on screen while loading gets made one at a time
      if (!plain.current) {
        plain.current = { pipelines, update: pipelines.updateForRender }
        pipelines.updateForRender = (object) => pipelines.getForRender(object, pending.current)
      }
      // everything downloaded (models, textures, the labels' font) for a moment, and the
      // effects drawing (they're loaded separately)
      const loaded =
        !busy.current && document.fonts.status === 'loaded' && (!atmosphere || effects.drawn)
      if (!loaded && clock.elapsedTime - started.current < MAX_WAIT) frames.current = 0
      else if (frames.current > 5) next(atmosphere ? 'high' : 'low')
    } else if (frames.current > FRAMES) {
      if (step.current === 'high') settle('low')
      else if (step.current === 'low') settle(atmosphere ? 'back' : 'last')
      else if (step.current === 'back') settle('last')
      else next('done')
    }
  })

  return null
}

// just the model, standing still: it only has to be drawn once, shadow and all
function Avatar({ avatar }: { avatar: AvatarInfo }) {
  const { scene } = useGLTF(modelUrl(avatar))
  const model = useMemo(() => {
    const copy = clone(scene)
    copy.traverse((o) => (o.castShadow = true))
    return copy
  }, [scene])
  return <primitive object={model} />
}
