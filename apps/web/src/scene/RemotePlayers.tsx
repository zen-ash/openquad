import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import { INTERP_DELAY, sample } from '../game/interpolation'
import { avatarById } from '../game/avatars'
import { animForSpeed } from '../game/movement'
import { snapshots, useGame, type Person } from '../net/store'
import { useVoice } from '../voice/store'
import Character, { type Anim } from './Character'
import ChatBubble from './ChatBubble'

function RemotePlayer({ id, person }: { id: string; person: Person }) {
  const body = useRef<Group>(null)
  const speed = useRef(0)
  const currentAnim = useRef<Anim>('Idle')
  const [anim, setAnim] = useState<Anim>('Idle')
  const speaking = useVoice((s) => s.speaking[id] ?? false)

  useFrame((_, delta) => {
    const group = body.current
    const buffer = snapshots.get(id)
    if (!group || !buffer) return

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
  })

  return (
    <group ref={body}>
      <Character avatar={avatarById(person.avatar)} anim={anim} />
      <ChatBubble id={id} />
      <Billboard position-y={2.2}>
        <Text
          fontSize={0.35}
          color={speaking ? '#7dff6a' : 'white'}
          outlineWidth={0.03}
          outlineColor="black"
        >
          {person.name}
        </Text>
      </Billboard>
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
