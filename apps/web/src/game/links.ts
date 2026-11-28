import { localPlayer } from './localPlayer'
import { navigateTo } from './nav'
import { arrivalSpot, search, words, type Place } from './places'
import { startTour, tourNamed } from './tours'
import { usePanel } from '../hud/panels'

// "meet here" links: ?to=langdale-hall puts up directions there, ?at=sce starts you there.
// anything that finds the place in the search box works (?to=rec, ?at=a%26h). ?tour=essentials
// starts a tour
export function placeFromLink(value: string | null): Place | undefined {
  return value && words(value).length ? search(value)[0] : undefined
}

export function linkTargets(query: string) {
  const params = new URLSearchParams(query)
  return { to: placeFromLink(params.get('to')), at: placeFromLink(params.get('at')) }
}

// what the front page's button asked for: a tour, or to find a building (the places search)
let wanted: 'tour' | 'find' | null = null
export const wantOnJoin = (what: typeof wanted) => (wanted = what)

// once, when you first get in. not again after a reconnect
let followed = false
export function followLinks(query = location.search) {
  if (followed) return
  followed = true
  if (wanted === 'tour') return startTour('essentials')
  if (wanted === 'find') return usePanel.setState({ open: 'places' })
  const { to, at } = linkTargets(query)
  if (at) {
    const spot = arrivalSpot(at.spot)
    localPlayer.teleport = spot
    // so directions start from there, Player moves you on its next frame
    localPlayer.x = spot.x
    localPlayer.z = spot.z
  }
  const tour = new URLSearchParams(query).get('tour')
  if (tour && tourNamed(tour)) startTour(tour)
  else if (to) navigateTo(to.label, to.spot, { x: localPlayer.x, z: localPlayer.z })
}
