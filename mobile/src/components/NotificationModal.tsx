import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList, ActivityIndicator, Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme, ThemeColors } from '../context/ThemeContext';
import { notificationService, AppNotification } from '../services/notificationService';
import Toast from 'react-native-toast-message';

const { height: SH } = Dimensions.get('window');

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationModal({ visible, onClose, onUnreadCountChange }: NotificationModalProps) {
  const { C } = useAppTheme();
  const s = getStyles(C);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data || []);
      const unread = (data || []).filter(n => !n.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      
      const newUnread = notifications.filter(n => !n.is_read && n.id !== id).length;
      if (onUnreadCountChange) onUnreadCountChange(newUnread);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to mark as read' });
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (onUnreadCountChange) onUnreadCountChange(0);
      Toast.show({ type: 'success', text1: 'Success', text2: 'All marked as read' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to mark all as read' });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      const newUnread = notifications.filter(n => !n.is_read && n.id !== id).length;
      if (onUnreadCountChange) onUnreadCountChange(newUnread);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete' });
    }
  };

  const clearAll = async () => {
    try {
      await notificationService.clearAll();
      setNotifications([]);
      if (onUnreadCountChange) onUnreadCountChange(0);
      Toast.show({ type: 'success', text1: 'Success', text2: 'All notifications cleared' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to clear notifications' });
    }
  };

  const getIconData = (type: string) => {
    if (type === 'payment_due') return { icon: 'credit-card', color: '#f59e0b' };
    if (type === 'event_created') return { icon: 'check-circle', color: '#10b981' };
    return { icon: 'calendar', color: '#6d4aff' };
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const { icon, color } = getIconData(item.type);
    
    return (
      <TouchableOpacity 
        style={[s.itemRow, !item.is_read && s.itemUnread]} 
        onPress={() => !item.is_read && markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[s.iconBox, { backgroundColor: color + '22' }]}>
          <Feather name={icon as any} size={18} color={color} />
        </View>
        <View style={s.itemContent}>
          <Text style={s.itemTitle}>{item.title}</Text>
          <Text style={s.itemMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={s.itemDate}>{formatDate(item.created_at)}</Text>
        </View>
        <TouchableOpacity style={s.deleteBtn} onPress={() => deleteNotification(item.id)} activeOpacity={0.7}>
          <Feather name="trash-2" size={16} color={C.red + '99'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.modalCard}>
          <View style={s.dragHandle} />
          
          <View style={s.header}>
            <View>
              <Text style={s.title}>Notifications</Text>
              <Text style={s.subtitle}>Updates and alerts</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {notifications.length > 0 && (
            <View style={s.actionsRow}>
              <TouchableOpacity style={s.actionTextBtn} onPress={markAllAsRead}>
                <Feather name="check-circle" size={14} color={C.primary} />
                <Text style={s.actionText}>Mark all read</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionTextBtn} onPress={clearAll}>
                <Feather name="trash-2" size={14} color={C.red} />
                <Text style={[s.actionText, { color: C.red }]}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.listContent}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Feather name="bell-off" size={32} color={C.textMuted} />
                  <Text style={s.emptyTitle}>All caught up!</Text>
                  <Text style={s.emptyText}>You have no notifications right now.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SH * 0.7,
    maxHeight: SH * 0.9,
    paddingBottom: 20,
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderColor: C.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  
  actionsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: C.border,
  },
  actionTextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600', color: C.primary },
  
  listContent: { flexGrow: 1 },
  center: { padding: 40, alignItems: 'center' },
  
  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: C.border,
  },
  itemUnread: { backgroundColor: C.card + '80' },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  itemMessage: { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginBottom: 6 },
  itemDate: { fontSize: 11, color: C.textMuted },
  deleteBtn: { padding: 8, marginRight: -8 },
  
  empty: { padding: 40, alignItems: 'center', gap: 10, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textSecondary },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
});
