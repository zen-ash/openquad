import { localPlayer } from './localPlayer'
import { navigateTo } from './nav'
import { arrivalSpot, search, words, type Place } from './places'

// "meet here" links: ?to=langdale-hall puts up directions there, ?at=sce starts you there.
// anything that finds the place in the search box works (?to=rec, ?at=a%26h)
export function placeFromLink(value: string | null): Place | undefined {
  return value && words(value).length ? search(value)[0] : undefined
}

export function linkTargets(query: string) {
  const params = new URLSearchParams(query)
  return { to: placeFromLink(params.get('to')), at: placeFromLink(params.get('at')) }
}

// once, when you first get in. not again after a reconnect
let followed = false
export function followLinks(query = location.search) {
  if (followed) return
  followed = true
  const { to, at } = linkTargets(query)
  if (at) {
    const spot = arrivalSpot(at.spot)
    localPlayer.teleport = spot
    // so directions start from there, Player moves you on its next frame
    localPlayer.x = spot.x
    localPlayer.z = spot.z
  }
  if (to) navigateTo(to.label, to.spot, { x: localPlayer.x, z: localPlayer.z })
}
