import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell, FiCalendar, FiCheckCircle, FiCreditCard, FiInfo,
  FiCheck, FiTrash2, FiArrowLeft, FiExternalLink, FiFilter,
  FiRefreshCw, FiX
} from 'react-icons/fi';
import { notificationService, AppNotification } from '../services/notificationService';
import api from '../services/api';

type FilterType = 'all' | 'unread' | 'event_created' | 'event_reminder' | 'payment_due' | 'payment_confirmed';

const TYPE_LABELS: Record<string, string> = {
  all: 'All',
  unread: 'Unread',
  event_created: 'Events Added',
  event_reminder: 'Reminders',
  payment_due: 'Payment Due',
  payment_confirmed: 'Confirmed',
};

const getTypeIcon = (type: string, size = 18) => {
  switch (type) {
    case 'event_created': return <FiCheckCircle size={size} />;
    case 'event_reminder': return <FiCalendar size={size} />;
    case 'payment_due': return <FiCreditCard size={size} />;
    case 'payment_confirmed': return <FiCheckCircle size={size} />;
    default: return <FiInfo size={size} />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'event_created': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500' };
    case 'event_reminder': return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-500' };
    case 'payment_due': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-500' };
    case 'payment_confirmed': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500' };
    default: return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-500' };
  }
};

const getTypePill = (type: string) => {
  const labels: Record<string, string> = {
    event_created: 'Event Added', event_reminder: 'Reminder',
    payment_due: 'Payment Due', payment_confirmed: 'Confirmed', info: 'Info',
  };
  return labels[type] || type;
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await notificationService.clearAll();
      setNotifications([]);
      setClearConfirm(false);
      window.dispatchEvent(new CustomEvent('calendar:eventCreated'));
    } catch (e) {
      console.error('Failed to clear notifications', e);
    } finally {
      setClearing(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      window.dispatchEvent(new CustomEvent('calendar:eventCreated'));
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  const handleMarkPaid = async (n: AppNotification) => {
    if (!n.related_event_id || payingId) return;
    setPayingId(n.id);
    try {
      await api.post(`/api/calendar/${n.related_event_id}/mark-paid`);
      await fetchNotifications();
      window.dispatchEvent(new CustomEvent('calendar:eventCreated'));
    } catch (e) { console.error(e); }
    finally { setPayingId(null); }
  };

  const handleNavigateToCalendar = (n: AppNotification) => {
    // Navigate to calendar; if we have a date from related event, pass it as a query param
    if (n.related_event_start_time) {
      try {
        const dateStr = n.related_event_start_time.split('T')[0];
        navigate(`/calendar?date=${dateStr}`);
      } catch (e) {
        navigate('/calendar');
      }
    } else {
      navigate('/calendar');
    }
  };

  return (
    <div className="px-6 py-6 max-w-[860px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white border-none cursor-pointer transition-colors"
        >
          <FiArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 m-0">Notifications</h1>
          <p className="text-sm text-gray-500 m-0 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white border-none cursor-pointer transition-colors"
            title="Refresh"
          >
            <FiRefreshCw size={16} />
          </button>
          {notifications.length > 0 && (
            <button
              onClick={() => setClearConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 text-sm font-semibold rounded-xl border-none cursor-pointer transition-colors"
            >
              <FiTrash2 size={14} /> Clear all
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl border-none cursor-pointer transition-colors"
            >
              <FiCheck size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {(Object.keys(TYPE_LABELS) as FilterType[]).map(key => {
          const count = key === 'all' ? notifications.length
            : key === 'unread' ? notifications.filter(n => !n.is_read).length
              : notifications.filter(n => n.type === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border-none cursor-pointer transition-all ${filter === key
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              {TYPE_LABELS[key]}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/25 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notification list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600 mb-4">
            <FiBell size={28} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No notifications here</p>
          <p className="text-sm text-gray-400 mt-1">Try a different filter above</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(n => {
            const colors = getTypeColor(n.type);
            const isPaymentDue = n.type === 'payment_due';
            const isPaying = payingId === n.id;

            return (
              <div
                key={n.id}
                className={`rounded-2xl border transition-all ${!n.is_read
                    ? 'bg-indigo-50/60 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30 shadow-sm'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  }`}
              >
                <div className="p-5 flex gap-4">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.text}`}>
                    {getTypeIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${colors.badge}`}>
                          {getTypePill(n.type)}
                        </span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatTime(n.created_at)}</span>
                        <button
                          onClick={(e) => handleDelete(n.id, e)}
                          className="p-1 -mr-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors bg-transparent border-none cursor-pointer"
                          title="Remove notification"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </div>

                    <p className={`text-sm font-semibold mb-1 ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {n.message}
                    </p>

                    {/* Payment amount */}
                    {isPaymentDue && n.related_event_amount && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-lg">
                        <FiCreditCard size={13} className="text-amber-500" />
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                          ₹{n.related_event_amount.toLocaleString()}
                          {n.related_event_payment_method && ` · ${n.related_event_payment_method}`}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {/* Calendar link for event-related notifications */}
                      {n.related_event_id && (
                        <button
                          onClick={() => handleNavigateToCalendar(n)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg border-none cursor-pointer transition-colors"
                        >
                          <FiCalendar size={12} /> View in Calendar
                        </button>
                      )}

                      {/* Mark Paid / Received for payment_due */}
                      {isPaymentDue && n.related_event_id && (
                        <button
                          onClick={() => handleMarkPaid(n)}
                          disabled={isPaying}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                        >
                          <FiCheckCircle size={12} />
                          {isPaying ? 'Recording…' : (n.title.includes('Income') ? 'Mark as Received' : 'Mark as Paid')}
                        </button>
                      )}

                      {/* Mark as read */}
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-xs font-semibold rounded-lg border-none cursor-pointer transition-colors"
                        >
                          <FiCheck size={12} /> Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* ── Clear Confirm Modal ── */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setClearConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-[360px] rounded-2xl shadow-xl overflow-hidden animate-slide-up flex flex-col items-center text-center p-7">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-4"><FiTrash2 size={24} /></div>
            <h3 className="m-0 mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">Clear all notifications?</h3>
            <p className="m-0 mb-6 text-sm text-gray-500 leading-relaxed">
              Are you sure you want to delete all notifications? This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <button className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors" onClick={() => setClearConfirm(false)} disabled={clearing}>Cancel</button>
              <button className="flex-1 flex justify-center items-center gap-1.5 py-2.5 bg-red-500 text-white border-none rounded-lg text-sm font-semibold hover:bg-red-600 shadow-sm shadow-red-500/20 cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed" onClick={handleClearAll} disabled={clearing}>
                <FiTrash2 size={14} />{clearing ? 'Clearing…' : 'Yes, Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
