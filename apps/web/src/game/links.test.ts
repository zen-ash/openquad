import { beforeEach, describe, expect, it } from 'vitest'
import { followLinks, linkTargets } from './links'
import { localPlayer } from './localPlayer'
import { stopNavigating, useNav } from './nav'

beforeEach(() => stopNavigating())

describe('links', () => {
  it('reads where to go and where to start', () => {
    const { to, at } = linkTargets('?to=langdale-hall&at=sce')
    expect(to?.label).toBe('Langdale Hall')
    expect(at?.label).toBe('Student Center East')
  })

  it('takes short names and escaped ones', () => {
    expect(linkTargets('?to=rec').to?.label).toBe('Student Recreation Center')
    expect(linkTargets('?to=a%26h').to?.label).toBe('Arts & Humanities')
  })

  it('ignores ones that find nothing', () => {
    expect(linkTargets('?to=zzqx&at=').to).toBeUndefined()
    expect(linkTargets('?to=---').to).toBeUndefined()
    expect(linkTargets('?quality=low')).toEqual({ to: undefined, at: undefined })
  })

  it('starts you there and puts up the directions, once', () => {
    localPlayer.x = localPlayer.z = 0
    followLinks('?at=library-north&to=langdale')
    const goal = useNav.getState().goal
    expect(goal?.label).toBe('Langdale Hall')
    // from the library, not from hurt park
    expect(localPlayer.teleport).not.toBeNull()
    expect(useNav.getState().path[0]).toEqual(localPlayer.teleport)

    stopNavigating()
    followLinks('?to=langdale')
    expect(useNav.getState().goal).toBeNull()
  })
})
