import { Platform } from 'react-native';
import type { MotionPermission } from '../logic/types';
import { dayWindow, lastKeys, todayKey } from '../logic/time';

/**
 * Thin, fully guarded wrapper around expo-sensors' Pedometer. Every call is try/catch'd and
 * returns null / a no-op on web or when the sensor is missing, so the app renders from its
 * cached per-day counts and never throws because of the sensor.
 *
 * iOS only keeps about seven days of pedometer history; older days come back as 0, which the
 * caller treats as "unknown" and keeps its cached value.
 */

type PedometerModule = typeof import('expo-sensors')['Pedometer'];

function native() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

let cached: PedometerModule | null | undefined;
async function mod(): Promise<PedometerModule | null> {
  if (!native()) return null;
  if (cached !== undefined) return cached;
  try {
    const m = await import('expo-sensors');
    cached = m.Pedometer;
  } catch {
    cached = null;
  }
  return cached;
}

export async function isAvailable(): Promise<boolean> {
  const P = await mod();
  if (!P) return false;
  try {
    return await P.isAvailableAsync();
  } catch {
    return false;
  }
}

function toState(res: { status: string; granted: boolean; canAskAgain: boolean } | null): MotionPermission {
  if (!res) return 'unknown';
  if (res.granted) return 'granted';
  if (res.status === 'denied' && !res.canAskAgain) return 'denied';
  if (res.status === 'denied') return 'denied';
  return 'unknown';
}

export async function getPermission(): Promise<MotionPermission> {
  const P = await mod();
  if (!P) return 'unknown';
  try {
    return toState(await P.getPermissionsAsync());
  } catch {
    return 'unknown';
  }
}

/** Shows the iOS motion prompt (once). Safe to call repeatedly. */
export async function requestPermission(): Promise<MotionPermission> {
  const P = await mod();
  if (!P) return 'unknown';
  try {
    const cur = await P.getPermissionsAsync();
    if (cur.granted) return 'granted';
    return toState(await P.requestPermissionsAsync());
  } catch {
    return 'unknown';
  }
}

export async function stepsBetween(start: Date, end: Date): Promise<number | null> {
  const P = await mod();
  if (!P) return null;
  if (end.getTime() <= start.getTime()) return 0;
  try {
    const r = await P.getStepCountAsync(start, end);
    return Number.isFinite(r?.steps) ? Math.max(0, Math.round(r.steps)) : null;
  } catch {
    return null;
  }
}

export async function stepsForDay(key: string, now: number = Date.now()): Promise<number | null> {
  const [start, end] = dayWindow(key, now);
  return stepsBetween(start, end);
}

export async function stepsToday(now: number = Date.now()): Promise<number | null> {
  return stepsForDay(todayKey(now), now);
}

/**
 * Per-day counts for the last `days` days, oldest first. Days the sensor cannot answer for are
 * omitted so the caller keeps whatever it had cached.
 */
export async function fetchRecentDays(days = 14, now: number = Date.now()): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const P = await mod();
  if (!P) return out;
  const keys = lastKeys(days, now);
  const today = todayKey(now);
  for (const key of keys) {
    const n = await stepsForDay(key, now);
    if (n === null) continue;
    // iOS returns 0 for anything older than its ~7 day buffer; treat 0 on old days as unknown.
    const ageDays = keys.length - 1 - keys.indexOf(key);
    if (n === 0 && ageDays > 7 && key !== today) continue;
    out[key] = n;
  }
  return out;
}

/**
 * Live updates while the app is open. The callback receives the number of steps taken since the
 * watch started; the caller re-queries today's total rather than adding deltas.
 */
export function watchSteps(cb: (stepsSinceWatch: number) => void): () => void {
  let sub: { remove: () => void } | null = null;
  let cancelled = false;
  mod().then((P) => {
    if (!P || cancelled) return;
    try {
      sub = P.watchStepCount((r) => {
        try {
          cb(Math.max(0, Math.round(r?.steps ?? 0)));
        } catch {
          /* ignore */
        }
      });
    } catch {
      sub = null;
    }
  });
  return () => {
    cancelled = true;
    try {
      sub?.remove();
    } catch {
      /* ignore */
    }
  };
}
