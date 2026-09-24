// where the sun is over GSU at a given moment. standard solar position formulas
// (same approach as the SunCalc library), good to well under a degree
const LAT = (33.7542 * Math.PI) / 180
const LON = -84.3854

const RAD = Math.PI / 180
const DAY_MS = 86_400_000
const J2000 = 2451545

/** altitude (0 = horizon, + is up) and azimuth (0 = south, + toward west), in radians */
export function sunPosition(date: Date) {
  const days = date.getTime() / DAY_MS + 2440587.5 - J2000

  const meanAnomaly = RAD * (357.5291 + 0.98560028 * days)
  const center =
    RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly))
  const eclipticLon = meanAnomaly + center + RAD * 102.9372 + Math.PI
  const tilt = RAD * 23.4397

  const declination = Math.asin(Math.sin(tilt) * Math.sin(eclipticLon))
  const rightAscension = Math.atan2(Math.sin(eclipticLon) * Math.cos(tilt), Math.cos(eclipticLon))
  const siderealTime = RAD * (280.16 + 360.9856235 * days) + LON * RAD
  const hourAngle = siderealTime - rightAscension

  const altitude = Math.asin(
    Math.sin(LAT) * Math.sin(declination) +
      Math.cos(LAT) * Math.cos(declination) * Math.cos(hourAngle),
  )
  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(LAT) - Math.tan(declination) * Math.cos(LAT),
  )
  return { altitude, azimuth }
}

/** unit vector pointing at the sun in game space (north is -z, east is +x) */
export function sunDirection(date: Date): [number, number, number] {
  const { altitude, azimuth } = sunPosition(date)
  const flat = Math.cos(altitude)
  return [-Math.sin(azimuth) * flat, Math.sin(altitude), Math.cos(azimuth) * flat]
}

/** 1 in full daylight, 0 at night, fading through dusk/dawn */
export function daylight(altitude: number) {
  const t = (altitude / RAD + 6) / 12 // -6deg (end of dusk) .. +6deg
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * (3 - 2 * clamped)
}

// how many minutes atlanta is off UTC right now (-240 in summer, -300 in winter)
function atlantaOffset(date: Date) {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')!.value // like "GMT-4"
  const [, sign, hours, minutes] = /GMT([+-])(\d+)(?::(\d+))?/.exec(name) ?? []
  if (!sign) return 0
  return (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes ?? 0))
}

/** today (in atlanta) at hh:mm atlanta time */
export function atlantaTime(hours: number, minutes: number, now = new Date()) {
  const offset = atlantaOffset(now)
  const local = new Date(now.getTime() + offset * 60_000)
  const utc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    hours,
    minutes,
  )
  return new Date(utc - offset * 60_000)
}

// about when the sun is setting today: the last time before 9pm it's still 2 degrees up
function sunsetToday(now: Date) {
  for (let m = 21 * 60; m > 12 * 60; m -= 5) {
    const t = atlantaTime(Math.floor(m / 60), m % 60, now)
    if (sunPosition(t).altitude > 2 * RAD) return t
  }
  return atlantaTime(19, 0, now)
}

/** the moment to light the scene for, for each time of day setting */
export function timeFor(setting: string, now = new Date()) {
  const clock = /^(\d{1,2}):(\d{2})$/.exec(setting) // exact times like 09:00, for screenshots
  if (clock) return atlantaTime(Number(clock[1]), Number(clock[2]), now)
  if (setting === 'morning') return atlantaTime(8, 30, now)
  if (setting === 'noon') return atlantaTime(13, 30, now)
  if (setting === 'sunset') return sunsetToday(now)
  if (setting === 'night') return atlantaTime(22, 0, now)
  return now
}
