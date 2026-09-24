import { useSettings } from './settings'

// high quality draws the scene at most 1920x1200 and taa scales it up to the screen
// (scene/Effects.tsx). native draws every pixel of a retina screen, about twice the work
export default function ResolutionPicker() {
  const native = useSettings((s) => s.native)
  const shown = useSettings((s) => s.atmosphere && s.quality === 'high')
  if (!shown) return null
  return (
    <select
      className="view-option"
      aria-label="Resolution"
      value={native ? 'native' : 'capped'}
      onChange={(e) => {
        const on = e.target.value === 'native'
        useSettings.setState({ native: on })
        try {
          localStorage.setItem('native', on ? '1' : '0')
        } catch {
          // private mode, it just won't be remembered
        }
        e.currentTarget.blur() // so walking keys don't change it
      }}
    >
      <option value="capped">Up to 1920x1200</option>
      <option value="native">Native resolution</option>
    </select>
  )
}
