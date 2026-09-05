import { AppState, BIG_DAY_FACTOR, MAX_GOAL, MIN_GOAL, Walk } from './types';
import { addDaysKey, compareKeys, lastKeys, todayKey, weekKeys, weekStartKey } from './time';

export type StepsByDay = Record<string, number>;

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function clampGoal(n: number): number {
  return Math.max(MIN_GOAL, Math.min(MAX_GOAL, Math.round(n)));
}

export function stepsOn(stepsByDay: StepsByDay, key: string): number {
  return Math.max(0, Math.round(stepsByDay[key] ?? 0));
}

/** Keys that have a recorded (non-undefined) count. */
export function recordedKeys(stepsByDay: StepsByDay): string[] {
  return Object.keys(stepsByDay).sort(compareKeys);
}

export type WeekBar = { key: string; steps: number; met: boolean; isToday: boolean; future: boolean };

/** Mon..Sun bars for the week containing today. */
export function weekBars(stepsByDay: StepsByDay, goal: number, now: number = Date.now()): WeekBar[] {
  const today = todayKey(now);
  return weekKeys(today).map((key) => {
    const steps = stepsOn(stepsByDay, key);
    return { key, steps, met: steps >= goal, isToday: key === today, future: compareKeys(key, today) > 0 };
  });
}

/**
 * Average steps per day over the last `days` days (today excluded), counting only days that
 * have a recorded count. Returns 0 when nothing is recorded.
 */
export function average(stepsByDay: StepsByDay, days: number, now: number = Date.now(), includeToday = false): number {
  const keys = lastKeys(days + (includeToday ? 0 : 1), now);
  const pool = includeToday ? keys : keys.slice(0, -1);
  const vals = pool.filter((k) => stepsByDay[k] !== undefined).map((k) => stepsOn(stepsByDay, k));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export type Averages = { week: number; month: number; earlier: number; recent: number; days: number };

/**
 * Averages for the Trail: last 7 days, last 30 days, and the first vs second half of the
 * `window` day span ("your average went from X to Y"). Only recorded days count.
 */
export function averages(stepsByDay: StepsByDay, window: number, now: number = Date.now()): Averages {
  const keys = lastKeys(window, now);
  const recorded = keys.filter((k) => stepsByDay[k] !== undefined);
  const half = Math.floor(recorded.length / 2);
  const mean = (ks: string[]) => (ks.length ? ks.reduce((a, k) => a + stepsOn(stepsByDay, k), 0) / ks.length : 0);
  return {
    week: average(stepsByDay, 7, now),
    month: average(stepsByDay, 30, now),
    earlier: mean(recorded.slice(0, half)),
    recent: mean(recorded.slice(half)),
    days: recorded.length,
  };
}

/** "Let Stride pick": 110% of the 7-day average (or 3,000), rounded to 500. */
export function pickGoal(stepsByDay: StepsByDay, now: number = Date.now()): number {
  const avg = average(stepsByDay, 7, now);
  const base = avg > 0 ? avg : 3000;
  return clampGoal(Math.max(MIN_GOAL, roundTo(base * 1.1, 500)));
}

export type Streak = { count: number; active: boolean; lastMetKey: string | null; pausedDays: number };

/**
 * Streak = number of goal-met days in the current run. A missed day pauses the run instead of
 * breaking it: the count is kept and picks up on the next goal-met day. It is only "active" when
 * yesterday or today met the goal. A pause longer than 30 days starts a fresh count so a year-old
 * number does not linger.
 */
export function streak(stepsByDay: StepsByDay, goal: number, now: number = Date.now()): Streak {
  const today = todayKey(now);
  const yesterday = addDaysKey(today, -1);
  const met = recordedKeys(stepsByDay).filter((k) => compareKeys(k, today) <= 0 && stepsOn(stepsByDay, k) >= goal);
  if (!met.length) return { count: 0, active: false, lastMetKey: null, pausedDays: 0 };
  let count = 1;
  for (let i = met.length - 1; i > 0; i--) {
    const gap = daysBetween(met[i - 1], met[i]);
    if (gap > 30) break;
    count++;
  }
  const lastMetKey = met[met.length - 1];
  const active = lastMetKey === today || lastMetKey === yesterday;
  const pausedDays = active ? 0 : Math.max(0, daysBetween(lastMetKey, today) - 1);
  return { count, active, lastMetKey, pausedDays };
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86_400_000);
}

export type GoalSuggestion = { next: number; direction: 'up' | 'down'; line: string };

/**
 * Adaptive goal suggestion for next week. Up (+10%, rounded to 500, capped at +1,000) when the
 * goal was met on at least 5 of the last 7 days. Down (to 110% of the average, rounded to 500) when
 * the week averaged under 60% of the goal. Otherwise null: keep the current goal.
 */
