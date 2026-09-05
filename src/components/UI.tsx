import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';

export function Screen({ children, scroll, contentStyle }: { children: React.ReactNode; scroll?: boolean; contentStyle?: ViewStyle }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ width: 70 }}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
        )}
      </View>
      <Text style={[type.h3, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
        {title ?? ''}
      </Text>
      <View style={{ width: 70, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <Text style={[type.label, { marginBottom: 8 }, color ? { color } : null]}>{children}</Text>;
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  style,
  color,
  textColor,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  color?: string;
  textColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        color ? { backgroundColor: color } : null,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={[styles.primaryText, textColor ? { color: textColor } : null]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, style, disabled }: { title: string; onPress: () => void; style?: ViewStyle; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.secondary, disabled && { opacity: 0.5 }, pressed && { opacity: 0.7 }, style]}
    >
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

export function GhostButton({ title, onPress, style }: { title: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.6 }, style]}>
      <Text style={styles.ghostText}>{title}</Text>
    </Pressable>
  );
}

export function OptionButton({
  label,
  sub,
  selected,
  onPress,
  multi,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, selected && styles.optionActive, pressed && { opacity: 0.85 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.h3, selected && { color: colors.accent }]}>{label}</Text>
        {sub ? <Text style={[type.sub, { marginTop: 2 }]}>{sub}</Text> : null}
      </View>
      <View style={[styles.radio, multi && { borderRadius: 6 }, selected && styles.radioActive]}>
        {selected && <View style={[styles.radioDot, multi && { borderRadius: 2 }]} />}
      </View>
    </Pressable>
  );
}

export function Chip({ text, selected, onPress, big }: { text: string; selected?: boolean; onPress?: () => void; big?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.chip, big && styles.chipBig, selected && styles.chipActive]}>
      <Text style={[styles.chipText, big && { fontSize: 16 }, selected && { color: colors.onAccent }]}>{text}</Text>
    </Pressable>
  );
}

export function ProgressDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= index ? colors.accent : colors.lineStrong }}
        />
      ))}
    </View>
  );
}

export function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[type.caption, { marginBottom: 6 }]}>{label}</Text>
      <Text style={[type.num, { fontSize: 22, color: color ?? colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={[type.caption, { marginTop: 2 }]}>{sub}</Text> : null}
    </View>
  );
}

export function ToggleRow({ label, sub, value, onChange, last }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{label}</Text>
        {sub ? <Text style={type.caption}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.cardAlt }} thumbColor="#fff" />
    </View>
  );
}

export function Row({ label, value, onPress, danger, last }: { label: string; value?: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={[type.body, { fontWeight: '600' }, danger && { color: colors.danger }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {value ? <Text style={type.sub}>{value}</Text> : null}
        <Text style={{ color: colors.inkFaint, fontSize: 18 }}>›</Text>
      </View>
    </Pressable>
  );
}

export function Group({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function SectionCaption({ children }: { children: React.ReactNode }) {
  return <Text style={[type.caption, { marginTop: 20, marginBottom: 6 }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: 20 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  back: { color: colors.inkSoft, fontSize: 17, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.line },
  primary: { backgroundColor: colors.accent, borderRadius: radius.pill, height: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  primaryText: { color: colors.onAccent, fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  secondary: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  secondaryText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  ghost: { height: 48, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.inkSoft, fontSize: 15, fontWeight: '600' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, borderWidth: 1.5, borderColor: colors.line },
  optionActive: { borderColor: colors.accent, backgroundColor: colors.cardAlt },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  chip: { backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.line },
  chipBig: { paddingHorizontal: 20, paddingVertical: 14 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 10,
  },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line },
});
