import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, G, Text as SvgText, Polyline } from 'react-native-svg';
import ChatWidget from '../../components/chat/ChatWidget';
import DateFilterModal, { FilterState } from '../../components/DateFilterModal';

const { width: SW } = Dimensions.get('window');

// Theme is loaded dynamically from ThemeContext

const CHART_COLORS = ['#6d4aff', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (n: number) => {
  if (n == null) return '₹0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
};
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const getFilterLabel = (f: FilterState) => {
  if (f.type === 'custom' && f.startDate && f.endDate) {
    const s = fmtDate(f.startDate);
    const e = fmtDate(f.endDate);
    return s === e ? s : `${s} - ${e}`;
  } else if (f.type === 'custom' && f.startDate) {
    return fmtDate(f.startDate);
  }

  const map: Record<string, string> = {
    'all': 'All Time',
    '6days': 'Last 7 Days',
    'week': 'Last Week',
    'month': 'Last Month',
    '6months': 'Last 6 Months',
    'year': 'Current YTD',
  };
  return map[f.type] || 'Filter';
};

// ── Mini Bar Chart ─────────────────────────────────────────────────
function BarChart({ data, C }: { data: any[], C: ThemeColors }) {
  const chart = getChartStyles(C);
  if (!data || data.length === 0) {
    return (
      <View style={chart.empty}>
        <Text style={chart.emptyText}>No data yet</Text>
        <Text style={chart.emptySmall}>Add transactions to see income vs expenses trend</Text>
      </View>
    );
  }
  const maxVal = Math.max(...data.flatMap((d: any) => [d.credits || 0, d.debits || 0]), 1);
  const barW = Math.max(8, (SW - 96) / data.length / 2 - 4);
  return (
    <View>
      {/* Legend */}
      <View style={chart.legend}>
        <View style={chart.legendItem}><View style={[chart.legendDot, { backgroundColor: C.green }]} /><Text style={chart.legendLabel}>Income</Text></View>
        <View style={chart.legendItem}><View style={[chart.legendDot, { backgroundColor: C.red }]} /><Text style={chart.legendLabel}>Expenses</Text></View>
      </View>
      {/* Bars */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4, paddingHorizontal: 4 }}>
        {data.slice(-12).map((d: any, i: number) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 140 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 120 }}>
              <View style={[chart.bar, {
                height: Math.max(4, ((d.credits || 0) / maxVal) * 120),
                backgroundColor: C.green, width: barW,
              }]} />
              <View style={[chart.bar, {
                height: Math.max(4, ((d.debits || 0) / maxVal) * 120),
                backgroundColor: C.red, width: barW,
              }]} />
            </View>
            <Text style={chart.barLabel} numberOfLines={1}>{d.date ? d.date.slice(5) : ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Custom SVG Pie Chart ──────────────────────────────────────────
function CustomPieChartView({ data, C }: { data: any[], C: ThemeColors }) {
  const chart = getChartStyles(C);
  const scrollRef = useRef<ScrollView>(null);
  const [hidden, setHidden] = useState<string[]>([]);

  if (!data || data.length === 0) {
    return (
      <View style={chart.empty}>
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

  const SIZE = SW - 32;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE * 0.22; // Pie radius
  
  let currentAngle = -Math.PI / 2; // Start at 12 o'clock

  const slices = visibleData.map((item, i) => {
    const angle = total > 0 ? (item.amount / total) * (Math.PI * 2) : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Path calculation
    const startX = CENTER + RADIUS * Math.cos(startAngle);
    const startY = CENTER + RADIUS * Math.sin(startAngle);
    const endX = CENTER + RADIUS * Math.cos(endAngle);
    const endY = CENTER + RADIUS * Math.sin(endAngle);
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    // Fallback for 100% circle
    let d;
    if (angle > Math.PI * 1.999) {
      d = `M ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER} ${CENTER + RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER} ${CENTER - RADIUS} Z`;
    } else {
      d = `M ${CENTER} ${CENTER} L ${startX} ${startY} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    }

    // Label calculation
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
    const lineEndY = lineMidY;

    return {
      item,
      color: item.color,
      d,
      linePoints: `${lineStartX},${lineStartY} ${lineMidX},${lineMidY} ${lineEndX},${lineEndY}`,
      textX: lineEndX + (isRight ? 5 : -5),
      textY: lineEndY + 4,
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
                <Polyline points={slice.linePoints} fill="none" stroke={slice.color} strokeWidth="1" />
                <SvgText
                  x={slice.textX}
                  y={slice.textY}
                  fill={C.textSecondary}
                  fontSize="11"
                  textAnchor={slice.textAnchor}
                >
                  {slice.item.category}
                </SvgText>
              </G>
            ))
          )}
        </G>
      </Svg>

      {/* Horizontal Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 4, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => scrollRef.current?.scrollTo({ x: 0, animated: true })} style={{ padding: 4 }}>
          <Feather name="chevron-left" size={20} color={C.textMuted} />
        </TouchableOpacity>
        
        <ScrollView 
          ref={scrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ flex: 1 }}
        >
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

// ── Main Dashboard ─────────────────────────────────────────────────
export default function DashboardScreen() {
  const { C } = useAppTheme();
  const s = getStyles(C);
  const { user } = useAuth();

  const [filter, setFilter] = useState<FilterState>({ type: 'all', startDate: null, endDate: null });
  const [filterVisible, setFilterVisible] = useState(false);

  const [kpis, setKpis] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [widgets, setWidgets] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const params = {
        filter_type: filter.type,
        ...(filter.startDate && { start_date: filter.startDate }),
        ...(filter.endDate && { end_date: filter.endDate })
      };
      const [k, ch, w] = await Promise.all([
        dashboardService.getKPIs(params),
        dashboardService.getCharts(params),
        dashboardService.getWidgets(params),
      ]);
      setKpis(k?.data || k);
      setCharts(ch?.data || ch);
      setWidgets(w?.data || w);
    } catch (e) {
      console.warn('Dashboard load error:', e.message || e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { setLoading(true); load(); }, [filter]);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const recentTx = widgets?.recent_transactions?.slice(0, 5) || [];
  const kpiCards = [
    { label: 'Total Credits', value: fmt(kpis?.total_credits?.current ?? 0), color: C.green, icon: '↑', change: kpis?.total_credits?.change_percent },
    { label: 'Total Expenses', value: fmt(kpis?.total_debits?.current ?? 0), color: C.red, icon: '↓', change: kpis?.total_debits?.change_percent },
    { label: 'Net Balance', value: fmt(kpis?.net_balance?.current ?? 0), color: C.primary, icon: '◈', change: kpis?.net_balance?.change_percent },
    { label: 'Transactions', value: String(kpis?.total_transactions?.current ?? 0), color: C.amber, icon: '#', change: kpis?.total_transactions?.change_percent },
  ];

  const creditVsDebit: any[] = charts?.credit_vs_debit || [];
  const categoryBreakdown: any[] = charts?.category_breakdown || [];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.welcomeText}>Welcome back,</Text>
            <Text style={s.nameText}>{user?.full_name || 'User'} 👋</Text>
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setFilterVisible(true)}>
            <Feather name="calendar" size={18} color={C.textPrimary} />
            <Text style={s.filterText}>
              {getFilterLabel(filter)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Balance Hero ── */}
        <View style={s.heroCard}>
          <View style={s.heroGlow} />
          <Text style={s.heroLabel}>AVAILABLE BALANCE</Text>
          <Text style={[s.heroValue, { color: (kpis?.available_balance ?? 0) >= 0 ? C.green : C.red }]}>
            {fmt(kpis?.available_balance ?? 0)}
          </Text>
          <View style={s.heroRow}>
            {kpis?.highest_expense_category?.current && (
              <View style={s.heroBadge}>
                <Text style={s.heroBadgeText}>
                  Top: <Text style={{ color: C.amber }}>{kpis.highest_expense_category.current}</Text>
                </Text>
              </View>
            )}
            {kpis?.average_monthly_expense?.current != null && (
              <View style={s.heroBadge}>
                <Text style={s.heroBadgeText}>
                  Avg/mo: <Text style={{ color: C.accent }}>{fmt(kpis.average_monthly_expense.current)}</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── KPI Grid ── */}
        <View style={s.kpiGrid}>
          {kpiCards.map((c, i) => (
            <View key={i} style={[s.kpiCard, { borderLeftColor: c.color }]}>
              <View style={[s.kpiIconBox, { backgroundColor: c.color + '22' }]}>
                <Text style={[s.kpiIconText, { color: c.color }]}>{c.icon}</Text>
              </View>
              <View style={s.kpiContent}>
                <Text style={s.kpiLabel}>{c.label}</Text>
                <Text style={s.kpiValue}>{c.value}</Text>
                {c.change != null && (
                  <Text style={[s.kpiChange, { color: (c.change ?? 0) >= 0 ? C.green : C.red }]}>
                    {(c.change ?? 0) >= 0 ? '+' : ''}{c.change}%
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── Income vs Expenses Chart ── */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Income vs Expenses</Text>
          <BarChart data={creditVsDebit} C={C} />
        </View>

        {/* ── Category Breakdown ── */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Category Breakdown</Text>
          <CustomPieChartView data={categoryBreakdown} C={C} />
        </View>

        {/* ── Recent Transactions ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Transactions</Text>
          </View>
          {recentTx.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>💰</Text>
              <Text style={s.emptyTitle}>No transactions yet</Text>
              <Text style={s.emptyText}>Add your first transaction to get started</Text>
            </View>
          ) : (
            recentTx.map((tx: any, i: number) => (
              <View key={tx.id ?? i} style={[s.txRow, i < recentTx.length - 1 && s.txBorder]}>
                <View style={[s.txDot, { backgroundColor: tx.type === 'credit' ? C.green : C.red }]} />
                <View style={s.txInfo}>
                  <Text style={s.txCategory}>{tx.category}</Text>
                  <Text style={s.txDesc} numberOfLines={1}>{tx.description || 'No description'}</Text>
                  <Text style={s.txDate}>{fmtDate(tx.date)}</Text>
                </View>
                <Text style={[s.txAmount, { color: tx.type === 'credit' ? C.green : C.red }]}>
                  {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <DateFilterModal
        visible={filterVisible}
        currentFilter={filter}
        onClose={() => setFilterVisible(false)}
        onApply={setFilter}
      />

      {/* Floating Chatbot Widget */}
      <ChatWidget />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 12 },
  loadingText: { color: C.textMuted, fontSize: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  welcomeText: { fontSize: 13, color: C.textMuted },
  nameText: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: C.border
  },
  filterText: { color: C.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  heroCard: {
    marginHorizontal: 20, marginVertical: 12,
    backgroundColor: C.card, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(109,74,255,0.2)',
    overflow: 'hidden',
    shadowColor: C.primary, shadowOpacity: 0.2, shadowRadius: 20, elevation: 6,
  },
  heroGlow: {
    position: 'absolute', top: -40, right: -40, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(200,80,255,0.08)',
  },
  heroLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  heroValue: { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  heroRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, borderWidth: 1, borderColor: C.border },
  heroBadgeText: { fontSize: 12, color: C.textSecondary },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  kpiCard: {
    width: '47.5%', backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 3,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  kpiIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiIconText: { fontSize: 18, fontWeight: '800' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', letterSpacing: 0.3, marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  kpiChange: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  chartCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: C.card, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 16 },

  section: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  sectionHeader: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },

  empty: { padding: 40, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  txBorder: { borderBottomWidth: 1, borderColor: C.border },
  txDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  txDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  txDate: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});

const getChartStyles = (C: ThemeColors) => StyleSheet.create({
  empty: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
  emptySmall: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  bar: { borderRadius: 4 },
  barLabel: { fontSize: 9, color: C.textMuted, marginTop: 4, textAlign: 'center' },
});

const getPieStyles = (C: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  label: { fontSize: 12, color: C.textSecondary, width: 72, fontWeight: '500' },
  barTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  pct: { fontSize: 11, color: C.textMuted, width: 38, textAlign: 'right', fontWeight: '600' },
  amt: { fontSize: 11, color: C.textSecondary, width: 54, textAlign: 'right', fontWeight: '700' },
});

