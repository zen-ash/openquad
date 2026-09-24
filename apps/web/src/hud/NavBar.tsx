import { useEffect } from 'react'
import { localPlayer } from '../game/localPlayer'
import { minutes, stopNavigating, updateNav, useNav } from '../game/nav'

export default function NavBar() {
  const goal = useNav((s) => s.goal)
  const meters = useNav((s) => s.meters)
  const arrived = useNav((s) => s.arrived)

  useEffect(() => {
    const timer = setInterval(() => updateNav({ x: localPlayer.x, z: localPlayer.z }), 400)
    return () => clearInterval(timer)
  }, [])

  // "you've arrived" hangs around for a few seconds
  useEffect(() => {
    if (!arrived) return
    const timer = setTimeout(() => useNav.setState({ arrived: null }), 4000)
    return () => clearTimeout(timer)
  }, [arrived])

  if (arrived && !goal) {
    return <div className="navbar arrived">You've arrived at {arrived}</div>
  }
  if (!goal) return null
  return (
    <div className="navbar">
      <span className="to">{goal.label}</span>
      <span className="how">
        {Math.round(meters)} m &middot; {minutes(meters)} min walk
      </span>
      <button
        aria-label="Stop directions"
        onClick={(e) => (stopNavigating(), e.currentTarget.blur())}
      >
        &times;
      </button>
    </div>
  )
}
