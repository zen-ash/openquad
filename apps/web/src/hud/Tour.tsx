import { useEffect } from 'react'
import { localPlayer } from '../game/localPlayer'
import { whereIs } from '../game/location'
import { useNav } from '../game/nav'
import {
  arrive,
  endTour,
  nextStop,
  startTour,
  tourNamed,
  TOURS,
  useTour,
  walkToStop,
} from '../game/tours'
import { showCard } from './PlaceCard'
import { usePanel } from './panels'

// the tour you're on: where you're heading, a line about it, and on to the next stop
export default function Tour() {
  const id = useTour((s) => s.id)
  const n = useTour((s) => s.stop)
  const arrived = useTour((s) => s.arrived)
  const goal = useNav((s) => s.goal)
  const auto = useNav((s) => s.auto)
  const tour = id ? tourNamed(id) : undefined
  const stop = tour?.stops[n]

  // there by walking up to it, or by the nav bar's "you've arrived"
  useEffect(() => {
    if (!stop) return
    const timer = setInterval(() => {
      const here = whereIs(localPlayer.x, localPlayer.z).name
      if (useNav.getState().arrived === stop.place || here === stop.place) arrive(stop.place)
    }, 400)
    return () => clearInterval(timer)
  }, [stop])

  // what's there comes up when you get there
  useEffect(() => {
    if (arrived && stop) showCard(stop.place)
  }, [arrived, stop])

  if (!tour) return null
  const walking = auto && goal?.label === stop?.place
  const last = n === tour.stops.length - 1
  return (
    <section className="tour" aria-label="Tour">
      <div className="head">
        <span>{tour.name}</span>
        <span className="count">{stop ? `Stop ${n + 1} of ${tour.stops.length}` : 'Done'}</span>
      </div>
      {stop ? (
        <>
          <h3>{stop.place}</h3>
          <p>{stop.say}</p>
          <div className="actions">
            {arrived ? (
              <button className="go" onClick={nextStop}>
                {last ? 'Finish' : 'Next stop'}
              </button>
            ) : walking ? (
              <span className="on-the-way">On the way...</span>
            ) : (
              <button className="go" onClick={walkToStop}>
                Take me there
              </button>
            )}
            {!arrived && !last && (
              <button className="plain" onClick={nextStop}>
                Skip
              </button>
            )}
            <button className="plain" onClick={endTour}>
              End tour
            </button>
          </div>
        </>
      ) : (
        <>
          <p>That's the tour. Search for any other building with Places.</p>
          <div className="actions">
            <button className="go" onClick={endTour}>
              Close
            </button>
          </div>
        </>
      )}
      <div className="dots" aria-hidden>
        {tour.stops.map((s, i) => (
          <i key={s.place} className={i < n || (i === n && arrived) ? 'done' : ''} />
        ))}
      </div>
    </section>
  )
}

// the tours you can take, in the panel under the Tours button
export function ToursList() {
  const id = useTour((s) => s.id)
  const n = useTour((s) => s.stop)
  return (
    <section className="tours" aria-label="Tours">
      {TOURS.map((t) => {
        const going = id === t.id && n < t.stops.length
        return (
          <div key={t.id} className="tour-pick">
            <h3>{t.name}</h3>
            <p>
              {t.about} {t.stops.length} stops.
            </p>
            <button
              className="go"
              onClick={() => {
                usePanel.setState({ open: null })
                if (going) walkToStop()
                else startTour(t.id)
              }}
            >
              {going ? `Carry on (stop ${n + 1})` : 'Start the tour'}
            </button>
          </div>
        )
      })}
    </section>
  )
}
