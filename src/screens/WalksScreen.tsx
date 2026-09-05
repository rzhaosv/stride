import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Screen, Header, PrimaryButton, Card } from '../components/UI';
import LogWalkSheet from '../components/LogWalkSheet';
import { colors, radius, type } from '../theme';
import { useApp, useNow } from '../store/AppContext';
import { ScreenProps } from '../navigation';
import { dateKey, formatRelativeKey, formatSteps } from '../logic/time';
import { bigDays, sortWalks } from '../logic/steps';

type Item =
  | { kind: 'walk'; key: string; at: string; minutes: number; note: string }
  | { kind: 'big'; key: string; at: string; steps: number; average: number };

export default function WalksScreen({ navigation }: ScreenProps<'Walks'>) {
  const { state, isPro, deleteWalk } = useApp();
  const now = useNow(60_000);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (!isPro) navigation.replace('Paywall');
  }, [isPro, navigation]);

  const walks: Item[] = sortWalks(state.walks).map((w) => ({ kind: 'walk', key: dateKey(new Date(w.at)), at: w.at, minutes: w.minutes, note: w.note }));
  const big: Item[] = bigDays(state.stepsByDay, now).map((b) => ({ kind: 'big', key: b.key, at: `${b.key}T12:00:00`, steps: b.steps, average: b.average }));
  const items = [...walks, ...big].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const onRemove = (at: string) =>
    Alert.alert('Remove this walk?', 'It comes off the list. Your steps are not affected.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteWalk(at) },
    ]);

  return (
    <Screen scroll>
      <Header title="Walks" onBack={() => navigation.goBack()} />
      <Text style={[type.bodySoft, { marginTop: 8 }]}>
        Walks you logged by hand, plus any day the sensor counted well above your usual.
      </Text>
      <PrimaryButton title="+ Log a walk" onPress={() => setLogOpen(true)} style={{ marginTop: 16 }} />

      {items.length === 0 ? (
        <Card style={{ marginTop: 18 }}>
          <Text style={type.h3}>Nothing here yet</Text>
          <Text style={[type.bodySoft, { marginTop: 4 }]}>
            Log a treadmill, pram or indoor walk and it lands here. Big days show up on their own once Stride has a week of counting.
          </Text>
        </Card>
      ) : (
        <View style={{ marginTop: 18, gap: 10 }}>
          {items.map((it) =>
            it.kind === 'walk' ? (
              <Pressable key={`w-${it.at}`} onLongPress={() => onRemove(it.at)} style={styles.row}>
                <View style={styles.iconWrap}>
                  <View style={styles.walkDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>{it.minutes} min walk</Text>
                  <Text style={type.sub}>
                    {formatRelativeKey(it.key, now)}
                    {it.note ? ` · ${it.note}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => onRemove(it.at)} hitSlop={10}>
                  <Text style={{ color: colors.inkFaint, fontSize: 13, fontWeight: '600' }}>Remove</Text>
                </Pressable>
              </Pressable>
            ) : (
              <View key={`b-${it.key}`} style={[styles.row, { borderColor: colors.lineStrong }]}>
                <View style={styles.iconWrap}>
                  <View style={styles.bigDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>A big day · {formatSteps(it.steps)}</Text>
                  <Text style={type.sub}>
                    {formatRelativeKey(it.key, now)} · about {Math.round((it.steps / Math.max(1, it.average)) * 10) / 10}× your usual {formatSteps(it.average)}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>
      )}
      <Text style={[type.caption, { marginTop: 16 }]}>Long-press or tap Remove to take a logged walk off the list.</Text>
      <LogWalkSheet visible={logOpen} onClose={() => setLogOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line },
  iconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  walkDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.accent },
  bigDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.sand },
});
