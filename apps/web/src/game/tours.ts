import { create } from 'zustand'
import data from '../campus/tours.json'
import { localPlayer } from './localPlayer'
import { navigateTo, stopNavigating } from './nav'
import { placeNamed } from './places'

// guided tours: stops in order, a line about each, walked by yourself ("take me there") from
// one to the next. defined in campus/tours.json. where you got to is kept on this device so
// you can pick it up again

export type Stop = { place: string; say: string }
export type Tour = { id: string; name: string; about: string; stops: Stop[] }

export const TOURS: Tour[] = Object.entries(data).map(([id, t]) => ({ id, ...t }))
export const tourNamed = (id: string) => TOURS.find((t) => t.id === id)

// stop is how far you've got (stops.length when it's done), arrived whether you're at it
type State = { id: string | null; stop: number; arrived: boolean }

const KEY = 'tour'

function saved(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    const tour = s && tourNamed(s.id)
    if (tour && Number.isInteger(s.stop) && s.stop >= 0 && s.stop <= tour.stops.length)
      return { id: tour.id, stop: s.stop, arrived: false }
  } catch {
    // start over then
  }
  return { id: null, stop: 0, arrived: false }
}

export const useTour = create<State>(() => saved())

function save(s: State) {
  useTour.setState(s)
  try {
    if (s.id) localStorage.setItem(KEY, JSON.stringify({ id: s.id, stop: s.stop }))
    else localStorage.removeItem(KEY)
  } catch {
    // not remembered then
  }
}

/** the tour you're on and the stop you're heading for (undefined when it's done) */
export function current() {
  const { id, stop } = useTour.getState()
  const tour = id ? tourNamed(id) : undefined
  return { tour, stop: tour?.stops[stop] }
}

/** walk by yourself to the stop you're on */
export function walkToStop() {
  const { stop } = current()
  const p = stop && placeNamed(stop.place)
  if (p) navigateTo(p.label, p.spot, { x: localPlayer.x, z: localPlayer.z }, true)
}

export function startTour(id: string) {
  if (!tourNamed(id)) return
  save({ id, stop: 0, arrived: false })
  walkToStop()
}

/** you're at the stop now (by walking there or getting there yourself) */
export function arrive(place: string) {
  const s = useTour.getState()
  if (s.arrived || current().stop?.place !== place) return
  useTour.setState({ arrived: true })
  stopNavigating()
}

/** on to the next stop: walking there by itself, unless that was the last one */
export function nextStop() {
  const s = useTour.getState()
  save({ ...s, stop: s.stop + 1, arrived: false })
  walkToStop()
}

export function endTour() {
  save({ id: null, stop: 0, arrived: false })
  stopNavigating()
}
