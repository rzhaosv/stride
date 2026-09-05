import { Platform } from 'react-native';

/**
 * One quiet daily local notification, "A short walk counts.", at the user's chosen time.
 * Permission is only requested from Settings when the user turns reminders on. expo-notifications
 * is native-only; everything is guarded so the web bundle never touches it.
 */

function native() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function mod() {
  if (!native()) return null;
  try {
    const m = await import('expo-notifications');
    return m;
  } catch {
    return null;
  }
}

let handlerSet = false;
export async function setupNotificationHandler() {
  const N = await mod();
  if (!N || handlerSet) return;
  handlerSet = true;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    /* ignore */
  }
}

/** Ask for permission. Only call when the user explicitly enables reminders. */
export async function requestPermission(): Promise<boolean> {
  const N = await mod();
  if (!N) return false;
  try {
    const cur = await N.getPermissionsAsync();
    if (cur.granted) return true;
    const res = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    return res.granted;
  } catch {
    return false;
  }
}

export async function cancelAll() {
  const N = await mod();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignore */
  }
}

export type ReminderConfig = { hour: number; minute: number };

/** (Re)schedule the single daily reminder from scratch. */
export async function scheduleDaily(cfg: ReminderConfig) {
  const N = await mod();
  if (!N) return;
  await cancelAll();
  try {
    await N.scheduleNotificationAsync({
      identifier: 'daily-walk',
      content: {
        title: 'A short walk counts.',
        body: 'Ten minutes is a real walk. Stride is counting.',
        sound: false,
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: cfg.hour, minute: cfg.minute },
    });
  } catch {
    /* best-effort */
  }
}
