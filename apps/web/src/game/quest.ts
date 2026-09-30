import { create } from 'zustand'
import campus from '../campus/campus.json'
import { centroid } from '../campus/geometry'
import type { Point } from './collision'
import { places } from './places'

// a little tour of campus for the game look, one step at a time. a step is done when
// you're at a place (the name the hud shows, game/location.ts) or have enough stars
export type Step = { text: string; place?: string; stars?: number; spot?: Point }

const spotOf = (label: string) => places.find((p) => p.label === label)?.spot
const quad = campus.areas.find((a) => a.name === 'Panther Quad')!

export const QUEST: Step[] = [
  { text: 'Visit Library North', place: 'Library North', spot: spotOf('Library North') },
  {
    text: 'Find Student Center East',
    place: 'Student Center East',
    spot: spotOf('Student Center East'),
  },
  { text: 'Hang out on the Panther Quad', place: 'Panther Quad', spot: centroid(quad.points) },
  { text: 'Look up at Langdale Hall', place: 'Langdale Hall', spot: spotOf('Langdale Hall') },
  { text: 'Reach the Research Tower', place: 'Research Tower', spot: spotOf('Research Tower') },
  { text: 'Collect 10 stars', stars: 10 },
]

/** the step you're on after this (QUEST.length when it's all done) */
export function progress(step: number, place: string, stars: number) {
  const s = QUEST[step]
  if (!s) return step
  const done = s.place ? place === s.place : stars >= (s.stars ?? 0)
  return done ? step + 1 : step
}

const KEY = 'quest'

function savedStep() {
  try {
    const n = Number(localStorage.getItem(KEY))
    return Number.isInteger(n) && n >= 0 && n <= QUEST.length ? n : 0
  } catch {
    return 0
  }
}

// done: the step that was just finished, for the confetti (key tells them apart)
export const useQuest = create<{ step: number; done: { text: string; key: number } | null }>(
  () => ({ step: savedStep(), done: null }),
)

export function setStep(step: number) {
  useQuest.setState({ step })
  try {
    localStorage.setItem(KEY, String(step))
  } catch {
    // not remembered then
  }
}
