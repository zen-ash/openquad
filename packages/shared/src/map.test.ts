import { describe, expect, it } from 'vitest'
import { onMap } from './map'

describe('map', () => {
  it('has all of campus on it', () => {
    expect(onMap(0, 0)).toBe(true)
    // the research tower, and piedmont north up by the connector
    expect(onMap(30, 395)).toBe(true)
    expect(onMap(470, -540)).toBe(true)
  })

  it('stops at the edges', () => {
    expect(onMap(600, 0)).toBe(false)
    expect(onMap(0, 500)).toBe(false)
    expect(onMap(0, -700)).toBe(false)
    expect(onMap(530, 0, 20)).toBe(false)
  })
})
