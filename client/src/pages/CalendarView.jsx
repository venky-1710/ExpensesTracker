import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, format, isSameMonth, isSameDay,
    addMonths, subMonths, parseISO
} from 'date-fns';
import {
    FiChevronLeft, FiChevronRight, FiPlus, FiClock,
    FiTrash2, FiEdit2, FiCalendar, FiAlertCircle, FiX
} from 'react-icons/fi';
import api from '../services/api';
import './CalendarView.css';

// Safe ISO parser — handles both "2026-04-12T09:00" and "2026-04-12T09:00:00.000Z"
const safeParse = (str) => {
    if (!str) return new Date();
    try {
        const normalized = str.length === 16 ? str + ':00' : str;
        return parseISO(normalized);
    } catch {
        return new Date(str);
    }
};

const toLocalInput = (date) => format(date, "yyyy-MM-dd'T'HH:mm");

// Split a "yyyy-MM-ddTHH:mm" string into date/hour/minute/ampm parts
const splitDateTime = (iso) => {
    const d = safeParse(iso);
    const h24 = d.getHours();
    const ampm = h24 < 12 ? 'AM' : 'PM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return {
        date: format(d, 'yyyy-MM-dd'),
        hour: String(h12).padStart(2, '0'),
        minute: String(d.getMinutes()).padStart(2, '0'),
        ampm,
    };
};

