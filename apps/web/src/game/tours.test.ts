import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNav } from './nav'
import { placeNamed } from './places'
import { arrive, current, endTour, nextStop, startTour, TOURS, useTour } from './tours'

// node has no localStorage
const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => saved.get(k) ?? null,
  setItem: (k: string, v: string) => saved.set(k, String(v)),
  removeItem: (k: string) => saved.delete(k),
  clear: () => saved.clear(),
})

describe('tours', () => {
  beforeEach(() => {
    localStorage.clear()
    endTour()
  })

  it('has first week essentials, every stop a real place with a short line', () => {
    const tour = TOURS.find((t) => t.id === 'essentials')!
    expect(tour.stops.length).toBeGreaterThanOrEqual(7)
    for (const stop of tour.stops) {
      expect(placeNamed(stop.place), stop.place).toBeDefined()
      expect(stop.say.length).toBeLessThanOrEqual(120)
    }
  })

  it('walks you to the first stop by itself', () => {
    startTour('essentials')
    expect(useTour.getState()).toMatchObject({ id: 'essentials', stop: 0, arrived: false })
    expect(useNav.getState()).toMatchObject({ auto: true })
    expect(useNav.getState().goal?.label).toBe(current().stop!.place)
  })

  it('notices you got there, only at the stop you are on', () => {
    startTour('essentials')
    arrive('Student Recreation Center')
    expect(useTour.getState().arrived).toBe(false)
    arrive(current().stop!.place)
    expect(useTour.getState().arrived).toBe(true)
  })

  it('goes on to the next stop, and skips one you do not want', () => {
    startTour('essentials')
    arrive(current().stop!.place)
    nextStop()
    expect(useTour.getState()).toMatchObject({ stop: 1, arrived: false })
    expect(useNav.getState().goal?.label).toBe(current().stop!.place)
    nextStop()
    expect(useTour.getState().stop).toBe(2)
  })

  it('is done after the last stop', () => {
    startTour('essentials')
    const stops = current().tour!.stops.length
    for (let i = 0; i < stops; i++) nextStop()
    expect(current().stop).toBeUndefined()
    expect(useTour.getState().stop).toBe(stops)
  })

  it('remembers where you got to on this device', () => {
    startTour('essentials')
    nextStop()
    expect(JSON.parse(localStorage.getItem('tour')!)).toEqual({ id: 'essentials', stop: 1 })
    endTour()
    expect(localStorage.getItem('tour')).toBeNull()
  })
})
