import { AVATAR_IDS, MAX_NAME_LENGTH } from '@quad/shared'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { beanOf } from './game/avatars'
import { wantOnJoin } from './game/links'
import { connect } from './net/connection'
import { useGame } from './net/store'
import { useSettings, walker } from './settings'
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

// the front page: what this is, and one tap to get in. a name and a look are up to you
export default function JoinScreen() {
  const status = useGame((s) => s.status)
  const warming = useSettings((s) => s.warming)
  const [built, asked] = useSettings((s) => s.built)
  const [name, setName] = useState(() => saved('name', ''))
  const [firstPick] = useState(() => {
    const last = saved('avatar', AVATAR_IDS[0]!)
    return AVATAR_IDS.includes(last) ? last : AVATAR_IDS[0]!
  })

  function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const typed = name.trim()
    if (typed) save('name', typed)
    // read the avatar straight from the form, not from react state. while the city is
    // loading react can be a second behind, and clicking an avatar then join quickly
    // used to join with the old one. the browser updates a real radio button right away
    const avatar = String(new FormData(e.currentTarget).get('avatar') ?? firstPick)
    save('avatar', avatar)
    // which button: explore, take a tour or find a building
    const go = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value
    wantOnJoin(go === 'tour' || go === 'find' ? go : null)
    startMic()
    connect(typed || `Visitor ${100 + Math.floor(Math.random() * 900)}`, avatar)
  }

  // waits for the shaders to be built (scene/WarmUp.tsx), or walking around hitches
  const busy = warming || status === 'connecting'
  return (
    <div className="overlay">
      <form className="card front" onSubmit={join}>
        <h1>OpenQuad</h1>
        <p className="tagline">
          Georgia State's downtown campus, built in 3D. Walk around, find any building and get
          walked there step by step, or meet people and talk.
        </p>
        {status === 'disconnected' && <p className="error">Couldn't reach the server.</p>}

        <div className="go-buttons">
          <button type="submit" className="join" name="go" value="explore" disabled={busy}>
            Explore
          </button>
          <button type="submit" className="join" name="go" value="tour" disabled={busy}>
            Take a tour
          </button>
          <button type="submit" className="join" name="go" value="find" disabled={busy}>
            Find a building
          </button>
        </div>
        <p className="status" aria-live="polite">
          {warming
            ? asked > 0
              ? `Getting the campus ready: ${built} of ${asked}`
              : 'Loading the campus...'
            : status === 'connecting'
              ? 'Joining...'
              : ''}
        </p>

        <label htmlFor="name">What's your name?</label>
        <input
          id="name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Optional"
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />

        <details className="look">
          <summary>Pick your look</summary>
          <fieldset className="avatars">
            <legend className="label">Pick your look</legend>
            {AVATAR_IDS.map((id) => (
              <label key={id}>
                <input
                  type="radio"
                  name="avatar"
                  value={id}
                  defaultChecked={id === firstPick}
                  aria-label={walker ? DESCRIPTIONS[id] : `${beanOf(id).name} bean`}
                />
                {!walker ? (
                  // everyone's a bean, drawn in css (styles.css .bean)
                  <span
                    className="bean"
                    style={
                      { '--body': beanOf(id).body, '--accent': beanOf(id).accent } as CSSProperties
                    }
                  >
                    <i />
                  </span>
                ) : (
                  <img src={`/models/people/thumbs/${id}.webp`} alt="" />
                )}
              </label>
            ))}
          </fieldset>
        </details>

        <p className="about">
          A student project for CSC 4370 at Georgia State. Not an official university site.
          Buildings and streets from OpenStreetMap.
        </p>
      </form>
    </div>
  )
}
