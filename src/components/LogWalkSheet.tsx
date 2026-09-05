import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, radius, type } from '../theme';
import { Chip, PrimaryButton } from './UI';
import { useApp } from '../store/AppContext';

const PRESETS = [10, 15, 20, 30, 45, 60];

/**
 * Manual walk: minutes + optional note, for treadmill / pram / indoor days the sensor missed.
 * Logged walks live in their own list; they are never added to the step count.
 */
export default function LogWalkSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { logWalk } = useApp();
  const [minutes, setMinutes] = useState<number>(20);
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');

  const value = custom ? Math.round(parseFloat(custom)) : minutes;
  const valid = Number.isFinite(value) && value > 0;

  const save = () => {
    if (!valid) return;
    logWalk(value, note);
    setNote('');
    setCustom('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} pointerEvents="box-none">
        <View style={styles.sheet}>
          <Text style={type.h2}>Log a walk</Text>
          <Text style={[type.bodySoft, { marginTop: 4 }]}>For treadmill, pram or indoor days. Kept as a walk, not added to your steps.</Text>
          <Text style={[type.caption, { marginTop: 18, marginBottom: 8 }]}>MINUTES</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map((m) => (
              <Chip
                key={m}
                text={String(m)}
                selected={!custom && minutes === m}
                onPress={() => {
                  setCustom('');
                  setMinutes(m);
                }}
              />
            ))}
          </View>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
            placeholder="Or type minutes"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
          />
          <Text style={[type.caption, { marginTop: 14, marginBottom: 8 }]}>NOTE (OPTIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Rain, so the treadmill."
            placeholderTextColor={colors.inkFaint}
            style={[styles.input, { marginTop: 0 }]}
            maxLength={80}
          />
          <PrimaryButton title="Save walk" onPress={save} disabled={!valid} style={{ marginTop: 18 }} />
          <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={type.sub}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 22,
    paddingBottom: 30,
  },
  input: {
    marginTop: 10,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
});
