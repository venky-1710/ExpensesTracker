import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, G, Text as SvgText, Polyline, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import ChatWidget from '../../components/chat/ChatWidget';
import DateFilterModal, { FilterState } from '../../components/DateFilterModal';

const { width: SW } = Dimensions.get('window');

const CHART_COLORS = ['#6d4aff', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

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
    return s === e ? s : `${s} – ${e}`;
  } else if (f.type === 'custom' && f.startDate) {
    return fmtDate(f.startDate);
  }
  const map: Record<string, string> = {
    'all': 'All Time', '6days': 'Last 7 Days', 'week': 'Last Week',
    'month': 'Last Month', '6months': 'Last 6 Months', 'year': 'Current YTD',
  };
  return map[f.type] || 'Filter';
};

// ── Category icons ────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  Food: 'coffee', Transport: 'truck', Shopping: 'shopping-bag',
  Entertainment: 'film', Health: 'heart', Bills: 'file-text',
  Salary: 'briefcase', Investment: 'trending-up', Other: 'circle',
};

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtMonthLabel = (dateStr: string) => {
  if (!dateStr) return '';
  const m = parseInt(dateStr.split('-')[1], 10);
  return MONTH_ABBR[(m - 1)] ?? dateStr.slice(5);
};

// ── Income vs Expenses Chart ────────────────────────────────────────
const SERIES = [
  { key: 'income',  label: 'Income',   color: '#10b981', gradId: 'igGreen' },
  { key: 'expense', label: 'Expenses', color: '#ef4444', gradId: 'igRed'   },
] as const;

