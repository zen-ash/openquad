import { useProgress } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import type { Object3D } from 'three'
import { AVATARS } from '../game/avatars'
import { hideCity, useSettings } from '../settings'
import Character from './Character'
import Furniture, { sampleRooms } from './Furniture'
import { effects } from './fx'

// three builds a shader (and the gpu a pipeline) the first time something is drawn. that
// took 50-200ms every time something new came into view while walking around (pnpm walk).
// so while the join screen is up this draws everything once, with nothing left out for
// being off screen, in each state that needs its own shaders: high quality, then low (so
// dropping to it later doesn't rebuild anything), and back. plus every avatar and a
// furnished room, under the ground. join waits for it

// frames per step: the first one builds, the others catch anything that showed up late
const FRAMES = 3
// seconds, don't wait forever on a download that never finishes
const MAX_WAIT = 20

type Step = 'loading' | 'high' | 'low' | 'back'

export default function WarmUp() {
  const warming = useSettings((s) => s.warming)
  return (
    <>
      {warming && <Warming />}
      {/* drawn while warming, then kept but hidden: three throws a shader away once
          nothing uses it, and furniture and other people's avatars come and go */}
      {!hideCity && (
        <group position={[0, -50, 0]} visible={warming}>
          {AVATARS.map((a) => (
            <Suspense key={a.id} fallback={null}>
              <Character avatar={a} anim="Idle" />
            </Suspense>
          ))}
          {sampleRooms().map((room) => (
            <Furniture key={room} fixed={room} />
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

  useFrame(({ scene, clock }) => {
    started.current ||= clock.elapsedTime
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
    const next = (to: Step | 'done') => {
      frames.current = 0
      if (to === 'done') {
        for (const o of culled.current) o.frustumCulled = true
        useSettings.setState({ warming: false })
        return
      }
      step.current = to
      if (to === 'low') useSettings.setState({ quality: 'low' })
      if (to === 'back') useSettings.setState({ quality: 'high' })
    }

    if (step.current === 'loading') {
      // everything downloaded (models, textures, the labels' font) for a moment, and the
      // effects drawing (they're loaded separately)
      const loaded =
        !busy.current && document.fonts.status === 'loaded' && (!atmosphere || effects.drawn)
      if (!loaded && clock.elapsedTime - started.current < MAX_WAIT) frames.current = 0
      else if (frames.current > 5) next(atmosphere ? 'high' : 'low')
    } else if (frames.current > FRAMES) {
      if (step.current === 'high') next('low')
      else if (step.current === 'low') next(atmosphere ? 'back' : 'done')
      else next('done')
    }
  })

  return null
}
