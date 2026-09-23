import { describe, expect, it } from 'vitest'
import { parseMessage } from './messages'

describe('parseMessage', () => {
  it('parses a valid move', () => {
    const raw = JSON.stringify({ type: 'move', position: { x: 1, y: 0, z: -3 }, heading: 1.2 })
    expect(parseMessage(raw)).toEqual({
      type: 'move',
      position: { x: 1, y: 0, z: -3 },
      heading: 1.2,
    })
  })

  it('parses a signal', () => {
    const raw = JSON.stringify({ type: 'signal', to: 'abc', data: { kind: 'bye' } })
    expect(parseMessage(raw)).toEqual({ type: 'signal', to: 'abc', data: { kind: 'bye' } })
  })

  it('trims and caps names', () => {
    const raw = JSON.stringify({ type: 'join', name: '  ' + 'x'.repeat(50), avatar: 'male_17' })
    expect(parseMessage(raw)).toEqual({ type: 'join', name: 'x'.repeat(24), avatar: 'male_17' })
  })

  it('gives an unknown avatar the default one', () => {
    const msg = parseMessage(JSON.stringify({ type: 'join', name: 'A', avatar: '../../etc' }))
    expect(msg).toEqual({ type: 'join', name: 'A', avatar: 'male_09' })
  })

  it('keeps a valid reconnect position', () => {
    const position = { x: 1, y: 0, z: 2 }
    const msg = parseMessage(
      JSON.stringify({ type: 'join', name: 'A', avatar: 'male_09', position }),
    )
    expect(msg).toEqual({ type: 'join', name: 'A', avatar: 'male_09', position })
  })

  it('parses an emote', () => {
    expect(parseMessage(JSON.stringify({ type: 'emote', name: 'Wave' }))).toEqual({
      type: 'emote',
      name: 'Wave',
    })
  })

  it('trims and caps chat', () => {
    const msg = parseMessage(JSON.stringify({ type: 'chat', text: ' ' + 'y'.repeat(300) }))
    expect(msg).toEqual({ type: 'chat', text: 'y'.repeat(200) })
  })

  it.each([
    ['not json', 'hello'],
    ['unknown type', JSON.stringify({ type: 'teleport' })],
    ['empty name', JSON.stringify({ type: 'join', name: '   ' })],
    ['NaN position', '{"type":"move","position":{"x":null,"y":0,"z":0},"heading":0}'],
    ['missing heading', JSON.stringify({ type: 'move', position: { x: 0, y: 0, z: 0 } })],
    ['signal without target', JSON.stringify({ type: 'signal', data: { kind: 'bye' } })],
    ['empty chat', JSON.stringify({ type: 'chat', text: '   ' })],
    ['unknown emote', JSON.stringify({ type: 'emote', name: 'Backflip' })],
    ['signal with unknown kind', JSON.stringify({ type: 'signal', to: 'a', data: { kind: 'x' } })],
  ])('rejects %s', (_, raw) => {
    expect(parseMessage(raw)).toBeNull()
  })
})
