export type Reason = 'move' | 'scale' | 'calorieapps' | 'doctor' | 'feelbetter';
export type WalkWindow = 'morning' | 'lunch' | 'evening';
export type MotionPermission = 'unknown' | 'granted' | 'denied';
export type Units = 'metric' | 'imperial';

/** A manually logged walk (treadmill, pram, indoor). Stored separately from sensor steps. */
export type Walk = { at: string; minutes: number; note: string };

/** Optional, opt-in only. Never shown on Home. */
export type WeightEntry = { at: string; kg: number };

export type AppState = {
  onboarded: boolean;
  startedAt: string;
  reasons: Reason[];
  goal: number;
  adaptiveGoals: boolean;
  walkWindow: WalkWindow;
  reminderHour: number;
  reminderMinute: number;
  /** Set during onboarding; permission is requested later from Settings. */
  remindersWanted: boolean;
  remindersEnabled: boolean;
  motionPermission: MotionPermission;
  /** Cache of per-day step counts, YYYY-MM-DD -> steps. Rendered instantly, refreshed from the sensor. */
  stepsByDay: Record<string, number>;
  walks: Walk[];
  streakBest: number;
  /** Date key of the last week an adaptive suggestion was answered, so it is asked once a week. */
  goalSuggestionAnsweredWeek: string | null;
  weightOptIn: boolean;
  weightEntries: WeightEntry[];
  units: Units;
};

export const DEFAULT_STATE: AppState = {
  onboarded: false,
  startedAt: new Date(0).toISOString(),
  reasons: [],
  goal: 5000,
  adaptiveGoals: true,
  walkWindow: 'evening',
  reminderHour: 18,
  reminderMinute: 0,
  remindersWanted: false,
  remindersEnabled: false,
  motionPermission: 'unknown',
  stepsByDay: {},
  walks: [],
  streakBest: 0,
  goalSuggestionAnsweredWeek: null,
  weightOptIn: false,
  weightEntries: [],
  units: 'metric',
};

export const REASON_LABELS: Record<Reason, string> = {
  move: 'I want to move more',
  scale: "I've been avoiding the scale",
  calorieapps: 'Calorie apps made it worse',
  doctor: 'My doctor suggested walking',
  feelbetter: 'I just want to feel better',
};

export const GOAL_CHOICES = [3000, 5000, 7000, 10000];

export const WINDOW_LABELS: Record<WalkWindow, [string, string]> = {
  morning: ['Morning', 'Before the day gets loud'],
  lunch: ['Around lunch', 'A loop between things'],
  evening: ['Evening', 'When the day is done'],
};

/** Default reminder time for each walking window. */
export const WINDOW_TIME: Record<WalkWindow, [number, number]> = {
  morning: [8, 0],
  lunch: [12, 30],
  evening: [18, 0],
};

export const BIG_DAY_FACTOR = 1.5;
export const MIN_GOAL = 1000;
export const MAX_GOAL = 30000;
