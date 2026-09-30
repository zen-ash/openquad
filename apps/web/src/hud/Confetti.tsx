// a burst of confetti over the screen, plain css. same pieces every time, the "random" is
// worked out from the index
const COLORS = ['#2a6cff', '#ffd23f', '#ff6fa8', '#5cc254', '#ffffff', '#ff8a4c']
const PIECES = Array.from({ length: 70 }, (_, i) => {
  const r = (salt: number) => {
    const n = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
    return n - Math.floor(n)
  }
  return {
    left: `${r(1) * 100}%`,
    color: COLORS[i % COLORS.length],
    delay: `${r(2) * 0.4}s`,
    time: `${1.6 + r(3) * 1.2}s`,
    drift: `${(r(4) - 0.5) * 30}vw`,
    spin: `${(r(5) - 0.5) * 1440}deg`,
    wide: r(6) > 0.5,
  }
})

export default function Confetti() {
  return (
    <div className="confetti" aria-hidden>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={p.wide ? 'wide' : undefined}
          style={
            {
              left: p.left,
              background: p.color,
              animationDelay: p.delay,
              animationDuration: p.time,
              '--drift': p.drift,
              '--spin': p.spin,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
