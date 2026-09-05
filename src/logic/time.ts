export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD in local time. */
export function dateKey(d: Date | number): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function todayKey(now: number = Date.now()): string {
  return dateKey(now);
}

/** Local midnight for a YYYY-MM-DD key. */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function addDaysKey(key: string, n: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** [start, end) window for a day in local time; today's end is `now`. */
export function dayWindow(key: string, now: number = Date.now()): [Date, Date] {
  const start = keyToDate(key);
  const nextMidnight = keyToDate(addDaysKey(key, 1));
  const end = nextMidnight.getTime() > now ? new Date(now) : nextMidnight;
  return [start, end];
}

/** The last `n` day keys ending today, oldest first. */
export function lastKeys(n: number, now: number = Date.now()): string[] {
  const today = todayKey(now);
  return Array.from({ length: n }, (_, i) => addDaysKey(today, -(n - 1 - i)));
}

/** ISO day of week 1 (Mon) .. 7 (Sun). */
export function isoDay(d: Date | number): number {
  const x = typeof d === 'number' ? new Date(d) : d;
  const js = x.getDay();
  return js === 0 ? 7 : js;
}

export function isoDayOfKey(key: string): number {
  return isoDay(keyToDate(key));
}

/** Monday key of the week containing `key`. */
export function weekStartKey(key: string): string {
  return addDaysKey(key, -(isoDayOfKey(key) - 1));
}

/** Seven keys Mon..Sun for the week containing `key`. */
export function weekKeys(key: string): string[] {
  const start = weekStartKey(key);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
}

export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function formatTime(h: number, m: number): string {
  const suffix = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)}${suffix}`;
}

export function formatKeyShort(key: string): string {
  const d = keyToDate(key);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatKeyDay(key: string): string {
  const d = keyToDate(key);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatRelativeKey(key: string, now: number = Date.now()): string {
  const today = todayKey(now);
  if (key === today) return 'Today';
  if (key === addDaysKey(today, -1)) return 'Yesterday';
  return formatKeyShort(key);
}

/** 4,120 style grouping without relying on locale support on every platform. */
export function formatSteps(n: number): string {
  const v = Math.max(0, Math.round(n));
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
