import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { localPlayer } from '../game/localPlayer'
import { minutes, navigateTo, walkMeters } from '../game/nav'
import { placeNamed } from '../game/places'
import { usePanel } from './panels'

// which place's card is up (the places search, arriving somewhere, the hud's About)
export const useCard = create<{ open: string | null }>(() => ({ open: null }))

export const showCard = (label: string) => {
  if (!placeNamed(label)?.card) return
  usePanel.setState({ open: null })
  useCard.setState({ open: label })
}
const close = () => useCard.setState({ open: null })

export default function PlaceCard() {
  const label = useCard((s) => s.open)
  const place = label ? placeNamed(label) : undefined
  const card = place?.card
  // a building's inside is ours, not the real rooms
  const building = !!place?.gsu
  const walk = useMemo(() => {
    const p = label ? placeNamed(label) : undefined
    return p ? walkMeters({ x: localPlayer.x, z: localPlayer.z }, p.spot) : 0
  }, [label])

  useEffect(() => {
    if (!label) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [label])

  if (!place || !card) return null
  const go = (auto: boolean) => {
    navigateTo(place.label, place.spot, { x: localPlayer.x, z: localPlayer.z }, auto)
    close()
  }
  return (
    <section className="place-card" aria-label={place.label}>
      <header>
        <h2>{place.label}</h2>
        <button className="close" aria-label="Close" onClick={close}>
          &times;
        </button>
      </header>
      <p className="sub">
        {place.gsu ? 'Georgia State University' : 'Downtown Atlanta'}
        {walk > 20 && <> &middot; {minutes(walk)} min walk</>}
      </p>
      <p>{card.about}</p>
      <h3>What's here</h3>
      <ul>
        {card.inside.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="actions">
        {walk > 20 && (
          <>
            <button className="go" onClick={() => go(true)}>
              Take me there
            </button>
            <button className="plain" onClick={() => go(false)}>
              Directions
            </button>
          </>
        )}
        <a href={card.link} target="_blank" rel="noreferrer">
          Official page
        </a>
      </div>
      {building && (
        <p className="note">
          The inside in the game is made up: the rooms and furniture aren't the real ones.
        </p>
      )}
    </section>
  )
}
