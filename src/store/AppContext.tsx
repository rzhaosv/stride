import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DEFAULT_STATE, MotionPermission } from '../logic/types';
import { addDaysKey, todayKey, weekStartKey } from '../logic/time';
import { clampGoal, streak as computeStreak } from '../logic/steps';
import { configureBilling, getCustomerInfo, isPremium, addPremiumListener } from '../services/billing';
import { scheduleDaily, cancelAll, requestPermission as requestNotifPermission } from '../services/notifications';
import * as Pedometer from '../services/pedometer';
import { demo } from '../dev/demo';

export const STORAGE_KEY = 'stride.state.v1';
const DEV_UNLOCK = process.env.EXPO_PUBLIC_DEV_UNLOCK === '1' || process.env.EXPO_PUBLIC_DEV_UNLOCK === 'true';

export type SensorStatus = {
  /** null until checked; false on web / devices without a pedometer. */
  available: boolean | null;
  refreshing: boolean;
  lastSync: number | null;
};

type Ctx = {
  ready: boolean;
  state: AppState;
  isPro: boolean;
  setPro: (v: boolean) => void;
  sensor: SensorStatus;
  update: (patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
  completeOnboarding: (setup: Partial<AppState>) => void;
  requestMotion: () => Promise<MotionPermission>;
  refreshSteps: () => Promise<void>;
  setGoal: (goal: number) => void;
  logWalk: (minutes: number, note: string, at?: number) => void;
  deleteWalk: (at: string) => void;
  setReminders: (on: boolean) => Promise<boolean>;
  setReminderTime: (hour: number, minute: number) => void;
  answerSuggestion: (accept: boolean, next: number) => void;
  logWeight: (kg: number) => void;
  deleteWeight: (at: string) => void;
  resetAll: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isPro, setIsPro] = useState(DEV_UNLOCK || !!demo?.pro);
  const [sensor, setSensor] = useState<SensorStatus>({ available: null, refreshing: false, lastSync: null });
  const stateRef = useRef(state);
  stateRef.current = state;
  const refreshingRef = useRef(false);

  // Load persisted state + billing
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<AppState>) });
      } catch {
        /* start fresh */
      }
      configureBilling();
      const info = await getCustomerInfo();
      if (isPremium(info)) setIsPro(true);
      unsub = addPremiumListener((pro) => setIsPro(pro || DEV_UNLOCK || !!demo?.pro));
      setReady(true);
    })();
    return () => unsub();
  }, []);

  // Persist on every change (after initial load)
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const update = useCallback<Ctx['update']>((patch) => {
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  /** Merge fresh per-day counts into the cache. Never lowers today below a live reading already shown. */
  const mergeSteps = useCallback((fresh: Record<string, number>) => {
    if (!Object.keys(fresh).length) return;
    setState((prev) => ({ ...prev, stepsByDay: { ...prev.stepsByDay, ...fresh } }));
  }, []);

  /** Full refresh: today + the last 14 days. Cheap enough to run on foreground and on live ticks. */
  const refreshSteps = useCallback(async () => {
    if (Platform.OS === 'web' || demo) return;
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setSensor((s) => ({ ...s, refreshing: true }));
    try {
      const available = await Pedometer.isAvailable();
      setSensor((s) => ({ ...s, available }));
      if (!available) return;
      const perm = await Pedometer.getPermission();
      if (perm !== 'unknown' && perm !== stateRef.current.motionPermission) {
        setState((prev) => ({ ...prev, motionPermission: perm }));
      }
      if (perm === 'denied') return;
      const fresh = await Pedometer.fetchRecentDays(14);
      mergeSteps(fresh);
      setSensor((s) => ({ ...s, lastSync: Date.now() }));
    } finally {
      refreshingRef.current = false;
      setSensor((s) => ({ ...s, refreshing: false }));
    }
  }, [mergeSteps]);

  /** Today only: used on live ticks so the big number moves without re-reading two weeks. */
  const refreshToday = useCallback(async () => {
    if (Platform.OS === 'web' || demo) return;
    const now = Date.now();
    const n = await Pedometer.stepsToday(now);
    if (n === null) return;
    const key = todayKey(now);
    setState((prev) => (prev.stepsByDay[key] === n ? prev : { ...prev, stepsByDay: { ...prev.stepsByDay, [key]: n } }));
  }, []);

  // Sensor wiring: initial refresh, live watch (throttled), foreground refresh, midnight rollover.
  useEffect(() => {
    if (!ready || !state.onboarded) return;
    if (Platform.OS === 'web' || demo) {
      setSensor((s) => ({ ...s, available: false }));
      return;
    }
    refreshSteps();
    let last = 0;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const stopWatch = Pedometer.watchSteps(() => {
      const now = Date.now();
      if (now - last > 2500) {
        last = now;
        refreshToday();
      } else if (!pending) {
        pending = setTimeout(() => {
          pending = null;
          last = Date.now();
          refreshToday();
        }, 2500);
      }
    });
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') refreshSteps();
    });
    let dayKey = todayKey();
    const tick = setInterval(() => {
      const k = todayKey();
      if (k !== dayKey) {
        dayKey = k;
        refreshSteps();
      }
    }, 60_000);
    return () => {
      stopWatch();
      sub.remove();
      clearInterval(tick);
      if (pending) clearTimeout(pending);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.onboarded, state.motionPermission]);

  // Keep the best streak on record.
  useEffect(() => {
    if (!ready) return;
    const s = computeStreak(state.stepsByDay, state.goal);
    if (s.count > state.streakBest) setState((prev) => ({ ...prev, streakBest: s.count }));
  }, [ready, state.stepsByDay, state.goal, state.streakBest]);

  const completeOnboarding = useCallback((setup: Partial<AppState>) => {
    const now = new Date().toISOString();
    setState((prev) => ({ ...prev, ...setup, onboarded: true, startedAt: now }));
  }, []);

  const requestMotion = useCallback(async () => {
    if (Platform.OS === 'web' || demo) {
      setState((prev) => ({ ...prev, motionPermission: 'granted' }));
      return 'granted' as MotionPermission;
    }
    const perm = await Pedometer.requestPermission();
    setState((prev) => ({ ...prev, motionPermission: perm }));
    if (perm === 'granted') refreshSteps();
    return perm;
  }, [refreshSteps]);

  const setGoal = useCallback((goal: number) => {
    setState((prev) => ({ ...prev, goal: clampGoal(goal) }));
  }, []);

  const logWalk = useCallback((minutes: number, note: string, at?: number) => {
    const m = Math.max(1, Math.min(600, Math.round(minutes)));
    setState((prev) => ({ ...prev, walks: [...prev.walks, { at: new Date(at ?? Date.now()).toISOString(), minutes: m, note: note.trim() }] }));
  }, []);

  const deleteWalk = useCallback((at: string) => {
    setState((prev) => ({ ...prev, walks: prev.walks.filter((w) => w.at !== at) }));
  }, []);

  const setReminders = useCallback(async (on: boolean) => {
    if (on) {
      const ok = await requestNotifPermission();
      if (!ok) return false;
      const s = stateRef.current;
      await scheduleDaily({ hour: s.reminderHour, minute: s.reminderMinute });
      setState((prev) => ({ ...prev, remindersEnabled: true, remindersWanted: true }));
      return true;
    }
    await cancelAll();
    setState((prev) => ({ ...prev, remindersEnabled: false, remindersWanted: false }));
    return false;
  }, []);

  const setReminderTime = useCallback((hour: number, minute: number) => {
    setState((prev) => {
      const next = { ...prev, reminderHour: hour, reminderMinute: minute };
      if (next.remindersEnabled) scheduleDaily({ hour, minute });
      return next;
    });
  }, []);

  const answerSuggestion = useCallback((accept: boolean, next: number) => {
    const week = weekStartKey(todayKey());
    setState((prev) => ({ ...prev, goal: accept ? clampGoal(next) : prev.goal, goalSuggestionAnsweredWeek: week }));
  }, []);

  const logWeight = useCallback((kg: number) => {
    const v = Math.max(20, Math.min(400, kg));
    setState((prev) => ({ ...prev, weightEntries: [...prev.weightEntries, { at: new Date().toISOString(), kg: Math.round(v * 10) / 10 }] }));
  }, []);

  const deleteWeight = useCallback((at: string) => {
    setState((prev) => ({ ...prev, weightEntries: prev.weightEntries.filter((w) => w.at !== at) }));
  }, []);

  const resetAll = useCallback(async () => {
    await cancelAll();
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    setState(DEFAULT_STATE);
  }, []);

  return (
    <AppCtx.Provider
      value={{
        ready,
        state,
        isPro,
        setPro: (v) => setIsPro(v || DEV_UNLOCK || !!demo?.pro),
        sensor,
        update,
        completeOnboarding,
        requestMotion,
        refreshSteps,
        setGoal,
        logWalk,
        deleteWalk,
        setReminders,
        setReminderTime,
        answerSuggestion,
        logWeight,
        deleteWeight,
        resetAll,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp(): Ctx {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

/** Re-renders every `intervalMs` so "today" and notes stay current. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export { addDaysKey };
