import { describe, expect, it } from 'vitest'
import { atlantaTime, daylight, sunDirection, sunPosition, timeFor } from './sun'

const deg = (r: number) => (r * 180) / Math.PI

describe('sunPosition', () => {
  // around the september equinox the sun is right over the equator, so at solar noon it
  // should be about 90 - 33.75 = 56 degrees up, due south
  it('is high in the south at solar noon', () => {
    const { altitude, azimuth } = sunPosition(new Date('2026-09-23T17:40:00Z'))
    expect(deg(altitude)).toBeGreaterThan(54)
    expect(deg(altitude)).toBeLessThan(58)
    expect(Math.abs(deg(azimuth))).toBeLessThan(5)
  })

  it('is down at midnight', () => {
    expect(deg(sunPosition(new Date('2026-09-24T04:00:00Z')).altitude)).toBeLessThan(-40)
  })

  it('rises in the east around 7:25am eastern', () => {
    const { altitude, azimuth } = sunPosition(new Date('2026-09-23T11:25:00Z'))
    expect(Math.abs(deg(altitude))).toBeLessThan(2)
    expect(deg(azimuth)).toBeLessThan(-80) // east of south
  })

  it('is higher in summer than winter', () => {
    const june = sunPosition(new Date('2026-06-21T17:30:00Z')).altitude
    const december = sunPosition(new Date('2026-12-21T17:30:00Z')).altitude
    expect(june).toBeGreaterThan(december)
  })
})

describe('sunDirection', () => {
  it('points up and south at noon', () => {
    const [x, y, z] = sunDirection(new Date('2026-09-23T17:40:00Z'))
    expect(y).toBeGreaterThan(0.8)
    expect(z).toBeGreaterThan(0.4) // south is +z
    expect(Math.abs(x)).toBeLessThan(0.1)
    expect(Math.hypot(x, y, z)).toBeCloseTo(1)
  })
})

describe('daylight', () => {
  it('fades between night and day', () => {
    expect(daylight(-0.3)).toBe(0)
    expect(daylight(0)).toBeCloseTo(0.5)
    expect(daylight(0.5)).toBe(1)
  })
})

describe('atlantaTime', () => {
  it('handles daylight saving', () => {
    const now = new Date('2026-09-23T15:00:00Z')
    expect(atlantaTime(21, 30, now).toISOString()).toBe('2026-09-24T01:30:00.000Z') // EDT, -4
    const winter = new Date('2026-12-15T15:00:00Z')
    expect(atlantaTime(21, 30, winter).toISOString()).toBe('2026-12-16T02:30:00.000Z') // EST, -5
  })

  it('uses the atlanta date, not the utc one', () => {
    // 11pm in atlanta is already tomorrow in utc
    const lateNight = new Date('2026-09-24T03:00:00Z')
    expect(atlantaTime(9, 0, lateNight).toISOString()).toBe('2026-09-23T13:00:00.000Z')
  })
})

describe('timeFor', () => {
  const now = new Date('2026-09-23T15:00:00Z')

  it('uses the real time for live', () => {
    expect(timeFor('live', now)).toBe(now)
  })

  it('puts the sun low but still up for sunset', () => {
    const alt = deg(sunPosition(timeFor('sunset', now)).altitude)
    expect(alt).toBeGreaterThan(1.5)
    expect(alt).toBeLessThan(4)
  })

  it('takes an exact time too', () => {
    expect(timeFor('17:30', now).toISOString()).toBe('2026-09-23T21:30:00.000Z')
  })

  it('is dark for night and bright for noon', () => {
    expect(daylight(sunPosition(timeFor('night', now)).altitude)).toBe(0)
    expect(daylight(sunPosition(timeFor('noon', now)).altitude)).toBe(1)
  })
})
