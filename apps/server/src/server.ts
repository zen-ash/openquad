import { existsSync } from 'node:fs'
import { createServer, type Server, type ServerResponse } from 'node:http'
import { TICK_RATE } from '@quad/shared'
import sirv from 'sirv'
import { WebSocketServer, WebSocket } from 'ws'
import { getIceServers } from './ice'
import { parseMessage } from './messages'
import { Room } from './room'
import { Stats } from './stats'

type Options = {
  // built web app to serve. in dev vite serves it instead
  webDir?: string
  // how often to check for dead connections (laptop closed, wifi dropped)
  heartbeatMs?: number
}

// short ids instead of uuids, they're in every position update (a uuid alone was 36
// of the ~110 bytes). only need to be unique while the server's running
let nextId = 0

// without these browsers guess how long to keep files, and kept showing the old site for a
// while after a deploy
function setHeaders(res: ServerResponse, pathname: string) {
  // vite puts a hash in these names, a new build never reuses one
  if (pathname.startsWith('/assets/')) {
    res.setHeader('cache-control', 'public, max-age=31536000, immutable')
  } else {
    // index.html, models, textures: ask every time. the etag makes that a quick 304 when
    // nothing changed
    res.setHeader('cache-control', 'no-cache')
  }
}

export function startServer(port: number, { webDir, heartbeatMs = 30_000 }: Options = {}) {
  const room = new Room()
  const stats = new Stats()
  const serveWeb =
    webDir && existsSync(webDir) ? sirv(webDir, { single: true, etag: true, setHeaders }) : null

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, players: room.size }))
      return
    }
    if (req.url === '/stats') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(stats.report(room.size)))
      return
    }
    if (req.url === '/ice') {
      void getIceServers().then((servers) => {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        res.end(JSON.stringify(servers))
      })
      return
    }
    if (serveWeb) return serveWeb(req, res)
    res.writeHead(404).end()
  })

  const wss = new WebSocketServer({ server: http, path: '/ws' })
  const alive = new WeakMap<WebSocket, boolean>()

  wss.on('connection', (socket) => {
    const id = (nextId++).toString(36)
    let joined = false

    alive.set(socket, true)
    socket.on('pong', () => alive.set(socket, true))

    const send = (msg: unknown) => {
      if (socket.readyState !== WebSocket.OPEN) return
      const json = JSON.stringify(msg)
      socket.send(json)
      stats.sent(json.length)
    }

    socket.on('message', (raw) => {
      const msg = parseMessage(raw.toString())
      if (!msg) return

      if (msg.type === 'join') {
        if (joined) return
        joined = true
        room.join(id, msg.name, msg.avatar, send, msg.position)
        return
      }
      if (!joined) return

      if (msg.type === 'move') room.move(id, msg.position, msg.heading)
      else if (msg.type === 'signal') room.relaySignal(id, msg.to, msg.data)
      else if (msg.type === 'chat') room.chat(id, msg.text)
      else if (msg.type === 'emote') room.emote(id, msg.name)
    })

    socket.on('close', () => room.leave(id))
  })

  const tick = setInterval(() => {
    const start = performance.now()
    room.tick()
    stats.tick(performance.now() - start)
  }, 1000 / TICK_RATE)

  // browsers answer pings on their own, even in background tabs. no answer since
  // the last ping = gone, so kick them instead of leaving a frozen player around
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.get(socket)) {
        socket.terminate()
        continue
      }
      alive.set(socket, false)
      socket.ping()
    }
  }, heartbeatMs)

  return new Promise<{ http: Server; close: () => Promise<void> }>((resolve) => {
    http.listen(port, () => {
      resolve({
        http,
        close: () =>
          new Promise((done) => {
            clearInterval(tick)
            clearInterval(heartbeat)
            for (const client of wss.clients) client.terminate()
            wss.close()
            http.close(() => done())
          }),
      })
    })
  })
}
