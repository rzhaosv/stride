# Stride: Count Steps, Not Calories

Stride is a fully local iOS step counter for people who know they have put on weight, cannot quite say it out loud,
and have been burned by calorie apps and diets. It counts steps from the phone's motion sensor and draws them as a
winding trail. It never shows calories, never asks for weight unless you opt in from Settings, and never uses the
words that make people close the app. Tone: quiet, kind, adult. Tagline: **Count steps, not calories.** No account,
no network traffic except RevenueCat.

## Screens

| screen | file | notes |
| --- | --- | --- |
| Onboarding | `src/screens/OnboardingScreen.tsx` | 4 steps: what brought you here (multi), starting goal (3,000 / 5,000 / 7,000 / 10,000 / Let Stride pick), when you usually walk + reminder intent, motion permission ("Nothing leaves your phone", Allow / Not now). Ends on the Paywall (skippable). |
| Paywall | `src/screens/PaywallScreen.tsx` | "Walk it off, quietly." 4 benefits, `$rc_annual` (7-day trial, then yearly, highlighted) / `$rc_monthly` (7-day trial, then monthly), "Start my 7-day free trial", "Continue with the basics", restore, terms, privacy, auto-renew disclosure. |
| Home | `src/screens/HomeScreen.tsx` | Big live step number inside the goal ring, "N to go" / "Goal met", one of 12 gentle notes, the SVG trail with today's dot, Mon-Sun bars with the goal line, `+ Log a walk`, run card (paused, never broken), reminder nudge. Motion denied shows a calm explainer with Open Settings. Header pills: Trail, Walks, Settings. |
| Trail | `src/screens/TrailScreen.tsx` | Pro. 30 / 90-day winding trail with one node per day (size by steps, filled when the goal was met, today ringed in sand), "your average went from X to Y", 7 / 30-day averages, goal days, weekly totals, adaptive goal suggestion (Accept / Keep current), quiet badges. |
| Walks | `src/screens/WalksScreen.tsx` | Pro. Manually logged walks (minutes + note; remove via long-press or Remove) merged with auto-detected big days (> 1.5x your recorded average). |
| Settings | `src/screens/SettingsScreen.tsx` | Goal, adaptive goals, daily reminder toggle + time (permission asked only here), motion access status, optional weight tracking (off by default, never on Home) with kg / lb, restore, manage subscription, privacy / terms, support, reset. |

## Free vs Pro

Free: today's steps and the goal ring, the week bars, and the trail motif. Pro (RevenueCat entitlement `pro`): Trail
history, adaptive goals, runs and badges, reminders, the Walks log. `EXPO_PUBLIC_DEV_UNLOCK=1` unlocks everything
locally. Tapping a gated item opens the Paywall.

## Words Stride does not use

fat, diet, burn, guilt, cheat, calories (except to say it does not count them). Streaks are called runs; a missed day
**pauses** a run and is shown as "paused", never "broken" or reset. Badges only mark days that happened.

## Data: `src/services/pedometer.ts`

`expo-sensors` `Pedometer` behind a lazy import guarded by `Platform.OS`, with every call wrapped in try/catch:

- `isAvailable()`, `getPermission()`, `requestPermission()` (iOS motion prompt, asked from onboarding step 4).
- `stepsForDay(key)` uses `getStepCountAsync(localMidnight, nextMidnight|now)`; `fetchRecentDays(14)` fills the
  per-day cache. iOS only keeps ~7 days of history, so zeros on older days are treated as unknown and the cached value
  is kept.
- `watchSteps()` wraps `watchStepCount` for live updates while the app is open; the provider re-queries today's
  total (throttled to 2.5 s) rather than summing deltas. It also refreshes on foreground and at midnight.
- Web (and `?demo=`) never touches the sensor; the demo hook seeds the cache instead.

## State model

Persisted as JSON in AsyncStorage under `stride.state.v1` (`src/store/AppContext.tsx`, types in `src/logic/types.ts`):

