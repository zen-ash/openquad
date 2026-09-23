import { EMOTES } from '@quad/shared'
import { useEffect } from 'react'
import { send } from './net/connection'

function emote(name: string) {
  send({ type: 'emote', name })
}

// 1-5 on the keyboard, or tap them
export default function EmoteBar() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat || e.target instanceof HTMLInputElement) return
      const name = EMOTES[Number(e.key) - 1]
      if (name) emote(name)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="emotes" role="toolbar" aria-label="Emotes">
      {EMOTES.map((name, i) => (
        <button key={name} onClick={(e) => (emote(name), e.currentTarget.blur())}>
          <kbd>{i + 1}</kbd> {name}
        </button>
      ))}
    </div>
  )
}
