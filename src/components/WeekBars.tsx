import React from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

/** Web SVG text defaults to serif; native uses the system font. */
const svgFont = Platform.OS === 'web' ? { fontFamily: 'system-ui, -apple-system, sans-serif' } : {};
import { WeekBar } from '../logic/steps';
import { DAY_NAMES } from '../logic/time';

/** Seven Mon..Sun bars with a dashed goal line. Bars at or over the goal are green. */
export default function WeekBars({ width, bars, goal, height = 120 }: { width: number; bars: WeekBar[]; goal: number; height?: number }) {
  if (width <= 0) return <View style={{ height }} />;
  const padTop = 14;
  const padBottom = 22;
  const chartH = height - padTop - padBottom;
  const max = Math.max(goal * 1.25, ...bars.map((b) => b.steps), 1);
  const slot = width / 7;
  const barW = Math.min(30, slot * 0.56);
  const y = (v: number) => padTop + chartH - (v / max) * chartH;
  return (
    <Svg width={width} height={height}>
      <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={colors.sand} strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="4 5" />
      {bars.map((b, i) => {
        const x = slot * i + (slot - barW) / 2;
        const h = Math.max(b.steps > 0 ? 3 : 0, chartH * (b.steps / max));
        const fill = b.future ? 'transparent' : b.met ? colors.accent : b.isToday ? colors.inkSoft : colors.cardAlt;
        return (
          <React.Fragment key={b.key}>
            {b.future || b.steps === 0 ? (
              <Rect x={x} y={y(0) - 3} width={barW} height={3} rx={1.5} fill={colors.lineStrong} />
            ) : (
              <Rect x={x} y={y(0) - h} width={barW} height={h} rx={Math.min(6, barW / 2)} fill={fill} />
            )}
            <SvgText
              {...svgFont}
              x={slot * i + slot / 2}
              y={height - 6}
              fontSize={11}
              fontWeight={b.isToday ? '800' : '600'}
              fill={b.isToday ? colors.ink : colors.inkFaint}
              textAnchor="middle"
            >
              {DAY_NAMES[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function GoalLineHint({ goal }: { goal: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <View style={{ width: 14, height: 0, borderTopWidth: 1.5, borderColor: colors.sand, borderStyle: 'dashed' }} />
      <Text style={{ color: colors.inkFaint, fontSize: 12, fontWeight: '500' }}>goal {String(goal).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>
    </View>
  );
}
