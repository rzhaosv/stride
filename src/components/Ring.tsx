import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

/** Goal ring. `progress` 0..1+; over 1 the ring closes and glows a little. */
export default function Ring({
  size = 240,
  stroke = 14,
  progress,
  children,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  children?: React.ReactNode;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const c = size / 2;
  const r = c - stroke / 2 - 2;
  const circ = 2 * Math.PI * r;
  const done = progress >= 1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke={colors.cardAlt} strokeWidth={stroke} fill="none" />
        {done && <Circle cx={c} cy={c} r={r - stroke} fill={colors.accent} fillOpacity={0.07} />}
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={done ? colors.accent : colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.001, circ * p)} ${circ}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      {children}
    </View>
  );
}
