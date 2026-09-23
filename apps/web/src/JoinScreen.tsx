import { AVATAR_IDS, MAX_NAME_LENGTH } from '@quad/shared'
import { useState, type FormEvent } from 'react'
import { connect } from './net/connection'
import { useGame } from './net/store'
import { startMic } from './voice/voice'

// for screen readers and the tests, the thumbnails say the rest
const DESCRIPTIONS: Record<string, string> = {
  male_09: 'black t-shirt',
  female_01: 'pink shirt',
  male_17: 'blue jacket',
  female_17: 'green top',
  male_01: 'striped polo',
  female_05: 'pink blazer',
}

function saved(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // private mode etc, not a big deal
  }
}

export default function JoinScreen() {
  const status = useGame((s) => s.status)
  const [name, setName] = useState(() => saved('name', ''))
  const [firstPick] = useState(() => {
    const last = saved('avatar', AVATAR_IDS[0]!)
    return AVATAR_IDS.includes(last) ? last : AVATAR_IDS[0]!
  })

  function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    // read the avatar straight from the form, not from react state. while the city is
    // loading react can be a second behind, and clicking an avatar then join quickly
    // used to join with the old one. the browser updates a real radio button right away
    const avatar = String(new FormData(e.currentTarget).get('avatar') ?? firstPick)
    save('name', trimmed)
    save('avatar', avatar)
    startMic()
    connect(trimmed, avatar)
  }

  return (
    <div className="overlay">
      <form className="card" onSubmit={join}>
        <h1>OpenQuad</h1>
        <p className="tagline">Georgia State's campus, online. Walk up to people to talk.</p>
        {status === 'disconnected' && <p className="error">Couldn't reach the server.</p>}

        <label htmlFor="name">What's your name?</label>
        <input
          id="name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          autoComplete="off"
        />

        <fieldset className="avatars">
          <legend className="label">Pick your look</legend>
          {AVATAR_IDS.map((id) => (
            <label key={id}>
              <input
                type="radio"
                name="avatar"
                value={id}
                defaultChecked={id === firstPick}
                aria-label={DESCRIPTIONS[id]}
              />
              <img src={`/models/people/thumbs/${id}.webp`} alt="" />
            </label>
          ))}
        </fieldset>

        <button type="submit" className="join" disabled={!name.trim() || status === 'connecting'}>
          {status === 'connecting' ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  )
}
