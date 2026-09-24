import { TIMES, useSettings, type TimeOfDay } from './settings'

const LABELS: Record<TimeOfDay, string> = {
  live: 'Live (Atlanta time)',
  morning: 'Morning',
  noon: 'Noon',
  sunset: 'Sunset',
  night: 'Night',
}

export default function TimePicker() {
  const time = useSettings((s) => s.time)
  return (
    <select
      className="time-picker"
      aria-label="Time of day"
      value={time}
      onChange={(e) => {
        useSettings.setState({ time: e.target.value })
        e.currentTarget.blur() // so walking keys don't change it
      }}
    >
      {!TIMES.includes(time as TimeOfDay) && <option value={time}>{time}</option>}
      {TIMES.map((t) => (
        <option key={t} value={t}>
          {LABELS[t]}
        </option>
      ))}
    </select>
  )
}
