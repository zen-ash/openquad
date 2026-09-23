import { MAX_NAME_LENGTH } from '@quad/shared'
import { useState, type FormEvent } from 'react'
import { connect } from './net/connection'
import { useGame } from './net/store'
import { startMic } from './voice/voice'

function savedName() {
  try {
    return localStorage.getItem('name') ?? ''
  } catch {
    return ''
  }
}

export default function JoinScreen() {
  const status = useGame((s) => s.status)
  const [name, setName] = useState(savedName)

  function join(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      localStorage.setItem('name', trimmed)
    } catch {
      // private mode etc, not a big deal
    }
    startMic()
    connect(trimmed)
  }

  return (
    <div className="overlay">
      <form className="card" onSubmit={join}>
        <h1>OpenQuad</h1>
        <p className="tagline">Georgia State's campus, online. Walk up to people to talk.</p>
        {status === 'disconnected' && <p className="error">Lost connection to the server.</p>}
        <label htmlFor="name">What's your name?</label>
        <input
          id="name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          autoComplete="off"
        />
        <button disabled={!name.trim() || status === 'connecting'}>
          {status === 'connecting' ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  )
}
