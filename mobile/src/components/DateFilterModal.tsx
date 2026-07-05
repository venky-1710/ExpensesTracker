import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';
import { useAppTheme, ThemeColors } from '../context/ThemeContext';
import { Feather } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');

const PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 7 Days', value: '6days' },
  { label: 'Last Week', value: 'week' },
  { label: 'Last Month', value: 'month' },
  { label: 'Last 6 Months', value: '6months' },
  { label: 'Current YTD', value: 'year' },
  { label: 'Custom Range', value: 'custom' }
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface FilterState {
  type: string;
  startDate: string | null;
  endDate: string | null;
  granularity?: string;
}

interface DateFilterModalProps {
  visible: boolean;
  currentFilter: FilterState;
  onApply: (filter: FilterState) => void;
  onClose: () => void;
}

export default function DateFilterModal({ visible, currentFilter, onApply, onClose }: DateFilterModalProps) {
  const { C } = useAppTheme();
  const s = getStyles(C);

  const [currentMonthView, setCurrentMonthView] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('all');
  const [granularity, setGranularity] = useState<string>('monthly');

  useEffect(() => {
    if (visible) {
      setSelectedPreset(currentFilter.type);
      if (currentFilter.granularity) {
        setGranularity(currentFilter.granularity);
      }
      if (currentFilter.startDate) {
        const sd = new Date(currentFilter.startDate);
        setSelectionStart(sd);
        setCurrentMonthView(sd);
      } else {
        setSelectionStart(null);
        setCurrentMonthView(new Date());
      }
      if (currentFilter.endDate) {
        setSelectionEnd(new Date(currentFilter.endDate));
      } else {
        setSelectionEnd(null);
      }
    }
  }, [visible, currentFilter]);

  const handlePrevMonth = () => {
    setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() + 1, 1));
  };

  const getDaysDuration = (start: Date | null, end: Date | null, type: string | null) => {
    if (type === 'custom' && start && end) {
      return Math.abs(Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }
    switch (type) {
      case '6days': return 6;
      case 'week': return 7;
      case 'month': return 30;
      case '6months': return 180;
      case 'year': return 365;
      case 'all': return 3650;
      default: return 30;
    }
  };

  const getGranularityOptions = () => {
    const type = selectedPreset;
    const days = getDaysDuration(selectionStart, selectionEnd, type);
    
    if (days <= 31) {
      return [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' }
      ];
    } else if (days <= 366) {
      return [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' }
      ];
    } else {
      return [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Yearly', value: 'yearly' }
      ];
    }
  };

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    
    const days = getDaysDuration(null, null, preset);
    const defaultGran = days > 31 ? 'monthly' : 'daily';
    setGranularity(defaultGran);

    if (preset === 'custom') return;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let start = new Date(today);
    start.setHours(0, 0, 0, 0);
    
    let end = new Date(today);

    switch (preset) {
      case 'all':
        setSelectionStart(null);
        setSelectionEnd(null);
        return;
      case '6days':
        start.setDate(today.getDate() - 6);
        break;
      case 'week':
        const day = start.getDay();
        const diffToStart = start.getDate() - day - 7;
        start.setDate(diffToStart);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
        break;
      case '6months':
        start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        break;
    }

    setSelectionStart(start);
    setSelectionEnd(end);
    setCurrentMonthView(start);
  };

  const handleDatePress = (date: Date) => {
    setSelectedPreset('custom');
    if (!selectionStart || (selectionStart && selectionEnd)) {
      setSelectionStart(date);
      setSelectionEnd(null);
    } else {
      if (date.getTime() < selectionStart.getTime()) {
        setSelectionStart(date);
        setSelectionEnd(null);
      } else {
        date.setHours(23, 59, 59, 999);
        setSelectionEnd(date);
      }
    }
  };

  const handleApply = () => {
    onApply({
      type: selectedPreset,
      startDate: selectionStart ? selectionStart.toISOString() : null,
      endDate: selectionEnd ? selectionEnd.toISOString() : null,
      granularity: granularity
    });
    onClose();
  };

  // Generate Calendar Grid
  const year = currentMonthView.getFullYear();
  const month = currentMonthView.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const grid: (Date | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    d.setHours(0, 0, 0, 0);
    grid.push(d);
  }
  while (grid.length % 7 !== 0) {
    grid.push(null);
  }

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const isBetween = (date: Date) => {
    if (!selectionStart || !selectionEnd) return false;
    return date.getTime() > selectionStart.getTime() && date.getTime() < selectionEnd.getTime();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.modalContainer}>
          
          <View style={s.header}>
            <Text style={s.headerTitle}>Select Date Range</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Calendar Header */}
          <View style={s.calNav}>
            <TouchableOpacity onPress={handlePrevMonth} style={s.navBtn}>
              <Feather name="chevron-left" size={20} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={s.monthText}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={s.navBtn}>
              <Feather name="chevron-right" size={20} color={C.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Calendar Weekdays */}
          <View style={s.weekdaysRow}>
            {DAYS_OF_WEEK.map(d => (
              <Text key={d} style={s.weekdayText}>{d}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={s.grid}>
            {grid.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={s.dayCell} />;
              
              const isStart = isSameDay(date, selectionStart);
              const isEnd = isSameDay(date, selectionEnd);
              const isInRange = isBetween(date);

              return (
                <View key={date.toISOString()} style={[
                  s.dayCellWrapper,
                  isInRange && s.dayCellInRange,
                  isStart && selectionEnd && s.dayCellStartRange,
                  isEnd && selectionStart && s.dayCellEndRange
                ]}>
                  <TouchableOpacity
                    style={[
                      s.dayCell,
                      (isStart || isEnd) && s.dayCellSelected,
                    ]}
                    onPress={() => handleDatePress(date)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      s.dayText,
                      (isStart || isEnd) && s.dayTextSelected
                    ]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Selected Range Display */}
          <View style={s.selectedRangeBox}>
            <Text style={s.selectedRangeText}>
              {selectionStart ? selectionStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start'} 
              {'  —  '} 
              {selectionEnd ? selectionEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End'}
            </Text>
          </View>

          {/* Granularity Selector */}
          <View style={s.granularityContainer}>
            <Text style={s.granularityLabel}>Granularity:</Text>
            <View style={s.granularityRow}>
              {getGranularityOptions().map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.granularityChip, granularity === opt.value && s.granularityChipActive]}
                  onPress={() => setGranularity(opt.value)}
                >
                  <Text style={[s.granularityText, granularity === opt.value && s.granularityTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Presets Horizontal Scroll */}
          <View style={s.presetsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.presetsScroll}>
              {PRESETS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[s.presetChip, selectedPreset === p.value && s.presetChipActive]}
                  onPress={() => handlePresetSelect(p.value)}
                >
                  <Text style={[s.presetText, selectedPreset === p.value && s.presetTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Footer Actions */}
          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.applyBtn, (!selectionStart && selectedPreset === 'custom') && s.applyBtnDisabled]} 
              onPress={handleApply}
              disabled={!selectionStart && selectedPreset === 'custom'}
            >
              <Text style={s.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { 
    width: '90%', maxWidth: 400, backgroundColor: C.card, borderRadius: 24, 
    borderWidth: 1, borderColor: C.border, overflow: 'hidden'
  },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 20, borderBottomWidth: 1, borderColor: C.border 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  
  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  navBtn: { padding: 8, backgroundColor: C.inputBg, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  monthText: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  
  weekdaysRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: C.textMuted },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  dayCellWrapper: { width: '14.28%', aspectRatio: 1, paddingVertical: 2 },
  dayCellInRange: { backgroundColor: 'rgba(109,74,255,0.15)' },
  dayCellStartRange: { backgroundColor: 'rgba(109,74,255,0.15)', borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  dayCellEndRange: { backgroundColor: 'rgba(109,74,255,0.15)', borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  dayCellSelected: { backgroundColor: C.primary },
  dayText: { fontSize: 14, color: C.textPrimary, fontWeight: '500' },
  dayTextSelected: { color: '#fff', fontWeight: '800' },

  selectedRangeBox: { alignItems: 'center', paddingVertical: 16 },
  selectedRangeText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },

  granularityContainer: { paddingHorizontal: 20, marginBottom: 16 },
  granularityLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  granularityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  granularityChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border },
  granularityChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  granularityText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  granularityTextActive: { color: '#fff' },

  presetsContainer: { borderTopWidth: 1, borderColor: C.border, paddingVertical: 16 },
  presetsScroll: { paddingHorizontal: 16, gap: 8 },
  presetChip: { 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, 
    borderWidth: 1, borderColor: C.border, backgroundColor: C.inputBg 
  },
  presetChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  presetText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  presetTextActive: { color: '#fff' },

  footer: { 
    flexDirection: 'row', padding: 16, borderTopWidth: 1, borderColor: C.border, gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.textSecondary, fontWeight: '700', fontSize: 15 },
  applyBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.primary },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
