import { TILES_KEY, useSettings } from '../settings'

type Layer = 'tiles' | 'extruded' | 'tilesInside' | 'outlines' | 'fenceLine'

const LAYERS: [Layer, string][] = [
  ['tiles', 'Google 3D tiles'],
  ['extruded', 'Our buildings outside'],
  ['tilesInside', 'Tiles inside the fence'],
  ['outlines', 'OSM outlines'],
  ['fenceLine', 'Fence line'],
]

// dev (or ?debug): turn the tiles and our own buildings on and off separately, to compare
// them and check they line up. inside the fence it's always our buildings
export default function DebugLayers() {
  const settings = useSettings()
  return (
    <fieldset className="debug-layers">
      <legend>Layers</legend>
      {LAYERS.map(([layer, label]) => (
        <label key={layer}>
          <input
            type="checkbox"
            checked={settings[layer]}
            disabled={(layer === 'tiles' || layer === 'tilesInside') && !TILES_KEY}
            onChange={(e) => {
              useSettings.setState({ [layer]: e.target.checked })
              e.currentTarget.blur() // so walking keys don't flip it
            }}
          />
          {label}
        </label>
      ))}
    </fieldset>
  )
}
