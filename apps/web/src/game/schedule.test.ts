import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setDay, toMinutes, useDay, walks } from './schedule'

// node has no localStorage
const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => saved.get(k) ?? null,
  setItem: (k: string, v: string) => saved.set(k, String(v)),
  clear: () => saved.clear(),
})

// every walk 260m (a few minutes), so the tests don't depend on the routes
const flat = () => 260

describe('my day', () => {
  beforeEach(() => {
    localStorage.clear()
    useDay.setState({ day: [] })
  })

  it('reads times', () => {
    expect(toMinutes('9:30')).toBe(570)
    expect(toMinutes('13:05')).toBe(785)
    expect(toMinutes('25:00')).toBeNull()
    expect(toMinutes('')).toBeNull()
  })

  it('works out the walk between each class and the next', () => {
    const w = walks(
      [
        { place: 'Langdale Hall', start: '9:00', end: '9:50' },
        { place: 'Library North', start: '10:00', end: '10:50' },
        { place: 'Petit Science Center', start: '10:52', end: '11:45' },
      ],
      flat,
    )
    expect(w).toHaveLength(2)
    expect(w[0]).toMatchObject({ from: 'Langdale Hall', to: 'Library North', gap: 10 })
    expect(w[0]!.walk).toBe(3)
    expect(w[0]!.late).toBe(false)
    expect(w[0]!.tight).toBe(false)
    // two minutes to walk three minutes
    expect(w[1]!.late).toBe(true)
  })

  it("says when it's only just enough", () => {
    const [w] = walks(
      [
        { place: 'Langdale Hall', start: '9:00', end: '9:50' },
        { place: 'Library North', start: '9:54', end: '10:50' },
      ],
      flat,
    )
    expect(w).toMatchObject({ late: false, tight: true })
  })

  it('needs no walk to stay in the same building, and no times to show the walk', () => {
    const w = walks(
      [
        { place: 'Langdale Hall', start: '', end: '' },
        { place: 'Langdale Hall', start: '', end: '' },
        { place: 'Library North', start: '', end: '' },
      ],
      flat,
    )
    expect(w[0]).toMatchObject({ walk: 0, gap: null, late: false })
    expect(w[1]).toMatchObject({ walk: 3, gap: null, late: false })
  })

  it('uses the real routes', () => {
    const [w] = walks([
      { place: 'Langdale Hall', start: '9:00', end: '9:50' },
      { place: 'Student Recreation Center', start: '10:00', end: '11:00' },
    ])
    expect(w!.meters).toBeGreaterThan(200)
  })

  it('remembers the day on this device only', () => {
    setDay([{ place: 'Library North', start: '9:00', end: '9:50' }])
    expect(JSON.parse(localStorage.getItem('day')!)).toHaveLength(1)
  })
})
