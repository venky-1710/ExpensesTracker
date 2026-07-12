import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { calendarService } from '../../services/calendarService';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const parseEvtDate = (s: string) => {
  try { return new Date(s); } catch { return new Date(); }
};

const formatTime = (s: string) => {
  const d = parseEvtDate(s);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const BLANK_FORM = {
  title: '', description: '', start_time: '', end_time: '', color: '#6366f1',
  amount: '', payment_category: 'Bills', payment_method: 'Card', transaction_type: 'debit' as 'credit' | 'debit',
};

export default function CalendarScreen() {
  const { C, isDark } = useAppTheme();
  const s = getStyles(C);
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'today' | 'calendar'>('today');

  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [startMode, setStartMode] = useState<'date' | 'time' | null>(null);
  const [endMode, setEndMode] = useState<'date' | 'time' | null>(null);

  const onStartChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        if (startMode === 'date') {
          const current = new Date(form.start_time || new Date());
          current.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          setForm({ ...form, start_time: current.toISOString() });
          setStartMode('time');
        } else if (startMode === 'time') {
          const current = new Date(form.start_time || new Date());
          current.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          setForm({ ...form, start_time: current.toISOString() });
          setStartMode(null);
        }
      } else {
        setStartMode(null);
      }
    } else {
      if (selectedDate) setForm({ ...form, start_time: selectedDate.toISOString() });
    }
  };

  const onEndChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set' && selectedDate) {
        if (endMode === 'date') {
          const current = new Date(form.end_time || new Date());
          current.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          setForm({ ...form, end_time: current.toISOString() });
          setEndMode('time');
        } else if (endMode === 'time') {
          const current = new Date(form.end_time || new Date());
          current.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          setForm({ ...form, end_time: current.toISOString() });
          setEndMode(null);
        }
      } else {
        setEndMode(null);
      }
    } else {
      if (selectedDate) setForm({ ...form, end_time: selectedDate.toISOString() });
    }
  };

  const load = useCallback(async () => {
    try {
      const data = await calendarService.getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) { console.error('Calendar load error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const days: { day: number, type: 'prev' | 'current' | 'next', date: Date }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      type: 'prev',
      date: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i)
    });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, type: 'current', date: new Date(currentYear, currentMonth, i) });
  }
  let nextDay = 1;
  while (days.length < 42) {
    days.push({ day: nextDay, type: 'next', date: new Date(currentYear, currentMonth + 1, nextDay) });
    nextDay++;
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  };
  const goToday = () => { setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth()); setSelectedDate(now); };

  const selectedDayEvents = events
    .filter(ev => isSameDay(parseEvtDate(ev.start_time), selectedDate))
    .sort((a, b) => parseEvtDate(a.start_time).getTime() - parseEvtDate(b.start_time).getTime());

  const openDetail = (ev: any) => {
    setSelectedEvent(ev);
    setDetailModal(true);
  };

  const openCreate = () => {
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(10, 0, 0, 0);
    setEditing(null);
    setForm({
      ...BLANK_FORM,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });
    setModal(true);
  };

  const openEdit = (ev: any) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      start_time: parseEvtDate(ev.start_time).toISOString(),
      end_time: parseEvtDate(ev.end_time).toISOString(),
      color: ev.color || '#6366f1',
      amount: ev.amount ? ev.amount.toString() : '',
      payment_category: ev.payment_category || 'Bills',
      payment_method: ev.payment_method || 'Card',
      transaction_type: ev.transaction_type || 'debit',
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Toast.show({ type: 'error', text1: 'Title required', text2: 'Please enter an event title' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        amount: form.amount ? parseFloat(form.amount) : null,
      };
      if (editing) {
        const updated = await calendarService.updateEvent(editing.id, payload);
        setEvents(prev => prev.map(e => e.id === editing.id ? updated : e));
        Toast.show({ type: 'success', text1: 'Updated!', text2: 'Event updated' });
      } else {
        const created = await calendarService.createEvent(payload);
        setEvents(prev => [...prev, created]);
        Toast.show({ type: 'success', text1: 'Created!', text2: 'Event added' });
      }
      setModal(false);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.detail || 'Failed to save event' });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (ev: any) => {
    try {
      await calendarService.markAsPaid(ev.id);
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_paid: true } : e));
      Toast.show({ type: 'success', text1: 'Success', text2: 'Marked as paid' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to mark as paid' });
    }
  };

  const handleUndoPaid = async (ev: any) => {
    try {
      await calendarService.undoPaid(ev.id);
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_paid: false } : e));
      Toast.show({ type: 'success', text1: 'Success', text2: 'Payment undone' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to undo payment' });
    }
  };

  const handleDelete = (ev: any) => {
    Alert.alert('Delete Event', `Delete "${ev.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setEvents(prev => prev.filter(e => e.id !== ev.id));
          try { await calendarService.deleteEvent(ev.id); }
          catch { load(); }
        },
      },
    ]);
  };

  const PASTEL_COLORS = [
    isDark ? '#4c1d95' : '#c4b5fd', // Purple
    isDark ? '#9f1239' : '#fecdd3', // Pink
    isDark ? '#115e59' : '#99f6e4', // Teal
    isDark ? '#3f6212' : '#d9f99d', // Lime/Green
    isDark ? '#854d0e' : '#fde047', // Yellow
    isDark ? '#1e3a8a' : '#bfdbfe', // Blue
  ];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Top Segmented Control & Add Button */}
        <View style={s.topBar}>
          <View style={s.segmentControl}>
            <TouchableOpacity 
              style={[s.segmentBtn, viewMode === 'today' && s.segmentBtnActive]} 
              onPress={() => { setViewMode('today'); goToday(); }} 
              activeOpacity={0.8}
            >
              <Text style={[s.segmentText, viewMode === 'today' && s.segmentTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.segmentBtn, viewMode === 'calendar' && s.segmentBtnActive]} 
              onPress={() => setViewMode('calendar')} 
              activeOpacity={0.8}
            >
              <Text style={[s.segmentText, viewMode === 'calendar' && s.segmentTextActive]}>Calendar</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.addBtnCircle} onPress={openCreate} activeOpacity={0.8}>
            <Feather name="plus" size={20} color={isDark ? '#000' : '#fff'} />
          </TouchableOpacity>
        </View>

        {viewMode === 'today' ? (
          /* ── TODAY VIEW ────────────────────────────────────── */
          <View style={s.todayContainer}>
            <View style={s.todayHeaderRow}>
              <View style={s.todayDateWrap}>
                <Text style={s.todayWeekday}>{now.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
                <Text style={s.todayHugeDate}>
                  {now.getDate().toString().padStart(2, '0')}
                </Text>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={s.todayMonthText}>{MONTHS[now.getMonth()].toUpperCase()}</Text>
                  <Text style={s.todayYearText}>{now.getFullYear()}</Text>
                </View>
              </View>
              <View style={s.todayTimeWrap}>
                <Text style={s.todayTimeText}>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                <Text style={s.todayTimeSub}>Local Time</Text>
              </View>
            </View>

            <View style={s.tasksSection}>
              <View style={s.tasksHeader}>
                <Text style={s.tasksTitle}>Todays tasks</Text>
                <View style={s.remindersPill}>
                  <Text style={s.remindersText}>Reminders</Text>
                </View>
              </View>

              {loading ? (
                <ActivityIndicator color={C.primary} style={{ margin: 20 }} />
              ) : selectedDayEvents.length === 0 ? (
                <Text style={s.emptyDaySubtext}>No tasks for today.</Text>
              ) : (
                selectedDayEvents.map((ev, idx) => {
                  const start = parseEvtDate(ev.start_time);
                  const end = parseEvtDate(ev.end_time);
                  const durationMins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
                  
                  // Use theme-aware pastels for today cards, fallback to ev.color
                  const cardColor = PASTEL_COLORS[idx % PASTEL_COLORS.length];
                  const textColor = isDark ? '#ffffff' : '#111111';

                  return (
                    <TouchableOpacity 
                      key={ev.id} 
                      style={[s.taskCard, { backgroundColor: cardColor }]} 
                      onPress={() => openDetail(ev)} 
                      activeOpacity={0.9}
                    >
                      <View style={[s.decorativeBubble, { backgroundColor: textColor + '15' }]} pointerEvents="none" />
                      <View style={s.taskCardTop}>
                        <Text style={[s.taskCardTitle, { color: textColor }]} numberOfLines={2}>{ev.title}</Text>
                      </View>
                      <View style={s.taskCardBottom}>
                        <View>
                          <Text style={[s.taskTimeVal, { color: textColor }]}>{formatTime(ev.start_time)}</Text>
                          <Text style={[s.taskTimeLbl, { color: textColor + 'aa' }]}>Start</Text>
                        </View>
                        <View style={[s.taskDurationPill, { backgroundColor: textColor + '1a' }]}>
                          <Text style={[s.taskDurationText, { color: textColor }]}>{durationMins} Min</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[s.taskTimeVal, { color: textColor }]}>{formatTime(ev.end_time)}</Text>
                          <Text style={[s.taskTimeLbl, { color: textColor + 'aa' }]}>End</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        ) : (
          /* ── CALENDAR VIEW ─────────────────────────────────── */
          <View style={s.calContainer}>
            <View style={s.monthSelector}>
              <Text style={s.monthMuted}>{MONTHS[(currentMonth + 11) % 12].substring(0, 3).toUpperCase()}</Text>
              <TouchableOpacity onPress={prevMonth} style={{ padding: 10 }}>
                <Feather name="chevron-left" size={20} color={C.textPrimary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.monthActive}>{MONTHS[currentMonth].toUpperCase()}</Text>
                <Text style={s.yearSubtext}>{currentYear}</Text>
              </View>
              <TouchableOpacity onPress={nextMonth} style={{ padding: 10 }}>
                <Feather name="chevron-right" size={20} color={C.textPrimary} />
              </TouchableOpacity>
              <Text style={s.monthMuted}>{MONTHS[(currentMonth + 1) % 12].substring(0, 3).toUpperCase()}</Text>
            </View>

            <View style={s.dayCardsList}>
              {days.filter(d => d.type === 'current').map((item, i) => {
                const dayEvts = events.filter(ev => isSameDay(parseEvtDate(ev.start_time), item.date));
                const dayColor = PASTEL_COLORS[i % PASTEL_COLORS.length];
                const textColor = isDark ? '#ffffff' : '#111111';

                return (
                  <View key={`dc-${i}`} style={[s.dayCard, { backgroundColor: dayColor }]}>
                    <View style={[s.decorativeBubble, { backgroundColor: textColor + '15' }]} pointerEvents="none" />
                    
                    {/* Top Right Add Button */}
                    <TouchableOpacity 
                      style={[s.timelineAddBtn, { position: 'absolute', top: 20, right: 20, backgroundColor: textColor + '1a', zIndex: 10 }]} 
                      onPress={() => { setSelectedDate(item.date); openCreate(); }}
                      activeOpacity={0.8}
                    >
                      <Feather name="plus" size={14} color={textColor} />
                    </TouchableOpacity>

                    <View style={s.dayCardLeft}>
                      <Text style={[s.dayCardWeekday, { color: textColor }]}>{item.date.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
                      <Text style={[s.dayCardNum, { color: textColor }]}>{item.day}</Text>
                      <Text style={[s.dayCardMonth, { color: textColor }]}>{MONTHS[currentMonth].substring(0, 3).toUpperCase()}</Text>
                    </View>
                    <View style={s.dayCardRight}>
                      {dayEvts.map((ev, j) => {
                        const startD = parseEvtDate(ev.start_time);
                        const endD = parseEvtDate(ev.end_time);
                        const formatShortTime = (d: Date) => {
                          const h = d.getHours();
                          const ampm = h >= 12 ? 'pm' : 'am';
                          return `${h % 12 || 12} ${ampm}`;
                        };
                        
                        return (
                          <View key={`ev-${j}`} style={[s.timelineEvt, { flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginBottom: j < dayEvts.length - 1 ? 16 : 0 }]}>
                            <TouchableOpacity 
                              style={[s.timelineBlock, { paddingHorizontal: 0, paddingVertical: 0 }]} 
                              onPress={() => openDetail(ev)}
                              activeOpacity={0.8}
                            >
                              <Text style={[s.timelineBlockText, { color: textColor, fontSize: 16, marginBottom: 4 }]} numberOfLines={1}>{ev.title}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Feather name="clock" size={12} color={textColor + 'cc'} />
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textColor + 'cc' }}>
                                  {formatShortTime(startD)} - {formatShortTime(endD)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                      {dayEvts.length === 0 && (
                        <View style={[s.timelineEvt, { justifyContent: 'flex-start' }]}>
                          <Text style={{ color: textColor + 'cc', fontSize: 14, fontWeight: '700' }}>All day</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Event Detail Modal */}
      <Modal visible={detailModal} animationType="slide" transparent onRequestClose={() => setDetailModal(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.dragHandle} />
            {selectedEvent && (
              <>
                <View style={s.modalHeader}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={s.modalTitle}>{selectedEvent.title}</Text>
                    <View style={[s.evtTimeRow, { marginTop: 4 }]}>
                      <Feather name="clock" size={14} color={C.textMuted} />
                      <Text style={[s.evtTime, { fontSize: 14 }]}>
                        {formatTime(selectedEvent.start_time)} – {formatTime(selectedEvent.end_time)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.closeBtn} onPress={() => setDetailModal(false)}>
                    <Feather name="x" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                  {selectedEvent.description ? (
                    <View style={s.detailSection}>
                      <Text style={s.formLabel}>Description</Text>
                      <Text style={s.detailText}>{selectedEvent.description}</Text>
                    </View>
                  ) : null}

                  {selectedEvent.amount ? (
                    <View style={s.detailSection}>
                      <Text style={s.formLabel}>Financial Details</Text>
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Amount</Text>
                        <Text style={s.detailValue}>₹{selectedEvent.amount}</Text>
                      </View>
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Type</Text>
                        <View style={[s.typePill, { backgroundColor: selectedEvent.transaction_type === 'credit' ? C.green + '20' : C.red + '20' }]}>
                          <Text style={[s.typePillText, { color: selectedEvent.transaction_type === 'credit' ? C.green : C.red }]}>
                            {(selectedEvent.transaction_type || 'debit').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Category</Text>
                        <Text style={s.detailValue}>{selectedEvent.payment_category || 'Bills'}</Text>
                      </View>
                      <View style={s.detailRow}>
                        <Text style={s.detailLabel}>Status</Text>
                        <View style={[s.typePill, { backgroundColor: selectedEvent.is_paid ? C.green + '20' : C.amber + '20' }]}>
                          <Text style={[s.typePillText, { color: selectedEvent.is_paid ? C.green : C.amber }]}>
                            {selectedEvent.is_paid ? 'COMPLETED' : 'PENDING'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Actions */}
                  <View style={s.detailActions}>
                    {selectedEvent.amount != null ? (
                      selectedEvent.is_paid ? (
                        <TouchableOpacity 
                          style={[s.actionBtn, { backgroundColor: C.textSecondary + '15' }]} 
                          onPress={() => { handleUndoPaid(selectedEvent); setDetailModal(false); }}
                          activeOpacity={0.8}
                        >
                          <Feather name="corner-up-left" size={18} color={C.textSecondary} />
                          <Text style={[s.actionBtnText, { color: C.textSecondary }]}>Undo Payment</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={[s.actionBtn, { backgroundColor: C.green + '15' }]} 
                          onPress={() => { handleMarkPaid(selectedEvent); setDetailModal(false); }}
                          activeOpacity={0.8}
                        >
                          <Feather name="check-circle" size={18} color={C.green} />
                          <Text style={[s.actionBtnText, { color: C.green }]}>
                            {selectedEvent.transaction_type === 'credit' ? 'Mark as Received' : 'Mark as Paid'}
                          </Text>
                        </TouchableOpacity>
                      )
                    ) : null}

                    <View style={s.actionRowSplit}>
                      <TouchableOpacity 
                        style={[s.actionBtn, { flex: 1, backgroundColor: C.primary + '15' }]} 
                        onPress={() => { setDetailModal(false); openEdit(selectedEvent); }}
                        activeOpacity={0.8}
                      >
                        <Feather name="edit-2" size={16} color={C.primary} />
                        <Text style={[s.actionBtnText, { color: C.primary }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[s.actionBtn, { flex: 1, backgroundColor: C.red + '15' }]} 
                        onPress={() => { setDetailModal(false); handleDelete(selectedEvent); }}
                        activeOpacity={0.8}
                      >
                        <Feather name="trash-2" size={16} color={C.red} />
                        <Text style={[s.actionBtnText, { color: C.red }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ height: 40 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Event Modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.dragHandle} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>{editing ? 'Edit Event' : 'New Event'}</Text>
                <Text style={s.modalSubtitle}>{editing ? 'Update event details' : 'Fill in event details'}</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setModal(false)}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={s.formLabel}>Event Title *</Text>
              <View style={s.inputRow}>
                <View style={s.inputIconLeft}>
                  <Feather name="type" size={16} color={C.textMuted} />
                </View>
                <TextInput
                  style={[s.formInput, s.inputWithIcon]}
                  placeholder="e.g. Pay electricity bill"
                  placeholderTextColor={C.textMuted}
                  value={form.title}
                  onChangeText={v => setForm({ ...form, title: v })}
                />
              </View>

              <Text style={s.formLabel}>Start Time</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setStartMode('date')} activeOpacity={0.7}>
                <View style={s.inputIconLeft}>
                  <Feather name="calendar" size={16} color={C.textMuted} />
                </View>
                <View style={[s.formInput, s.inputWithIcon, { justifyContent: 'center' }]}>
                  <Text style={{ color: form.start_time ? C.textPrimary : C.textMuted, fontSize: 15 }}>
                    {form.start_time ? new Date(form.start_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Select Date & Time'}
                  </Text>
                </View>
              </TouchableOpacity>
              {startMode !== null && Platform.OS === 'ios' && (
                <View style={{ backgroundColor: C.inputBg, borderRadius: 14, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
                    <TouchableOpacity onPress={() => setStartMode(null)}>
                      <Text style={{ color: C.primary, fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={form.start_time ? new Date(form.start_time) : new Date()}
                    mode="datetime"
                    display="spinner"
                    onChange={onStartChange}
                    themeVariant={isDark ? 'dark' : 'light'}
                    textColor={C.textPrimary}
                  />
                </View>
              )}
              {startMode !== null && Platform.OS === 'android' && (
                <DateTimePicker
                  value={form.start_time ? new Date(form.start_time) : new Date()}
                  mode={startMode}
                  display="default"
                  onChange={onStartChange}
                />
              )}

              <Text style={s.formLabel}>End Time</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setEndMode('date')} activeOpacity={0.7}>
                <View style={s.inputIconLeft}>
                  <Feather name="clock" size={16} color={C.textMuted} />
                </View>
                <View style={[s.formInput, s.inputWithIcon, { justifyContent: 'center' }]}>
                  <Text style={{ color: form.end_time ? C.textPrimary : C.textMuted, fontSize: 15 }}>
                    {form.end_time ? new Date(form.end_time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Select Date & Time'}
                  </Text>
                </View>
              </TouchableOpacity>
              {endMode !== null && Platform.OS === 'ios' && (
                <View style={{ backgroundColor: C.inputBg, borderRadius: 14, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
                    <TouchableOpacity onPress={() => setEndMode(null)}>
                      <Text style={{ color: C.primary, fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={form.end_time ? new Date(form.end_time) : new Date()}
                    mode="datetime"
                    display="spinner"
                    onChange={onEndChange}
                    themeVariant={isDark ? 'dark' : 'light'}
                    textColor={C.textPrimary}
                  />
                </View>
              )}
              {endMode !== null && Platform.OS === 'android' && (
                <DateTimePicker
                  value={form.end_time ? new Date(form.end_time) : new Date()}
                  mode={endMode}
                  display="default"
                  onChange={onEndChange}
                />
              )}

              <Text style={s.formLabel}>Amount (Optional)</Text>
              <View style={s.inputRow}>
                <View style={s.inputIconLeft}>
                  <Feather name="dollar-sign" size={16} color={C.textMuted} />
                </View>
                <TextInput
                  style={[s.formInput, s.inputWithIcon]}
                  placeholder="e.g. 50"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={form.amount}
                  onChangeText={v => setForm({ ...form, amount: v })}
                />
              </View>
              
              <Text style={s.formLabel}>Transaction Type</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[s.typeBtn, form.transaction_type === 'debit' && s.typeBtnActive]}
                  onPress={() => setForm({ ...form, transaction_type: 'debit' })}
                  activeOpacity={0.7}
                >
                  <Text style={[s.typeBtnText, form.transaction_type === 'debit' && s.typeBtnTextActive]}>Debit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeBtn, form.transaction_type === 'credit' && s.typeBtnActive]}
                  onPress={() => setForm({ ...form, transaction_type: 'credit' })}
                  activeOpacity={0.7}
                >
                  <Text style={[s.typeBtnText, form.transaction_type === 'credit' && s.typeBtnTextActive]}>Credit</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: (!['Bills', 'Food', 'Transport', 'Shopping'].includes(form.payment_category)) ? 10 : 20 }}>
                {['Bills', 'Food', 'Transport', 'Shopping', 'Other'].map(cat => {
                  const isActive = form.payment_category === cat || (cat === 'Other' && !['Bills', 'Food', 'Transport', 'Shopping'].includes(form.payment_category));
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.catPill, isActive && s.catPillActive]}
                      onPress={() => setForm({ ...form, payment_category: cat === 'Other' ? '' : cat })}
                    >
                      <Text style={[s.catPillText, isActive && s.catPillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {(!['Bills', 'Food', 'Transport', 'Shopping'].includes(form.payment_category)) && (
                <View style={s.inputRow}>
                  <View style={s.inputIconLeft}>
                    <Feather name="tag" size={16} color={C.textMuted} />
                  </View>
                  <TextInput
                    style={[s.formInput, s.inputWithIcon]}
                    placeholder="Enter custom category"
                    placeholderTextColor={C.textMuted}
                    value={['Bills', 'Food', 'Transport', 'Shopping'].includes(form.payment_category) ? '' : form.payment_category}
                    onChangeText={v => setForm({ ...form, payment_category: v })}
                  />
                </View>
              )}

              <Text style={s.formLabel}>Description</Text>
              <TextInput
                style={[s.formInput, { minHeight: 80, textAlignVertical: 'top', marginBottom: 20 }]}
                placeholder="Optional notes..."
                placeholderTextColor={C.textMuted}
                value={form.description}
                onChangeText={v => setForm({ ...form, description: v })}
                multiline
              />

              <Text style={s.formLabel}>Color</Text>
              <View style={s.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorSwatch, { backgroundColor: c }, form.color === c && s.colorSwatchActive]}
                    onPress={() => setForm({ ...form, color: c })}
                    activeOpacity={0.8}
                  >
                    {form.color === c && <Feather name="check" size={14} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name={editing ? 'check-circle' : 'plus-circle'} size={18} color="#fff" />
                      <Text style={s.saveBtnText}>{editing ? 'Update Event' : 'Save Event'}</Text>
                    </View>
                  )
                }
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  // Top Segment Control & Add Button
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  segmentControl: {
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 20, padding: 4,
    borderWidth: 1, borderColor: C.border,
  },
  segmentBtn: {
    paddingVertical: 8, paddingHorizontal: 20, borderRadius: 16,
  },
  segmentBtnActive: { backgroundColor: C.textPrimary },
  segmentText: { fontSize: 13, fontWeight: '700', color: C.textMuted },
  segmentTextActive: { color: C.bg },
  addBtnCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },

  // Today View Styles
  todayContainer: { paddingHorizontal: 20 },
  todayHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: 40, marginTop: 10,
  },
  todayDateWrap: { flex: 1 },
  todayWeekday: { fontSize: 16, color: C.textMuted, fontWeight: '500', marginBottom: -4 },
  todayHugeDate: { fontSize: 64, fontWeight: '500', color: C.textPrimary, lineHeight: 72 },
  todayMonthText: { fontSize: 50, fontWeight: '500', color: C.textPrimary, lineHeight: 56, marginTop: -8 },
  todayYearText: { fontSize: 18, fontWeight: '700', color: C.textMuted, marginTop: -4 },
  
  todayTimeWrap: { alignItems: 'flex-end', paddingBottom: 6 },
  todayTimeText: { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  todayTimeSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  tasksSection: { marginTop: 10 },
  tasksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  tasksTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  remindersPill: {
    backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
  },
  remindersText: { fontSize: 11, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase' },

  taskCard: {
    padding: 24, borderRadius: 28, borderTopLeftRadius: 36, borderBottomRightRadius: 36, marginBottom: 16,
    overflow: 'hidden',
  },
  taskCardTop: { marginBottom: 30 },
  taskCardTitle: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  taskCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  taskTimeVal: { fontSize: 20, fontWeight: '800' },
  taskTimeLbl: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  taskDurationPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    alignSelf: 'flex-end', marginBottom: 2,
  },
  taskDurationText: { fontSize: 12, fontWeight: '700' },

  emptyDaySubtext: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 20 },

  // Calendar View Styles
  calContainer: { paddingHorizontal: 20 },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, marginBottom: 24, marginTop: 10,
  },
  monthActive: { fontSize: 24, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  yearSubtext: { fontSize: 12, fontWeight: '600', color: C.textMuted, marginTop: -2 },
  monthMuted: { fontSize: 20, fontWeight: '700', color: C.textMuted + '60' },

  dayCardsList: { gap: 16 },
  dayCard: {
    flexDirection: 'row', borderRadius: 28, borderTopLeftRadius: 36, borderBottomRightRadius: 36, padding: 24, minHeight: 160,
    overflow: 'hidden',
  },
  dayCardLeft: {
    width: '35%', paddingRight: 10,
  },
  dayCardWeekday: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  dayCardNum: { fontSize: 50, fontWeight: '500', lineHeight: 54 },
  dayCardMonth: { fontSize: 32, fontWeight: '500', lineHeight: 36, marginTop: -8 },
  
  dayCardRight: {
    flex: 1, paddingLeft: 16,
    justifyContent: 'center', gap: 16,
  },
  timelineEvt: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineTimeBox: { width: 45 },
  timelineTimeText: { fontSize: 12, fontWeight: '600' },
  timelineBlock: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  timelineBlockText: { fontSize: 13, fontWeight: '700' },
  timelineAddBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  overlay: { flex: 1, backgroundColor: '#000000C0', justifyContent: 'flex-end' },
  
  decorativeBubble: {
    position: 'absolute', top: -40, right: -30,
    width: 140, height: 140, borderRadius: 70,
  },
  
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  modalSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { paddingHorizontal: 24, paddingTop: 20 },
  formLabel: {
    fontSize: 12, fontWeight: '700', color: C.textSecondary,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  formInput: {
    backgroundColor: C.inputBg, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14, color: C.textPrimary, fontSize: 15, marginBottom: 0,
  },
  inputRow: { position: 'relative', justifyContent: 'center', marginBottom: 20 },
  inputIconLeft: { position: 'absolute', left: 16, zIndex: 1 },
  inputWithIcon: { paddingLeft: 46 },
  
  typeBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  typeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  typeBtnTextActive: { color: '#fff' },

  catPill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    marginRight: 10,
  },
  catPillActive: { backgroundColor: C.primary, borderColor: C.primary },
  catPillText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  catPillTextActive: { color: '#fff' },

  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  colorSwatch: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.1 }] },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center', marginTop: 10,
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  statusBadge: {
    padding: 10, alignItems: 'center', justifyContent: 'center'
  },
  detailSection: {
    backgroundColor: C.bg, borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: C.border,
  },
  detailText: { fontSize: 14, color: C.textPrimary, lineHeight: 22 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border,
  },
  detailLabel: { fontSize: 14, color: C.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  evtTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  evtTime: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typePillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  detailActions: { gap: 12, marginTop: 10 },
  actionRowSplit: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
});
