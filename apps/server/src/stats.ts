import { monitorEventLoopDelay } from 'node:perf_hooks'

// numbers for /stats, mostly so the load test can see how the server is holding up
export class Stats {
  private ticks: number[] = []
  private bytes = 0
  private messages = 0
  private since = performance.now()
  private loop = monitorEventLoopDelay({ resolution: 10 })

  constructor() {
    this.loop.enable()
  }

  tick(ms: number) {
    this.ticks.push(ms)
    if (this.ticks.length > 1000) this.ticks.shift()
  }

  sent(bytes: number) {
    this.bytes += bytes
    this.messages++
  }

  // since the last report
  report(players: number) {
    const seconds = (performance.now() - this.since) / 1000
    const sorted = [...this.ticks].sort((a, b) => a - b)
    const pick = (q: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
    const round = (n: number) => Math.round(n * 100) / 100

    const out = {
      players,
      tickMs: {
        avg: round(sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1)),
        p99: round(pick(0.99)),
      },
      eventLoopLagMs: { p99: round(this.loop.percentile(99) / 1e6) },
      sent: {
        messagesPerSec: Math.round(this.messages / seconds),
        kbPerSec: Math.round(this.bytes / 1024 / seconds),
      },
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    }
    this.ticks = []
    this.bytes = this.messages = 0
    this.since = performance.now()
    this.loop.reset()
    return out
  }
}
