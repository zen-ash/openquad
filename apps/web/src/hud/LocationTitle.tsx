import { useEffect, useState } from 'react'
import type { Place } from '../game/location'

// big title when you arrive somewhere new. waits a moment first, so walking along the
// edge of two places doesn't flash titles back and forth
const SETTLE = 700

export default function LocationTitle({ place }: { place: Place }) {
  const [shown, setShown] = useState<Place | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShown(place), SETTLE)
    return () => clearTimeout(timer)
  }, [place])

  if (!shown) return null
  // key restarts the fade animation for each new place
  return (
    <div className="location-title" key={shown.name} aria-live="polite">
      <div className="name">{shown.name}</div>
      <div className="sub">{shown.sub}</div>
    </div>
  )
}
