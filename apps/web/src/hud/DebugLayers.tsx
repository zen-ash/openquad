import { useState } from 'react'
import { fx, TONE_MAPPINGS } from '../scene/fx'
import { TILES_KEY, useSettings } from '../settings'

type Layer = 'tiles' | 'extruded' | 'tilesInside' | 'outlines' | 'fenceLine'

const LAYERS: [Layer, string][] = [
  ['tiles', 'Google 3D tiles'],
  ['extruded', 'Our buildings outside'],
  ['tilesInside', 'Tiles inside the fence'],
  ['outlines', 'OSM outlines'],
  ['fenceLine', 'Fence line'],
]

const EFFECTS: [keyof typeof fx, string][] = [
  ['ao', 'Ambient occlusion'],
  ['contact', 'Contact shadows'],
  ['haze', 'Haze'],
  ['sharpen', 'Sharpening'],
  ['aberration', 'Color fringes'],
  ['glare', 'Glare'],
  ['vignette', 'Vignette'],
  ['saturation', 'Camera saturation'],
  ['exposure', 'Auto exposure'],
]

// dev (or ?debug): turn the tiles and our own buildings on and off separately, to compare
// them and check they line up. inside the fence it's always our buildings. and each of
// the effects, to see what it does
export default function DebugLayers() {
  const atmosphere = useSettings((s) => s.atmosphere)
  return (
    <div className="debug-panel">
      <Layers />
      {atmosphere && <Effects />}
    </div>
  )
}

function Layers() {
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

function Effects() {
  const taa = useSettings((s) => s.taa)
  const [on, setOn] = useState(() => EFFECTS.map(([key]) => fx[key].value > 0.5))
  const mapping = useSettings((s) => s.toneMapping)
  return (
    <fieldset className="debug-layers">
      <legend>Effects</legend>
      <label>
        <input
          type="checkbox"
          checked={taa}
          onChange={(e) => {
            // taa off puts the picture together differently, the shaders get rebuilt
            useSettings.setState({ taa: e.target.checked })
            e.currentTarget.blur()
          }}
        />
        TAA
      </label>
      {EFFECTS.map(([key, label], i) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={on[i]}
            onChange={(e) => {
              fx[key].value = e.target.checked ? 1 : 0
              setOn(on.map((v, j) => (j === i ? e.target.checked : v)))
              e.currentTarget.blur()
            }}
          />
          {label}
        </label>
      ))}
      <label>
        Tone mapping
        <select
          value={mapping}
          onChange={(e) => {
            // rebuilds the effects too
            useSettings.setState({ toneMapping: e.target.value as typeof mapping })
            e.currentTarget.blur()
          }}
        >
          {Object.keys(TONE_MAPPINGS).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}
