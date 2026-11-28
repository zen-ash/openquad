import { useEffect } from 'react'
import { followLinks } from '../game/links'
import { localPlayer } from '../game/localPlayer'
import { minutes, stopNavigating, updateNav, useNav } from '../game/nav'
import { showCard } from './PlaceCard'

export default function NavBar() {
  const goal = useNav((s) => s.goal)
  const meters = useNav((s) => s.meters)
  const arrived = useNav((s) => s.arrived)
  const auto = useNav((s) => s.auto)

  useEffect(() => {
    // a ?to= or ?at= link from an email or a qr code
    followLinks()
    const timer = setInterval(() => updateNav({ x: localPlayer.x, z: localPlayer.z }), 400)
    return () => clearInterval(timer)
  }, [])

  // "you've arrived" hangs around for a few seconds, and up comes what's there
  useEffect(() => {
    if (!arrived) return
    showCard(arrived)
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
        className="auto"
        onClick={(e) => (useNav.setState({ auto: !auto }), e.currentTarget.blur())}
      >
        {auto ? 'Pause' : 'Take me there'}
      </button>
      <button
        className="stop"
        aria-label="Stop directions"
        onClick={(e) => (stopNavigating(), e.currentTarget.blur())}
      >
        &times;
      </button>
    </div>
  )
}
