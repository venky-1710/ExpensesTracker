import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  ScrollView, Switch, Alert, Platform, Animated
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { timesheetService } from '../../services/timesheetService';
import Toast from 'react-native-toast-message';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import { useGlobalFilter } from '../../context/FilterContext';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { toastConfig } from '../../components/ToastConfig';
import DateFilterModal, { FilterState } from '../../components/DateFilterModal';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { uploadService } from '../../services/uploadService';
import { TypingIndicator } from '../../components/TypingIndicator';
import { DocumentLoader } from '../../components/DocumentLoader';

const BLANK_FORM = {
  date: new Date().toISOString().split('T')[0],
  work_code: '',
  description: '',
  duration: 1
};

export default function TimesheetsScreen() {
  const { C, isDark } = useAppTheme();
  const s = getStyles(C);

  const { filter, setFilter } = useGlobalFilter();
  const { user, updateUser } = useAuth();
  const workCodes = user?.custom_work_codes || [];

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const prevMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const nextMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const currentMonthIdx = selectedMonth.getMonth();
  const currentYearNum = selectedMonth.getFullYear();

  const [viewMode, setViewMode] = useState<'overview' | 'table'>('overview');
  const [filterVisible, setFilterVisible] = useState(false);
  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newWorkCode, setNewWorkCode] = useState('');
  const [actionSheet, setActionSheet] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewedTimesheets, setReviewedTimesheets] = useState<any[]>([]);

  const fabAnim = React.useRef(new Animated.Value(0)).current;
  const item1Anim = React.useRef(new Animated.Value(0)).current;
  const item2Anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (actionSheet) {
      Animated.stagger(80, [
        Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
        Animated.spring(item1Anim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
        Animated.spring(item2Anim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }),
      ]).start();
    } else {
      Animated.stagger(50, [
        Animated.spring(item2Anim, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.spring(item1Anim, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.spring(fabAnim, { toValue: 0, useNativeDriver: true, friction: 6 }),
      ]).start();
    }
  }, [actionSheet]);

  const spin = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  const getPopStyle = (anim: Animated.Value, translateY: number) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, translateY] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }
    ]
  });

  const handleAddWorkCode = async () => {
    const code = newWorkCode.trim();
    if (!code) return;
    if (workCodes.includes(code)) {
      Toast.show({ type: 'info', text1: 'Already exists', text2: 'This work code is already in your list.' });
      return;
    }

    try {
      const updated = [...workCodes, code];
      await userService.updatePreferences({ custom_work_codes: updated });
      updateUser({ custom_work_codes: updated });
      setForm(prev => ({ ...prev, work_code: code }));
      setNewWorkCode('');
      Toast.show({ type: 'success', text1: 'Added', text2: 'Work code added successfully.' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to add work code' });
    }
  };

  const handleDeleteWorkCode = async (code: string) => {
    Alert.alert('Delete Work Code', `Remove "${code}" from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const updated = workCodes.filter((w: string) => w !== code);
            await userService.updatePreferences({ custom_work_codes: updated });
            updateUser({ custom_work_codes: updated });
            if (form.work_code === code) {
              setForm(prev => ({ ...prev, work_code: '' }));
            }
          } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete' });
          }
        }
      }
    ]);
  };

  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [sortField, setSortField] = useState<'date' | 'work_code' | 'duration' | null>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedTimesheets = React.useMemo(() => {
    if (!sortField) return timesheets;
    return [...timesheets].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (sortField === 'duration') {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [timesheets, sortField, sortAsc]);

  const handleSort = (field: 'date' | 'work_code' | 'duration') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const fetchTimesheets = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let start, end;
      if (viewMode === 'overview') {
        start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString();
        end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else {
        start = filter.startDate;
        end = filter.endDate;
      }
      
      const data = await timesheetService.getTimesheets(start, end, pageNum, 20);
      
      if (pageNum === 1) {
        setTimesheets(data.timesheets || []);
      } else {
        setTimesheets(prev => [...prev, ...(data.timesheets || [])]);
      }
      
      setHasMore(data.pagination?.has_more || false);
      setPage(pageNum);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch timesheets' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedMonth, filter, viewMode]);

  useEffect(() => {
    fetchTimesheets(1);
  }, [fetchTimesheets]);

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchTimesheets(page + 1);
    }
  };

  const openCreate = () => {
    setActionSheet(false);
    setEditing(null);
    setForm({ ...BLANK_FORM, work_code: workCodes.length > 0 ? workCodes[0] : '' });
    setModal(true);
  };

  const pickDocument = async () => {
    setActionSheet(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
        copyToCacheDirectory: true
      });
      if (res.canceled) return;
      const file = res.assets[0];

      setUploadLoading(true);
      try {
        const data = await uploadService.analyzeTimesheets(file.uri, file.name, file.mimeType || 'application/pdf', (file as any).file);
        setReviewedTimesheets(data.timesheets);
        setReviewModal(true);
      } catch (err: any) {
        let errMsg = 'Failed to analyze document.';
        if (err.response?.data?.detail) {
          errMsg = typeof err.response.data.detail === 'string'
            ? err.response.data.detail
            : Array.isArray(err.response.data.detail) ? err.response.data.detail[0]?.msg : JSON.stringify(err.response.data.detail);
        }
        Toast.show({ type: 'error', text1: 'Error', text2: errMsg });
      } finally {
        setUploadLoading(false);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error picking document' });
    }
  };

  const handleConfirmTimesheets = async () => {
    try {
      setUploadLoading(true);
      const res = await uploadService.confirmTimesheets(reviewedTimesheets);
      Toast.show({ type: 'success', text1: 'Success', text2: res.message });
      setReviewModal(false);
      fetchTimesheets();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to confirm timesheets' });
    } finally {
      setUploadLoading(false);
    }
  };

  const openDetail = (item: any) => {
    setSelectedItem(item);
    setDetailModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      date: item.date,
      work_code: item.work_code,
      description: item.description || '',
      duration: item.duration || 0
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.work_code || typeof form.duration !== 'number' || form.duration <= 0 || !form.description.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill all required fields and ensure duration is valid.' });
      return;
    }

    try {
      if (editing) {
        await timesheetService.updateTimesheet(editing.id, form);
        Toast.show({ type: 'success', text1: 'Success', text2: 'Timesheet updated' });
      } else {
        await timesheetService.createTimesheet(form);
        Toast.show({ type: 'success', text1: 'Success', text2: 'Timesheet added' });
      }
      setModal(false);
      fetchTimesheets();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to save timesheet' });
    }
  };

  const handleDelete = (item: any) => {
    Alert.alert('Delete Timesheet', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await timesheetService.deleteTimesheet(item.id);
            Toast.show({ type: 'success', text1: 'Success', text2: 'Timesheet deleted' });
            fetchTimesheets();
          } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete' });
          }
        }
      }
    ]);
  };

  const totalTimesheets = timesheets.length;
  const totalHours = timesheets.reduce((acc, t) => acc + (Number(t.duration) || 0), 0);

  const workCodeHours: Record<string, number> = {};
  timesheets.forEach(t => {
    const code = t.work_code || 'Other';
    workCodeHours[code] = (workCodeHours[code] || 0) + (Number(t.duration) || 0);
  });

  const topWorkCode = Object.entries(workCodeHours).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];
  const pieData = Object.entries(workCodeHours).map(([code, hrs], i) => ({
    category: code,
    total: hrs,
    color: CHART_COLORS[i % CHART_COLORS.length]
  }));

  const formatDate = (iso: string) => {
    if (!iso) return '';
    // If it's already DD-MM-YYYY, just return it
    if (iso.includes('-') && iso.split('-')[0].length === 2) return iso;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  // Export Logic
  const exportPDF = async () => {
    try {
      let rows = '';
      timesheets.forEach(ts => {
        rows += `
          <tr>
            <td>${formatDate(ts.date)}</td>
            <td>${ts.work_code}</td>
            <td>${ts.description || ''}</td>
            <td>${ts.duration}h</td>
          </tr>
        `;
      });

      const html = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f4f4f4; }
            </style>
          </head>
          <body>
            <h1>Timesheets Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <table>
              <tr>
                <th>Date</th>
                <th>Work Code</th>
                <th>Description</th>
                <th>Duration</th>
              </tr>
              ${rows}
            </table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Export Failed', text2: 'Could not export to PDF' });
    }
  };

  const exportExcel = async () => {
    try {
      let csvContent = 'Date,Work Code,Description,Duration (h)\n';

      timesheets.forEach(ts => {
        const descStr = ts.description ? String(ts.description) : '';
        const desc = `"${descStr.replace(/"/g, '""')}"`;
        const codeStr = ts.work_code ? String(ts.work_code) : '';
        const code = `"${codeStr.replace(/"/g, '""')}"`;
        csvContent += `${formatDate(ts.date)},${code},${desc},${ts.duration}\n`;
      });

      const uri = FileSystem.cacheDirectory + 'Timesheets.csv';
      await FileSystem.writeAsStringAsync(uri, csvContent);
      await Sharing.shareAsync(uri, { 
        mimeType: 'text/csv', 
        UTI: 'public.comma-separated-values',
        dialogTitle: 'Export Timesheets' 
      });
    } catch (e: any) {
      console.error('CSV Export Error:', e);
      Toast.show({ type: 'error', text1: 'Export Failed', text2: e?.message || String(e) });
    }
  };

  const PASTEL_COLORS = isDark
    ? ['#4f46e5', '#be123c', '#115e59', '#b45309', '#0f766e', '#86198f']
    : ['#e0e7ff', '#ffe4e6', '#ccfbf1', '#fef3c7', '#dcfce7', '#f3e8ff'];

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const cardColor = PASTEL_COLORS[index % PASTEL_COLORS.length];
    const textColor = isDark ? '#ffffff' : '#111111';
    
    let itemDate = new Date(item.date);
    if (isNaN(itemDate.getTime()) && typeof item.date === 'string' && item.date.includes('-')) {
      const parts = item.date.split('-');
      if (parts[0].length === 2 && parts[2].length === 4) {
        itemDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
      }
    }
    const isValidDate = !isNaN(itemDate.getTime());

    return (
      <TouchableOpacity
        style={[s.dayCard, { backgroundColor: cardColor }]}
        onPress={() => openDetail(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.9}
      >
        <View style={[s.decorativeBubble, { backgroundColor: textColor + '15' }]} pointerEvents="none" />

        {/* Top Right Edit Icon */}
        <TouchableOpacity onPress={() => openEdit(item)} style={[s.absoluteEditBtn, { backgroundColor: textColor + '1a' }]}>
          <Feather name="edit-2" size={14} color={textColor} />
        </TouchableOpacity>

        <View style={s.dayCardLeft}>
          <Text style={[s.dayCardWeekday, { color: textColor }]}>{isValidDate ? itemDate.toLocaleDateString('en-US', { weekday: 'long' }) : 'Unknown'}</Text>
          <Text style={[s.dayCardNum, { color: textColor }]}>{isValidDate ? itemDate.getDate() : '-'}</Text>
          <Text style={[s.dayCardMonth, { color: textColor }]}>{isValidDate ? MONTHS[itemDate.getMonth()].substring(0, 3).toUpperCase() : '---'}</Text>
        </View>
        <View style={s.dayCardRight}>
          <View style={s.timelineEvt}>
            <View style={s.timelineBlock}>
              <Text style={[s.timelineBlockText, { color: textColor, fontSize: 18, marginBottom: 4 }]} numberOfLines={1}>{item.work_code || 'Unknown'}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: item.description ? 8 : 0 }}>
                <Feather name="clock" size={14} color={textColor + 'cc'} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: textColor + 'cc' }}>
                  {Number(item.duration).toFixed(0)} hrs
                </Text>
              </View>

              {!!item.description && (
                <Text style={{ fontSize: 13, color: textColor + 'cc', paddingRight: 32, lineHeight: 18 }} numberOfLines={3}>{item.description}</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Top Bar (Calendar Style) */}
      <View style={s.topBar}>
        <View style={s.segmentControl}>
          <TouchableOpacity
            style={[s.segmentBtn, viewMode === 'overview' && s.segmentBtnActive]}
            onPress={() => setViewMode('overview')}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentText, viewMode === 'overview' && s.segmentTextActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segmentBtn, viewMode === 'table' && s.segmentBtnActive]}
            onPress={() => setViewMode('table')}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentText, viewMode === 'table' && s.segmentTextActive]}>Table</Text>
          </TouchableOpacity>
        </View>
        {viewMode === 'table' && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={s.addBtnCircleSmall} onPress={exportExcel} activeOpacity={0.8}>
              <MaterialCommunityIcons name="microsoft-excel" size={18} color={isDark ? '#000' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity style={s.addBtnCircleSmall} onPress={exportPDF} activeOpacity={0.8}>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color={isDark ? '#000' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity style={s.addBtnCircleSmall} onPress={() => setFilterVisible(true)} activeOpacity={0.8}>
              <Feather name="filter" size={14} color={isDark ? '#000' : '#fff'} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Month Selector */}
      {viewMode === 'overview' && (
        <View style={s.monthSelector}>
          <Text style={s.monthMuted}>{MONTHS[(currentMonthIdx + 11) % 12].substring(0, 3).toUpperCase()}</Text>
          <TouchableOpacity onPress={prevMonth} style={{ padding: 10 }}>
            <Feather name="chevron-left" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.monthActive}>{MONTHS[currentMonthIdx].toUpperCase()}</Text>
            <Text style={s.yearSubtext}>{currentYearNum}</Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={{ padding: 10 }}>
            <Feather name="chevron-right" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={s.monthMuted}>{MONTHS[(currentMonthIdx + 1) % 12].substring(0, 3).toUpperCase()}</Text>
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
      ) : viewMode === 'table' ? (
        <View style={{ flex: 1 }}>
          <View style={[s.kpiRow, { paddingHorizontal: 16, marginTop: 16 }]}>
            <View style={[s.kpiCard, { backgroundColor: C.primary + '15', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 16 }]}>
              <Feather name="file-text" size={32} color={C.primary} />
              <View>
                <Text style={[s.kpiLabel, { marginTop: 0, fontSize: 13 }]}>Total Records</Text>
                <Text style={[s.kpiValue, { marginTop: 2, fontSize: 24 }]}>{totalTimesheets}</Text>
              </View>
            </View>
            <View style={[s.kpiCard, { backgroundColor: C.green + '15', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 16 }]}>
              <Feather name="clock" size={32} color={C.green} />
              <View>
                <Text style={[s.kpiLabel, { marginTop: 0, fontSize: 13 }]}>Total Hours</Text>
                <Text style={[s.kpiValue, { marginTop: 2, fontSize: 24 }]}>{totalHours.toFixed(0)} hrs</Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: C.card, margin: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border }}>
            <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={[s.tableRow, s.tableHeader]}>
                  <TouchableOpacity onPress={() => handleSort('date')} style={[{ width: 100 }, s.tableSortCell]}>
                    <Text style={[s.tableCellHeader, sortField === 'date' && { color: C.primary }]}>Date</Text>
                    {sortField === 'date' && <Feather name={sortAsc ? 'chevron-up' : 'chevron-down'} size={14} color={C.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSort('work_code')} style={[{ width: 150 }, s.tableSortCell]}>
                    <Text style={[s.tableCellHeader, sortField === 'work_code' && { color: C.primary }]}>Work Code</Text>
                    {sortField === 'work_code' && <Feather name={sortAsc ? 'chevron-up' : 'chevron-down'} size={14} color={C.primary} />}
                  </TouchableOpacity>
                  <View style={{ width: 200, paddingVertical: 12, paddingHorizontal: 16 }}>
                    <Text style={s.tableCellHeader}>Description</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleSort('duration')} style={[{ width: 80 }, s.tableSortCell]}>
                    <Text style={[s.tableCellHeader, sortField === 'duration' && { color: C.primary }]}>Hours</Text>
                    {sortField === 'duration' && <Feather name={sortAsc ? 'chevron-up' : 'chevron-down'} size={14} color={C.primary} />}
                  </TouchableOpacity>
                </View>
                {/* Table Body */}
              <FlatList
                data={sortedTimesheets}
                keyExtractor={(item, index) => item.id || String(index)}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTimesheets(1); }} tintColor={C.primary} />}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? <ActivityIndicator color={C.primary} style={{ margin: 20 }} /> : null}
                ListEmptyComponent={
                  <View style={{ padding: 40, alignItems: 'center', width: 530 }}>
                    <Text style={{ color: C.textMuted }}>No timesheets found.</Text>
                  </View>
                }
                renderItem={({ item: ts, index: i }) => (
                  <View style={[s.tableRow, { alignItems: 'flex-start' }, i % 2 === 1 && { backgroundColor: C.bg }]}>
                    <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 16 }}>
                      {(() => {
                        let d = new Date(ts.date);
                        if (isNaN(d.getTime()) && ts.date.includes('-')) {
                           const parts = ts.date.split('-');
                           if (parts[0].length === 2 && parts[2].length === 4) {
                              d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                           }
                        }
                        if (isNaN(d.getTime())) return <Text style={[s.tableCell, { paddingVertical: 0, paddingHorizontal: 0 }]}>{ts.date}</Text>;
                        return (
                          <View>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: C.textPrimary }}>{d.getDate().toString().padStart(2, '0')}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary, textTransform: 'capitalize' }}>{MONTHS[d.getMonth()].substring(0, 3)}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: C.textMuted }}>{d.getFullYear()}</Text>
                          </View>
                        );
                      })()}
                    </View>
                    <View style={{ width: 150, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'flex-start' }}>
                      <View style={{ backgroundColor: C.primary + '15', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }} numberOfLines={2}>{ts.work_code}</Text>
                      </View>
                    </View>
                    <Text style={[s.tableCell, { width: 200, color: C.textSecondary, lineHeight: 20 }]}>{ts.description || '--'}</Text>
                    <View style={{ width: 80, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'flex-start' }}>
                      <View style={{ backgroundColor: C.green + '15', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ color: C.green, fontWeight: '800', fontSize: 14 }}>{Number(ts.duration).toFixed(0)}</Text>
                      </View>
                    </View>
                  </View>
                )}
              />
              </View>
            </ScrollView>
          </View>
        </View>
      ) : (
        <FlatList
          data={sortedTimesheets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTimesheets(1); }} tintColor={C.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            sortedTimesheets.length > 0 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.textSecondary, letterSpacing: 0.5 }}>TIMELINE</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: C.border }}
                  onPress={() => handleSort('date')}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.textPrimary }}>Sort</Text>
                  <Feather name={sortAsc ? 'arrow-up' : 'arrow-down'} size={14} color={C.textPrimary} />
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Feather name="clock" size={48} color={C.border} />
              <Text style={s.emptyTitle}>No timesheets found</Text>
              <Text style={s.emptySub}>Tap the + button to add one.</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={[s.fab, { zIndex: 101 }]} onPress={() => setActionSheet(!actionSheet)} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Feather name="plus" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>

      <DateFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        currentFilter={filter}
        onApply={setFilter}
      />

      {/* Detail Modal */}
      <Modal visible={detailModal} animationType="slide" transparent onRequestClose={() => setDetailModal(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.dragHandle} />
            {selectedItem && (
              <>
                <View style={s.detailHeader}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={s.detailTitle}>{selectedItem.work_code || 'Unknown'}</Text>
                    <View style={s.detailTimeRow}>
                      <Feather name="calendar" size={14} color={C.textMuted} />
                      <Text style={s.detailTimeText}>{formatDate(selectedItem.date)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.closeBtn} onPress={() => setDetailModal(false)}>
                    <Feather name="x" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                  {selectedItem.description ? (
                    <View style={s.detailSection}>
                      <Text style={s.formLabel}>Description</Text>
                      <Text style={s.detailText}>{selectedItem.description}</Text>
                    </View>
                  ) : null}

                  <View style={s.detailSection}>
                    <Text style={s.formLabel}>Duration</Text>
                    <Text style={s.detailValue}>{Number(selectedItem.duration).toFixed(0)} hrs</Text>
                  </View>

                  <View style={s.actionRowSplit}>
                    <TouchableOpacity
                      style={[s.actionBtn, { flex: 1, backgroundColor: C.primary + '15' }]}
                      onPress={() => { setDetailModal(false); openEdit(selectedItem); }}
                      activeOpacity={0.8}
                    >
                      <Feather name="edit-2" size={16} color={C.primary} />
                      <Text style={[s.actionBtnText, { color: C.primary }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.actionBtn, { flex: 1, backgroundColor: C.red + '15' }]}
                      onPress={() => { setDetailModal(false); handleDelete(selectedItem); }}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={16} color={C.red} />
                      <Text style={[s.actionBtnText, { color: C.red }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ height: 40 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Form Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <View style={s.modalRoot}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModal(false)} style={s.closeBtn}>
              <Feather name="arrow-left" size={20} color={C.textPrimary} />
              <Text style={s.closeBtnText}>Back</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>{editing ? 'Edit Timesheet' : 'New Timesheet'}</Text>

            <View style={s.formGroup}>
              <Text style={s.label}>Date</Text>
              <TouchableOpacity style={s.dateInput} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: C.textPrimary }}>{formatDate(form.date)}</Text>
                <Feather name="calendar" size={16} color={C.textMuted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(form.date)}
                  mode="date"
                  display="default"
                  onChange={(e, d) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (d) setForm({ ...form, date: d.toISOString().split('T')[0] });
                  }}
                />
              )}
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Work Code</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 }}>
                {workCodes.map(w => (
                  <View key={w} style={[s.pill, form.work_code === w && { backgroundColor: C.primary, borderColor: C.primary }]}>
                    <TouchableOpacity
                      onPress={() => setForm({ ...form, work_code: w })}
                      style={{ paddingVertical: 4 }}
                    >
                      <Text style={[s.pillText, form.work_code === w && { color: '#fff' }]}>{w}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteWorkCode(w)} style={{ marginLeft: 8, padding: 4 }}>
                      <Feather name="x" size={14} color={form.work_code === w ? '#fff' : C.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TextInput
                  style={[s.input, { flex: 1, height: 44, paddingVertical: 0 }]}
                  placeholder="New Work Code..."
                  placeholderTextColor={C.textMuted}
                  value={newWorkCode}
                  onChangeText={setNewWorkCode}
                  onSubmitEditing={handleAddWorkCode}
                />
                <TouchableOpacity
                  onPress={handleAddWorkCode}
                  style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginLeft: 8, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="plus" size={20} color={C.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={t => setForm({ ...form, description: t })}
                placeholder="Type here..."
                placeholderTextColor={C.textMuted}
                multiline
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Duration (Hours)</Text>
                <View style={s.durationInputRow}>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    value={form.duration.toString()}
                    onChangeText={t => setForm({ ...form, duration: parseFloat(t) || 0 })}
                    keyboardType="decimal-pad"
                  />
                  <View style={s.durationIcon}>
                    <Feather name="clock" size={16} color={C.textMuted} />
                  </View>
                </View>
              </View>
            </View>

          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Text style={[s.actionBtnText, { color: '#fff' }]}>Save Timesheet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gooey Speed Dial Menu */}
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 100 }]} pointerEvents={actionSheet ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: item2Anim }]} pointerEvents={actionSheet ? 'auto' : 'none'}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setActionSheet(false)} />
        </Animated.View>

        {/* Upload Button */}
        <Animated.View style={[{ position: 'absolute', bottom: 24, right: 24, alignItems: 'flex-end' }, getPopStyle(item1Anim, -70)]} pointerEvents={actionSheet ? 'auto' : 'none'}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' }}>Upload (AI)</Text>
            <TouchableOpacity style={[s.fab, { position: 'relative', bottom: 0, right: 0, width: 50, height: 50, backgroundColor: C.green }]} onPress={pickDocument}>
              <Feather name="upload" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Add Entry Button */}
        <Animated.View style={[{ position: 'absolute', bottom: 24, right: 24, alignItems: 'flex-end' }, getPopStyle(item2Anim, -140)]} pointerEvents={actionSheet ? 'auto' : 'none'}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' }}>Manual Entry</Text>
            <TouchableOpacity style={[s.fab, { position: 'relative', bottom: 0, right: 0, width: 50, height: 50, backgroundColor: C.primary }]} onPress={openCreate}>
              <Feather name="edit-2" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Review Modal */}
      <Modal visible={reviewModal} animationType="slide" transparent onRequestClose={() => setReviewModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalCard, { maxHeight: '95%' }]}>
            <View style={s.dragHandle} />
            <View style={[s.modalHeader, { marginBottom: 16 }]}>
              <View>
                <Text style={s.modalTitle}>Review Timesheets</Text>
                <Text style={[s.modalSubtitle, { color: C.textSecondary, marginTop: -16 }]}>Please verify the AI extracted data</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setReviewModal(false)}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {reviewedTimesheets.map((ts, idx) => (
                <View key={idx} style={[s.reviewCard, { backgroundColor: C.bg }]}>
                  <View style={s.reviewCardHeader}>
                    <Text style={{ fontWeight: '700', color: C.primary, fontSize: 16 }}>Entry {idx + 1}</Text>
                    <TouchableOpacity onPress={() => setReviewedTimesheets(prev => prev.filter((_, i) => i !== idx))}>
                      <Feather name="trash-2" size={18} color={C.red} />
                    </TouchableOpacity>
                  </View>

                  <View style={s.reviewRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.label}>Date (DD-MM-YYYY)</Text>
                      <TextInput
                        style={[s.input, { backgroundColor: C.card }]}
                        value={ts.date}
                        placeholder="DD-MM-YYYY"
                        placeholderTextColor={C.textMuted}
                        onChangeText={(t) => {
                          const n = [...reviewedTimesheets];
                          n[idx].date = t;
                          setReviewedTimesheets(n);
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.label}>Duration (hrs)</Text>
                      <TextInput
                        style={[s.input, { backgroundColor: C.card }]}
                        value={String(ts.duration)}
                        keyboardType="decimal-pad"
                        onChangeText={(t) => {
                          const n = [...reviewedTimesheets];
                          n[idx].duration = t;
                          setReviewedTimesheets(n);
                        }}
                      />
                    </View>
                  </View>

                  <Text style={s.label}>Work Code (Company Name)</Text>
                  {workCodes.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {workCodes.map(w => (
                        <TouchableOpacity
                          key={w}
                          style={[s.pill, { paddingVertical: 4, paddingHorizontal: 10 }, ts.work_code === w && { backgroundColor: C.primary, borderColor: C.primary }]}
                          onPress={() => {
                            const n = [...reviewedTimesheets];
                            n[idx].work_code = w;
                            setReviewedTimesheets(n);
                          }}
                        >
                          <Text style={[s.pillText, { fontSize: 12 }, ts.work_code === w && { color: '#fff' }]}>{w}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TextInput
                    style={[s.input, { backgroundColor: C.card }]}
                    value={ts.work_code}
                    placeholder="Or type a new work code..."
                    placeholderTextColor={C.textMuted}
                    onChangeText={(t) => {
                      const n = [...reviewedTimesheets];
                      n[idx].work_code = t;
                      setReviewedTimesheets(n);
                    }}
                  />

                  <Text style={s.label}>Description</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: C.card }]}
                    value={ts.description}
                    multiline
                    onChangeText={(t) => {
                      const n = [...reviewedTimesheets];
                      n[idx].description = t;
                      setReviewedTimesheets(n);
                    }}
                  />
                </View>
              ))}
              {reviewedTimesheets.length === 0 && (
                <Text style={{ textAlign: 'center', color: C.textMuted, marginTop: 40 }}>No timesheets extracted.</Text>
              )}
            </ScrollView>

            <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderColor: C.border }}>
              <TouchableOpacity style={[s.saveBtn, { width: '100%' }]} onPress={handleConfirmTimesheets}>
                <Text style={[s.actionBtnText, { color: '#fff' }]}>Confirm & Save All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Loader Overlay */}
      {uploadLoading && <DocumentLoader C={C} />}

    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: C.textPrimary },
  subtitle: { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border
  },

  card: {
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.primary + '10',
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  cardDate: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  cardBody: { padding: 16 },
  cardMatter: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  cardWorkCode: { fontSize: 13, fontWeight: '600', color: C.primary, textTransform: 'uppercase' },
  cardDesc: { fontSize: 14, color: C.textSecondary, marginTop: 12, lineHeight: 20 },
  cardFooter: { paddingHorizontal: 16, paddingBottom: 16 },
  pillRow: { flexDirection: 'row', gap: 8 },
  durationPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  durationText: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  billablePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: C.primary },
  billableText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 14, color: C.textSecondary, marginTop: 8 },

  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 20, marginTop: 10,
  },
  monthActive: { fontSize: 24, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  yearSubtext: { fontSize: 12, fontWeight: '600', color: C.textMuted, marginTop: -2 },
  monthMuted: { fontSize: 20, fontWeight: '700', color: C.textMuted + '60' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },

  modalRoot: { flex: 1, backgroundColor: C.bg },
  modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  closeBtnText: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  modalTitle: { fontSize: 24, fontWeight: '800', color: C.textPrimary, marginBottom: 24 },
  modalSubtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 24, marginTop: -16 },
  modalContent: { padding: 20, paddingBottom: 100 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: C.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.textPrimary
  },
  dateInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center'
  },
  pillText: { fontSize: 14, fontWeight: '600', color: C.textPrimary },

  durationInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  durationIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center'
  },

  modalFooter: {
    padding: 20, borderTopWidth: 1, borderTopColor: C.border,
    flexDirection: 'row', gap: 12, backgroundColor: C.bg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20
  },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, alignItems: 'center'
  },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  saveBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 12,
    backgroundColor: C.primary, alignItems: 'center'
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  segmentWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  segmentControl: {
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 24,
    padding: 4, borderWidth: 1, borderColor: C.border, flex: 1, marginRight: 12
  },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  segmentBtnActive: { backgroundColor: C.textPrimary },
  segmentText: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  segmentTextActive: { color: C.bg },

  topBar: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtnCircleSmall: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.textPrimary,
    alignItems: 'center', justifyContent: 'center'
  },

  dayCard: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 24, padding: 20,
    flexDirection: 'row', minHeight: 140, overflow: 'hidden', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    position: 'relative'
  },
  decorativeBubble: {
    position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: 100
  },
  absoluteEditBtn: {
    position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', zIndex: 10
  },
  absoluteDuration: {
    position: 'absolute', bottom: 16, right: 16, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 10
  },
  dayCardLeft: {
    width: 80, justifyContent: 'center'
  },
  dayCardWeekday: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  dayCardNum: { fontSize: 48, fontWeight: '800', lineHeight: 52 },
  dayCardMonth: { fontSize: 20, fontWeight: '800' },

  dayCardRight: { flex: 1, justifyContent: 'center', paddingLeft: 12 },
  timelineEvt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  timelineTimeBox: { width: 50, alignItems: 'center' },
  timelineTimeText: { fontSize: 13, fontWeight: '700' },
  timelineBlock: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
  timelineBlockText: { fontSize: 16, fontWeight: '800' },
  miniAddBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  overviewContent: { padding: 16, paddingBottom: 100 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginTop: 8 },
  kpiLabel: { fontSize: 12, color: C.textSecondary, marginTop: 4, fontWeight: '600' },
  chartCard: { backgroundColor: C.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginTop: 4, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 16, alignSelf: 'flex-start' },
  chartEmpty: { padding: 40, color: C.textMuted },

  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'center' },
  tableHeader: { backgroundColor: C.card, borderBottomWidth: 2 },
  tableCell: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14, color: C.textPrimary },
  tableCellHeader: { fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', fontSize: 12 },
  tableSortCell: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 16 },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '90%' },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  detailTitle: { fontSize: 24, fontWeight: '800', color: C.textPrimary },
  detailTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detailTimeText: { fontSize: 14, color: C.textMuted },
  modalBody: { paddingBottom: 20 },
  detailSection: { marginBottom: 24 },
  formLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  detailText: { fontSize: 16, color: C.textPrimary, lineHeight: 24 },
  detailValue: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  actionRowSplit: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, marginBottom: 12 },
  sheetIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheetBtnTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  sheetBtnSub: { fontSize: 13, color: C.textMuted },
  reviewCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewRow: { flexDirection: 'row', gap: 12, marginBottom: 12 }
});
