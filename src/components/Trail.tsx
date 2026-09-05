import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { Circle, Path, Text as SvgText, G } from 'react-native-svg';
import { colors } from '../theme';

/** Web SVG text defaults to serif; native uses the system font. */
const svgFont = Platform.OS === 'web' ? { fontFamily: 'system-ui, -apple-system, sans-serif' } : {};

type Pt = { x: number; y: number };

/** Smooth polyline through points using Catmull-Rom converted to cubic beziers. */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Point at `ratio` of the polyline's length (linear between samples; dense enough to look smooth). */
function pointAt(pts: Pt[], ratio: number): Pt {
  const lens: number[] = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = lens[lens.length - 1];
  const target = Math.max(0, Math.min(1, ratio)) * total;
  for (let i = 1; i < pts.length; i++) {
    if (lens[i] >= target) {
      const seg = lens[i] - lens[i - 1] || 1;
      const t = (target - lens[i - 1]) / seg;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
  }
  return pts[pts.length - 1];
}

/**
 * Home motif: a winding trail from left to right with a dot that advances with today's progress.
 * The trail past the dot is faint; the walked part is solid green; the end carries a sand marker.
 */
export function HomeTrail({ width, height = 96, progress, done }: { width: number; height?: number; progress: number; done?: boolean }) {
  const pad = 18;
  const pts = useMemo(() => {
    const n = 48;
    const out: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = pad + t * (width - pad * 2);
      const y = height / 2 + Math.sin(t * Math.PI * 2.2 + 0.4) * (height * 0.28) + Math.sin(t * Math.PI * 5.1) * (height * 0.06);
      out.push({ x, y });
    }
    return out;
  }, [width, height]);
  const p = Math.max(0, Math.min(1, progress));
  const dot = pointAt(pts, p);
  const walked = useMemo(() => {
    const n = Math.max(2, Math.round(p * (pts.length - 1)) + 1);
    const sub = pts.slice(0, n);
    sub.push(dot);
    return sub;
  }, [pts, p, dot]);
  const end = pts[pts.length - 1];
  const start = pts[0];
  if (width <= 0) return <View style={{ height }} />;
  return (
    <Svg width={width} height={height}>
      <Path d={smoothPath(pts)} stroke={colors.lineStrong} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="1 9" />
      {p > 0 && <Path d={smoothPath(walked)} stroke={colors.accent} strokeWidth={4} fill="none" strokeLinecap="round" />}
      <Circle cx={start.x} cy={start.y} r={4} fill={colors.inkFaint} />
      <Circle cx={end.x} cy={end.y} r={done ? 8 : 6} fill={done ? colors.sand : colors.bg} stroke={colors.sand} strokeWidth={2} />
      <Circle cx={dot.x} cy={dot.y} r={14} fill={colors.accent} fillOpacity={0.18} />
      <Circle cx={dot.x} cy={dot.y} r={7} fill={colors.accent} stroke={colors.bg} strokeWidth={2} />
    </Svg>
  );
}

export type TrailNode = { key: string; steps: number; met: boolean; isToday: boolean; label?: string; recorded: boolean };

/**
 * Trail screen: one node per day along a vertical winding path, oldest at the top. Node size
 * scales with steps against the goal; filled when the goal was met; today is ringed in sand.
 */
export function DayTrail({ width, nodes, goal, rowHeight = 26 }: { width: number; nodes: TrailNode[]; goal: number; rowHeight?: number }) {
  const padX = 54;
  const padY = 22;
  const height = padY * 2 + Math.max(0, nodes.length - 1) * rowHeight;
  const pts = useMemo(() => {
    const amp = (width - padX * 2) / 2;
    const cx = width / 2;
    return nodes.map((_, i) => ({ x: cx + Math.sin(i * 0.42) * amp, y: padY + i * rowHeight }));
  }, [nodes, width, rowHeight]);
  if (width <= 0 || nodes.length === 0) return <View style={{ height: 40 }} />;
  const radiusFor = (n: TrailNode) => {
    if (!n.recorded) return 3;
    const r = Math.min(1.6, n.steps / Math.max(1, goal));
    return 4 + r * 6;
  };
  return (
    <Svg width={width} height={height}>
      <Path d={smoothPath(pts)} stroke={colors.lineStrong} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="1 8" />
      {nodes.map((n, i) => {
        const p = pts[i];
        const r = radiusFor(n);
        const left = p.x < width / 2;
        return (
          <G key={n.key}>
            {n.met ? (
              <Circle cx={p.x} cy={p.y} r={r} fill={colors.accent} />
            ) : (
              <Circle cx={p.x} cy={p.y} r={r} fill={colors.bg} stroke={n.recorded ? colors.inkSoft : colors.lineStrong} strokeWidth={2} />
            )}
            {n.isToday && <Circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke={colors.sand} strokeWidth={2} />}
            {n.label ? (
              <SvgText
                {...svgFont}
                x={left ? p.x - r - 10 : p.x + r + 10}
                y={p.y + 4}
                fontSize={11}
                fontWeight="600"
                fill={colors.inkFaint}
                textAnchor={left ? 'end' : 'start'}
              >
                {n.label}
              </SvgText>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

/** Small legend under the day trail. */
export function TrailLegend() {
  const item = (node: React.ReactNode, label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {node}
      <Text style={{ color: colors.inkFaint, fontSize: 12, fontWeight: '500' }}>{label}</Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 6 }}>
      {item(<View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent }} />, 'goal met')}
      {item(<View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.inkSoft }} />, 'a walk')}
      {item(<View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.sand }} />, 'today')}
    </View>
  );
}
