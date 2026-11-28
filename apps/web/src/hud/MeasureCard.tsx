import { holdScreen, useMeasure } from '../net/measure'

const s = (ms: number | null | undefined) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)} s`)

// what ?measure is doing, and what it found once it's done (net/measure.ts)
export default function MeasureCard() {
  const { report, at, of, sent, awake } = useMeasure()
  if (!report) return null
  const { load, samples, previous, errors } = report
  return (
    <div className="measure" role="status">
      {!report.done ? (
        <>
          <strong>Measuring this phone</strong>
          <p>
            Step {at} of {of}: {report.step}
          </p>
          <progress max={of} value={at} />
          <p>Leave it on this screen, it takes about 5 minutes.</p>
          {awake !== 'yes' && (
            <button type="button" onClick={() => void holdScreen()}>
              Keep the screen on
            </button>
          )}
        </>
      ) : (
        <>
          <strong>Done</strong>
          <p>
            {sent === 'sent'
              ? 'The results were sent.'
              : "Couldn't send the results: take a screenshot of this."}
          </p>
          <p>
            Ready in {s(load.ready)}, walking at {s(load.walking)} (server {s(load.server)},
            downloaded {((load.downloadKb ?? 0) / 1024).toFixed(1)} MB)
          </p>
          <table>
            <thead>
              <tr>
                <th>Spot</th>
                <th>Look</th>
                <th>fps</th>
                <th>1% low</th>
                <th>worst</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((x) => (
                <tr key={`${x.name}-${x.quality}`}>
                  <td>{x.name}</td>
                  <td>{x.quality}</td>
                  <td>{x.fps}</td>
                  <td>{x.low1} ms</td>
                  <td>{x.worst} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => location.reload()}>
            Run again
          </button>
        </>
      )}
      {previous && <p>The last run stopped at {previous.stoppedAt}.</p>}
      {errors.length > 0 && <p className="error">{errors.at(-1)}</p>}
    </div>
  )
}
