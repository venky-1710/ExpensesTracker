import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { G, Text as SvgText, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ThemeColors } from '../../context/ThemeContext';

const { width: SW } = Dimensions.get('window');

const SERIES = [
  { key: 'income', label: 'Income', color: '#10b981', gradId: 'igGreen' },
  { key: 'expense', label: 'Expenses', color: '#ef4444', gradId: 'igRed' },
] as const;

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtMonthLabel = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr; // Return full date string (e.g. YYYY-MM-DD) as requested
};

export default function IncomeExpenseChart({ data, C }: { data: any[], C: ThemeColors }) {
  const chart = getChartStyles(C);
  const [hidden, setHidden] = useState<string[]>([]);

  const toggle = (key: string) =>
    setHidden(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  if (!data || data.length === 0) {
    return (
      <View style={chart.empty}>
        <Feather name="bar-chart-2" size={32} color={C.textMuted} />
        <Text style={chart.emptyText}>No data yet</Text>
        <Text style={chart.emptySmall}>Add transactions to see your trend</Text>
      </View>
    );
  }

  const showIncome = !hidden.includes('income');
  const showExpense = !hidden.includes('expense');

  const displayData = data.slice(-8);

  const maxVal = Math.max(
    ...displayData.flatMap((d: any) => [
      showIncome ? (d.credits || 0) : 0,
      showExpense ? (d.debits || 0) : 0,
    ]),
    1,
  );

  const Y_LABEL_W = 42;
  const TOP_PAD = 12;
  const BOT_PAD = 45; // Increased to accommodate long rotated date strings
  const CHART_H = 180;
  const SVG_H = CHART_H + TOP_PAD + BOT_PAD;
  // Inside the chat bubble, we don't have full screen width. We'll use 100% of parent width minus padding.
  const FULL_W = SW - 80;
  const PLOT_W = FULL_W - Y_LABEL_W;
  const bothVis = showIncome && showExpense;
  const GROUP_W = PLOT_W / displayData.length;
  const BAR_W = Math.min(18, GROUP_W * (bothVis ? 0.32 : 0.45));
  const BAR_GAP = bothVis ? 4 : 0;
  const pairW = bothVis ? BAR_W * 2 + BAR_GAP : BAR_W;
  const GROUP_OFF = (GROUP_W - pairW) / 2;

  const fmtY = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return `${Math.round(v)}`;
  };

  const gridPcts = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Svg width={FULL_W} height={SVG_H}>
        <Defs>
          <LinearGradient id="igGreen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#10b981" stopOpacity="1" />
            <Stop offset="1" stopColor="#10b981" stopOpacity="0.45" />
          </LinearGradient>
          <LinearGradient id="igRed" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ef4444" stopOpacity="1" />
            <Stop offset="1" stopColor="#ef4444" stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        {gridPcts.map((pct, i) => {
          const y = TOP_PAD + CHART_H - pct * CHART_H;
          return (
            <G key={i}>
              <Line
                x1={Y_LABEL_W} y1={y} x2={FULL_W} y2={y}
                stroke={C.border}
                strokeWidth={i === 0 ? 1 : 0.7}
                strokeOpacity={i === 0 ? 0.8 : 0.45}
                strokeDasharray={i === 0 ? undefined : '4 5'}
              />
              {pct > 0 && (
                <SvgText x={Y_LABEL_W - 6} y={y + 4} fontSize="9" fill={C.textMuted} textAnchor="end">
                  {fmtY(pct * maxVal)}
                </SvgText>
              )}
            </G>
          );
        })}

        {displayData.map((d: any, i: number) => {
          const incH = Math.max(6, ((d.credits || 0) / maxVal) * CHART_H);
          const expH = Math.max(6, ((d.debits || 0) / maxVal) * CHART_H);
          const gx = Y_LABEL_W + i * GROUP_W + GROUP_OFF;
          const baseY = TOP_PAD + CHART_H;
          const midX = gx + pairW / 2;

          return (
            <G key={i}>
              {showIncome && (
                <Rect
                  x={gx} y={baseY - incH}
                  width={BAR_W} height={incH}
                  rx={5} ry={5}
                  fill="url(#igGreen)"
                />
              )}
              {showExpense && (
                <Rect
                  x={bothVis ? gx + BAR_W + BAR_GAP : gx} y={baseY - expH}
                  width={BAR_W} height={expH}
                  rx={5} ry={5}
                  fill="url(#igRed)"
                />
              )}
              <SvgText 
                x={midX} 
                y={baseY + 16} 
                fontSize="9" 
                fill={C.textMuted} 
                textAnchor="end" 
                transform={`rotate(-35, ${midX}, ${baseY + 16})`}
              >
                {fmtMonthLabel(d.date)}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      <View style={chart.tagRow}>
        {SERIES.map(s => {
          const isHidden = hidden.includes(s.key);
          return (
            <TouchableOpacity
              key={s.key}
              style={[chart.legendItem, { opacity: isHidden ? 0.4 : 1 }]}
              onPress={() => toggle(s.key)}
              activeOpacity={0.7}
            >
              <View style={[chart.legendDot, { backgroundColor: s.color }]} />
              <Text style={[chart.legendLabel, { textDecorationLine: isHidden ? 'line-through' : 'none' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const getChartStyles = (C: ThemeColors) => StyleSheet.create({
  empty: { paddingVertical: 36, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
  emptySmall: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  tagRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14 },
});
