import { AVATAR_IDS } from '@quad/shared'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import { avatarById } from '../game/avatars'
import { walkerAt, walkers, type Walker } from '../game/crowd'
import { localPlayer } from '../game/localPlayer'
import { surfaceAt } from '../game/surface'
import { still, walker } from '../settings'
import Bean from './Bean'
import Character from './Character'

// people walking about campus (game/crowd.ts). they're all there for the whole visit, each
// one only drawn while it's this close to you: mounting a person when they came into view
// was a few ms (copying the skeleton)
const NEAR = 70
// and casting a real shadow only this close: that's three more draws each, the soft shadow
// under them does from further away
const SHADOWS = 30

// the walk's clock: the real time, so everyone sees the same people, held for screenshots
const now = () => (still ? 0 : Date.now() / 1000)

function Person({ w }: { w: Walker }) {
  const body = useRef<Group>(null)
  const [close, setClose] = useState(false)
  useFrame(() => {
    const g = body.current
    if (!g) return
    const p = walkerAt(w, now())
    const d = Math.hypot(p.x - localPlayer.x, p.z - localPlayer.z)
    g.visible = d < NEAR
    if (d < SHADOWS !== close) setClose(d < SHADOWS)
    if (!g.visible) return
    // on the ground or a deck, carrying on from where they were like a player
    g.position.set(p.x, surfaceAt(p.x, p.z, g.position.y || Infinity), p.z)
    g.rotation.y = p.heading
  })
  const avatar = AVATAR_IDS[w.avatar % AVATAR_IDS.length]!
  return (
    <group ref={body}>
      {walker ? (
        <Character avatar={avatarById(avatar)} anim="Walk" />
      ) : (
        <Bean avatar={avatar} shadows={close} />
      )}
    </group>
  )
}

export default function Crowd() {
  return walkers().map((w, i) => <Person key={i} w={w} />)
}
