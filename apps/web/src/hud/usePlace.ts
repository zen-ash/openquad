import { VOICE_MAX_DISTANCE } from '@quad/shared'
import { useEffect, useState } from 'react'
import { localPlayer } from '../game/localPlayer'
import { whereIs, type Place } from '../game/location'
import { snapshots } from '../net/store'

// where you are and how many people can hear you. checked a few times a second, it
// doesn't need to be every frame
export function usePlace() {
  const [place, setPlace] = useState<Place>(() => whereIs(localPlayer.x, localPlayer.z))
  const [nearby, setNearby] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      const next = whereIs(localPlayer.x, localPlayer.z)
      setPlace((p) => (p.name === next.name && p.sub === next.sub ? p : next))

      let count = 0
      for (const buffer of snapshots.values()) {
        const last = buffer[buffer.length - 1]
        if (last && Math.hypot(last.x - localPlayer.x, last.z - localPlayer.z) < VOICE_MAX_DISTANCE)
          count++
      }
      setNearby(count)
    }, 300)
    return () => clearInterval(timer)
  }, [])

  return { place, nearby }
}
