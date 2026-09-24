import { voiceVolume, VOICE_MAX_DISTANCE, VOICE_MIN_DISTANCE } from '@quad/shared'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { wallBetween } from '../game/interiors'
import { INTERP_DELAY, sample } from '../game/interpolation'
import { localPlayer } from '../game/localPlayer'
import { snapshots, useGame } from '../net/store'
import { audioContext, levelOf, OPEN_AIR, setListener, THROUGH_WALL } from './audio'
import { planCalls, shouldCall, type Nearby } from './peers'
import { useVoice } from './store'
import { call, hangUp, micAnalyser, peers } from './voice'

const PLAN_EVERY = 0.5 // seconds
const SPEAKING_LEVEL = 0.01
const SPEAKING_HOLD = 300 // ms, so the indicator doesn't flicker between words
// anything above background hiss
const SOUND_LEVEL = 0.002

const lastLoud = new Map<string, number>()
// last time any sound at all came from each person. the e2e tests use this
export const lastSound = new Map<string, number>()

// lives inside the canvas so it can run every frame, doesn't render anything
export default function VoiceUpdater() {
  const planTimer = useRef(0)

  useFrame((_, delta) => {
    const me = useGame.getState().me
    if (!me) return
    const now = performance.now()
    const ac = audioContext()

    // camera looks at the player from behind, so "forward" is away from the camera
    const yaw = localPlayer.cameraYaw
    setListener(localPlayer.x, localPlayer.z, -Math.sin(yaw), -Math.cos(yaw))

    const nearby: Nearby[] = []
    for (const [id, buffer] of snapshots) {
      const s = sample(buffer, now - INTERP_DELAY)
      if (!s) continue
      const dist = Math.hypot(s.x - localPlayer.x, s.z - localPlayer.z)
      if (shouldCall(me.id, id)) nearby.push({ id, dist })

      const audio = peers.get(id)?.audio
      if (audio) {
        audio.panner.positionX.value = s.x
        audio.panner.positionZ.value = s.z
        const wall = wallBetween(localPlayer, s)
        const volume = voiceVolume(dist, VOICE_MIN_DISTANCE, VOICE_MAX_DISTANCE) * (wall ? 0.5 : 1)
        audio.gain.gain.setTargetAtTime(volume, ac.currentTime, 0.1)
        audio.filter.frequency.setTargetAtTime(wall ? THROUGH_WALL : OPEN_AIR, ac.currentTime, 0.1)
      }
    }

    planTimer.current += delta
    if (planTimer.current >= PLAN_EVERY && useVoice.getState().mic !== 'pending') {
      planTimer.current = 0
      const mine = new Set([...peers.keys()].filter((id) => shouldCall(me.id, id)))
      const plan = planCalls(nearby, mine)
      plan.call.forEach(call)
      plan.hangUp.forEach(hangUp)
    }

    updateSpeaking(me.id, now)
  })

  return null
}

function updateSpeaking(myId: string, now: number) {
  const levels: [string, number][] = []
  const { muted } = useVoice.getState()
  if (micAnalyser && !muted) levels.push([myId, levelOf(micAnalyser)])
  for (const [id, peer] of peers) {
    if (peer.audio) levels.push([id, levelOf(peer.audio.analyser)])
  }

  const speaking: Record<string, boolean> = {}
  for (const [id, level] of levels) {
    if (level > SOUND_LEVEL) lastSound.set(id, now)
    if (level > SPEAKING_LEVEL) lastLoud.set(id, now)
    speaking[id] = now - (lastLoud.get(id) ?? 0) < SPEAKING_HOLD
  }

  // only touch the store when something changed, otherwise every name tag re-renders
  const prev = useVoice.getState().speaking
  const keys = new Set([...Object.keys(prev), ...Object.keys(speaking)])
  const changed = [...keys].some((k) => (prev[k] ?? false) !== (speaking[k] ?? false))
  if (changed) useVoice.setState({ speaking })
}
