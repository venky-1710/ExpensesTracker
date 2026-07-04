import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, format, isSameMonth, isSameDay,
  addMonths, subMonths, parseISO
} from 'date-fns';
import {
  FiChevronLeft, FiChevronRight, FiPlus, FiClock,
  FiTrash2, FiEdit2, FiCalendar, FiAlertCircle, FiX,
  FiDollarSign, FiCheckCircle, FiCreditCard
} from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  color: string;
  amount?: number;
  payment_category?: string;
  payment_method?: string;
  transaction_type?: 'debit' | 'credit';
  transaction_id?: string;
  is_paid?: boolean;
}

interface EventForm {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  color: string;
  amount: string;
  payment_category: string;
  payment_method: string;
  transaction_type: 'debit' | 'credit';
}

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  event: CalendarEvent | null;
}

interface DeleteConfirmState {
  open: boolean;
  event: CalendarEvent | null;
  deleting: boolean;
}

interface PayConfirmState {
  open: boolean;
  event: CalendarEvent | null;
  paying: boolean;
}

interface DateTimeParts {
  date: string;
  hour: string;
  minute: string;
  ampm: 'AM' | 'PM';
}

const safeParse = (str: string): Date => {
  if (!str) return new Date();
  try {
    // Remove timezone info so JS parses as local time
    const local = str.replace('Z', '').split('+')[0].split('.')[0];
    return parseISO(local);
  } catch {
    return new Date(str);
  }
};

const toLocalInput = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm");

const splitDateTime = (iso: string): DateTimeParts => {
  const d = safeParse(iso);
  const h24 = d.getHours();
  const ampm: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    date: format(d, 'yyyy-MM-dd'),
    hour: String(h12).padStart(2, '0'),
    minute: String(d.getMinutes()).padStart(2, '0'),
    ampm,
  };
};

