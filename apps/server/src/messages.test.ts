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
    const msg = parseMessage(JSON.stringify({ type: 'join', name: '  ' + 'x'.repeat(50) }))
    expect(msg).toEqual({ type: 'join', name: 'x'.repeat(24) })
  })

  it.each([
    ['not json', 'hello'],
    ['unknown type', JSON.stringify({ type: 'teleport' })],
    ['empty name', JSON.stringify({ type: 'join', name: '   ' })],
    ['NaN position', '{"type":"move","position":{"x":null,"y":0,"z":0},"heading":0}'],
    ['missing heading', JSON.stringify({ type: 'move', position: { x: 0, y: 0, z: 0 } })],
    ['signal without target', JSON.stringify({ type: 'signal', data: { kind: 'bye' } })],
    ['signal with unknown kind', JSON.stringify({ type: 'signal', to: 'a', data: { kind: 'x' } })],
  ])('rejects %s', (_, raw) => {
    expect(parseMessage(raw)).toBeNull()
  })
})
