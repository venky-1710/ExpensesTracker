import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { G, Path, Polyline, Text as SvgText } from 'react-native-svg';
import { ThemeColors } from '../../context/ThemeContext';

const { width: SW } = Dimensions.get('window');

const CHART_COLORS = ['#6d4aff', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

export default function CategoryPieChart({ data, C, customWidth }: { data: any[], C: ThemeColors, customWidth?: number }) {
  const chart = getChartStyles(C);
  const scrollRef = useRef<ScrollView>(null);
  const [hidden, setHidden] = useState<string[]>([]);

  if (!data || data.length === 0) {
    return (
      <View style={chart.empty}>
        <Feather name="pie-chart" size={32} color={C.textMuted} />
        <Text style={chart.emptyText}>No categories yet</Text>
        <Text style={chart.emptySmall}>Add expense transactions to see breakdown</Text>
      </View>
    );
  }

  const allPieData = data.sort((a, b) => b.amount - a.amount).slice(0, 8).map((item, i) => ({
    ...item,
    color: CHART_COLORS[i % CHART_COLORS.length]
  }));

  const visibleData = allPieData.filter(item => !hidden.includes(item.category));
  const total = visibleData.reduce((sum, item) => sum + item.amount, 0);

  const SIZE = customWidth || (SW - 64);
  const CENTER = SIZE / 2;
  const RADIUS = SIZE * 0.22;

  let currentAngle = -Math.PI / 2;
  let prevRightY = -1000;
  let prevLeftY = 1000;

  const slices = visibleData.map((item) => {
    const angle = total > 0 ? (item.amount / total) * (Math.PI * 2) : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startX = CENTER + RADIUS * Math.cos(startAngle);
    const startY = CENTER + RADIUS * Math.sin(startAngle);
    const endX = CENTER + RADIUS * Math.cos(endAngle);
    const endY = CENTER + RADIUS * Math.sin(endAngle);
    const largeArcFlag = angle > Math.PI ? 1 : 0;

    let d;
    if (angle > Math.PI * 1.999) {
      d = `M ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER} ${CENTER + RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER} ${CENTER - RADIUS} Z`;
    } else {
      d = `M ${CENTER} ${CENTER} L ${startX} ${startY} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    }

    const midAngle = startAngle + angle / 2;
    const isRight = Math.cos(midAngle) >= 0;
    const lineStartR = RADIUS;
    const lineMidR = RADIUS + 12;
    const lineEndOffset = isRight ? 12 : -12;
    
    const lineStartX = CENTER + lineStartR * Math.cos(midAngle);
    const lineStartY = CENTER + lineStartR * Math.sin(midAngle);
    const lineMidX = CENTER + lineMidR * Math.cos(midAngle);
    const lineMidY = CENTER + lineMidR * Math.sin(midAngle);
    const lineEndX = lineMidX + lineEndOffset;
    
    let finalY = lineMidY;
    if (isRight) {
      if (finalY - prevRightY < 14) finalY = prevRightY + 14;
      prevRightY = finalY;
    } else {
      if (prevLeftY - finalY < 14) finalY = prevLeftY - 14;
      prevLeftY = finalY;
    }

    const showLabel = angle > 0.08;

    return {
      item, color: item.color, d, showLabel,
      linePoints: `${lineStartX},${lineStartY} ${lineMidX},${lineMidY} ${lineEndX},${finalY}`,
      textX: lineEndX + (isRight ? 5 : -5),
      textY: finalY + 4,
      textAnchor: isRight ? 'start' : 'end',
    };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={SIZE} height={SIZE * 0.75}>
        <G y={-10}>
          {total === 0 ? (
            <G>
              <Path
                d={`M ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER} ${CENTER + RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER} ${CENTER - RADIUS} Z`}
                fill="rgba(150,150,150,0.1)"
              />
              <SvgText x={CENTER} y={CENTER + 4} fill={C.textMuted} fontSize="12" textAnchor="middle">
                No visible data
              </SvgText>
            </G>
          ) : (
            slices.map((slice, i) => (
              <G key={i}>
                <Path d={slice.d} fill={slice.color} />
                {slice.showLabel && (
                  <>
                    <Polyline points={slice.linePoints} fill="none" stroke={slice.color} strokeWidth="1" />
                    <SvgText x={slice.textX} y={slice.textY} fill={C.textSecondary} fontSize="11" textAnchor={slice.textAnchor as any}>
                      {slice.item.category}
                    </SvgText>
                  </>
                )}
              </G>
            ))
          )}
        </G>
      </Svg>

      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 4, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => scrollRef.current?.scrollTo({ x: 0, animated: true })} style={{ padding: 4 }}>
          <Feather name="chevron-left" size={20} color={C.textMuted} />
        </TouchableOpacity>
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={[chart.legend, { marginBottom: 0 }]}>
            {allPieData.map((item, i) => {
              const isHidden = hidden.includes(item.category);
              return (
                <TouchableOpacity
                  key={i}
                  style={[chart.legendItem, { opacity: isHidden ? 0.4 : 1 }]}
                  onPress={() => {
                    setHidden(prev =>
                      isHidden ? prev.filter(c => c !== item.category) : [...prev, item.category]
                    );
                  }}
                >
                  <View style={[chart.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[chart.legendLabel, { textDecorationLine: isHidden ? 'line-through' : 'none' }]}>
                    {item.category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <TouchableOpacity onPress={() => scrollRef.current?.scrollToEnd({ animated: true })} style={{ padding: 4 }}>
          <Feather name="chevron-right" size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getChartStyles = (C: ThemeColors) => StyleSheet.create({
  empty: { paddingVertical: 36, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
  emptySmall: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
});
