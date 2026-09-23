import { useEffect } from 'react'
import { useGame } from '../net/store'
import { useVoice } from './store'
import { setMuted } from './voice'

export default function MicButton() {
  const mic = useVoice((s) => s.mic)
  const muted = useVoice((s) => s.muted)
  const myId = useGame((s) => s.me?.id)
  const talking = useVoice((s) => (myId ? (s.speaking[myId] ?? false) : false))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'KeyM' || e.repeat) return
      if (e.target instanceof HTMLInputElement) return
      setMuted(!useVoice.getState().muted)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (mic === 'blocked') {
    return <div className="mic blocked">No mic - you can still listen</div>
  }

  return (
    <button
      className={`mic ${muted ? 'muted' : ''} ${talking ? 'talking' : ''}`}
      disabled={mic === 'pending'}
      onClick={() => setMuted(!muted)}
    >
      {mic === 'pending' ? 'Starting mic...' : muted ? 'Muted (M)' : 'Mic on (M)'}
    </button>
  )
}
