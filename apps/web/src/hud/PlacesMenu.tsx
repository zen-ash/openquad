import { useEffect, useMemo, useState } from 'react'
import { localPlayer } from '../game/localPlayer'
import { minutes, navigateTo, walkMeters } from '../game/nav'
import { arrivalSpot, search, type Place } from '../game/places'

// the first few results get their walking time (each one is a route worked out)
const TIMED = 5

const here = () => ({ x: localPlayer.x, z: localPlayer.z })

export default function PlacesMenu() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const results = useMemo(() => search(query), [query])
  const walks = useMemo(
    () => (query.trim() ? results.slice(0, TIMED).map((p) => walkMeters(here(), p.spot)) : []),
    [query, results],
  )

  // G opens it, like pulling up a map
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'KeyG' || e.target instanceof HTMLInputElement) return
      // or the g lands in the search box it just opened
      e.preventDefault()
      setOpen((o) => !o)
      setQuery('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const close = () => {
    setOpen(false)
    setQuery('')
  }
  const go = (p: Place, auto: boolean) => {
    navigateTo(p.label, p.spot, here(), auto)
    close()
  }

  return (
    <div className="places">
      <button className="places-toggle" onClick={() => (open ? close() : setOpen(true))}>
        {open ? 'Close' : 'Places (G)'}
      </button>
      {open && (
        <div className="places-panel">
          <input
            className="places-search"
            type="search"
            aria-label="Search places"
            placeholder="Search, like Langdale or SCE"
            // opening the menu is asking to search
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // enter walks you to the best match
              if (e.key === 'Enter' && results[0]) go(results[0], true)
              if (e.key === 'Escape') close()
            }}
          />
          <ul>
            {results.map((p, i) => (
              <li key={p.label}>
                <span>
                  {p.label}
                  {walks[i] !== undefined && <small>{minutes(walks[i])} min walk</small>}
                </span>
                <button className="go" onClick={() => go(p, true)}>
                  Take me there
                </button>
                <button className="plain" onClick={() => go(p, false)}>
                  Directions
                </button>
                <button
                  className="plain"
                  onClick={() => {
                    localPlayer.teleport = arrivalSpot(p.spot)
                    close()
                  }}
                >
                  Teleport
                </button>
              </li>
            ))}
            {!results.length && <li className="none">Nothing found with that name</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
