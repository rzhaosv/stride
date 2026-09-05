import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header, Card, Chip, StatTile, PrimaryButton, SecondaryButton } from '../components/UI';
import { DayTrail, TrailLegend, TrailNode } from '../components/Trail';
import { useWidth } from '../components/useWidth';
import { colors, radius, type } from '../theme';
import { useApp, useNow } from '../store/AppContext';
import { demo } from '../dev/demo';
import { ScreenProps } from '../navigation';
import { formatSteps, isoDayOfKey, formatKeyDay, lastKeys, todayKey, weekStartKey } from '../logic/time';
import { averages, badges, stepsOn, suggestGoal, weekTotals } from '../logic/steps';

export default function TrailScreen({ navigation }: ScreenProps<'Trail'>) {
  const { state, isPro, answerSuggestion } = useApp();
  const now = useNow(60_000);
  const [window, setWindow] = useState<30 | 90>(demo?.name === 'trail' ? 90 : 30);
  const [w, onLayout] = useWidth();

  useEffect(() => {
    if (!isPro) navigation.replace('Paywall');
  }, [isPro, navigation]);

  const today = todayKey(now);
  const keys = lastKeys(window, now);
  const nodes: TrailNode[] = keys.map((key) => {
    const recorded = state.stepsByDay[key] !== undefined;
    const steps = stepsOn(state.stepsByDay, key);
    return {
      key,
      steps,
      recorded,
      met: recorded && steps >= state.goal,
      isToday: key === today,
      label: isoDayOfKey(key) === 1 || key === today ? formatKeyDay(key) : undefined,
    };
  });
  const av = averages(state.stepsByDay, window, now);
  const totals = weekTotals(state.stepsByDay, window, now).filter((t) => t.days > 0).reverse();
  const maxWeek = Math.max(1, ...totals.map((t) => t.total));
  const goalDays = nodes.filter((n) => n.met).length;
  const suggestion = state.adaptiveGoals ? suggestGoal(state.stepsByDay, state.goal, now) : null;
  const askedThisWeek = state.goalSuggestionAnsweredWeek === weekStartKey(today);
  const shift = av.days >= 10 && av.earlier > 0 ? Math.round((av.recent - av.earlier) / Math.max(1, av.earlier) * 100) : null;

  return (
    <Screen scroll>
      <Header title="Trail" onBack={() => navigation.goBack()} />

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Chip text="30 days" selected={window === 30} onPress={() => setWindow(30)} />
        <Chip text="90 days" selected={window === 90} onPress={() => setWindow(90)} />
      </View>

      <Card style={{ marginTop: 16 }}>
        <Text style={type.h3}>Your average</Text>
        {av.days >= 10 ? (
          <>
            <Text style={[type.bodySoft, { marginTop: 4 }]}>
              Went from <Text style={{ color: colors.ink, fontWeight: '700' }}>{formatSteps(av.earlier)}</Text> to{' '}
              <Text style={{ color: colors.accent, fontWeight: '700' }}>{formatSteps(av.recent)}</Text> a day across these {window} days.
              {shift !== null && shift > 0 ? ' That is a direction.' : shift !== null && shift < 0 ? ' Some weeks are like that.' : ''}
            </Text>
          </>
        ) : (
          <Text style={[type.bodySoft, { marginTop: 4 }]}>After ten days of counting, Stride shows how your average is moving.</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <StatTile label="7-DAY AVG" value={formatSteps(av.week)} />
          <StatTile label="30-DAY AVG" value={formatSteps(av.month)} />
          <StatTile label="GOAL DAYS" value={String(goalDays)} sub={`of ${window}`} color={colors.accent} />
        </View>
      </Card>

      {suggestion && !askedThisWeek ? (
        <View style={styles.suggest}>
          <Text style={type.label}>Next week</Text>
          <Text style={[type.h2, { marginTop: 6 }]}>{suggestion.line}</Text>
          <Text style={[type.sub, { marginTop: 6 }]}>
            {suggestion.direction === 'up'
              ? `You met ${formatSteps(state.goal)} on most days this week. The goal only moves up when it felt easy.`
              : `This week averaged well under ${formatSteps(state.goal)}. A smaller goal you can meet beats a bigger one you cannot.`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <PrimaryButton title={`Accept ${formatSteps(suggestion.next)}`} onPress={() => answerSuggestion(true, suggestion.next)} style={{ flex: 1, height: 48 }} />
            <SecondaryButton title="Keep current" onPress={() => answerSuggestion(false, suggestion.next)} style={{ flex: 1, height: 48 }} />
          </View>
        </View>
      ) : !state.adaptiveGoals ? (
        <Text style={[type.caption, { marginTop: 14 }]}>Adaptive goals are off. Turn them on in Settings and Stride will suggest a nudge once a week.</Text>
      ) : null}

      <Card style={{ marginTop: 16, paddingHorizontal: 8 }}>
        <Text style={[type.h3, { paddingHorizontal: 10 }]}>The trail</Text>
        <Text style={[type.caption, { paddingHorizontal: 10, marginTop: 2 }]}>One node a day. Bigger with more steps, filled when the goal was met.</Text>
        <View onLayout={onLayout} style={{ marginTop: 8 }}>
          <DayTrail width={w} nodes={nodes} goal={state.goal} rowHeight={window === 90 ? 18 : 26} />
        </View>
        <TrailLegend />
      </Card>

      {totals.length ? (
        <Card style={{ marginTop: 16 }}>
          <Text style={type.h3}>Weekly totals</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {totals.map((t) => (
              <View key={t.start}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={type.sub}>Week of {formatKeyDay(t.start)}</Text>
                  <Text style={[type.sub, { color: colors.ink, fontVariant: ['tabular-nums'] }]}>
                    {formatSteps(t.total)} · {formatSteps(t.average)}/day
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(2, (t.total / maxWeek) * 100)}%`, backgroundColor: t.average >= state.goal ? colors.accent : colors.inkSoft }]} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={{ marginTop: 16 }}>
        <Text style={type.h3}>Quiet badges</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {badges(state, now).map((b) => (
            <View key={b.id} style={[styles.badge, b.earned && styles.badgeOn]}>
              <Text style={[styles.badgeText, b.earned && { color: colors.onAccent }]}>{b.label}</Text>
            </View>
          ))}
        </View>
        <Text style={[type.caption, { marginTop: 10 }]}>Badges are about days that happened. There is nothing here for days that did not.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  suggest: { marginTop: 16, backgroundColor: colors.cardAlt, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.lineStrong },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  badge: { backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  badgeOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  badgeText: { color: colors.inkFaint, fontSize: 13, fontWeight: '700' },
});
