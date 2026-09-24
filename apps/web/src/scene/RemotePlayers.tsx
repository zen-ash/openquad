import { VOICE_MAX_DISTANCE } from '@quad/shared'
import { Billboard, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { INTERP_DELAY, sample } from '../game/interpolation'
import { avatarById } from '../game/avatars'
import { localPlayer } from '../game/localPlayer'
import { animForSpeed } from '../game/movement'
import { stopEmote, useEmotes } from '../net/emotes'
import { snapshots, useGame, type Person } from '../net/store'
import { useVoice } from '../voice/store'
import Character, { type Anim } from './Character'
import ChatBubble from './ChatBubble'
import Label from './Label'

function RemotePlayer({ id, person }: { id: string; person: Person }) {
  const body = useRef<Group>(null)
  const speed = useRef(0)
  const currentAnim = useRef<Anim>('Idle')
  const [anim, setAnim] = useState<Anim>('Idle')
  const speaking = useVoice((s) => s.speaking[id] ?? false)
  const emote = useEmotes((s) => s.playing[id])
  const hearing = useRef(false)
  const [inRange, setInRange] = useState(false)
  // bumped every time they come into range, restarts the "!" animation
  const [alert, setAlert] = useState(0)

  useFrame((_, delta) => {
    const group = body.current
    const buffer = snapshots.get(id)
    if (!group) return
    // out of view (too far away), don't leave them standing where we last saw them
    group.visible = !!buffer
    if (!buffer) return

    const s = sample(buffer, performance.now() - INTERP_DELAY)
    if (!s) return

    // smooth the speed out a bit, otherwise the animation flickers between walk/idle
    const dt = Math.max(delta, 0.001)
    const moved = Math.hypot(s.x - group.position.x, s.z - group.position.z)
    speed.current += (moved / dt - speed.current) * Math.min(1, dt * 10)

    group.position.set(s.x, 0, s.z)
    group.rotation.y = s.heading

    const next = animForSpeed(speed.current)
    if (next !== currentAnim.current) {
      currentAnim.current = next
      setAnim(next)
    }

    // in voice range or not. a couple of meters of slack so it doesn't flicker at the edge
    const dist = Math.hypot(s.x - localPlayer.x, s.z - localPlayer.z)
    const nowHearing = hearing.current ? dist < VOICE_MAX_DISTANCE + 2 : dist < VOICE_MAX_DISTANCE
    if (nowHearing !== hearing.current) {
      hearing.current = nowHearing
      setInRange(nowHearing)
      if (nowHearing) setAlert((n) => n + 1)
    }
  })

  // walking off cancels an emote
  useEffect(() => {
    if (anim !== 'Idle' && emote) stopEmote(id, emote.key)
  }, [anim, emote, id])
  const shown = emote && anim === 'Idle' ? emote.name : anim

  return (
    <group ref={body}>
      <Character
        avatar={avatarById(person.avatar)}
        anim={shown}
        onEmoteDone={() => emote && stopEmote(id, emote.key)}
      />
      <ChatBubble id={id} />
      <Billboard position-y={2.2}>
        <Label
          fontSize={0.35}
          color={speaking ? '#7dff6a' : 'white'}
          // faded when they're too far away to hear you
          fillOpacity={inRange ? 1 : 0.45}
          outlineOpacity={inRange ? 1 : 0.45}
          outlineWidth={0.03}
          outlineColor="black"
        >
          {person.name}
        </Label>
      </Billboard>
      {alert > 0 && inRange && (
        // a quick "!" when someone comes close enough to talk. key restarts the css animation
        <Html key={alert} position={[0, 2.9, 0]} center distanceFactor={10}>
          <div className="range-alert">!</div>
        </Html>
      )}
    </group>
  )
}

export default function RemotePlayers() {
  const players = useGame((s) => s.players)
  return (
    <>
      {Object.entries(players).map(([id, person]) => (
        <RemotePlayer key={id} id={id} person={person} />
      ))}
    </>
  )
}
