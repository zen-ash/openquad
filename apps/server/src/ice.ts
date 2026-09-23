type IceServer = { urls: string | string[]; username?: string; credential?: string }

const STUN_ONLY: IceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }]

// credentials last a day, refetch well before that
const TTL = 24 * 60 * 60
const REFRESH_AFTER = 12 * 60 * 60 * 1000

let cached: { servers: IceServer[]; at: number } | null = null

/**
 * STUN + TURN servers for the browser. TURN relays the audio when two people can't
 * connect directly (school/work wifi a lot of the time). Uses Cloudflare's TURN if
 * CF_TURN_KEY_ID and CF_TURN_API_TOKEN are set, otherwise just STUN.
 */
export async function getIceServers(env = process.env, now = Date.now()): Promise<IceServer[]> {
  const { CF_TURN_KEY_ID: keyId, CF_TURN_API_TOKEN: token } = env
  if (!keyId || !token) return STUN_ONLY
  if (cached && now - cached.at < REFRESH_AFTER) return cached.servers

  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ttl: TTL }),
      },
    )
    if (!res.ok) throw new Error(`cloudflare turn: ${res.status}`)
    const { iceServers } = (await res.json()) as { iceServers: IceServer[] }

    // cloudflare's docs say browsers block port 53 and those urls just time out
    const servers = iceServers.map((s) => ({
      ...s,
      urls: [s.urls].flat().filter((u) => !/:53\b/.test(u)),
    }))
    cached = { servers, at: now }
    return servers
  } catch (err) {
    console.error('could not get turn credentials, falling back to stun', err)
    return cached?.servers ?? STUN_ONLY
  }
}

export function clearIceCache() {
  cached = null
}
