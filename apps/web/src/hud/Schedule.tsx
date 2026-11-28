import { useMemo, useState } from 'react'
import { localPlayer } from '../game/localPlayer'
import { navigateTo } from '../game/nav'
import { placeNamed, search } from '../game/places'
import { setDay, useDay, walks, type Class } from '../game/schedule'
import { usePanel } from './panels'

// "my day": your classes in order, the walk between each and whether it fits
export default function Schedule() {
  const day = useDay((s) => s.day)
  const [query, setQuery] = useState('')
  const found = useMemo(() => (query.trim() ? search(query).slice(0, 4) : []), [query])
  const legs = useMemo(() => walks(day), [day])

  const change = (i: number, c: Partial<Class>) =>
    setDay(day.map((d, j) => (j === i ? { ...d, ...c } : d)))
  const add = (place: string) => {
    setDay([...day, { place, start: '', end: '' }])
    setQuery('')
  }
  const go = (place: string) => {
    const p = placeNamed(place)
    if (!p) return
    navigateTo(p.label, p.spot, { x: localPlayer.x, z: localPlayer.z }, true)
    usePanel.setState({ open: null })
  }

  return (
    <section className="day" aria-label="My day">
      <p className="hint">
        Your classes in order. It works out the walks in between. Kept on this device only.
      </p>
      <ol>
        {day.map((c, i) => {
          const leg = legs[i - 1]
          return (
            <li key={i}>
              {leg && (
                <div className={`walk ${leg.late ? 'late' : leg.tight ? 'tight' : ''}`}>
                  {leg.walk ? `${leg.walk} min walk` : 'Same building'}
                  {leg.gap !== null && <> &middot; {leg.gap} min between</>}
                  {leg.late && <strong> &middot; Not enough time</strong>}
                  {leg.tight && <strong> &middot; Only just</strong>}
                </div>
              )}
              <div className="class">
                <span className="name">{c.place}</span>
                <input
                  type="time"
                  aria-label={`${c.place} starts`}
                  value={c.start}
                  onChange={(e) => change(i, { start: e.target.value })}
                />
                <input
                  type="time"
                  aria-label={`${c.place} ends`}
                  value={c.end}
                  onChange={(e) => change(i, { end: e.target.value })}
                />
                <button className="go" onClick={() => go(c.place)}>
                  Go
                </button>
                <button
                  className="plain"
                  aria-label={`Remove ${c.place}`}
                  onClick={() => setDay(day.filter((_, j) => j !== i))}
                >
                  &times;
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <input
        className="places-search"
        type="search"
        aria-label="Add a class"
        placeholder={day.length ? 'Add the next class, like Aderhold' : 'Add your first class'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && found[0]) add(found[0].label)
        }}
      />
      {found.length > 0 && (
        <ul className="found">
          {found.map((p) => (
            <li key={p.label}>
              <button onClick={() => add(p.label)}>{p.label}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
