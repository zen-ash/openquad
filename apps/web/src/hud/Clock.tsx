import { useEffect, useState } from 'react'
import { timeFor } from '../game/sun'
import { useSettings } from '../settings'

const format = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  minute: '2-digit',
})

export default function Clock() {
  const setting = useSettings((s) => s.time)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(timer)
  }, [])

  return <div className="clock">{format.format(timeFor(setting, now))}</div>
}
