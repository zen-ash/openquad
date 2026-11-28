// phones measuring themselves (?measure in the web app) send what they found after each
// step. kept in memory until the server restarts, newest last, GET /measure lists them

const MAX = 50
export const MAX_BYTES = 64 * 1024

export class Reports {
  private byId = new Map<string, object>()

  /** a report as sent, false if it isn't one */
  add(json: string) {
    let report: unknown
    try {
      report = JSON.parse(json)
    } catch {
      return false
    }
    const id = (report as { id?: unknown } | null)?.id
    if (typeof id !== 'string' || !/^[a-z0-9]{1,16}$/.test(id)) return false
    // a later step of the same run replaces it and moves it to the end
    this.byId.delete(id)
    this.byId.set(id, { received: new Date().toISOString(), ...(report as object) })
    if (this.byId.size > MAX) this.byId.delete(this.byId.keys().next().value!)
    return true
  }

  list() {
    return [...this.byId.values()]
  }
}
