import { useEffect, useState } from 'react'
import { localPlayer } from '../game/localPlayer'
import { navigateTo } from '../game/nav'
import { arrivalSpot, places } from '../game/places'

export default function PlacesMenu() {
  const [open, setOpen] = useState(false)

  // G opens it, like pulling up a map
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'KeyG' || e.target instanceof HTMLInputElement) return
      setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const close = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(false)
    // otherwise space/enter would keep clicking it while you walk
    e.currentTarget.blur()
  }

  return (
    <div className="places">
      <button className="places-toggle" onClick={() => setOpen(!open)}>
        {open ? 'Close' : 'Places (G)'}
      </button>
      {open && (
        <ul>
          {places.map((p) => (
            <li key={p.label}>
              <span>{p.label}</span>
              <button
                className="directions"
                onClick={(e) => {
                  navigateTo(p.label, p.spot, { x: localPlayer.x, z: localPlayer.z })
                  close(e)
                }}
              >
                Directions
              </button>
              <button
                className="teleport"
                onClick={(e) => {
                  localPlayer.teleport = arrivalSpot(p.spot)
                  close(e)
                }}
              >
                Teleport
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