function IncomeExpenseChart({ data, C }: { data: any[], C: ThemeColors }) {
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

  const showIncome  = !hidden.includes('income');
  const showExpense = !hidden.includes('expense');

  const displayData = data.slice(-8);

  // Recalculate max only from visible series
  const maxVal = Math.max(
    ...displayData.flatMap((d: any) => [
      showIncome  ? (d.credits || 0) : 0,
      showExpense ? (d.debits  || 0) : 0,
    ]),
    1,
  );

  // Layout
  const Y_LABEL_W = 42;
  const TOP_PAD   = 12;
  const BOT_PAD   = 26;
  const CHART_H   = 180;
  const SVG_H     = CHART_H + TOP_PAD + BOT_PAD;
  const FULL_W    = SW - 72;
  const PLOT_W    = FULL_W - Y_LABEL_W;
  const bothVis   = showIncome && showExpense;
  const GROUP_W   = PLOT_W / displayData.length;
  const BAR_W     = Math.min(18, GROUP_W * (bothVis ? 0.32 : 0.45));
  const BAR_GAP   = bothVis ? 4 : 0;
  const pairW     = bothVis ? BAR_W * 2 + BAR_GAP : BAR_W;
  const GROUP_OFF = (GROUP_W - pairW) / 2;

  const fmtY = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
    return `${Math.round(v)}`;
  };

  const gridPcts = [0, 0.25, 0.5, 0.75, 1];

  return (
    <View>
      <Svg width={FULL_W} height={SVG_H}>
        <Defs>
          <LinearGradient id="igGreen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#10b981" stopOpacity="1"    />
            <Stop offset="1" stopColor="#10b981" stopOpacity="0.45" />
          </LinearGradient>
          <LinearGradient id="igRed" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ef4444" stopOpacity="1"    />
            <Stop offset="1" stopColor="#ef4444" stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        {/* Y-axis gridlines + labels */}
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

        {/* Bars + x-labels */}
        {displayData.map((d: any, i: number) => {
          const incH  = Math.max(6, ((d.credits || 0) / maxVal) * CHART_H);
          const expH  = Math.max(6, ((d.debits  || 0) / maxVal) * CHART_H);
          const gx    = Y_LABEL_W + i * GROUP_W + GROUP_OFF;
          const baseY = TOP_PAD + CHART_H;
          const midX  = gx + pairW / 2;

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
              <SvgText x={midX} y={baseY + 18} fontSize="10" fill={C.textMuted} textAnchor="middle">
                {fmtMonthLabel(d.date)}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Toggle tags */}
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

// ── Custom SVG Pie Chart ──────────────────────────────────────────
function CustomPieChartView({ data, C }: { data: any[], C: ThemeColors }) {
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

  const SIZE = SW - 32;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE * 0.22;

  let currentAngle = -Math.PI / 2;

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
    const lineEndY = lineMidY;

    return {
      item, color: item.color, d,
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
                <SvgText x={slice.textX} y={slice.textY} fill={C.textSecondary} fontSize="11" textAnchor={slice.textAnchor}>
                  {slice.item.category}
                </SvgText>
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

// ── KPI icon map ──────────────────────────────────────────────────
const KPI_ICONS = ['trending-up', 'trending-down', 'dollar-sign', 'activity'] as const;

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
    { label: 'Total Credits', value: fmt(kpis?.total_credits?.current ?? 0), color: C.green, iconName: 'trending-up', change: kpis?.total_credits?.change_percent },
    { label: 'Total Expenses', value: fmt(kpis?.total_debits?.current ?? 0), color: C.red, iconName: 'trending-down', change: kpis?.total_debits?.change_percent },
    { label: 'Net Balance', value: fmt(kpis?.net_balance?.current ?? 0), color: C.primary, iconName: 'dollar-sign', change: kpis?.net_balance?.change_percent },
    { label: 'Transactions', value: String(kpis?.total_transactions?.current ?? 0), color: C.amber, iconName: 'activity', change: kpis?.total_transactions?.change_percent },
  ];

  const creditVsDebit: any[] = charts?.credit_vs_debit || [];
  const categoryBreakdown: any[] = charts?.category_breakdown || [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.welcomeText}>{greeting()},</Text>
            <Text style={s.nameText}>{user?.full_name || 'User'} 👋</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.filterBtn} onPress={() => setFilterVisible(true)}>
              <Feather name="calendar" size={14} color={C.textSecondary} />
              <Text style={s.filterText}>{getFilterLabel(filter)}</Text>
              <Feather name="chevron-down" size={12} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Balance Hero ── */}
        <View style={s.heroCard}>
          <View style={s.heroGlow} />
          <View style={s.heroGlow2} />
          <Text style={s.heroLabel}>AVAILABLE BALANCE</Text>
          <Text style={[s.heroValue, { color: (kpis?.available_balance ?? 0) >= 0 ? C.green : C.red }]}>
            {fmt(kpis?.available_balance ?? 0)}
          </Text>
          <View style={s.heroRow}>
            {kpis?.highest_expense_category?.current && (
              <View style={s.heroBadge}>
                <Feather name="tag" size={10} color={C.amber} />
                <Text style={s.heroBadgeText}>
                  Top: <Text style={{ color: C.amber }}>{kpis.highest_expense_category.current}</Text>
                </Text>
              </View>
            )}
            {kpis?.average_monthly_expense?.current != null && (
              <View style={s.heroBadge}>
                <Feather name="calendar" size={10} color={C.accent} />
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
              <View style={[s.kpiIconBox, { backgroundColor: c.color + '20' }]}>
                <Feather name={c.iconName as any} size={18} color={c.color} />
              </View>
              <View style={s.kpiContent}>
                <Text style={s.kpiLabel}>{c.label}</Text>
                <Text style={s.kpiValue}>{c.value}</Text>
                {c.change != null && (
                  <View style={s.kpiChangeRow}>
                    <Feather
                      name={(c.change ?? 0) >= 0 ? 'arrow-up-right' : 'arrow-down-right'}
                      size={10}
                      color={(c.change ?? 0) >= 0 ? C.green : C.red}
                    />
                    <Text style={[s.kpiChange, { color: (c.change ?? 0) >= 0 ? C.green : C.red }]}>
                      {(c.change ?? 0) >= 0 ? '+' : ''}{c.change}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── Income vs Expenses Chart ── */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Income vs Expenses</Text>
            <View style={[s.chartBadge, { backgroundColor: C.primary + '15' }]}>
              <Text style={[s.chartBadgeText, { color: C.primary }]}>Monthly</Text>
            </View>
          </View>
          <IncomeExpenseChart data={creditVsDebit} C={C} />
        </View>

        {/* ── Category Breakdown ── */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Category Breakdown</Text>
            <View style={[s.chartBadge, { backgroundColor: C.amber + '15' }]}>
              <Text style={[s.chartBadgeText, { color: C.amber }]}>Expenses</Text>
            </View>
          </View>
          <CustomPieChartView data={categoryBreakdown} C={C} />
        </View>

        {/* ── Recent Transactions ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/transactions')} style={s.seeAllBtn}>
              <Text style={s.seeAllText}>See All</Text>
              <Feather name="arrow-right" size={13} color={C.primary} />
            </TouchableOpacity>
          </View>
          {recentTx.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Feather name="credit-card" size={28} color={C.textMuted} />
              </View>
              <Text style={s.emptyTitle}>No transactions yet</Text>
              <Text style={s.emptyText}>Add your first transaction to get started</Text>
            </View>
          ) : (
            recentTx.map((tx: any, i: number) => {
              const isCredit = tx.type === 'credit';
              const catIcon = (CATEGORY_ICONS[tx.category] || 'circle') as any;
              return (
                <View key={tx.id ?? i} style={[s.txRow, i < recentTx.length - 1 && s.txBorder]}>
                  <View style={[s.txIconBadge, { backgroundColor: isCredit ? C.green + '18' : C.red + '18' }]}>
                    <Feather name={catIcon} size={15} color={isCredit ? C.green : C.red} />
                  </View>
                  <View style={s.txInfo}>
                    <Text style={s.txCategory}>{tx.category}</Text>
                    <Text style={s.txDesc} numberOfLines={1}>{tx.description || 'No description'}</Text>
                    <Text style={s.txDate}>{fmtDate(tx.date)}</Text>
                  </View>
                  <View style={s.txAmountCol}>
                    <Text style={[s.txAmount, { color: isCredit ? C.green : C.red }]}>
                      {isCredit ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                    </Text>
                    <View style={[s.txTypePill, { backgroundColor: isCredit ? C.green + '15' : C.red + '15' }]}>
                      <Text style={[s.txTypePillText, { color: isCredit ? C.green : C.red }]}>
                        {isCredit ? 'Credit' : 'Debit'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
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

      <ChatWidget />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 12 },
  loadingText: { color: C.textMuted, fontSize: 14 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  welcomeText: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  nameText: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  headerRight: { gap: 8 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
  },
  filterText: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },

  heroCard: {
    marginHorizontal: 20, marginVertical: 12,
    backgroundColor: C.card, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(109,74,255,0.2)',
    overflow: 'hidden',
    shadowColor: C.primary, shadowOpacity: 0.18, shadowRadius: 20, elevation: 6,
  },
  heroGlow: {
    position: 'absolute', top: -50, right: -50, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(200,80,255,0.1)',
  },
  heroGlow2: {
    position: 'absolute', bottom: -30, left: -30, width: 120, height: 120,
    borderRadius: 60, backgroundColor: 'rgba(109,74,255,0.08)',
  },
  heroLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  heroValue: { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 14 },
  heroRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  heroBadgeText: { fontSize: 12, color: C.textSecondary },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  kpiCard: {
    width: '47.5%', backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 3,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  kpiIconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  kpiContent: { flex: 1 },
  kpiLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', letterSpacing: 0.3, marginBottom: 4 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  kpiChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  kpiChange: { fontSize: 11, fontWeight: '700' },

  chartCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: C.card, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  chartBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  chartBadgeText: { fontSize: 11, fontWeight: '700' },

  section: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: C.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  empty: { padding: 36, alignItems: 'center', gap: 10 },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  txBorder: { borderBottomWidth: 1, borderColor: C.border },
  txIconBadge: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  txDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  txDate: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  txAmountCol: { alignItems: 'flex-end', gap: 5 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txTypePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  txTypePillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});

const getChartStyles = (C: ThemeColors) => StyleSheet.create({
  empty: { paddingVertical: 36, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
  emptySmall: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  bar: { borderRadius: 4 },
  barLabel: { fontSize: 9, color: C.textMuted, marginTop: 6, textAlign: 'center' },

  tagRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14,
  },
});
