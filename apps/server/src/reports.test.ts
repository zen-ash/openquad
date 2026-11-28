import { describe, expect, it } from 'vitest'
import { Reports } from './reports'

describe('reports', () => {
  it('replaces a run with its later steps', () => {
    const reports = new Reports()
    reports.add(JSON.stringify({ id: 'a', step: 'Joining' }))
    reports.add(JSON.stringify({ id: 'b', step: 'Joining' }))
    reports.add(JSON.stringify({ id: 'a', step: 'done' }))
    expect(reports.list().map((r) => (r as { id: string; step: string }).step)).toEqual([
      'Joining',
      'done',
    ])
    expect(reports.list().map((r) => (r as { id: string }).id)).toEqual(['b', 'a'])
  })

  it('turns away things that are not reports', () => {
    const reports = new Reports()
    expect(reports.add('{')).toBe(false)
    expect(reports.add('null')).toBe(false)
    expect(reports.add(JSON.stringify({ step: 'no id' }))).toBe(false)
    expect(reports.add(JSON.stringify({ id: '../../etc' }))).toBe(false)
    expect(reports.list()).toEqual([])
  })

  it('keeps only the last 50', () => {
    const reports = new Reports()
    for (let i = 0; i < 60; i++) reports.add(JSON.stringify({ id: `r${i}` }))
    const ids = reports.list().map((r) => (r as { id: string }).id)
    expect(ids).toHaveLength(50)
    expect(ids[0]).toBe('r10')
  })
})
