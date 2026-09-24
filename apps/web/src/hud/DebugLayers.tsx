import { TILES_KEY, useSettings } from '../settings'

type Layer = 'tiles' | 'extruded' | 'outlines'

const LAYERS: [Layer, string][] = [
  ['tiles', 'Google 3D tiles'],
  ['extruded', 'Our box buildings'],
  ['outlines', 'OSM outlines'],
]

// dev (or ?debug): turn the tiles and our own buildings on and off separately, to compare
// them and check they line up
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
            disabled={layer === 'tiles' && !TILES_KEY}
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
