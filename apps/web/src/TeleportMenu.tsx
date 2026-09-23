import { useState } from 'react'
import { localPlayer } from './game/localPlayer'
import { arrivalSpot, places } from './game/places'

export default function TeleportMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="teleport">
      <button className="teleport-toggle" onClick={() => setOpen(!open)}>
        {open ? 'Close' : 'Go to...'}
      </button>
      {open && (
        <ul>
          {places.map((p) => (
            <li key={p.label}>
              <button
                onClick={(e) => {
                  localPlayer.teleport = arrivalSpot(p.spot)
                  setOpen(false)
                  // otherwise space/enter would keep clicking it while you walk
                  e.currentTarget.blur()
                }}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