// Merge date/hour/minute/ampm parts back to "yyyy-MM-ddTHH:mm"
const mergeDateTime = ({ date, hour, minute, ampm }) => {
    let h = parseInt(hour, 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${date}T${String(h).padStart(2, '0')}:${minute}`;
};

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

// ── Custom Date+Time Picker ───────────────────────────────────
const DateTimePicker = ({ label, value, onChange, min }) => {
    const parts = splitDateTime(value || toLocalInput(new Date()));

    const update = (patch) => {
        const merged = mergeDateTime({ ...parts, ...patch });
        onChange(merged);
    };

    return (
        <div className="dtp-wrapper">
            <label className="evt-label">{label}</label>
            <div className="dtp-row">
                {/* Date */}
                <input
                    type="date"
                    className="dtp-date evt-input"
                    value={parts.date}
                    min={min}
                    onChange={(e) => update({ date: e.target.value })}
                    required
                />
                {/* Hour */}
                <select
                    className="dtp-select"
                    value={parts.hour}
                    onChange={(e) => update({ hour: e.target.value })}
                >
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="dtp-colon">:</span>
                {/* Minute */}
                <select
                    className="dtp-select"
                    value={parts.minute}
                    onChange={(e) => update({ minute: e.target.value })}
                >
                    {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {/* AM/PM */}
                <div className="dtp-ampm">
                    {['AM', 'PM'].map(p => (
                        <button
                            key={p}
                            type="button"
                            className={`dtp-ampm-btn${parts.ampm === p ? ' active' : ''}`}
                            onClick={() => update({ ampm: p })}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const BLANK_FORM = {
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    color: '#6366f1',
};

const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state
    const [modal, setModal] = useState({ open: false, mode: 'create', event: null });
    const [formData, setFormData] = useState(BLANK_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, event: null, deleting: false });

    // Drag state
    const [draggingId, setDraggingId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const dragEventRef = useRef(null);

    // ── Data Fetching ──────────────────────────────────────
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

    // ── Modal Helpers ──────────────────────────────────────
    const openCreateModal = () => {
        const start = new Date(selectedDate);
        start.setHours(9, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(10, 0, 0, 0);
        setFormData({ ...BLANK_FORM, start_time: toLocalInput(start), end_time: toLocalInput(end) });
        setFormError('');
        setModal({ open: true, mode: 'create', event: null });
    };

    const openEditModal = (evt, e) => {
        e.stopPropagation();
        setFormData({
            title: evt.title,
            description: evt.description || '',
            start_time: toLocalInput(safeParse(evt.start_time)),
            end_time: toLocalInput(safeParse(evt.end_time)),
            color: evt.color || '#6366f1',
        });
        setFormError('');
        setModal({ open: true, mode: 'edit', event: evt });
    };

    const closeModal = () => {
        setModal({ open: false, mode: 'create', event: null });
        setFormData(BLANK_FORM);
        setFormError('');
    };

    // Close modal on backdrop click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) closeModal();
    };

    // ── Form Submit ────────────────────────────────────────
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        const startDt = safeParse(formData.start_time);
        const endDt = safeParse(formData.end_time);

        if (endDt <= startDt) {
            setFormError('End time must be after start time.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                start_time: startDt.toISOString(),
                end_time: endDt.toISOString(),
            };

            if (modal.mode === 'create') {
                const res = await api.post('/api/calendar', payload);
                setEvents(prev => [...prev, res.data]);
            } else {
                const res = await api.put(`/api/calendar/${modal.event.id}`, payload);
                setEvents(prev => prev.map(ev => ev.id === modal.event.id ? res.data : ev));
            }
            closeModal();
        } catch (err) {
            console.error('Save failed', err);
            setFormError(err?.response?.data?.detail || 'Failed to save event. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────
    const promptDelete = (evt, e) => {
        e.stopPropagation();
        setDeleteConfirm({ open: true, event: evt, deleting: false });
    };

    const confirmDelete = async () => {
        const { event } = deleteConfirm;
        if (!event) return;
        setDeleteConfirm(prev => ({ ...prev, deleting: true }));
        // Optimistic remove
        setEvents(prev => prev.filter(p => p.id !== event.id));
        setDeleteConfirm({ open: false, event: null, deleting: false });
        try {
            await api.delete(`/api/calendar/${event.id}`);
        } catch (err) {
            console.error('Delete failed', err);
            fetchEvents(); // revert on failure
        }
    };

    const cancelDelete = () => {
        setDeleteConfirm({ open: false, event: null, deleting: false });
    };

    // ── Drag & Drop ────────────────────────────────────────
    const handleDragStart = (e, evt) => {
        e.stopPropagation();
        setDraggingId(evt.id);
        dragEventRef.current = evt;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', evt.id);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDropTarget(null);
        dragEventRef.current = null;
    };

    const handleDragOver = (e, dateStr) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget(dateStr);
    };

    const handleDragLeave = () => {
        setDropTarget(null);
    };

    const handleDrop = async (e, targetDate) => {
        e.preventDefault();
        setDropTarget(null);

        const evt = dragEventRef.current;
        if (!evt) return;

        const oldStart = safeParse(evt.start_time);
        const oldEnd = safeParse(evt.end_time);
        const durationMs = oldEnd - oldStart;

        // Build new times preserving time-of-day
        const newStart = new Date(targetDate);
        newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
        const newEnd = new Date(newStart.getTime() + durationMs);

        // Skip if dropped on the same day
        if (isSameDay(newStart, oldStart)) {
            setDraggingId(null);
            return;
        }

        // Optimistic UI update immediately
        const startISO = newStart.toISOString();
        const endISO = newEnd.toISOString();

        setEvents(prev => prev.map(p =>
            p.id === evt.id ? { ...p, start_time: startISO, end_time: endISO } : p
        ));
        setSelectedDate(targetDate);
        setDraggingId(null);

        try {
            await api.put(`/api/calendar/${evt.id}`, {
                start_time: startISO,
                end_time: endISO,
            });
        } catch (err) {
            console.error('Drag update failed', err);
            // Revert on failure
            fetchEvents();
        }
    };

    // ── Calendar Grid ──────────────────────────────────────
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);

    const calendarRows = [];
    let day = gridStart;
    while (day <= gridEnd) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            const cellDay = day;
            const dateStr = format(cellDay, 'yyyy-MM-dd');
            const isOutside = !isSameMonth(cellDay, monthStart);
            const isTodayCell = isSameDay(cellDay, new Date());
            const isSelected = isSameDay(cellDay, selectedDate);
            const isDrop = dropTarget === dateStr;

            const dayEvents = events.filter(ev => isSameDay(safeParse(ev.start_time), cellDay));

            week.push(
                <div
                    key={dateStr}
                    className={[
                        'cal-cell',
                        isOutside ? 'disabled' : '',
                        isTodayCell ? 'today' : '',
                        isSelected ? 'selected' : '',
                        isDrop ? 'drop-target' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => !isOutside && setSelectedDate(cellDay)}
                    onDragOver={(e) => !isOutside && handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => !isOutside && handleDrop(e, cellDay)}
                >
                    <span className="cal-number">{format(cellDay, 'd')}</span>
                    <div className="cal-events-container">
                        {dayEvents.map(evt => (
                            <div
                                key={evt.id}
                                className={`cal-event-pill${draggingId === evt.id ? ' dragging' : ''}`}
                                style={{
                                    backgroundColor: evt.color + '22',
                                    borderLeft: `3px solid ${evt.color}`,
                                    color: evt.color,
                                }}
                                draggable
                                onDragStart={(e) => handleDragStart(e, evt)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => e.stopPropagation()}
                                title={evt.title}
                            >
                                {evt.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
            day = addDays(day, 1);
        }
        calendarRows.push(
            <div className="cal-row" key={format(week[0].key ? gridStart : day, 'yyyy-MM-dd')}>
                {week}
            </div>
        );
    }

    // ── Sidebar Events ─────────────────────────────────────
    const selectedDayEvents = events
        .filter(ev => isSameDay(safeParse(ev.start_time), selectedDate))
        .sort((a, b) => safeParse(a.start_time) - safeParse(b.start_time));

    return (
        <div className="calendar-page fade-in">
            {/* Page Header */}
            <div className="cal-header-bar">
                <div>
                    <h1 className="cal-title">Calendar</h1>
                    <p className="cal-subtitle">Schedule and organize your financial events</p>
                </div>
            </div>

            {/* Top-level error */}
            {error && (
                <div className="cal-error-banner">
                    <FiAlertCircle size={16} />
                    {error}
                    <button onClick={fetchEvents}>Retry</button>
                </div>
            )}

            <div className="cal-layout">
                {/* ── Main Grid ── */}
                <div className="cal-main-board">
                    <div className="cal-controls">
                        <h2>{format(currentDate, 'MMMM yyyy')}</h2>
                        <div className="cal-navigation">
                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} title="Previous month">
                                <FiChevronLeft size={18} />
                            </button>
                            <button className="today-btn" onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}>
                                Today
                            </button>
                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} title="Next month">
                                <FiChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="cal-loading">
                            <div className="cal-spinner" />
                            <span>Loading events…</span>
                        </div>
                    ) : (
                        <div className="cal-grid">
                            <div className="cal-days-header">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="cal-day-name">{d}</div>
                                ))}
                            </div>
                            <div className="cal-body">{calendarRows}</div>
                        </div>
                    )}
                </div>

                {/* ── Sidebar ── */}
                <div className="cal-sidebar">
                    <div className="cal-sidebar-header">
                        <div className="sidebar-date-row">
                            <FiCalendar size={16} />
                            <h3>{format(selectedDate, 'EEEE, MMM d')}</h3>
                        </div>
                        <button className="add-event-btn" onClick={openCreateModal}>
                            <FiPlus size={16} /> Add Event
                        </button>
                    </div>

                    <div className="cal-sidebar-events">
                        {selectedDayEvents.length === 0 ? (
                            <div className="empty-events">
                                <FiCalendar size={32} className="empty-icon" />
                                <p>No events for this day</p>
                                <button className="empty-add-btn" onClick={openCreateModal}>
                                    <FiPlus size={14} /> Add event
                                </button>
                            </div>
                        ) : (
                            selectedDayEvents.map(evt => (
                                <div key={evt.id} className="detail-event-card">
                                    <div className="detail-event-indicator" style={{ background: evt.color }} />
                                    <div className="detail-event-content">
                                        <h4>{evt.title}</h4>
                                        <p className="detail-time">
                                            <FiClock size={11} />
                                            {format(safeParse(evt.start_time), 'h:mm a')}
                                            {' – '}
                                            {format(safeParse(evt.end_time), 'h:mm a')}
                                        </p>
                                        {evt.description && (
                                            <p className="detail-desc">{evt.description}</p>
                                        )}
                                    </div>
                                    <div className="detail-event-actions">
                                        <button
                                            className="evt-action-btn edit"
                                            onClick={(e) => openEditModal(evt, e)}
                                            title="Edit event"
                                        >
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button
                                            className="evt-action-btn del"
                                            onClick={(e) => promptDelete(evt, e)}
                                            title="Delete event"
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Create / Edit Modal ── */}
            {modal.open && (
                <div className="event-form-overlay" onClick={handleOverlayClick}>
                    <div className="event-form-card fade-in">
                        <div className="form-card-header">
                            <h3>{modal.mode === 'edit' ? 'Edit Event' : 'New Event'}</h3>
                            <button className="close-modal-btn" onClick={closeModal} type="button">
                                <FiX size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit}>
                            <label className="evt-label">Event Title *</label>
                            <input
                                type="text"
                                placeholder="e.g. Pay electricity bill"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="evt-input"
                                autoFocus
                            />

                            <DateTimePicker
                                label="Start Date & Time"
                                value={formData.start_time}
                                onChange={(v) => setFormData({ ...formData, start_time: v })}
                            />
                            <DateTimePicker
                                label="End Date & Time"
                                value={formData.end_time}
                                min={formData.start_time?.split('T')[0]}
                                onChange={(v) => setFormData({ ...formData, end_time: v })}
                            />

                            <label className="evt-label">Description</label>
                            <textarea
                                placeholder="Optional notes…"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="evt-input evt-textarea"
                            />

                            <div className="color-selector">
                                <label className="evt-label">Label Color</label>
                                <div className="color-swatches">
                                    {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`color-swatch${formData.color === c ? ' active' : ''}`}
                                            style={{ background: c }}
                                            onClick={() => setFormData({ ...formData, color: c })}
                                            title={c}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="color-custom-pick"
                                        title="Custom color"
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className="form-error">
                                    <FiAlertCircle size={14} /> {formError}
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="button" className="cancel-btn" onClick={closeModal} disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="save-btn" disabled={submitting}>
                                    {submitting ? 'Saving…' : modal.mode === 'edit' ? 'Update Event' : 'Save Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Dialog ── */}
            {deleteConfirm.open && (
                <div className="event-form-overlay" onClick={(e) => e.target === e.currentTarget && cancelDelete()}>
                    <div className="delete-confirm-card fade-in">
                        <div className="delete-confirm-icon">
                            <FiTrash2 size={24} />
                        </div>
                        <h3 className="delete-confirm-title">Delete Event?</h3>
                        <p className="delete-confirm-body">
                            Are you sure you want to delete
                            {' '}<strong>"{deleteConfirm.event?.title}"</strong>?
                            <br />
                            This action cannot be undone.
                        </p>
                        <div className="delete-confirm-actions">
                            <button
                                className="cancel-btn"
                                onClick={cancelDelete}
                                disabled={deleteConfirm.deleting}
                            >
                                Keep Event
                            </button>
                            <button
                                className="delete-confirm-btn"
                                onClick={confirmDelete}
                                disabled={deleteConfirm.deleting}
                            >
                                <FiTrash2 size={14} />
                                {deleteConfirm.deleting ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;
