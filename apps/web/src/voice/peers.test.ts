import { describe, expect, it } from 'vitest'
import { CONNECT_RADIUS, HANGUP_RADIUS, MAX_PEERS, planCalls, shouldCall } from './peers'

describe('planCalls', () => {
  it('calls people who are close', () => {
    const plan = planCalls([{ id: 'a', dist: 5 }], new Set())
    expect(plan).toEqual({ call: ['a'], hangUp: [] })
  })

  it('ignores people who are far away', () => {
    const plan = planCalls([{ id: 'a', dist: CONNECT_RADIUS + 1 }], new Set())
    expect(plan.call).toEqual([])
  })

  it('stays connected in the gap between connect and hang up distance', () => {
    const between = (CONNECT_RADIUS + HANGUP_RADIUS) / 2
    const plan = planCalls([{ id: 'a', dist: between }], new Set(['a']))
    expect(plan).toEqual({ call: [], hangUp: [] })
  })

  it('hangs up when someone walks away', () => {
    const plan = planCalls([{ id: 'a', dist: HANGUP_RADIUS + 1 }], new Set(['a']))
    expect(plan.hangUp).toEqual(['a'])
  })

  it('hangs up on people who left', () => {
    expect(planCalls([], new Set(['gone'])).hangUp).toEqual(['gone'])
  })

  it('calls the closest people first when there are too many', () => {
    const crowd = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, dist: 15 - i * 0.5 }))
    const plan = planCalls(crowd, new Set())
    expect(plan.call).toHaveLength(MAX_PEERS)
    expect(plan.call[0]).toBe('p19') // dist 5.5, the closest
  })

  it('does not go over the limit counting existing calls', () => {
    const connected = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    const others = [...connected, 'x', 'y'].map((id) => ({ id, dist: 3 }))
    expect(planCalls(others, connected).call).toHaveLength(1)
  })
})

describe('shouldCall', () => {
  it('only lets one side of each pair make the call', () => {
    expect(shouldCall('a', 'b')).toBe(true)
    expect(shouldCall('b', 'a')).toBe(false)
  })
})
