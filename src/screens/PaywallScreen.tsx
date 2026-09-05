import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors, radius, type } from '../theme';
import { PrimaryButton } from '../components/UI';
import { HomeTrail } from '../components/Trail';
import { useWidth } from '../components/useWidth';
import { getPackages, purchase, restore, isCancelledError } from '../services/billing';
import { useApp } from '../store/AppContext';
import { ScreenProps } from '../navigation';

export const SITE = 'https://tryforma.app/stride';
const BENEFITS: [string, string][] = [
  ['Steps, not calories', 'Nothing about food. Ever.'],
  ['Gentle weekly goals that adapt', 'Up only when it felt easy. Down when it did not.'],
  ['90-day trail view', 'Your walking, drawn as a path.'],
  ['Quiet reminders', 'One a day, at your time. "A short walk counts."'],
];

export default function PaywallScreen({ navigation, route }: ScreenProps<'Paywall'>) {
  const { setPro } = useApp();
  const [pkgs, setPkgs] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [w, onLayout] = useWidth();
  const fromOnboarding = route.params?.fromOnboarding;

  useEffect(() => {
    getPackages().then((p) => {
      setPkgs(p);
      const annual = p.find(isAnnual);
      setSelected((annual ?? p[0])?.identifier ?? null);
      setLoaded(true);
    });
  }, []);

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Home');
  };

  const onSubscribe = async () => {
    const pkg = pkgs.find((p) => p.identifier === selected);
    if (!pkg) {
      Alert.alert('Not available yet', 'Plans could not be loaded right now. Please check your connection and try again.');
      return;
    }
    setBusy(true);
    try {
      const ok = await purchase(pkg);
      if (ok) {
        setPro(true);
        close();
      }
    } catch (e) {
      if (!isCancelledError(e)) Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const ok = await restore();
      if (ok) {
        setPro(true);
        close();
      } else {
        Alert.alert('Nothing to restore', 'No active subscription was found for this Apple ID.');
      }
    } catch {
      Alert.alert('Restore failed', 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  // Annual first so it reads as the default.
  const ordered = [...pkgs].sort((a, b) => (isAnnual(a) ? -1 : isAnnual(b) ? 1 : 0));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable onPress={close} hitSlop={12} style={styles.close}>
        <Text style={{ color: colors.inkFaint, fontSize: 16, fontWeight: '600' }}>{fromOnboarding ? 'Skip' : '✕'}</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View onLayout={onLayout} style={{ marginTop: 10 }}>
          <HomeTrail width={w} height={90} progress={0.66} />
        </View>
        <Text style={[type.display, { textAlign: 'center', marginTop: 4 }]}>Walk it off, quietly.</Text>
        <Text style={[type.bodySoft, { textAlign: 'center', marginTop: 6 }]}>Stride Pro. Count steps, not calories.</Text>

        <View style={styles.benefits}>
          {BENEFITS.map(([label, sub]) => (
            <View key={label} style={styles.benefitRow}>
              <View style={styles.dot} />
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{label}</Text>
                <Text style={type.sub}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 12, marginTop: 4 }}>
          {!loaded ? (
            <Text style={[type.caption, { textAlign: 'center' }]}>Loading plans…</Text>
          ) : ordered.length === 0 ? (
            <View style={styles.plan}>
              <Text style={[type.bodySoft, { textAlign: 'center', flex: 1 }]}>
                Plans are not available right now. Today's steps and your goal ring stay free; try again later.
              </Text>
            </View>
          ) : (
            ordered.map((p) => {
              const active = p.identifier === selected;
              const annual = isAnnual(p);
              return (
                <Pressable key={p.identifier} onPress={() => setSelected(p.identifier)} style={[styles.plan, active && styles.planActive]}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>{annual ? 'Yearly' : 'Monthly'}</Text>
                    <Text style={[type.caption, { color: annual ? colors.sand : colors.inkSoft, marginTop: 2 }]}>
                      {annual ? '7-day free trial, then yearly · best value' : '7-day free trial, then monthly'}
                    </Text>
                  </View>
                  <Text style={[type.h3, { color: active ? colors.ink : colors.inkSoft }]}>{p.product.priceString}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        <PrimaryButton title="Start my 7-day free trial" onPress={onSubscribe} loading={busy} disabled={!selected} style={{ marginTop: 20 }} />
        <Pressable onPress={close} style={{ alignItems: 'center', paddingVertical: 14 }}>
          <Text style={[type.sub, { color: colors.inkFaint }]}>Continue with the basics</Text>
        </Pressable>
        <Text style={[type.caption, { textAlign: 'center', lineHeight: 17 }]}>
          Free for 7 days, then the plan price is charged to your Apple ID. Subscriptions auto-renew unless cancelled at least 24 hours
          before the end of the current period. Cancel anytime in Settings › Apple ID › Subscriptions. Today's steps and the goal ring
          are always free.
        </Text>

        <View style={styles.links}>
          <Pressable onPress={onRestore}><Text style={styles.link}>Restore purchases</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(`${SITE}/terms.html`)}><Text style={styles.link}>Terms</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(`${SITE}/privacy.html`)}><Text style={styles.link}>Privacy</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function isAnnual(p: PurchasesPackage) {
  return p.packageType === 'ANNUAL' || p.identifier === '$rc_annual';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  close: { position: 'absolute', top: 54, right: 20, zIndex: 5, padding: 6 },
  scroll: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 30 },
  benefits: { marginTop: 22, marginBottom: 20, gap: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sand, marginTop: 7 },
  plan: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    gap: 10,
  },
  planActive: { borderColor: colors.accent, backgroundColor: colors.cardAlt },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 18 },
  link: { color: colors.inkFaint, fontSize: 13, fontWeight: '600' },
});
