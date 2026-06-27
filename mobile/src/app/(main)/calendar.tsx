import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calendarService } from '../../services/calendarService';
import Toast from 'react-native-toast-message';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';

// Theme is loaded dynamically from ThemeContext


// ── Date helpers ────────────────────────────────────────────────
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

const BLANK_FORM = { title: '', description: '', start_time: '', end_time: '', color: '#6366f1' };

export default function CalendarScreen() {
  const { C } = useAppTheme();
  const s = getStyles(C);
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await calendarService.getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) { console.error('Calendar load error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const days: { day: number, type: 'prev' | 'current' | 'next', date: Date }[] = [];
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      type: 'prev',
      date: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i)
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      type: 'current',
      date: new Date(currentYear, currentMonth, i)
    });
  }
  // Next month days
  let nextDay = 1;
  while (days.length < 42) {
    days.push({
      day: nextDay,
      type: 'next',
      date: new Date(currentYear, currentMonth + 1, nextDay)
    });
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

  const getEventsForDay = (day: number) => {
    const target = new Date(currentYear, currentMonth, day);
    return events.filter(ev => isSameDay(parseEvtDate(ev.start_time), target));
  };

  const selectedDayEvents = events
    .filter(ev => isSameDay(parseEvtDate(ev.start_time), selectedDate))
    .sort((a, b) => parseEvtDate(a.start_time).getTime() - parseEvtDate(b.start_time).getTime());

  const openCreate = () => {
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(10, 0, 0, 0);
    setEditing(null);
    setForm({
      title: '', description: '',
      start_time: start.toISOString().slice(0, 16),
      end_time: end.toISOString().slice(0, 16),
      color: '#6366f1',
    });
    setModal(true);
  };

  const openEdit = (ev: any) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      start_time: parseEvtDate(ev.start_time).toISOString().slice(0, 16),
      end_time: parseEvtDate(ev.end_time).toISOString().slice(0, 16),
      color: ev.color || '#6366f1',
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

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Calendar</Text>
            <Text style={s.subtitle}>Schedule financial events</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openCreate}>
            <Text style={s.addBtnText}>+ Event</Text>
          </TouchableOpacity>
        </View>

        {/* Month Nav */}
        <View style={s.monthNav}>
          <TouchableOpacity style={s.navBtn} onPress={prevMonth}>
            <Text style={s.navBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={s.monthCenter}>
            <Text style={s.monthText}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={goToday}>
              <Text style={s.todayLink}>Today</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.navBtn} onPress={nextMonth}>
            <Text style={s.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={s.dayHeaders}>
          {DAYS.map(d => (
            <Text key={d} style={s.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={s.grid}>
          {days.map((item, i) => {
            const isToday = isSameDay(item.date, now);
            const isSelected = isSameDay(item.date, selectedDate);
            const isCurrentMonth = item.type === 'current';
            // We still only show events for current month in this view for simplicity, or we can fetch them?
            // calendarService.getEvents() gets all, so we can just check isSameDay for any event.
            const dayEvts = events.filter(ev => isSameDay(parseEvtDate(ev.start_time), item.date));

            return (
              <TouchableOpacity
                key={`day-${i}`}
                style={[
                  s.dayCell, 
                  isSelected && s.dayCellSelected, 
                  isToday && !isSelected && s.dayCellToday,
                  !isCurrentMonth && s.dayCellMuted
                ]}
                onPress={() => {
                  if (item.type === 'prev') prevMonth();
                  if (item.type === 'next') nextMonth();
                  setSelectedDate(item.date);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  s.dayNum, 
                  isSelected && s.dayNumSelected, 
                  isToday && !isSelected && s.dayNumToday,
                  !isCurrentMonth && !isSelected && s.dayNumMuted
                ]}>
                  {item.day}
                </Text>
                {dayEvts.slice(0, 2).map((ev, j) => (
                  <View key={j} style={[s.evtDot, { backgroundColor: ev.color || '#6366f1', opacity: isCurrentMonth ? 1 : 0.3 }]} />
                ))}
                {dayEvts.length > 2 && <Text style={[s.moreText, !isCurrentMonth && { opacity: 0.3 }]}>+{dayEvts.length - 2}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Events */}
        <View style={s.sidebar}>
          <View style={s.sidebarHeader}>
            <Text style={s.sidebarDate}>
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <TouchableOpacity style={s.sidebarAddBtn} onPress={openCreate}>
              <Text style={s.sidebarAddText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#6d4aff" style={{ margin: 20 }} />
          ) : selectedDayEvents.length === 0 ? (
            <View style={s.emptyDay}>
              <Text style={s.emptyDayIcon}>📅</Text>
              <Text style={s.emptyDayText}>No events for this day</Text>
            </View>
          ) : (
            selectedDayEvents.map(ev => (
              <View key={ev.id} style={[s.evtCard, { borderLeftColor: ev.color || '#6366f1' }]}>
                <View style={s.evtContent}>
                  <Text style={s.evtTitle}>{ev.title}</Text>
                  <Text style={s.evtTime}>
                    🕐 {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                  </Text>
                  {ev.description ? <Text style={s.evtDesc}>{ev.description}</Text> : null}
                </View>
                <View style={s.evtBtns}>
                  <TouchableOpacity style={s.evtEditBtn} onPress={() => openEdit(ev)}>
                    <Text style={s.evtEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.evtDelBtn} onPress={() => handleDelete(ev)}>
                    <Text style={s.evtDelText}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Event Modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Edit Event' : 'New Event'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              <Text style={s.formLabel}>Title *</Text>
              <TextInput
                style={s.formInput}
                placeholder="e.g. Pay electricity bill"
                placeholderTextColor="#475569"
                value={form.title}
                onChangeText={v => setForm({ ...form, title: v })}
              />

              <Text style={s.formLabel}>Start (YYYY-MM-DDTHH:mm)</Text>
              <TextInput
                style={s.formInput}
                placeholder="2026-01-15T09:00"
                placeholderTextColor="#475569"
                value={form.start_time}
                onChangeText={v => setForm({ ...form, start_time: v })}
              />

              <Text style={s.formLabel}>End (YYYY-MM-DDTHH:mm)</Text>
              <TextInput
                style={s.formInput}
                placeholder="2026-01-15T10:00"
                placeholderTextColor="#475569"
                value={form.end_time}
                onChangeText={v => setForm({ ...form, end_time: v })}
              />

              <Text style={s.formLabel}>Description</Text>
              <TextInput
                style={[s.formInput, { minHeight: 72, textAlignVertical: 'top' }]}
                placeholder="Optional notes..."
                placeholderTextColor="#475569"
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
                  />
                ))}
              </View>

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>{editing ? 'Update Event' : 'Save Event'}</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 4 },
  addBtn: {
    backgroundColor: C.primary, paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 20, 
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 8,
    marginBottom: 12,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderRadius: 22 },
  navBtnText: { fontSize: 20, color: C.textPrimary, fontWeight: '600' },
  monthCenter: { alignItems: 'center', gap: 4 },
  monthText: { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: 0.5 },
  todayLink: { fontSize: 12, color: C.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  dayHeaders: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  dayCell: {
    width: '14.28%', aspectRatio: 0.85, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10,
    borderRadius: 16, gap: 4,
  },
  dayCellMuted: { opacity: 0.4 },
  dayCellToday: { borderWidth: 1, borderColor: C.primary + '50', backgroundColor: C.primary + '10' },
  dayCellSelected: { 
    backgroundColor: C.primary, 
    shadowColor: C.primary, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
    opacity: 1, // ensure selected next-month days are fully visible
  },
  dayNum: { fontSize: 15, fontWeight: '700', color: C.textMuted },
  dayNumMuted: { color: C.textMuted + '80' },
  dayNumToday: { color: C.primary, fontWeight: '800' },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  evtDot: { width: 6, height: 6, borderRadius: 3 },
  moreText: { fontSize: 9, color: C.textMuted, fontWeight: '800' },

  sidebar: {
    flex: 1,
    marginTop: 24,
    backgroundColor: C.card,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120, // pad for bottom nav
  },
  sidebarHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  sidebarDate: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  sidebarAddBtn: {
    backgroundColor: C.primary + '15', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14,
  },
  sidebarAddText: { color: C.primary, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  emptyDay: { padding: 40, alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 24 },
  emptyDayIcon: { fontSize: 40 },
  emptyDayText: { fontSize: 14, color: C.textMuted, fontWeight: '500' },

  evtCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
    backgroundColor: C.bg, borderRadius: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  evtContent: { flex: 1 },
  evtTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  evtTime: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  evtDesc: { fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 18 },
  evtBtns: { gap: 8, marginLeft: 12 },
  evtEditBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.primary + '15', borderRadius: 10, alignItems: 'center',
  },
  evtEditText: { color: C.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  evtDelBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: C.red + '15', borderRadius: 10, alignItems: 'center',
  },
  evtDelText: { color: C.red, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  overlay: { flex: 1, backgroundColor: '#000000C0', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  modalClose: { fontSize: 20, color: C.textMuted, fontWeight: '800' },
  modalBody: { paddingHorizontal: 24, paddingTop: 8 },
  formLabel: { fontSize: 12, fontWeight: '700', color: C.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  formInput: {
    backgroundColor: C.inputBg, borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16, color: C.textPrimary, fontSize: 15, marginBottom: 20,
  },
  colorRow: { flexDirection: 'row', gap: 14, marginBottom: 24, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', marginTop: 10,
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
});
