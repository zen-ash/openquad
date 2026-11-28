import { useEffect, useMemo, useState } from 'react'
import { localPlayer } from '../game/localPlayer'
import { minutes, navigateTo, walkMeters } from '../game/nav'
import { arrivalSpot, search, type Place } from '../game/places'
import { showCard, useCard } from './PlaceCard'
import { togglePanel, usePanel } from './panels'
import Schedule from './Schedule'
import { ToursList } from './Tour'

// the first few results get their walking time (each one is a route worked out)
const TIMED = 5

const here = () => ({ x: localPlayer.x, z: localPlayer.z })

// the buttons at the top right and the panel under them: tours, my day, the places search
export default function PlacesMenu() {
  const panel = usePanel((s) => s.open)
  const open = panel === 'places'
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
      togglePanel('places')
      setQuery('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const close = () => {
    usePanel.setState({ open: null })
    setQuery('')
  }
  // a panel and a card share the spot
  useEffect(() => {
    if (panel) useCard.setState({ open: null })
  }, [panel])
  const go = (p: Place, auto: boolean) => {
    navigateTo(p.label, p.spot, here(), auto)
    close()
  }

  return (
    <div className="places">
      <div className="top-buttons">
        <button className="places-toggle" onClick={() => togglePanel('tours')}>
          {panel === 'tours' ? 'Close' : 'Tours'}
        </button>
        <button className="places-toggle" onClick={() => togglePanel('day')}>
          {panel === 'day' ? 'Close' : 'My day'}
        </button>
        <button
          className="places-toggle"
          onClick={() => {
            setQuery('')
            togglePanel('places')
          }}
        >
          {open ? 'Close' : 'Places (G)'}
        </button>
      </div>
      {panel === 'day' && (
        <div className="places-panel">
          <Schedule />
        </div>
      )}
      {panel === 'tours' && (
        <div className="places-panel">
          <ToursList />
        </div>
      )}
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
                  {p.card ? (
                    // the name opens what we know about it
                    <button
                      className="name"
                      onClick={() => {
                        close()
                        showCard(p.label)
                      }}
                    >
                      {p.label}
                    </button>
                  ) : (
                    p.label
                  )}
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
