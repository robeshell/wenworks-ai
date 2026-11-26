// An issue covers one week, Monday 00:00 to Sunday 24:00 in Asia/Taipei.
// Taipei is UTC+8 all year, so the arithmetic is done on shifted UTC dates.
const TAIPEI_OFFSET_MS = 8 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

const pad = (n) => String(n).padStart(2, '0');

/** A Date whose UTC fields read as Taipei wall-clock time. */
function toTaipei(date) {
  return new Date(date.getTime() + TAIPEI_OFFSET_MS);
}

function ymd(shifted) {
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** ISO 8601 week number and week-year of a Taipei calendar date. */
function isoWeek(shifted) {
  const day = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday); // Thursday of this week
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  return { year: day.getUTCFullYear(), week: Math.ceil(((day.getTime() - yearStart) / DAY_MS + 1) / 7) };
}

/** The week that contains the given instant. */
export function weekContaining(date) {
  const shifted = toTaipei(date);
  const weekday = shifted.getUTCDay() || 7; // Monday = 1 … Sunday = 7
  const mondayShifted = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - (weekday - 1)));
  const sundayShifted = new Date(mondayShifted.getTime() + 6 * DAY_MS);
  const start = new Date(mondayShifted.getTime() - TAIPEI_OFFSET_MS);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  const iso = isoWeek(mondayShifted);
  return {
    /** First instant of the week, inclusive (ISO, UTC). */
    start: start.toISOString(),
    /** First instant after the week, exclusive (ISO, UTC). */
    end: end.toISOString(),
    /** Taipei calendar dates of Monday and Sunday. */
    startDate: ymd(mondayShifted),
    endDate: ymd(sundayShifted),
    isoWeek: `${iso.year}-W${pad(iso.week)}`,
    label: `${mondayShifted.getUTCFullYear()} 年 ${mondayShifted.getUTCMonth() + 1} 月 ${mondayShifted.getUTCDate()} 日 – ${sundayShifted.getUTCMonth() + 1} 月 ${sundayShifted.getUTCDate()} 日`,
  };
}

/** The most recent week that has fully ended at the given instant. */
export function lastCompleteWeek(now) {
  return weekContaining(new Date(new Date(weekContaining(now).start).getTime() - 1));
}

/** True when an instant (Date or ISO string) falls inside the week. */
export function inWeek(week, instant) {
  const t = new Date(instant).getTime();
  return Number.isFinite(t) && t >= new Date(week.start).getTime() && t < new Date(week.end).getTime();
}

/** True when a plain YYYY-MM-DD date, read as a Taipei calendar date, falls inside the week. */
export function dateInWeek(week, date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date) && date.slice(0, 10) >= week.startDate && date.slice(0, 10) <= week.endDate;
}
