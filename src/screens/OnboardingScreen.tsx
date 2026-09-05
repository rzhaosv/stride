import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';
import { PrimaryButton, GhostButton, OptionButton, Chip, ProgressDots } from '../components/UI';
import { HomeTrail } from '../components/Trail';
import { useWidth } from '../components/useWidth';
import { useApp } from '../store/AppContext';
import { Reason, REASON_LABELS, GOAL_CHOICES, WalkWindow, WINDOW_LABELS, WINDOW_TIME } from '../logic/types';
import { pickGoal } from '../logic/steps';
import { formatSteps } from '../logic/time';
import * as Pedometer from '../services/pedometer';

const STEPS = 4;

export default function OnboardingScreen({ onDone, initialStep }: { onDone: () => void; initialStep?: number }) {
  const { completeOnboarding, requestMotion } = useApp();
  const [step, setStep] = useState(initialStep ?? 0);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [goal, setGoal] = useState<number | 'pick'>(5000);
  const [window, setWindow] = useState<WalkWindow>('evening');
  const [wantsReminders, setWantsReminders] = useState(true);
  const [busy, setBusy] = useState(false);
  const [w, onLayout] = useWidth();

  const toggle = (r: Reason) => setReasons(reasons.includes(r) ? reasons.filter((x) => x !== r) : [...reasons, r]);
  const canContinue = step === 0 ? reasons.length > 0 : true;

  /** Called after the permission answer. "Let Stride pick" reads the last week if the sensor allows. */
  const finish = async () => {
    setBusy(true);
    let goalValue = goal === 'pick' ? pickGoal({}) : goal;
    let stepsByDay: Record<string, number> = {};
    if (Platform.OS !== 'web') {
      try {
        stepsByDay = await Pedometer.fetchRecentDays(8);
        if (goal === 'pick') goalValue = pickGoal(stepsByDay);
      } catch {
        /* keep defaults */
      }
    }
    const [h, m] = WINDOW_TIME[window];
    completeOnboarding({
      reasons,
      goal: goalValue,
      adaptiveGoals: true,
      walkWindow: window,
      reminderHour: h,
      reminderMinute: m,
      remindersWanted: wantsReminders,
      remindersEnabled: false,
      stepsByDay,
    });
    setBusy(false);
    onDone();
  };

  const allow = async () => {
    setBusy(true);
    await requestMotion();
    await finish();
  };

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : allow());
  const back = () => step > 0 && setStep(step - 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <ProgressDots count={STEPS} index={step} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <Text style={type.label}>Stride</Text>
            <Text style={styles.q}>What brought you here?</Text>
            <Text style={[type.bodySoft, { marginTop: 6 }]}>Pick anything that fits. Nobody else sees this.</Text>
            <View style={{ gap: 10, marginTop: 22 }}>
              {(Object.keys(REASON_LABELS) as Reason[]).map((r) => (
                <OptionButton key={r} label={REASON_LABELS[r]} selected={reasons.includes(r)} onPress={() => toggle(r)} multi />
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={type.label}>Starting goal</Text>
            <Text style={styles.q}>Pick a starting goal</Text>
            <Text style={[type.bodySoft, { marginTop: 6 }]}>
              Steps a day. Smaller than you think is the right size. It can move later, and only up if it felt easy.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
              {GOAL_CHOICES.map((g) => (
                <Chip key={g} text={formatSteps(g)} selected={goal === g} onPress={() => setGoal(g)} big />
              ))}
              <Chip text="Let Stride pick" selected={goal === 'pick'} onPress={() => setGoal('pick')} big />
            </View>
            <View style={styles.block}>
              <Text style={type.sub}>
                {goal === 'pick'
                  ? 'Stride will look at your last week of steps and start you about 10% above it, rounded to the nearest 500. Without any history that is 3,500.'
                  : goal <= 3000
                    ? 'A gentle start. Most people can add this without changing their day.'
                    : goal <= 5000
                      ? 'About forty minutes of walking spread across a day. A common first goal.'
                      : goal <= 7000
                        ? 'A solid daily amount. Good if you already walk a fair bit.'
                        : 'A big goal. Fine if it is already close to your normal.'}
              </Text>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={type.label}>Rhythm</Text>
            <Text style={styles.q}>When do you usually walk?</Text>
            <Text style={[type.bodySoft, { marginTop: 6 }]}>Stride uses this for the one quiet reminder a day, if you want one.</Text>
            <View style={{ gap: 12, marginTop: 20 }}>
              {(Object.keys(WINDOW_LABELS) as WalkWindow[]).map((k) => (
                <OptionButton key={k} label={WINDOW_LABELS[k][0]} sub={WINDOW_LABELS[k][1]} selected={window === k} onPress={() => setWindow(k)} />
              ))}
            </View>
            <Pressable onPress={() => setWantsReminders(!wantsReminders)} style={[styles.block, styles.rowBetween]}>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>A quiet reminder</Text>
                <Text style={[type.sub, { marginTop: 2 }]}>"A short walk counts." once a day. You can turn it on in Settings later; nothing is asked now.</Text>
              </View>
              <Switch value={wantsReminders} onValueChange={setWantsReminders} trackColor={{ true: colors.accent, false: colors.cardAlt }} thumbColor="#fff" />
            </Pressable>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={type.label}>Motion</Text>
            <Text style={styles.q}>Counting your steps</Text>
            <Text style={[type.bodySoft, { marginTop: 6 }]}>
              Stride needs the motion sensor to count steps. Nothing leaves your phone.
            </Text>
            <View style={[styles.block, { paddingVertical: 10 }]} onLayout={onLayout}>
              <HomeTrail width={Math.max(0, w - 36)} progress={0.62} />
            </View>
            <View style={{ gap: 12, marginTop: 18 }}>
              {[
                ['No account', 'There is nothing to sign up for.'],
                ['No calories', 'Stride never shows them. It counts steps.'],
                ['No weight', 'Unless you choose to track it, later, in Settings.'],
              ].map(([t, s]) => (
                <View key={t} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>{t}</Text>
                    <Text style={type.sub}>{s}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title={step === STEPS - 1 ? 'Allow motion access' : 'Continue'} onPress={next} disabled={!canContinue} loading={busy} />
        {step === STEPS - 1 ? (
          <GhostButton title="Not now" onPress={finish} />
        ) : step > 0 ? (
          <GhostButton title="Back" onPress={back} />
        ) : (
          <View style={{ height: 48 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingTop: 14, paddingBottom: 6 },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  q: { ...type.display, fontSize: 30, marginTop: 8 },
  block: { marginTop: 18, backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.line },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footer: { paddingHorizontal: 24, paddingBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sand, marginTop: 7 },
});