export function suggestGoal(stepsByDay: StepsByDay, goal: number, now: number = Date.now()): GoalSuggestion | null {
  const keys = lastKeys(8, now).slice(0, -1);
  const recorded = keys.filter((k) => stepsByDay[k] !== undefined);
  if (recorded.length < 5) return null;
  const metDays = recorded.filter((k) => stepsOn(stepsByDay, k) >= goal).length;
  const avg = recorded.reduce((a, k) => a + stepsOn(stepsByDay, k), 0) / recorded.length;
  if (metDays >= 5) {
    const next = clampGoal(Math.min(goal + 1000, roundTo(goal * 1.1, 500)));
    if (next <= goal) return null;
    return { next, direction: 'up', line: `Next week: ${fmt(next)}? Only if it felt easy.` };
  }
  if (avg < goal * 0.6) {
    const next = clampGoal(Math.max(MIN_GOAL, roundTo(avg * 1.1, 500)));
    if (next >= goal) return null;
    return { next, direction: 'down', line: `Maybe ${fmt(next)} for now? Smaller is still forward.` };
  }
  return null;
}

function fmt(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export type BigDay = { key: string; steps: number; average: number };

/** Days above 1.5x the recorded average of the window (needs at least 5 recorded days). */
export function bigDays(stepsByDay: StepsByDay, now: number = Date.now(), window = 90): BigDay[] {
  const keys = lastKeys(window, now).filter((k) => stepsByDay[k] !== undefined);
  if (keys.length < 5) return [];
  const avg = keys.reduce((a, k) => a + stepsOn(stepsByDay, k), 0) / keys.length;
  if (avg <= 0) return [];
  return keys
    .filter((k) => stepsOn(stepsByDay, k) >= avg * BIG_DAY_FACTOR)
    .map((k) => ({ key: k, steps: stepsOn(stepsByDay, k), average: Math.round(avg) }))
    .reverse();
}

export type WeekTotal = { start: string; total: number; days: number; average: number };

/** Weekly totals (Mon-Sun) covering the window, oldest first. Only recorded days count. */
export function weekTotals(stepsByDay: StepsByDay, window: number, now: number = Date.now()): WeekTotal[] {
  const keys = lastKeys(window, now);
  const map = new Map<string, WeekTotal>();
  for (const k of keys) {
    const start = weekStartKey(k);
    const t = map.get(start) ?? { start, total: 0, days: 0, average: 0 };
    if (stepsByDay[k] !== undefined) {
      t.total += stepsOn(stepsByDay, k);
      t.days += 1;
    }
    map.set(start, t);
  }
  return [...map.values()].map((t) => ({ ...t, average: t.days ? Math.round(t.total / t.days) : 0 }));
}

/** Twelve gentle one-liners keyed by today's progress toward the goal. Never shaming. */
export function note(progressRatio: number, hour: number = new Date().getHours()): string {
  const r = Math.max(0, progressRatio);
  if (r === 0) return hour < 10 ? 'Every day starts at zero. That is fine.' : 'Nothing counted yet. The day is not over.';
  if (r < 0.1) return 'A few steps is a start. Not a race. A direction.';
  if (r < 0.25) return 'Moving. That is the whole idea.';
  if (r < 0.4) return 'Quietly adding up.';
  if (r < 0.5) return 'Almost halfway. No hurry.';
  if (r < 0.65) return 'Past halfway. Keep it easy.';
  if (r < 0.8) return 'Most of the way there.';
  if (r < 0.9) return 'Nearly. A short loop would do it.';
  if (r < 1) return 'Right at the edge. Whenever you are ready.';
  if (r < 1.2) return 'Goal met. That is enough for today.';
  if (r < 1.5) return 'Over the goal. Nicely done.';
  return 'A big day. Rest is part of it too.';
}

export const NOTE_COUNT = 12;

export function sortWalks(walks: Walk[]): Walk[] {
  return [...walks].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export type Badge = { id: string; label: string; earned: boolean; hint: string };

/** Quiet badges. No streak-shaming: they are about days that happened, not days that did not. */
export function badges(state: AppState, now: number = Date.now()): Badge[] {
  const today = todayKey(now);
  const metDays = recordedKeys(state.stepsByDay).filter((k) => compareKeys(k, today) <= 0 && stepsOn(state.stepsByDay, k) >= state.goal).length;
  const big = bigDays(state.stepsByDay, now).length;
  return [
    { id: 'first', label: 'First goal day', earned: metDays >= 1, hint: 'One day at the goal.' },
    { id: 'seven', label: 'Seven goal days', earned: metDays >= 7, hint: 'Seven days at the goal, in any order.' },
    { id: 'thirty', label: 'Thirty goal days', earned: metDays >= 30, hint: 'Thirty days at the goal.' },
    { id: 'walk', label: 'First logged walk', earned: state.walks.length >= 1, hint: 'A walk the sensor could not see.' },
    { id: 'big', label: 'A big day', earned: big >= 1, hint: 'A day well above your usual.' },
    { id: 'best', label: 'Best run: 10', earned: state.streakBest >= 10, hint: 'Ten goal days in a run.' },
  ];
}

export function kgToDisplay(kg: number, units: 'metric' | 'imperial'): string {
  return units === 'imperial' ? `${(kg * 2.20462).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
}

export function displayToKg(value: number, units: 'metric' | 'imperial'): number {
  return units === 'imperial' ? value / 2.20462 : value;
}
