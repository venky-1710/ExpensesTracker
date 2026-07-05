import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { calendarService } from '../../services/calendarService';
import Toast from 'react-native-toast-message';
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
  const { C } = useAppTheme();
  const s = getStyles(C);
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
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
      start_time: start.toISOString().slice(0, 16),
      end_time: end.toISOString().slice(0, 16),
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

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Calendar</Text>
            <Text style={s.subtitle}>Schedule financial events</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openCreate} activeOpacity={0.8}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.addBtnText}>Event</Text>
          </TouchableOpacity>
        </View>

        {/* Month Nav */}
        <View style={s.monthNav}>
          <TouchableOpacity style={s.navBtn} onPress={prevMonth} activeOpacity={0.7}>
            <Feather name="chevron-left" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={s.monthCenter}>
            <Text style={s.monthText}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={goToday} style={s.todayPill}>
              <Text style={s.todayLink}>Today</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.navBtn} onPress={nextMonth} activeOpacity={0.7}>
            <Feather name="chevron-right" size={20} color={C.textPrimary} />
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
            const dayEvts = events.filter(ev => isSameDay(parseEvtDate(ev.start_time), item.date));

            return (
              <TouchableOpacity
                key={`day-${i}`}
                style={[
                  s.dayCell,
                  isSelected && s.dayCellSelected,
                  isToday && !isSelected && s.dayCellToday,
                  !isCurrentMonth && s.dayCellMuted,
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
                  !isCurrentMonth && !isSelected && s.dayNumMuted,
                ]}>
                  {item.day}
                </Text>
                {dayEvts.slice(0, 2).map((ev, j) => (
                  <View key={j} style={[s.evtDot, { backgroundColor: ev.color || '#6366f1', opacity: isCurrentMonth ? 1 : 0.3 }]} />
                ))}
                {dayEvts.length > 2 && (
                  <Text style={[s.moreText, !isCurrentMonth && { opacity: 0.3 }]}>+{dayEvts.length - 2}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Events */}
        <View style={s.sidebar}>
          <View style={s.sidebarHeader}>
            <View>
              <Text style={s.sidebarDate}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              {selectedDayEvents.length > 0 && (
                <Text style={s.sidebarCount}>{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}</Text>
              )}
            </View>
            <TouchableOpacity style={s.sidebarAddBtn} onPress={openCreate} activeOpacity={0.8}>
              <Feather name="plus" size={14} color={C.primary} />
              <Text style={s.sidebarAddText}>Add</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={C.primary} style={{ margin: 20 }} />
          ) : selectedDayEvents.length === 0 ? (
            <View style={s.emptyDay}>
              <View style={s.emptyDayIconBox}>
                <Feather name="calendar" size={24} color={C.textMuted} />
              </View>
              <Text style={s.emptyDayText}>No events scheduled</Text>
              <Text style={s.emptyDaySubtext}>Tap + Add to create one</Text>
            </View>
          ) : (
            selectedDayEvents.map(ev => (
              <TouchableOpacity 
                key={ev.id} 
                style={[s.evtCard, { borderLeftColor: ev.color || '#6366f1' }]}
                onPress={() => openDetail(ev)}
                activeOpacity={0.7}
              >
                <View style={[s.evtColorDot, { backgroundColor: ev.color || '#6366f1' }]} />
                <View style={s.evtContent}>
                  <Text style={s.evtTitle}>{ev.title}</Text>
                  <View style={s.evtTimeRow}>
                    <Feather name="clock" size={12} color={C.textMuted} />
                    <Text style={s.evtTime}>{formatTime(ev.start_time)} – {formatTime(ev.end_time)}</Text>
                  </View>
                  {ev.description ? <Text style={s.evtDesc} numberOfLines={2}>{ev.description}</Text> : null}
                </View>
                {ev.amount != null && (
                  <View style={s.statusBadge}>
                    <Feather name={ev.is_paid ? 'check-circle' : 'circle'} size={14} color={ev.is_paid ? C.green : C.amber} />
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
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
              <View style={s.inputRow}>
                <View style={s.inputIconLeft}>
                  <Feather name="calendar" size={16} color={C.textMuted} />
                </View>
                <TextInput
                  style={[s.formInput, s.inputWithIcon]}
                  placeholder="2026-01-15T09:00"
                  placeholderTextColor={C.textMuted}
                  value={form.start_time}
                  onChangeText={v => setForm({ ...form, start_time: v })}
                />
              </View>

              <Text style={s.formLabel}>End Time</Text>
              <View style={s.inputRow}>
                <View style={s.inputIconLeft}>
                  <Feather name="clock" size={16} color={C.textMuted} />
                </View>
                <TextInput
                  style={[s.formInput, s.inputWithIcon]}
                  placeholder="2026-01-15T10:00"
                  placeholderTextColor={C.textMuted}
                  value={form.end_time}
                  onChangeText={v => setForm({ ...form, end_time: v })}
                />
              </View>

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

              <Text style={s.formLabel}>Description</Text>
              <TextInput
                style={[s.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 4 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14,
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: 12,
  },
  navBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
  },
  monthCenter: { alignItems: 'center', gap: 6 },
  monthText: { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: 0.5 },
  todayPill: {
    backgroundColor: C.primary + '18', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10,
  },
  todayLink: { fontSize: 11, color: C.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  dayHeaders: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 },
  dayHeader: {
    flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800',
    color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  dayCell: {
    width: '14.28%', aspectRatio: 0.85, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10,
    borderRadius: 14, gap: 3,
  },
  dayCellMuted: { opacity: 0.35 },
  dayCellToday: { borderWidth: 1.5, borderColor: C.primary + '60', backgroundColor: C.primary + '10' },
  dayCellSelected: {
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    opacity: 1,
  },
  dayNum: { fontSize: 15, fontWeight: '700', color: C.textMuted },
  dayNumMuted: { color: C.textMuted + '80' },
  dayNumToday: { color: C.primary, fontWeight: '800' },
  dayNumSelected: { color: '#fff', fontWeight: '800' },
  evtDot: { width: 5, height: 5, borderRadius: 3 },
  moreText: { fontSize: 9, color: C.textMuted, fontWeight: '800' },

  sidebar: {
    flex: 1, marginTop: 20,
    backgroundColor: C.card,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 120,
    borderTopWidth: 1, borderColor: C.border,
  },
  sidebarHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20,
  },
  sidebarDate: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  sidebarCount: { fontSize: 12, color: C.textMuted, marginTop: 3, fontWeight: '500' },
  sidebarAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.primary + '18', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12,
  },
  sidebarAddText: { color: C.primary, fontWeight: '700', fontSize: 13 },

  emptyDay: { padding: 36, alignItems: 'center', gap: 10 },
  emptyDayIconBox: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyDayText: { fontSize: 15, color: C.textPrimary, fontWeight: '700' },
  emptyDaySubtext: { fontSize: 13, color: C.textMuted },

  evtCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: C.bg, borderRadius: 18,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  evtColorDot: { display: 'none', width: 0 },
  evtContent: { flex: 1 },
  evtTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, marginBottom: 5 },
  evtTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  evtTime: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  evtDesc: { fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 18 },
  evtBtns: { gap: 8, marginLeft: 12 },
  evtIconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },

  overlay: { flex: 1, backgroundColor: '#000000C0', justifyContent: 'flex-end' },
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
    backgroundColor: C.border + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { paddingHorizontal: 24, paddingTop: 20 },
  formLabel: {
    fontSize: 12, fontWeight: '700', color: C.textSecondary,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  formInput: {
    backgroundColor: C.inputBg, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14, color: C.textPrimary, fontSize: 15, marginBottom: 20,
  },
  inputRow: { position: 'relative', justifyContent: 'center', marginBottom: 0 },
  inputIconLeft: { position: 'absolute', left: 16, zIndex: 1 },
  inputWithIcon: { paddingLeft: 46 },
  
  typeBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  typeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  typeBtnTextActive: { color: '#fff' },

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
    paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border + '50',
  },
  detailLabel: { fontSize: 14, color: C.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
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
