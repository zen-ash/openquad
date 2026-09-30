import { insideFence } from '@quad/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { whereIs } from './location'
import { progress, QUEST, setStep, useQuest } from './quest'

// node has no localStorage
const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => saved.get(k) ?? null,
  setItem: (k: string, v: string) => saved.set(k, String(v)),
  clear: () => saved.clear(),
})

describe('quest', () => {
  beforeEach(() => localStorage.clear())

  it('moves on when you get to the place', () => {
    expect(progress(0, 'Hurt Park', 0)).toBe(0)
    expect(progress(0, 'Library North', 0)).toBe(1)
  })

  it('only counts the place the step asks for', () => {
    expect(progress(1, 'Library North', 0)).toBe(1)
    expect(progress(1, 'Student Center East', 0)).toBe(2)
  })

  it('counts stars for the star step', () => {
    const last = QUEST.length - 1
    expect(progress(last, 'Hurt Park', 9)).toBe(last)
    expect(progress(last, 'Hurt Park', 10)).toBe(QUEST.length)
  })

  it('stays done once it is all done', () => {
    expect(progress(QUEST.length, 'Library North', 20)).toBe(QUEST.length)
  })

  it.each(QUEST.filter((s) => s.place).map((s) => [s.place!, s]))(
    'can get to %s inside the fence',
    (place, step) => {
      expect(step.spot).toBeDefined()
      expect(insideFence(step.spot!.x, step.spot!.z)).toBe(true)
      // the spot the directions go to counts as being there
      expect(whereIs(step.spot!.x, step.spot!.z).name).toBe(place)
    },
  )

  it('remembers the step', () => {
    setStep(3)
    expect(useQuest.getState().step).toBe(3)
    expect(localStorage.getItem('quest')).toBe('3')
  })
})
