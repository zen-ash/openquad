import { useGame } from '../net/store'
import { game, showDebug, useSettings } from '../settings'
import Clock from './Clock'
import Compass from './Compass'
import Fps from './Fps'
import Help from './Help'
import LocationTitle from './LocationTitle'
import Quest from './Quest'
import { usePlace } from './usePlace'

export default function Hud() {
  const online = useGame((s) => Object.keys(s.players).length + 1)
  const { place, nearby } = usePlace()
  const bike = useSettings((s) => s.bike)

  return (
    <>
      <div className="hud">
        <div className="place">{place.name}</div>
        <div className="sub">{place.sub}</div>
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
      {game && <Quest place={place} />}
      <LocationTitle place={place} />
      <Help />
    </>
  )
}
