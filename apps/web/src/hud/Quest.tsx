import { useEffect } from 'react'
import { STARS, useStars } from '../game/collectibles'
import { localPlayer } from '../game/localPlayer'
import type { Place } from '../game/location'
import { navigateTo } from '../game/nav'
import { progress, QUEST, setStep, useQuest } from '../game/quest'
import { fanfare } from '../game/sounds'
import Confetti from './Confetti'

// the game look's tour of campus and the star count, under the place name
export default function Quest({ place }: { place: Place }) {
  const step = useQuest((s) => s.step)
  const done = useQuest((s) => s.done)
  const stars = useStars((s) => s.got.length)

  useEffect(() => {
    const next = progress(step, place.name, stars)
    if (next === step) return
    setStep(next)
    useQuest.setState({ done: { text: QUEST[step]!.text, key: Date.now() } })
    fanfare()
  }, [step, place, stars])

  // the "done!" goes away after a bit
  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => useQuest.setState({ done: null }), 3200)
    return () => clearTimeout(timer)
  }, [done])

  const current = QUEST[step]
  const spot = current?.spot
  return (
    <>
      <div className="quest">
        {/* key: it bounces each time one's picked up */}
        <div className="stars" key={stars}>
          <span className="star-icon" aria-hidden>
            &#9733;
          </span>
          {stars} / {STARS.length}
        </div>
        <div className="step">
          {current ? (
            <>
              <span className="count">
                {step + 1}/{QUEST.length}
              </span>
              {current.text}
              {spot && (
                <button
                  onClick={(e) => {
                    navigateTo(current.place!, spot, { x: localPlayer.x, z: localPlayer.z })
                    e.currentTarget.blur()
                  }}
                >
                  Show me
                </button>
              )}
            </>
          ) : (
            'Tour done! Can you find every star?'
          )}
        </div>
      </div>
      {done && (
        <div key={done.key}>
          <div className="quest-done">
            <div className="big">Nice!</div>
            <div>{done.text}</div>
          </div>
          <Confetti />
        </div>
      )}
    </>
  )
}
