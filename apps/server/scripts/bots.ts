// load test: a bunch of fake players that join, wander around campus and chat, like
// real ones would. prints what they saw plus the server's own /stats at the end.
//
//   pnpm bots --count 100 --seconds 30 --spread 60 --url ws://localhost:2567/ws
//
// --spread is how far from hurt park they wander (meters). small = everyone crowded
// together like a class demo, big = spread over campus
import { AVATAR_IDS, insideFence, TICK_RATE, type ServerMessage } from '@quad/shared'
import { WebSocket } from 'ws'

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]!
}

const URL = arg('url', 'ws://localhost:2567/ws')
const COUNT = Number(arg('count', '50'))
const SECONDS = Number(arg('seconds', '30'))
const WALK_SPEED = 1.6
const AREA = Number(arg('spread', '60'))

// bots only count what arrives while this is on (everyone connected, nobody leaving)
let measuring = false

type Bot = { states: number; bytes: number; gaps: number[]; lastState: number; rtts: number[] }

// somewhere random in the area, but inside the fence or the server ignores the moves
function randomSpot() {
  for (;;) {
    const spot = { x: (Math.random() - 0.5) * 2 * AREA, z: (Math.random() - 0.5) * 2 * AREA }
    if (insideFence(spot.x, spot.z)) return spot
  }
}

function startBot(n: number, end: number): Promise<Bot> {
  const bot: Bot = { states: 0, bytes: 0, gaps: [], lastState: 0, rtts: [] }
  const ws = new WebSocket(URL)
  const pos = { x: 0, z: 0 }
  let target = randomSpot()
  let myId = ''
  let timers: ReturnType<typeof setInterval>[] = []

  ws.on('open', () => {
    const avatar = AVATAR_IDS[n % AVATAR_IDS.length]
    // start somewhere random in the area, not all on top of each other at spawn
    const position = { x: target.x, y: 0, z: target.z }
    ws.send(JSON.stringify({ type: 'join', name: `bot ${n}`, avatar, position }))
  })

  ws.on('message', (raw) => {
    const text = raw.toString()
    const msg = JSON.parse(text) as ServerMessage
    if (msg.type === 'welcome') {
      myId = msg.you.id
      Object.assign(pos, { x: msg.you.position.x, z: msg.you.position.z })
      // walk toward a random spot, pick a new one when we get there
      timers.push(
        setInterval(() => {
          const dx = target.x - pos.x
          const dz = target.z - pos.z
          const dist = Math.hypot(dx, dz)
          if (dist < 1) {
            target = randomSpot()
            return
          }
          const step = Math.min(dist, WALK_SPEED / TICK_RATE)
          pos.x += (dx / dist) * step
          pos.z += (dz / dist) * step
          const heading = Math.atan2(dx, dz)
          ws.send(JSON.stringify({ type: 'move', position: { x: pos.x, y: 0, z: pos.z }, heading }))
        }, 1000 / TICK_RATE),
      )
      // every tenth bot also chats, with the time in it, to measure the round trip
      if (n % 10 === 0) {
        timers.push(
          setInterval(() => ws.send(JSON.stringify({ type: 'chat', text: `${Date.now()}` })), 2000),
        )
      }
    } else if (!measuring) {
      return
    } else if (msg.type === 'state') {
      const now = performance.now()
      if (bot.lastState) bot.gaps.push(now - bot.lastState)
      bot.lastState = now
      bot.states++
      bot.bytes += text.length
    } else if (msg.type === 'chat' && msg.from === myId) {
      bot.rtts.push(Date.now() - Number(msg.text))
    }
  })

  return new Promise((resolve) => {
    // everyone leaves at the same time, so the numbers cover all of them being on
    setTimeout(() => {
      timers.forEach(clearInterval)
      timers = []
      ws.close()
      resolve(bot)
    }, end - Date.now())
  })
}

function percentile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
}

const statsUrl = URL.replace(/^ws/, 'http').replace(/\/ws$/, '/stats')

console.log(`${COUNT} bots, ${SECONDS}s, wandering ${AREA}m from hurt park, ${URL}`)

const RAMP = COUNT * 20 + 2000 // connecting one every 20ms, plus a bit to settle
const end = Date.now() + RAMP + SECONDS * 1000
const bots: Promise<Bot>[] = []
for (let i = 0; i < COUNT; i++) {
  bots.push(startBot(i, end))
  await new Promise((r) => setTimeout(r, 20)) // don't all connect in the same millisecond
}

// measure the middle of the test: everyone connected, nobody leaving yet
await new Promise((r) => setTimeout(r, RAMP - COUNT * 20))
// older servers don't have /stats, the bots' own numbers still work without it
const getStats = () =>
  fetch(statsUrl)
    .then((r) => r.json())
    .catch(() => null)
await getStats() // resets the server's counters
measuring = true
const measureFrom = performance.now()
await new Promise((r) => setTimeout(r, SECONDS * 1000 - 1000))
measuring = false
const measured = (performance.now() - measureFrom) / 1000
const server = await getStats()
const results = await Promise.all(bots)

const gaps = results.flatMap((b) => b.gaps)
const rtts = results.flatMap((b) => b.rtts)
const perBot = (f: (b: Bot) => number) => results.reduce((s, b) => s + f(b), 0) / results.length

console.table({
  'updates per second, per player': Math.round(perBot((b) => b.states) / measured),
  'download per player (KB/s)': Math.round(perBot((b) => b.bytes) / measured / 1024),
  'time between updates p50 (ms)': Math.round(percentile(gaps, 0.5)),
  'time between updates p99 (ms)': Math.round(percentile(gaps, 0.99)),
  'chat round trip p50 (ms)': Math.round(percentile(rtts, 0.5)),
  'chat round trip p99 (ms)': Math.round(percentile(rtts, 0.99)),
})
console.log('server:', JSON.stringify(server))
