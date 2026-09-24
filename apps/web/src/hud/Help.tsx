import { useEffect, useState } from 'react'
import { isTouchScreen } from '../TouchControls'

const KEYS: [string, string][] = [
  ['W A S D', 'walk'],
  ['Shift', 'run'],
  ['Q / E or drag', 'turn the camera'],
  ['Scroll', 'zoom'],
  ['Enter', 'chat'],
  ['1-5', 'emotes'],
  ['M', 'mute'],
  ['P', 'photo mode'],
  ['H', 'show / hide this'],
]

export default function Help() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'KeyH' || e.target instanceof HTMLInputElement) return
      setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (isTouchScreen) return null
  return (
    <div className="help">
      {open ? (
        <dl>
          {KEYS.map(([k, what]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <span className="hint">H for controls</span>
      )}
    </div>
  )
}
