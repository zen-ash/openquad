import { style, switchStyle, type Style } from './settings'

// photo-real or cartoon. reloads the page (settings.ts switchStyle)
export default function StylePicker() {
  return (
    <select
      className="view-option"
      aria-label="Style"
      value={style}
      onChange={(e) => switchStyle(e.target.value as Style)}
    >
      <option value="real">Realistic</option>
      <option value="toon">Cartoon</option>
    </select>
  )
}
