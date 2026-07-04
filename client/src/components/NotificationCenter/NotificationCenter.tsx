import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiInfo, FiCalendar, FiCheck, FiX, FiCheckCircle, FiCreditCard, FiTrash2 } from 'react-icons/fi';
import { notificationService, AppNotification } from '../../services/notificationService';
import api from '../../services/api';

// ─── Toast ──────────────────────────────────────────────────────────────────

interface ToastProps {
  notification: AppNotification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isPaymentDue = notification.type === 'payment_due';
  const isEventCreated = notification.type === 'event_created';
  const accentColor = isEventCreated ? '#10b981' : isPaymentDue ? '#f59e0b' : '#6d4aff';

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '380px',
        width: '100%',
        animation: 'slideInRight 0.35s cubic-bezier(.22,.68,0,1.2)',
      }}
    >
      <style>{`
        @keyframes slideInRight { from{transform:translateX(110%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes shrink        { from{width:100%} to{width:0%} }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg,#1e1b4b 0%,#0c1222 100%)',
        border: '1px solid rgba(109,74,255,0.3)',
        borderRadius: '14px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}>
        {/* Accent bar */}
        <div style={{ height: '3px', background: `linear-gradient(90deg,${accentColor},#6d4aff)` }} />

        <div style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {/* Icon */}
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: `${accentColor}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accentColor,
          }}>
            {isEventCreated ? <FiCheckCircle size={18} />
              : isPaymentDue ? <FiCreditCard size={18} />
                : <FiCalendar size={18} />}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '13px', color: '#f0f0ff', letterSpacing: '-0.1px' }}>
              {notification.title}
            </p>
            <p style={{
              margin: 0, fontSize: '12px', color: 'rgba(200,200,230,0.75)', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {notification.message}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px',
              width: '26px', height: '26px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(200,200,230,0.6)', flexShrink: 0, transition: 'background 0.15s',
            }}
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            background: accentColor,
            animation: 'shrink 5.5s linear forwards',
          }} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);

      // Detect brand-new unread notifications and show a toast
      const incoming = data.filter(n => !n.is_read && !prevIdsRef.current.has(n.id));
      if (incoming.length > 0 && prevIdsRef.current.size > 0) {
        setToast(incoming[0]);
      }
      prevIdsRef.current = new Set(data.map(n => n.id));
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Listen for event-created signal from CalendarView
  useEffect(() => {
    const handler = () => setTimeout(fetchNotifications, 1500);
    window.addEventListener('calendar:eventCreated', handler);
    return () => window.removeEventListener('calendar:eventCreated', handler);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const navigate = useNavigate();

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
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

  // ── Mark event as paid directly from notification ──────────────────────
  const handleMarkPaid = async (notification: AppNotification) => {
    if (!notification.related_event_id || payingId) return;
    setPayingId(notification.id);
    try {
      await api.post(`/api/calendar/${notification.related_event_id}/mark-paid`);
      // Refresh notifications to get the payment_confirmed notification
      await fetchNotifications();
      // Dispatch so CalendarView also refreshes
      window.dispatchEvent(new CustomEvent('calendar:eventCreated'));
    } catch (err: any) {
      console.error('Mark-paid failed', err);
    } finally {
      setPayingId(null);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    if (type === 'event_created') return <FiCheckCircle size={15} />;
    if (type === 'payment_due') return <FiCreditCard size={15} />;
    if (type === 'payment_confirmed') return <FiCheckCircle size={15} />;
    if (type === 'event_reminder') return <FiCalendar size={15} />;
    return <FiInfo size={15} />;
  };

  const getTypeColor = (type: string) => {
    if (type === 'event_created') return 'text-emerald-500';
    if (type === 'payment_due') return 'text-amber-500';
    if (type === 'payment_confirmed') return 'text-emerald-500';
    if (type === 'event_reminder') return 'text-purple-500';
    return 'text-blue-500';
  };

  return (
    <>
      {/* Toast */}
      {toast && <Toast notification={toast} onClose={() => setToast(null)} />}

      {/* Bell + Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
        >
          <FiBell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white dark:border-[#050B14]"></span>
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-[340px] bg-white dark:bg-[#0c1222] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden z-[100]">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                    title="Mark all as read"
                  >
                    <FiCheck size={14} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={() => setClearConfirm(true)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
                    title="Clear all"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700/40 flex items-center justify-center mx-auto mb-3 text-gray-300">
                    <FiBell size={22} />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Events you add will appear here</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const isPaymentDue = notification.type === 'payment_due';
                  const isPaying = payingId === notification.id;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => !notification.is_read && !isPaymentDue && handleMarkAsRead(notification.id)}
                      className={`p-4 border-b border-gray-50 dark:border-white/5 flex flex-col gap-2 transition-colors ${!notification.is_read
                          ? 'bg-indigo-50/50 dark:bg-indigo-500/10'
                          : 'bg-transparent'
                        } ${!isPaymentDue && !notification.is_read ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-500/20' : ''}`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className={`mt-0.5 shrink-0 ${getTypeColor(notification.type)}`}>
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-3">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
                          <button
                            onClick={(e) => handleDelete(notification.id, e)}
                            className="p-1 -mr-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors bg-transparent border-none cursor-pointer"
                            title="Remove"
                          >
                            <FiX size={14} />
                          </button>
                          {!notification.is_read && !isPaymentDue && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 mr-1.5 mt-1"></span>
                          )}
                        </div>
                      </div>

                      {/* ── "Mark as Paid" CTA for payment_due notifications ── */}
                      {isPaymentDue && notification.related_event_id && (
                        <div className="flex items-center gap-2 mt-1 pl-6">
                          {notification.related_event_amount && (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                              ₹{notification.related_event_amount.toLocaleString()}
                              {notification.related_event_payment_method && ` · ${notification.related_event_payment_method}`}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkPaid(notification); }}
                            disabled={isPaying}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                          >
                            <FiCheckCircle size={12} />
                            {isPaying ? 'Recording…' : 'Mark as Paid'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border-none cursor-pointer transition-colors"
                          >
                            Not yet
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ── See all footer ── */}
            <div
              className="p-3 border-t border-gray-100 dark:border-white/10 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              onClick={() => { setIsOpen(false); navigate('/notifications'); }}
            >
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                See all notifications →
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Clear Confirm Modal ── */}
      {clearConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setClearConfirm(false)}>
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
    </>
  );
};

export default NotificationCenter;
