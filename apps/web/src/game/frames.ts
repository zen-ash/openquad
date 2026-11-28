// frame times from a timing run (net/measure.ts) boiled down to the numbers that say how it
// felt: not just the middle frame, the slow ones too

export type Summary = {
  frames: number
  fps: number
  // ms: the middle frame, the mean of the worst 1% and 0.1%, the worst one
  median: number
  low1: number
  low01: number
  worst: number
  // frames that missed a 60hz refresh, and ones that are a visible hitch
  over25: number
  over50: number
}

export const round = (n: number) => Math.round(n * 10) / 10

/** frame times (ms) to the numbers we care about */
export function summarize(ms: number[]): Summary {
  const sorted = [...ms].sort((a, b) => a - b)
  const n = sorted.length
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length)
  const worstOf = (part: number) => mean(sorted.slice(n - Math.max(1, Math.round(n * part))))
  const total = sorted.reduce((s, x) => s + x, 0)
  return {
    frames: n,
    fps: round(total ? (n * 1000) / total : 0),
    median: round(sorted[Math.floor(n / 2)] ?? 0),
    low1: round(n ? worstOf(0.01) : 0),
    low01: round(n ? worstOf(0.001) : 0),
    worst: round(sorted[n - 1] ?? 0),
    over25: sorted.filter((x) => x > 25).length,
    over50: sorted.filter((x) => x > 50).length,
  }
}
