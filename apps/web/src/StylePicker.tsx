import { style, switchStyle, type Style } from './settings'

// the game look, photo-real or cartoon. reloads the page (settings.ts switchStyle)
export default function StylePicker() {
  return (
    <select
      className="view-option"
      aria-label="Style"
      value={style}
      onChange={(e) => switchStyle(e.target.value as Style)}
    >
      <option value="game">Game</option>
      <option value="real">Realistic</option>
      <option value="toon">Cartoon</option>
    </select>
  )
}