const mergeDateTime = ({ date, hour, minute, ampm }: DateTimeParts): string => {
  let h = parseInt(hour, 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${date}T${String(h).padStart(2, '0')}:${minute}`;
};

const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const PAYMENT_CATEGORIES = [
  'Bills', 'Rent', 'EMI', 'Insurance', 'Subscription',
  'Groceries', 'Medical', 'Education', 'Utilities', 'Other',
];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Other'];

interface DateTimePickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  min?: string;
}

const DateTimePicker = ({ label, value, onChange, min }: DateTimePickerProps) => {
  const parts = splitDateTime(value || toLocalInput(new Date()));

  const update = (patch: Partial<DateTimeParts>) => {
    const merged = mergeDateTime({ ...parts, ...patch } as DateTimeParts);
    onChange(merged);
  };

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="flex items-center gap-2">
        <input type="date" className="flex-1 min-w-[120px] px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" value={parts.date} min={min} onChange={(e) => update({ date: e.target.value })} required />
        <select className="w-16 px-2 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-center text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none" value={parts.hour} onChange={(e) => update({ hour: e.target.value })}>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-gray-500 font-bold">:</span>
        <select className="w-16 px-2 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-center text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none" value={parts.minute} onChange={(e) => update({ minute: e.target.value })}>
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg gap-1 border border-gray-200 dark:border-gray-600">
          {(['AM', 'PM'] as const).map(p => (
            <button key={p} type="button" className={`px-2 py-1 text-xs font-bold rounded cursor-pointer transition-colors border-none ${parts.ampm === p ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`} onClick={() => update({ ampm: p })}>
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const BLANK_FORM: EventForm = {
  title: '', description: '', start_time: '', end_time: '', color: '#6366f1',
  amount: '', payment_category: '', payment_method: '', transaction_type: 'debit',
};

const CalendarView = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [currentDate, setCurrentDate]   = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents]             = useState<CalendarEvent[]>([]);
  const [loading, setLoading]           = useState<boolean>(true);
  const [error, setError]               = useState<string>('');

  // Handle deep-linking from notifications
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
        setSelectedDate(parsed);
      }
    }
  }, [location.search]);

  const [modal, setModal]         = useState<ModalState>({ open: false, mode: 'create', event: null });
  const [formData, setFormData]   = useState<EventForm>(BLANK_FORM);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError]   = useState<string>('');
  const [showPaymentSection, setShowPaymentSection] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false, event: null, deleting: false });
  const [payConfirm, setPayConfirm]       = useState<PayConfirmState>({ open: false, event: null, paying: false });
  const [undoState, setUndoState]         = useState<{ eventId: string | null; undoing: boolean }>({ eventId: null, undoing: false });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragEventRef = useRef<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/calendar');
      setEvents(res.data || []);
    } catch (err) {
      console.error('Failed to fetch events', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const openCreateModal = () => {
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(10, 0, 0, 0);
    setFormData({ ...BLANK_FORM, start_time: toLocalInput(start), end_time: toLocalInput(end) });
    setShowPaymentSection(false);
    setFormError('');
    setModal({ open: true, mode: 'create', event: null });
  };

  const openEditModal = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      title: evt.title,
      description: evt.description || '',
      start_time: toLocalInput(safeParse(evt.start_time)),
      end_time:   toLocalInput(safeParse(evt.end_time)),
      color: evt.color || '#6366f1',
      amount: evt.amount ? String(evt.amount) : '',
      payment_category: evt.payment_category || '',
      payment_method:   evt.payment_method   || '',
      transaction_type: evt.transaction_type  || 'debit',
    });
    setShowPaymentSection(!!evt.amount);
    setFormError('');
    setModal({ open: true, mode: 'edit', event: evt });
  };

  const closeModal = () => {
    setModal({ open: false, mode: 'create', event: null });
    setFormData(BLANK_FORM);
    setShowPaymentSection(false);
    setFormError('');
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeModal();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const startDt = safeParse(formData.start_time);
    const endDt   = safeParse(formData.end_time);
    if (endDt <= startDt) { setFormError('End time must be after start time.'); return; }

    setSubmitting(true);
    try {
      // ⚠️  Send local ISO strings — NO .toISOString() to avoid UTC shift
      const payload: any = {
        title:       formData.title,
        description: formData.description || null,
        start_time:  formData.start_time,    // local time string kept as-is
        end_time:    formData.end_time,
        color:       formData.color,
        status:      'pending',
      };
      if (showPaymentSection && formData.amount) {
        payload.amount           = parseFloat(formData.amount);
        payload.payment_category = formData.payment_category || null;
        payload.payment_method   = formData.payment_method   || null;
        payload.transaction_type = formData.transaction_type;
      }

      if (modal.mode === 'create') {
        const res = await api.post('/api/calendar', payload);
        setEvents(prev => [...prev, res.data]);
        window.dispatchEvent(new CustomEvent('calendar:eventCreated'));
      } else if (modal.event) {
        const res = await api.put(`/api/calendar/${modal.event.id}`, payload);
        setEvents(prev => prev.map(ev => ev.id === modal.event!.id ? res.data : ev));
      }
      closeModal();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Failed to save event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const promptDelete = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, event: evt, deleting: false });
  };

  const confirmDelete = async () => {
    const { event } = deleteConfirm;
    if (!event) return;
    setDeleteConfirm(prev => ({ ...prev, deleting: true }));
    setEvents(prev => prev.filter(p => p.id !== event.id));
    setDeleteConfirm({ open: false, event: null, deleting: false });
    try {
      await api.delete(`/api/calendar/${event.id}`);
    } catch {
      fetchEvents();
    }
  };

  const cancelDelete = () => setDeleteConfirm({ open: false, event: null, deleting: false });

  // ── Payment confirmation ────────────────────────────────────────────────
  const promptPayment = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setPayConfirm({ open: true, event: evt, paying: false });
  };

  const confirmPayment = async () => {
    const { event } = payConfirm;
    if (!event) return;
    setPayConfirm(prev => ({ ...prev, paying: true }));
    try {
      await api.post(`/api/calendar/${event.id}/mark-paid`);
      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, is_paid: true } : ev));
      window.dispatchEvent(new CustomEvent('calendar:eventCreated')); // refresh notifications
    } catch (err: any) {
      console.error('Mark-paid failed', err);
    } finally {
      setPayConfirm({ open: false, event: null, paying: false });
    }
  };

  const handleUndoPayment = async (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setUndoState({ eventId: evt.id, undoing: true });
    try {
      await api.post(`/api/calendar/${evt.id}/undo-paid`);
      setEvents(prev => prev.map(ev => ev.id === evt.id ? { ...ev, is_paid: false } : ev));
      window.dispatchEvent(new CustomEvent('calendar:eventCreated'));
    } catch (err: any) {
      console.error('Undo-paid failed', err);
    } finally {
      setUndoState({ eventId: null, undoing: false });
    }
  };

  const cancelPayment = () => setPayConfirm({ open: false, event: null, paying: false });

  // ── Drag & Drop ────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, evt: CalendarEvent) => {
    e.stopPropagation();
    setDraggingId(evt.id);
    dragEventRef.current = evt;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', evt.id);
  };

  const handleDragEnd = () => { setDraggingId(null); setDropTarget(null); dragEventRef.current = null; };
  const handleDragOver = (e: React.DragEvent, dateStr: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget(dateStr); };
  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDropTarget(null);
    const evt = dragEventRef.current;
    if (!evt) return;
    const oldStart  = safeParse(evt.start_time);
    const oldEnd    = safeParse(evt.end_time);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    const newStart  = new Date(targetDate);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);
    if (isSameDay(newStart, oldStart)) { setDraggingId(null); return; }
    const startISO = toLocalInput(newStart);
    const endISO   = toLocalInput(newEnd);
    setEvents(prev => prev.map(p => p.id === evt.id ? { ...p, start_time: startISO, end_time: endISO } : p));
    setSelectedDate(targetDate);
    setDraggingId(null);
    try {
      await api.put(`/api/calendar/${evt.id}`, { start_time: startISO, end_time: endISO });
    } catch {
      fetchEvents();
    }
  };

  // ── Calendar grid ──────────────────────────────────────────────────────
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(monthStart);
  const gridStart  = startOfWeek(monthStart);
  const gridEnd    = endOfWeek(monthEnd);

  const calendarRows: JSX.Element[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const week: JSX.Element[] = [];
    for (let i = 0; i < 7; i++) {
      const cellDay = day;
      const dateStr = format(cellDay, 'yyyy-MM-dd');
      const isOutside  = !isSameMonth(cellDay, monthStart);
      const isTodayCell = isSameDay(cellDay, new Date());
      const isSelected  = isSameDay(cellDay, selectedDate);
      const isDrop      = dropTarget === dateStr;
      const dayEvents   = events.filter(ev => isSameDay(safeParse(ev.start_time), cellDay));

      week.push(
        <div
          key={dateStr}
          className={`flex-1 flex flex-col p-1.5 lg:p-2 min-h-[80px] lg:min-h-[110px] border-r border-gray-200 dark:border-gray-700 last:border-r-0 transition-colors ${
            isOutside ? 'bg-gray-50/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750'
          } ${isTodayCell && !isSelected ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''} ${
            isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-inset ring-indigo-500' : ''
          } ${isDrop ? 'bg-indigo-100/50 dark:bg-indigo-800/40 ring-2 ring-inset ring-indigo-400' : ''}`}
          onClick={() => !isOutside && setSelectedDate(cellDay)}
          onDragOver={(e) => !isOutside && handleDragOver(e, dateStr)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => !isOutside && handleDrop(e, cellDay)}
        >
          <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${
            isTodayCell ? 'bg-indigo-500 text-white shadow-sm' : isSelected ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300' : ''
          }`}>{format(cellDay, 'd')}</span>
          <div className="flex flex-col gap-1 overflow-y-auto pr-1">
            {dayEvents.map(evt => (
              <div
                key={evt.id}
                className={`px-1.5 py-1 text-[11px] leading-tight font-medium rounded truncate cursor-grab active:cursor-grabbing hover:brightness-95 transition-all ${draggingId === evt.id ? 'opacity-50 scale-95' : ''}`}
                style={{ backgroundColor: evt.color + '22', borderLeft: `3px solid ${evt.color}`, color: evt.color }}
                draggable
                onDragStart={(e) => handleDragStart(e, evt)}
                onDragEnd={handleDragEnd}
                onClick={(e) => e.stopPropagation()}
                title={evt.title}
              >
                {evt.title}
                {evt.amount && !evt.is_paid && <span className="ml-1">💳</span>}
                {evt.is_paid && <span className="ml-1">✅</span>}
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    calendarRows.push(
      <div className="flex flex-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0" key={format(day, 'yyyy-MM-dd')}>
        {week}
      </div>
    );
  }

  const selectedDayEvents = events
    .filter(ev => isSameDay(safeParse(ev.start_time), selectedDate))
    .sort((a, b) => safeParse(a.start_time).getTime() - safeParse(b.start_time).getTime());

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="px-7 py-6 h-full flex flex-col gap-4 overflow-hidden animate-fade-in">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 m-0 mb-0.5">Calendar</h1>
        <p className="text-sm text-gray-500 m-0">Schedule and organize your financial events</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm flex-shrink-0">
          <FiAlertCircle size={16} />{error}
          <button className="ml-auto bg-red-500 hover:bg-red-600 text-white border-none rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors" onClick={fetchEvents}>Retry</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-[18px] flex-1 min-h-0">
        {/* ── Calendar grid ── */}
        <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col overflow-hidden min-w-0">
          <div className="flex justify-between items-center px-4.5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
            <h2 className="m-0 text-lg font-semibold text-gray-900 dark:text-gray-100">{format(currentDate, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-1.5">
              <button className="flex items-center justify-center p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-500 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white dark:hover:bg-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer leading-none" onClick={() => setCurrentDate(subMonths(currentDate, 1))} title="Previous month"><FiChevronLeft size={18} /></button>
              <button className="flex items-center justify-center px-3.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-500 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white dark:hover:bg-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer text-sm font-medium leading-none" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>Today</button>
              <button className="flex items-center justify-center p-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-500 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white dark:hover:bg-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer leading-none" onClick={() => setCurrentDate(addMonths(currentDate, 1))} title="Next month"><FiChevronRight size={18} /></button>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 text-sm">
              <div className="w-7 h-7 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
              <span>Loading events…</span>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="flex-1 text-center py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>)}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">{calendarRows}</div>
            </div>
          )}
        </div>

        {/* ── Side panel ── */}
        <div className="w-full lg:w-[320px] xl:w-[360px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-4 flex-shrink-0">
            <div className="flex items-center gap-2.5 text-gray-900 dark:text-gray-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><FiCalendar size={18} /></div>
              <h3 className="m-0 text-base font-semibold">{format(selectedDate, 'EEEE, MMM d')}</h3>
            </div>
            <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 dark:bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer border-none" onClick={openCreateModal}><FiPlus size={16} /> Add Event</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center text-gray-300"><FiCalendar size={28} /></div>
                <p className="m-0 text-sm font-medium">No events for this day</p>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors" onClick={openCreateModal}><FiPlus size={14} /> Add event</button>
              </div>
            ) : selectedDayEvents.map(evt => (
              <div key={evt.id} className="relative flex flex-col p-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden pl-5">
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: evt.color }} />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="m-0 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">{evt.title}</h4>
                    <p className="m-0 text-[13px] text-gray-500 flex items-center gap-1.5 mb-1.5">
                      <FiClock size={11} className="text-gray-400" />
                      {format(safeParse(evt.start_time), 'h:mm a')} – {format(safeParse(evt.end_time), 'h:mm a')}
                    </p>
                    {evt.description && <p className="m-0 text-xs text-gray-400 leading-relaxed truncate mb-1.5">{evt.description}</p>}

                    {/* Payment badge */}
                    {evt.amount && (
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${
                        evt.is_paid
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : evt.transaction_type === 'credit'
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        {evt.is_paid ? <FiCheckCircle size={11} />
                          : evt.transaction_type === 'credit' ? <span>📥</span>
                          : <FiCreditCard size={11} />}
                        ₹{evt.amount.toLocaleString()}
                        {evt.payment_method && <span className="opacity-70">· {evt.payment_method}</span>}
                        {evt.is_paid
                          ? ` · ${evt.transaction_type === 'credit' ? 'Received ✓' : 'Paid ✓'}`
                          : evt.transaction_type === 'credit' ? ' · Income' : ' · Due'}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button className="w-7 h-7 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 flex items-center justify-center border-none cursor-pointer transition-colors" onClick={(e) => openEditModal(evt, e)} title="Edit event"><FiEdit2 size={14} /></button>
                    <button className="w-7 h-7 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 flex items-center justify-center border-none cursor-pointer transition-colors" onClick={(e) => promptDelete(evt, e)} title="Delete event"><FiTrash2 size={14} /></button>
                  </div>
                </div>

                {/* Mark as Paid/Received CTA — shown on unpaid events */}
                {evt.amount && !evt.is_paid && (
                  <button
                    onClick={(e) => promptPayment(evt, e)}
                    className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white border-none cursor-pointer transition-colors shadow-sm ${
                      evt.transaction_type === 'credit'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-emerald-500 hover:bg-emerald-600'
                    }`}
                  >
                    <FiCheckCircle size={13} />
                    {evt.transaction_type === 'credit' ? '📥 Mark as Received' : '✅ Mark as Paid'}
                  </button>
                )}

                {/* Undo Payment CTA */}
                {evt.amount && evt.is_paid && (
                  <button
                    onClick={(e) => handleUndoPayment(evt, e)}
                    disabled={undoState.eventId === evt.id && undoState.undoing}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 border-none cursor-pointer transition-colors disabled:opacity-60"
                  >
                    <FiX size={13} />
                    {undoState.eventId === evt.id && undoState.undoing ? 'Undoing...' : 'Undo Payment'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Create / Edit Modal ─────────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={handleOverlayClick}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <h3 className="m-0 text-lg font-bold text-gray-900 dark:text-gray-100">{modal.mode === 'edit' ? 'Edit Event' : 'New Event'}</h3>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 border-none cursor-pointer transition-colors" onClick={closeModal} type="button"><FiX size={18} /></button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Event Title *</label>
                <input type="text" placeholder="e.g. Pay electricity bill" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" autoFocus />
              </div>

              <DateTimePicker label="Start Date & Time" value={formData.start_time} onChange={(v) => setFormData({ ...formData, start_time: v })} />
              <DateTimePicker label="End Date & Time"   value={formData.end_time}   min={formData.start_time?.split('T')[0]} onChange={(v) => setFormData({ ...formData, end_time: v })} />

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                <textarea placeholder="Optional notes…" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[70px] resize-y" />
              </div>

              {/* Color */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Label Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#06b6d4'].map(c => (
                    <button key={c} type="button" className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${formData.color === c ? 'border-gray-800 dark:border-white shadow-sm ring-2 ring-white dark:ring-gray-800' : 'border-transparent'}`} style={{ background: c }} onClick={() => setFormData({ ...formData, color: c })} title={c} />
                  ))}
                  <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-8 h-8 p-0 border-none rounded-full cursor-pointer overflow-hidden opacity-80 hover:opacity-100 transition-opacity" title="Custom color" />
                </div>
              </div>

              {/* ── Payment section toggle ── */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentSection(!showPaymentSection)}
                  className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors border-none bg-transparent cursor-pointer p-0"
                >
                  <FiDollarSign size={15} />
                  {showPaymentSection ? '− Remove Payment Details' : '+ Add Payment Amount (optional)'}
                </button>

                {showPaymentSection && (
                  <div className="mt-3 p-4 bg-indigo-50/60 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/40 flex flex-col gap-3">

                    {/* Transaction type toggle */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Transaction Type</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, transaction_type: 'debit' })}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border-none cursor-pointer transition-all ${
                            formData.transaction_type === 'debit'
                              ? 'bg-red-500 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          📤 Debit (Expense)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, transaction_type: 'credit' })}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border-none cursor-pointer transition-all ${
                            formData.transaction_type === 'credit'
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          📥 Credit (Income)
                        </button>
                      </div>
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 m-0">
                        {formData.transaction_type === 'credit'
                          ? '💰 A credit (income) transaction will be auto-created when confirmed.'
                          : '💳 A debit (expense) transaction will be auto-created when confirmed.'}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Amount (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="e.g. 1500"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>

                    {/* Category */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Category</label>
                      <input
                        type="text"
                        list="payment-categories-list"
                        value={formData.payment_category}
                        onChange={(e) => setFormData({ ...formData, payment_category: e.target.value })}
                        placeholder="Select or type a category"
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        autoComplete="off"
                      />
                      <datalist id="payment-categories-list">
                        {Array.from(new Set([...PAYMENT_CATEGORIES, ...(user?.custom_categories || [])])).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </datalist>
                    </div>

                    {/* Payment method */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Payment Method</label>
                      <input
                        type="text"
                        list="payment-methods-list"
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        placeholder="Select or type a method"
                        className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        autoComplete="off"
                      />
                      <datalist id="payment-methods-list">
                        {Array.from(new Set([...PAYMENT_METHODS, ...(user?.custom_payment_methods || [])])).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                )}
              </div>

              {formError && <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30"><FiAlertCircle size={16} /> {formError}</div>}

              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" className="px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors" onClick={closeModal} disabled={submitting}>Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white border-none rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed" disabled={submitting}>
                  {submitting ? 'Saving…' : modal.mode === 'edit' ? 'Update Event' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ────────────────────────────────────────── */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && cancelDelete()}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-[360px] rounded-2xl shadow-xl overflow-hidden animate-slide-up flex flex-col items-center text-center p-7">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-4"><FiTrash2 size={24} /></div>
            <h3 className="m-0 mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">Delete Event?</h3>
            <p className="m-0 mb-6 text-sm text-gray-500 leading-relaxed">
              Are you sure you want to delete <strong>"{deleteConfirm.event?.title}"</strong>?<br />This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors" onClick={cancelDelete} disabled={deleteConfirm.deleting}>Keep Event</button>
              <button className="flex-1 flex justify-center items-center gap-1.5 py-2.5 bg-red-500 text-white border-none rounded-lg text-sm font-semibold hover:bg-red-600 shadow-sm shadow-red-500/20 cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed" onClick={confirmDelete} disabled={deleteConfirm.deleting}>
                <FiTrash2 size={14} />{deleteConfirm.deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Confirm Modal ───────────────────────────────────────── */}
      {payConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && cancelPayment()}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-[400px] rounded-2xl shadow-xl overflow-hidden animate-slide-up flex flex-col items-center text-center p-7">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 text-2xl ${payConfirm.event?.transaction_type === 'credit' ? 'bg-green-100 dark:bg-green-900/30 text-green-500' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'}`}>
              {payConfirm.event?.transaction_type === 'credit' ? '📥' : '💳'}
            </div>
            <h3 className="m-0 mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">
              {payConfirm.event?.transaction_type === 'credit' ? 'Confirm Income' : 'Confirm Payment'}
            </h3>
            <p className="m-0 mb-2 text-sm text-gray-500">
              {payConfirm.event?.transaction_type === 'credit' ? 'Did you receive ' : 'Did you pay for '}<strong>"{payConfirm.event?.title}"</strong>?
            </p>
            {payConfirm.event?.amount && (
              <div className={`mb-5 px-4 py-2 rounded-xl border ${payConfirm.event?.transaction_type === 'credit' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/40' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40'}`}>
                <span className={`text-2xl font-bold ${payConfirm.event?.transaction_type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-emerald-600 dark:text-emerald-400'}`}>₹{payConfirm.event.amount.toLocaleString()}</span>
                {payConfirm.event.payment_method && <p className={`text-xs m-0 mt-0.5 ${payConfirm.event?.transaction_type === 'credit' ? 'text-green-600 dark:text-green-500' : 'text-emerald-600 dark:text-emerald-500'}`}>via {payConfirm.event.payment_method}</p>}
              </div>
            )}
            <p className="m-0 mb-6 text-xs text-gray-400 leading-relaxed">
              Confirming will add a <strong>{payConfirm.event?.transaction_type === 'credit' ? 'credit (income)' : 'debit (expense)'} transaction</strong> of this amount to your records and reflect on the dashboard.
            </p>
            <div className="flex gap-3 w-full">
              <button className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors" onClick={cancelPayment} disabled={payConfirm.paying}>Not Yet</button>
              <button
                className={`flex-1 flex justify-center items-center gap-1.5 py-2.5 text-white border-none rounded-lg text-sm font-semibold shadow-sm cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${payConfirm.event?.transaction_type === 'credit' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
                onClick={confirmPayment}
                disabled={payConfirm.paying}
              >
                <FiCheckCircle size={14} />{payConfirm.paying ? 'Recording…' : (payConfirm.event?.transaction_type === 'credit' ? 'Yes, Received!' : 'Yes, I Paid!')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
