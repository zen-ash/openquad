import { useEffect, useRef } from 'react'

// frames per second, dev and ?debug only. written straight into the dom twice a second,
// react state every frame would cost frames itself
export default function Fps() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let frames = 0
    let start = performance.now()
    let id = requestAnimationFrame(function tick(now) {
      frames++
      if (now - start > 500 && ref.current) {
        const ms = (now - start) / frames
        ref.current.textContent = `${Math.round(1000 / ms)} fps · ${ms.toFixed(1)} ms`
        frames = 0
        start = now
      }
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [])
  return <span className="fps" ref={ref} />
}
