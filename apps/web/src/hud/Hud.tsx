import { useGame } from '../net/store'
import { game, showDebug, useSettings } from '../settings'
import Clock from './Clock'
import Compass from './Compass'
import Fps from './Fps'
import Help from './Help'
import { placeNamed } from '../game/places'
import { showCard } from './PlaceCard'
import Tour from './Tour'
import { useTour } from '../game/tours'
import LocationTitle from './LocationTitle'
import Quest from './Quest'
import { usePlace } from './usePlace'

export default function Hud() {
  const online = useGame((s) => Object.keys(s.players).length + 1)
  const { place, nearby } = usePlace()
  const bike = useSettings((s) => s.bike)
  const touring = useTour((s) => s.id !== null)

  return (
    <>
      <div className="hud">
        <div className="place">{place.name}</div>
        <div className="sub">
          {place.sub}
          {placeNamed(place.name)?.card && (
            <button className="about" onClick={() => showCard(place.name)}>
              What's here
            </button>
          )}
        </div>
        <div className="people">
          <span className="dot" />
          <span>{online} online</span>
          {nearby > 0 && <span className="nearby">&middot; {nearby} can hear you</span>}
          {bike && <span className="bike">Bike</span>}
          {showDebug && <Fps />}
        </div>
      </div>
      <Compass />
      <Clock />
      {/* a tour has the spot the game look's own little tour would be in */}
      {touring ? <Tour /> : game && <Quest place={place} />}
      <LocationTitle place={place} />
      {/* the tour has its spot */}
      {!touring && <Help />}
    </>
  )
}