| field | meaning |
| --- | --- |
| `onboarded`, `startedAt`, `reasons[]` | setup done, when, and why |
| `goal`, `adaptiveGoals`, `goalSuggestionAnsweredWeek` | steps per day; weekly suggestion state |
| `walkWindow`, `reminderHour`, `reminderMinute`, `remindersWanted`, `remindersEnabled` | reminder settings |
| `motionPermission` | `'unknown' \| 'granted' \| 'denied'` |
| `stepsByDay` `{YYYY-MM-DD: steps}` | per-day cache so Home renders instantly |
| `walks[]` `{at, minutes, note}` | manual walks, never added to steps |
| `streakBest` | best run on record |
| `weightOptIn`, `weightEntries[] {at, kg}`, `units` | optional, hidden by default |

## Logic (`src/logic/steps.ts`, all pure, all take `now`)

- `todayKey`, `dayWindow`, `lastKeys`, `weekKeys` in `time.ts`; weeks start Monday.
- `weekBars` Mon-Sun with `met` and `future` flags.
- `streak` = goal-met days in the current run; a missed day pauses (`active: false`, `pausedDays`), it never resets.
  A pause longer than 30 days starts a fresh count.
- `pickGoal` = round((7-day average or 3,000) x 1.1, 500) — "Let Stride pick" re-reads the sensor after permission.
- `suggestGoal` (once a week, Pro + adaptive on): up +10% rounded to 500 (max +1,000) when the goal was met on 5 of
  the last 7 days; down to 110% of the average when the week averaged under 60% of the goal; otherwise none.
- `averages` first-half vs second-half of the window for "went from X to Y"; `weekTotals`; `bigDays` > 1.5x average
  (needs 5 recorded days); `note(ratio)` 12 lines; `badges`.

## Notifications

`src/services/notifications.ts` schedules one daily local notification, "A short walk counts.", at the chosen time.
Permission is only requested when the reminder is turned on in Settings; the module is imported lazily behind a
`Platform` check so the web bundle never loads it.

## Demo hook (web only)

`src/dev/demo.ts` seeds localStorage before hydration when the web build is opened with `?demo=<name>`:
`home` (today 4,120 of 5,000, week bars, run of 4), `homeGoal` (goal met at 5,340), `trail` (60 days, average
3,900 → 5,100, suggestion showing), `walks`, `paywall`, `onboard` (step 1), `permission` (onboarding step 4),
`denied` (Home with motion off), `settings`. Pro is on for every demo except `paywall`; add `&pro=0` to see the free
Home. Add `&snap=1` to mark screenshot mode. On iOS/Android `demo` is always `null`.

## Environment variables

| var | purpose |
| --- | --- |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat public iOS SDK key. Without it billing is a no-op and the app runs free. |
| `EXPO_PUBLIC_DEV_UNLOCK` | `1` / `true` unlocks all Pro features locally. |

## Development

```sh
npm install
npx tsc --noEmit
npx expo config --json
CI=1 npx expo start --web --port 8096   # smoke test; curl http://localhost:8096/
npx expo start                          # iOS simulator / device (the pedometer needs a real device)
eas init && eas build -p ios --profile production
```

Before the first EAS build: run `eas init` (adds `extra.eas.projectId`), set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and
`submit.production.ios.ascAppId` in `eas.json` (both are `TBD`), and create the `pro` entitlement with `$rc_monthly`
and `$rc_annual` packages (7-day trial) in RevenueCat. Bundle id `com.formaz.stride`, Expo SDK 57, React Native
0.86, React 19. `NSMotionUsageDescription` is set both in `ios.infoPlist` and via the `expo-sensors` config plugin.
Legal pages: `https://tryforma.app/stride/terms.html` and `https://tryforma.app/stride/privacy.html`.

Icons in `assets/` are generated by a Pillow script (deep forest ground with a soft radial lift, a tapering soft
green winding path, three sand footstep dots, no text); regenerate them with any Pillow build if the palette changes.
