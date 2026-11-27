import { useEffect, useState } from 'react'
import { walker } from '../settings'
import { isTouchScreen } from '../TouchControls'

const KEYS: [string, string][] = [
  ['W A S D', 'walk'],
  ['Shift', 'run'],
  ['Q / E or drag', 'turn the camera'],
  ['Scroll', 'zoom'],
  ['G', 'directions to a building'],
  ['Enter', 'chat'],
  ['1-5', 'emotes'],
  ['M', 'mute'],
  ['P', 'photo mode'],
  ['H', 'show / hide this'],
]

const BIKE: [string, string] = ['B', 'bike on / off']
// the bean has a bike
const BEAN_KEYS = [...KEYS.slice(0, 2), BIKE, ...KEYS.slice(2)]

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
          {(walker ? KEYS : BEAN_KEYS).map(([k, what]) => (
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
