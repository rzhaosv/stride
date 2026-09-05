/**
 * Web-only demo seeding for App Store screenshots.
 *
 * When the app runs on web with `?demo=<name>` in the URL, a canned AppState is written to
 * localStorage under the AsyncStorage key *before* AppContext hydrates, and `demo.screen` /
 * `demo.onboardStep` tell App.tsx which screen to open. `demo.pro` unlocks Pro for the demo.
 *
 * Everything is guarded by `Platform.OS === 'web'`; on iOS/Android `demo` is always `null`.
 */
import { Platform } from 'react-native';
import { AppState, DEFAULT_STATE, Walk } from '../logic/types';
import { RootStackParamList } from '../navigation';
import { DAY, addDaysKey, todayKey, keyToDate } from '../logic/time';

const STORAGE_KEY = 'stride.state.v1';

export type DemoName = 'home' | 'homeGoal' | 'trail' | 'walks' | 'paywall' | 'onboard' | 'permission' | 'denied' | 'settings';
const VALID: DemoName[] = ['home', 'homeGoal', 'trail', 'walks', 'paywall', 'onboard', 'permission', 'denied', 'settings'];

export type Demo = {
  name: DemoName;
  screen: keyof RootStackParamList | null;
  onboardStep: number;
  pro: boolean;
  snap: boolean;
};

const iso = (ms: number) => new Date(ms).toISOString();

/** Small deterministic generator so screenshots are reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function base(now: number, daysTracked: number): AppState {
  return {
    ...DEFAULT_STATE,
    onboarded: true,
    startedAt: iso(now - daysTracked * DAY),
    reasons: ['scale', 'calorieapps'],
    goal: 5000,
    adaptiveGoals: true,
    walkWindow: 'evening',
    reminderHour: 18,
    reminderMinute: 0,
    remindersWanted: true,
    remindersEnabled: true,
    motionPermission: 'granted',
  };
}

/** Two weeks: exactly four goal-met days (5,000), the last one yesterday, so the streak reads 4. */
function homeSteps(now: number, today: number): Record<string, number> {
  const t = todayKey(now);
  const hist = [5210, 5640, 4380, 5120, 6030, 3910, 4470, 2980, 3620, 4120, 3350, 2760, 3980];
  const out: Record<string, number> = { [t]: today };
  hist.forEach((v, i) => {
    out[addDaysKey(t, -(i + 1))] = v;
  });
  return out;
}

/**
 * Sixty days with a gentle climb: the older half averages ~3,900, the recent half ~5,100, a few
 * big days, and five of the last seven at the goal so the adaptive suggestion shows.
 */
function trailSteps(now: number): Record<string, number> {
  const t = todayKey(now);
  const r = rng(7);
  const raw: number[] = [];
  for (let i = 0; i < 60; i++) {
    const age = 59 - i; // 59 = oldest
    const trend = 3900 + (1 - age / 59) * 1200;
    let v = trend + (r() - 0.5) * 1900;
    if (i === 12 || i === 33 || i === 47) v = trend * 1.9; // big days
    raw.push(Math.max(900, v));
  }
  const scale = (arr: number[], target: number) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.map((v) => v * (target / mean));
  };
  const older = scale(raw.slice(0, 30), 3900);
  const recent = scale(raw.slice(30, 60), 5100);
  const vals = [...older, ...recent].map((v) => Math.round(v / 10) * 10);
  // Last seven full days (yesterday back): five at or over the goal.
  const lastSeven = [5420, 4310, 5180, 6040, 5210, 3860, 5560];
  const out: Record<string, number> = {};
  vals.forEach((v, i) => {
    const key = addDaysKey(t, -(59 - i));
    out[key] = v;
  });
  lastSeven.forEach((v, i) => {
    out[addDaysKey(t, -(i + 1))] = v;
  });
  out[t] = 2860;
  return out;
}

function demoWalks(now: number): Walk[] {
  const t = todayKey(now);
  const at = (daysAgo: number, hour: number) => iso(keyToDate(addDaysKey(t, -daysAgo)).getTime() + hour * 3_600_000);
  return [
    { at: at(1, 19), minutes: 25, note: 'Rain. Treadmill at the gym.' },
    { at: at(4, 7), minutes: 40, note: 'Pram loop round the park.' },
    { at: at(9, 12), minutes: 15, note: 'Lunch block, phone in bag.' },
    { at: at(15, 18), minutes: 35, note: 'Called mum.' },
    { at: at(23, 8), minutes: 20, note: '' },
  ];
}

function buildState(name: DemoName, now: number): AppState | null {
  switch (name) {
    case 'onboard':
    case 'permission':
      return null;
    case 'home':
    case 'paywall':
      return { ...base(now, 14), stepsByDay: homeSteps(now, 4120), streakBest: 4 };
    case 'denied':
      return { ...base(now, 14), stepsByDay: homeSteps(now, 4120), streakBest: 4, motionPermission: 'denied' };
    case 'homeGoal':
      return { ...base(now, 14), stepsByDay: homeSteps(now, 5340), streakBest: 5 };
    case 'trail':
    case 'walks':
    case 'settings':
      return { ...base(now, 60), stepsByDay: trailSteps(now), walks: demoWalks(now), streakBest: 12 };
  }
}

function screenFor(name: DemoName): keyof RootStackParamList | null {
  switch (name) {
    case 'home':
    case 'homeGoal':
    case 'denied':
      return 'Home';
    case 'trail':
      return 'Trail';
    case 'walks':
      return 'Walks';
    case 'paywall':
      return 'Paywall';
    case 'settings':
      return 'Settings';
    case 'onboard':
    case 'permission':
      return null;
  }
}

function read(): Demo | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined' || !window.location || !window.localStorage) return null;
  const params = new URLSearchParams(window.location.search);
  const name = params.get('demo') as DemoName | null;
  if (!name || !VALID.includes(name)) return null;
  const now = Date.now();
  const state = buildState(name, now);
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return {
    name,
    screen: screenFor(name),
    onboardStep: name === 'permission' ? 3 : 0,
    pro: name !== 'paywall' && params.get('pro') !== '0',
    snap: params.get('snap') === '1',
  };
}

/** Null everywhere except web with `?demo=`. Evaluated once at module load, before hydration. */
export const demo: Demo | null = read();
