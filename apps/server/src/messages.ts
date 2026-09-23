import { MAX_NAME_LENGTH, type ClientMessage, type Vec3 } from '@quad/shared'

const SIGNAL_KINDS = ['description', 'candidate', 'bye']

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

function isVec3(v: unknown): v is Vec3 {
  if (typeof v !== 'object' || v === null) return false
  const { x, y, z } = v as Record<string, unknown>
  return isNum(x) && isNum(y) && isNum(z)
}

// never trust the client - returns null for anything malformed
export function parseMessage(raw: string): ClientMessage | null {
  let msg: Record<string, unknown>
  try {
    msg = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof msg !== 'object' || msg === null) return null

  switch (msg.type) {
    case 'join': {
      if (typeof msg.name !== 'string') return null
      const name = msg.name.trim().slice(0, MAX_NAME_LENGTH)
      return name ? { type: 'join', name } : null
    }
    case 'move':
      if (!isVec3(msg.position) || !isNum(msg.heading)) return null
      return { type: 'move', position: msg.position, heading: msg.heading }
    case 'signal': {
      const data = msg.data as { kind?: unknown } | null
      if (typeof msg.to !== 'string' || typeof data !== 'object' || data === null) return null
      if (!SIGNAL_KINDS.includes(data.kind as string)) return null
      return msg as ClientMessage
    }
    case 'ping':
      return { type: 'ping' }
    default:
      return null
  }
}
