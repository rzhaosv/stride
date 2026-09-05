import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, TextInput, Alert, Modal, Platform } from 'react-native';
import { Screen, Header, PrimaryButton, Card, Chip, Row, ToggleRow, Group, SectionCaption } from '../components/UI';
import { colors, radius, type } from '../theme';
import { useApp } from '../store/AppContext';
import { restore } from '../services/billing';
import { ScreenProps } from '../navigation';
import { SITE } from './PaywallScreen';
import { formatTime, formatSteps, formatKeyShort, dateKey } from '../logic/time';
import { GOAL_CHOICES } from '../logic/types';
import { clampGoal, displayToKg, kgToDisplay } from '../logic/steps';

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const MINUTES = [0, 15, 30, 45];

export default function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { state, isPro, setPro, update, setGoal, setReminders, setReminderTime, refreshSteps, logWeight, deleteWeight, resetAll } = useApp();
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [timeOpen, setTimeOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');

  const requirePro = (): boolean => {
    if (isPro) return true;
    navigation.navigate('Paywall');
    return false;
  };

  const onReminders = async (v: boolean) => {
    if (v && !requirePro()) return;
    const ok = await setReminders(v);
    if (v && !ok) Alert.alert('Notifications are off', 'Allow notifications for Stride in iOS Settings to get the daily reminder.');
  };

  const saveGoal = () => {
    const n = parseInt(goalDraft, 10);
    if (Number.isFinite(n)) setGoal(clampGoal(n));
    setGoalOpen(false);
  };

  const saveWeight = () => {
    const n = parseFloat(weightDraft);
    if (Number.isFinite(n) && n > 0) logWeight(displayToKg(n, state.units));
    setWeightDraft('');
    setWeightOpen(false);
  };

  const onReset = () =>
    Alert.alert('Reset everything?', 'This clears your goal, cached steps, walks and settings on this phone. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetAll() },
    ]);

  const lastWeight = state.weightEntries[state.weightEntries.length - 1];
  const motionLabel = state.motionPermission === 'granted' ? 'Allowed' : state.motionPermission === 'denied' ? 'Off' : 'Not asked';

  return (
    <Screen scroll>
      <Header title="Settings" onBack={() => navigation.goBack()} />

      <Card style={{ marginTop: 8 }}>
        <Text style={type.label}>Plan</Text>
        <Text style={[type.h2, { marginTop: 6 }]}>{isPro ? 'Stride Pro' : 'Basics'}</Text>
        {!isPro && (
          <>
            <Text style={[type.sub, { marginTop: 4 }]}>Today's steps and your goal ring. Pro adds the trail, adaptive goals, runs, reminders and the walks log.</Text>
            <PrimaryButton title="Start my 7-day free trial" onPress={() => navigation.navigate('Paywall')} style={{ marginTop: 14, height: 46 }} />
          </>
        )}
      </Card>

      <SectionCaption>GOAL</SectionCaption>
      <Group>
        <Row
          label="Daily goal"
          value={`${formatSteps(state.goal)} steps`}
          onPress={() => {
            setGoalDraft(String(state.goal));
            setGoalOpen(true);
          }}
        />
        <ToggleRow
          label="Adaptive goals"
          sub="Once a week Stride may suggest a nudge. Up only if it felt easy."
          value={state.adaptiveGoals}
          onChange={(v) => {
            if (v && !requirePro()) return;
            update({ adaptiveGoals: v });
          }}
          last
        />
      </Group>

      <SectionCaption>REMINDER</SectionCaption>
      <Group>
        <ToggleRow label="Daily reminder" sub={`"A short walk counts." at ${formatTime(state.reminderHour, state.reminderMinute)}`} value={state.remindersEnabled} onChange={onReminders} />
        <Row label="Reminder time" value={formatTime(state.reminderHour, state.reminderMinute)} onPress={() => setTimeOpen(true)} last />
      </Group>

      <SectionCaption>MOTION</SectionCaption>
      <Group>
        <Row label="Motion & Fitness access" value={motionLabel} onPress={() => (Platform.OS === 'web' ? undefined : Linking.openSettings().catch(() => {}))} />
        <Row label="Re-read the sensor" onPress={() => refreshSteps()} last />
      </Group>
      <Text style={[type.caption, { marginTop: 8 }]}>Steps are read from the phone's motion sensor and cached here. Nothing is uploaded anywhere.</Text>

      <SectionCaption>OPTIONAL</SectionCaption>
      <Group>
        <ToggleRow
          label="Track weight"
          sub="Off by default. Never shown on Home. Only here, only if you want it."
          value={state.weightOptIn}
          onChange={(v) => update({ weightOptIn: v })}
          last={!state.weightOptIn}
        />
        {state.weightOptIn ? (
          <>
            <Row label="Units" value={state.units === 'metric' ? 'kg' : 'lb'} onPress={() => update({ units: state.units === 'metric' ? 'imperial' : 'metric' })} />
            <Row label="Log weight" value={lastWeight ? `${kgToDisplay(lastWeight.kg, state.units)} · ${formatKeyShort(dateKey(new Date(lastWeight.at)))}` : undefined} onPress={() => setWeightOpen(true)} last />
          </>
        ) : null}
      </Group>
      {state.weightOptIn && state.weightEntries.length > 0 ? (
        <View style={{ marginTop: 8, gap: 4 }}>
          {[...state.weightEntries]
            .reverse()
            .slice(0, 6)
            .map((e) => (
              <Pressable
                key={e.at}
                onLongPress={() => Alert.alert('Remove entry?', '', [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => deleteWeight(e.at) }])}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6 }}
              >
                <Text style={type.caption}>{formatKeyShort(dateKey(new Date(e.at)))}</Text>
                <Text style={[type.caption, { color: colors.inkSoft }]}>{kgToDisplay(e.kg, state.units)}</Text>
              </Pressable>
            ))}
          <Text style={[type.caption, { paddingHorizontal: 16 }]}>Long-press an entry to remove it. There is no chart and no target, on purpose.</Text>
        </View>
      ) : null}

      <SectionCaption>SUBSCRIPTION</SectionCaption>
      <Group>
        <Row
          label="Restore purchases"
          onPress={async () => {
            const ok = await restore().catch(() => false);
            if (ok) setPro(true);
            else Alert.alert('Nothing to restore', 'No active subscription was found for this Apple ID.');
          }}
        />
        <Row label="Manage subscription" onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')} />
        <Row label="Privacy policy" onPress={() => Linking.openURL(`${SITE}/privacy.html`)} />
        <Row label="Terms of use" onPress={() => Linking.openURL(`${SITE}/terms.html`)} />
        <Row label="Support" onPress={() => Linking.openURL('mailto:ray@thezenithlabs.com?subject=Stride%20support')} last />
      </Group>

      <SectionCaption>RESET</SectionCaption>
      <Group>
        <Row label="Reset everything" onPress={onReset} danger last />
      </Group>

      <Text style={[type.caption, { marginTop: 20, lineHeight: 17 }]}>
        Stride counts steps. It is not a medical device and does not give health advice. If walking hurts or you have a condition that
        affects exercise, check with a doctor first. All data stays on this phone.
      </Text>

      <Modal visible={goalOpen} transparent animationType="fade" onRequestClose={() => setGoalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setGoalOpen(false)} />
        <View style={styles.sheet}>
          <Text style={type.h3}>Daily goal</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {GOAL_CHOICES.map((g) => (
              <Chip key={g} text={formatSteps(g)} selected={goalDraft === String(g)} onPress={() => setGoalDraft(String(g))} />
            ))}
          </View>
          <TextInput value={goalDraft} onChangeText={setGoalDraft} keyboardType="number-pad" style={styles.input} placeholder="Steps a day" placeholderTextColor={colors.inkFaint} />
          <PrimaryButton title="Save" onPress={saveGoal} style={{ marginTop: 14 }} />
          <Pressable onPress={() => setGoalOpen(false)} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={type.sub}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={timeOpen} transparent animationType="fade" onRequestClose={() => setTimeOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTimeOpen(false)} />
        <View style={styles.sheet}>
          <Text style={type.h3}>Reminder · {formatTime(state.reminderHour, state.reminderMinute)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {HOURS.map((h) => (
              <Chip key={h} text={formatTime(h, 0).replace(':00', '')} selected={state.reminderHour === h} onPress={() => setReminderTime(h, state.reminderMinute)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {MINUTES.map((m) => (
              <Chip key={m} text={`:${String(m).padStart(2, '0')}`} selected={state.reminderMinute === m} onPress={() => setReminderTime(state.reminderHour, m)} />
            ))}
          </View>
          <PrimaryButton title="Done" onPress={() => setTimeOpen(false)} style={{ marginTop: 18 }} />
        </View>
      </Modal>

      <Modal visible={weightOpen} transparent animationType="fade" onRequestClose={() => setWeightOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setWeightOpen(false)} />
        <View style={styles.sheet}>
          <Text style={type.h3}>Log weight ({state.units === 'metric' ? 'kg' : 'lb'})</Text>
          <Text style={[type.sub, { marginTop: 4 }]}>Just a number, kept here. No chart, no target.</Text>
          <TextInput value={weightDraft} onChangeText={setWeightDraft} autoFocus keyboardType="decimal-pad" style={styles.input} placeholderTextColor={colors.inkFaint} />
          <PrimaryButton title="Save" onPress={saveWeight} style={{ marginTop: 14 }} />
          <Pressable onPress={() => setWeightOpen(false)} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={type.sub}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 22,
    paddingBottom: 30,
  },
  input: {
    marginTop: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '600',
  },
});
