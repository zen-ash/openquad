import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { TICK_RATE } from '@quad/shared'
import { WebSocketServer, WebSocket } from 'ws'
import { parseMessage } from './messages'
import { Room } from './room'

export function startServer(port: number) {
  const room = new Room()

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, players: room.size }))
      return
    }
    res.writeHead(404).end()
  })

  const wss = new WebSocketServer({ server: http })

  wss.on('connection', (socket) => {
    const id = randomUUID()
    let joined = false

    const send = (msg: unknown) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg))
    }

    socket.on('message', (raw) => {
      const msg = parseMessage(raw.toString())
      if (!msg) return

      if (msg.type === 'join') {
        if (joined) return
        joined = true
        room.join(id, msg.name, send)
        return
      }
      if (!joined) return

      if (msg.type === 'move') room.move(id, msg.position, msg.heading)
      else if (msg.type === 'signal') room.relaySignal(id, msg.to, msg.data)
    })

    socket.on('close', () => room.leave(id))
  })

  const timer = setInterval(() => room.tick(), 1000 / TICK_RATE)

  return new Promise<{ http: Server; close: () => Promise<void> }>((resolve) => {
    http.listen(port, () => {
      resolve({
        http,
        close: () =>
          new Promise((done) => {
            clearInterval(timer)
            for (const client of wss.clients) client.terminate()
            wss.close()
            http.close(() => done())
          }),
      })
    })
  })
}
