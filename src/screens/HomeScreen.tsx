import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { Screen, PrimaryButton, SecondaryButton, Card } from '../components/UI';
import Ring from '../components/Ring';
import { HomeTrail } from '../components/Trail';
import WeekBars, { GoalLineHint } from '../components/WeekBars';
import LogWalkSheet from '../components/LogWalkSheet';
import { useWidth } from '../components/useWidth';
import { colors, radius, type } from '../theme';
import { useApp, useNow } from '../store/AppContext';
import { ScreenProps } from '../navigation';
import { formatSteps, todayKey } from '../logic/time';
import { note, stepsOn, streak as computeStreak, weekBars } from '../logic/steps';

function dateLine(now: number) {
  return new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { state, isPro, sensor, refreshSteps } = useApp();
  const now = useNow(30_000);
  const [logOpen, setLogOpen] = useState(false);
  const [w, onLayout] = useWidth();
  const [barsW, onBarsLayout] = useWidth();

  const today = todayKey(now);
  const steps = stepsOn(state.stepsByDay, today);
  const goal = Math.max(1, state.goal);
  const ratio = steps / goal;
  const toGo = Math.max(0, goal - steps);
  const met = steps >= goal;
  const bars = weekBars(state.stepsByDay, goal, now);
  const s = computeStreak(state.stepsByDay, goal, now);
  const denied = state.motionPermission === 'denied';
  const noSensor = Platform.OS !== 'web' && sensor.available === false;

  const gate = (screen: 'Trail' | 'Walks') => {
    if (isPro) navigation.navigate(screen);
    else navigation.navigate('Paywall');
  };
  const openLog = () => {
    if (isPro) setLogOpen(true);
    else navigation.navigate('Paywall');
  };

  return (
    <Screen scroll contentStyle={{ paddingBottom: 48 }}>
      <View style={styles.top}>
        <View>
          <Text style={type.label}>Stride</Text>
          <Text style={[type.sub, { marginTop: 2 }]}>{dateLine(now)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <NavPill label="Trail" onPress={() => gate('Trail')} />
          <NavPill label="Walks" onPress={() => gate('Walks')} />
          <NavPill label="Settings" onPress={() => navigation.navigate('Settings')} />
        </View>
      </View>

      {denied ? (
        <Card style={{ marginTop: 18 }}>
          <Text style={type.h2}>Motion access is off</Text>
          <Text style={[type.bodySoft, { marginTop: 8 }]}>
            Stride can only count steps with the motion sensor. Steps stay on your phone; nothing is uploaded. You can turn it on in
            Settings › Privacy › Motion & Fitness.
          </Text>
          <PrimaryButton title="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} style={{ marginTop: 16, height: 48 }} />
          <SecondaryButton title="Check again" onPress={() => refreshSteps()} style={{ marginTop: 10, height: 44 }} />
        </Card>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 22 }}>
          <Ring size={250} progress={ratio}>
            <Text style={[type.numXL, { textAlign: 'center' }]}>{formatSteps(steps)}</Text>
            <Text style={[type.sub, { marginTop: -2 }]}>of {formatSteps(goal)}</Text>
          </Ring>
          <Text style={[type.h2, { marginTop: 14, color: met ? colors.accent : colors.ink }]}>{met ? 'Goal met' : `${formatSteps(toGo)} to go`}</Text>
          <Text style={[type.bodySoft, { textAlign: 'center', marginTop: 6, paddingHorizontal: 12 }]}>{note(ratio, new Date(now).getHours())}</Text>
        </View>
      )}

      {noSensor && !denied ? (
        <Text style={[type.caption, { textAlign: 'center', marginTop: 12 }]}>This device has no step sensor. You can still log walks.</Text>
      ) : null}

      <View style={{ marginTop: 22 }} onLayout={onLayout}>
        <HomeTrail width={w} height={96} progress={ratio} done={met} />
      </View>

      <Card style={{ marginTop: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={type.h3}>This week</Text>
          <GoalLineHint goal={goal} />
        </View>
        <View style={{ marginTop: 10 }} onLayout={onBarsLayout}>
          <WeekBars width={barsW} bars={bars} goal={goal} />
        </View>
        <Text style={[type.caption, { marginTop: 6 }]}>
          {bars.filter((b) => b.met).length} of {bars.filter((b) => !b.future).length} days at the goal so far.
        </Text>
      </Card>

      <PrimaryButton title="+ Log a walk" onPress={openLog} style={{ marginTop: 16 }} color={colors.cardAlt} textColor={colors.ink} />

      {isPro ? (
        <Card style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View>
              <Text style={[type.numLg, { color: s.active ? colors.accent : colors.inkSoft }]}>{s.count}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{s.count === 1 ? 'goal day' : 'goal days'} in this run</Text>
              <Text style={[type.sub, { marginTop: 2 }]}>
                {s.count === 0
                  ? 'Your first goal day starts the run. There is no hurry.'
                  : s.active
                    ? 'Active. A missed day pauses it; it never resets.'
                    : `Paused ${s.pausedDays} ${s.pausedDays === 1 ? 'day' : 'days'}. It picks up on your next goal day.`}
              </Text>
            </View>
            {!s.active && s.count > 0 ? <Text style={styles.pausedTag}>paused</Text> : null}
          </View>
          {state.streakBest > s.count ? <Text style={[type.caption, { marginTop: 10 }]}>Best run: {state.streakBest}</Text> : null}
        </Card>
      ) : (
        <Pressable onPress={() => navigation.navigate('Paywall')} style={styles.lockCard}>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Runs, badges, the trail</Text>
            <Text style={[type.sub, { marginTop: 2 }]}>Part of Stride Pro. Today's steps and your ring are always free.</Text>
          </View>
          <Text style={{ color: colors.inkFaint, fontSize: 18 }}>›</Text>
        </Pressable>
      )}

      {isPro && state.remindersWanted && !state.remindersEnabled ? (
        <Pressable onPress={() => navigation.navigate('Settings')} style={[styles.lockCard, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>Turn on the quiet reminder</Text>
            <Text style={[type.sub, { marginTop: 2 }]}>One a day, in Settings. Only if you want it.</Text>
          </View>
          <Text style={{ color: colors.inkFaint, fontSize: 18 }}>›</Text>
        </Pressable>
      ) : null}

      <LogWalkSheet visible={logOpen} onClose={() => setLogOpen(false)} />
    </Screen>
  );
}

function NavPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
  pill: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  pillText: { color: colors.inkSoft, fontSize: 13, fontWeight: '700' },
  lockCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pausedTag: { color: colors.sand, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});
