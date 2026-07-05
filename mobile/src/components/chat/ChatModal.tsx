import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Alert, Keyboard, ScrollView, Animated, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const webotLogo = require('../../../assets/images/webot_logo.jpg');
const webotLogoCircle = require('../../../assets/images/webot_logo_circle.jpg');

import { chatService } from '../../services/chatService';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import * as DocumentPicker from 'expo-document-picker';
import { uploadService } from '../../services/uploadService';
import UploadReviewModal from './UploadReviewModal';
import { dashboardService } from '../../services/dashboardService';
import IncomeExpenseChart from '../charts/IncomeExpenseChart';
import CategoryPieChart from '../charts/CategoryPieChart';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  if (h >= 17 && h < 21) return 'Good Evening';
  return 'Good Night';
};

const timeAgo = (dateString: string): string => {
  if (!dateString) return '';
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  if (diff < 172800) return '1 day ago';
  return `${Math.round(diff / 86400)} days ago`;
};

// ─── Markdown Renderer ───────────────────────────────────────────────────────

const MarkdownText = ({ text, isUser, C }: { text: string; isUser: boolean; C: ThemeColors }) => {
  const clean = text
    .replace('[CHART:category_breakdown]', '')
    .replace('[CHART:income_expense]', '')
    .replace('[CHART:spending_trends]', '')
    .trim();

  const lines = clean.split('\n');
  const baseColor = isUser ? '#ffffff' : C.textPrimary;
  const mutedColor = isUser ? 'rgba(255,255,255,0.7)' : C.textMuted;

  return (
    <View>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={i} style={{ height: 6 }} />;

        // Headings
        const h3 = trimmed.match(/^###\s+(.+)/);
        const h2 = trimmed.match(/^##\s+(.+)/);
        const h1 = trimmed.match(/^#\s+(.+)/);
        if (h1) return <Text key={i} style={[styles.mdH1, { color: baseColor }]}>{h1[1]}</Text>;
        if (h2) return <Text key={i} style={[styles.mdH2, { color: baseColor }]}>{h2[1]}</Text>;
        if (h3) return <Text key={i} style={[styles.mdH3, { color: baseColor }]}>{h3[1]}</Text>;

        // Bullet points
        const bullet = trimmed.match(/^[*\-]\s+(.+)/);
        const numbered = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (bullet) {
          return (
            <View key={i} style={styles.mdBulletRow}>
              <Text style={[styles.mdBulletDot, { color: isUser ? '#fff' : C.primary }]}>•</Text>
              <InlineText text={bullet[1]} baseColor={baseColor} />
            </View>
          );
        }
        if (numbered) {
          return (
            <View key={i} style={styles.mdBulletRow}>
              <Text style={[styles.mdBulletDot, { color: isUser ? '#fff' : C.primary }]}>{numbered[1]}.</Text>
              <InlineText text={numbered[2]} baseColor={baseColor} />
            </View>
          );
        }

        return <InlineText key={i} text={trimmed} baseColor={baseColor} style={{ marginBottom: 2 }} />;
      })}
    </View>
  );
};

// Handles **bold** inline formatting
const InlineText = ({ text, baseColor, style }: { text: string; baseColor: string; style?: any }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <Text style={[{ color: baseColor, fontSize: 15, lineHeight: 22, flexShrink: 1 }, style]}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') && part.length > 4
          ? <Text key={i} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
};

// ─── Typing Indicator ────────────────────────────────────────────────────────

const TypingIndicator = ({ C }: { C: ThemeColors }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={[styles.msgWrapper, styles.msgModel]}>
      <View style={[styles.bubble, styles.bubbleModel, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: C.primary, transform: [{ translateY: d }]
            }} />
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ChatModal({ onClose }: { onClose: () => void }) {
  const { C } = useAppTheme();
  const { user } = useAuth() as any;
  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'there';

  const [threads, setThreads] = useState<any[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  const [isUploadReviewOpen, setIsUploadReviewOpen] = useState(false);
  const [extractedTransactions, setExtractedTransactions] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dashboardCharts, setDashboardCharts] = useState<any>(null);
  
  const flatListRef = useRef<FlatList>(null);

  const activeThread = threads.find(t => t.thread_id === currentThreadId);
  const messages = activeThread?.messages || [];

  const loadHistory = async () => {
    try {
      const data = await chatService.getHistory();
      if (data?.success) setThreads(data.data);
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  };

  const loadCharts = async () => {
    try {
      const ch = await dashboardService.getCharts({ filter_type: '6months' });
      setDashboardCharts(ch?.data || ch);
    } catch (e) {
      console.error('Failed to load charts for chat:', e);
    }
  };

  useEffect(() => { loadHistory(); loadCharts(); }, []);

  const scrollToEnd = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);

  const handleSend = async (overrideText: string | null = null) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;

    Keyboard.dismiss();
    setInput('');
    setLoading(true);

    const now = new Date().toISOString();
    const userMsg = { role: 'user', content: text, created_at: now };

    let tid = currentThreadId;
    if (!tid) { tid = 'pending'; setCurrentThreadId('pending'); }

    setThreads(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(t => t.thread_id === tid);
      if (idx === -1) arr.unshift({ thread_id: tid, messages: [userMsg], last_updated: now });
      else arr[idx] = { ...arr[idx], messages: [...arr[idx].messages, userMsg], last_updated: now };
      return arr;
    });
    scrollToEnd();

    try {
      const data = await chatService.sendMessage(text, tid);
      if (tid === 'pending') {
        const newTid = data.thread_id;
        setCurrentThreadId(newTid);
        setThreads(prev => prev.map(t => t.thread_id === 'pending' ? { ...t, thread_id: newTid } : t));
      }
      await loadHistory();
      scrollToEnd();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send message' });
      setThreads(prev => {
        const arr = [...prev];
        const active = arr.find(t => t.thread_id === currentThreadId || t.thread_id === 'pending');
        if (active) active.messages.push({ role: 'model', content: 'Sorry, I encountered an error. Please try again.', created_at: new Date().toISOString() });
        return arr;
      });
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => { setCurrentThreadId(null); setHistoryOpen(false); };

  const deleteChat = (tid: string) => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await chatService.deleteThread(tid);
            if (currentThreadId === tid) setCurrentThreadId(null);
            setThreads(prev => prev.filter(t => t.thread_id !== tid));
          } catch {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete chat' });
          }
        }
      },
    ]);
  };

  const saveTitle = async (tid: string) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    setThreads(prev => prev.map(t => t.thread_id === tid ? { ...t, title: editTitle } : t));
    setEditingId(null);
    try { await chatService.renameThread(tid, editTitle); }
    catch { Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to rename chat' }); }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgWrapper, isUser ? styles.msgUser : styles.msgModel]}>
        {!isUser && (
          <Image source={webotLogo} style={styles.botAvatar} resizeMode="cover" />
        )}
        <View style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: C.primary }]
            : [styles.bubbleModel, { backgroundColor: C.card, borderColor: C.border }]
        ]}>
          {item.content.includes('[CHART:category_breakdown]') ? (
            <View>
              <MarkdownText text={item.content.replace('[CHART:category_breakdown]', '')} isUser={isUser} C={C} />
              <View style={{ marginTop: 12, backgroundColor: C.bg, borderRadius: 12, paddingTop: 12, overflow: 'hidden' }}>
                <CategoryPieChart data={dashboardCharts?.category_breakdown || []} C={C} customWidth={240} />
              </View>
            </View>
          ) : item.content.includes('[CHART:income_expense]') || item.content.includes('[CHART:spending_trends]') ? (
            <View>
              <MarkdownText text={item.content.replace(/\[CHART:(income_expense|spending_trends)\]/g, '')} isUser={isUser} C={C} />
              <View style={{ marginTop: 12, backgroundColor: C.bg, borderRadius: 12, paddingTop: 12, overflow: 'hidden' }}>
                <IncomeExpenseChart data={dashboardCharts?.credit_vs_debit || []} C={C} />
              </View>
            </View>
          ) : (
            <MarkdownText text={item.content} isUser={isUser} C={C} />
          )}
          <Text style={[styles.msgTime, { color: isUser ? 'rgba(255,255,255,0.6)' : C.textMuted }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.ms-excel', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setIsUploading(true);
      Toast.show({ type: 'info', text1: 'Analyzing...', text2: 'This may take a minute.', autoHide: false });

      const data = await uploadService.analyzeStatement(file.uri, file.name, file.mimeType || 'application/octet-stream');
      
      Toast.hide();
      if (data && data.transactions) {
        setExtractedTransactions(data.transactions);
        setIsUploadReviewOpen(true);
      }
    } catch (error: any) {
      Toast.hide();
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: 'Could not analyze document' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadConfirm = async (transactions: any[]) => {
    setIsUploading(true);
    try {
      const result = await uploadService.confirmTransactions(transactions);
      setIsUploadReviewOpen(false);
      Toast.show({ type: 'success', text1: 'Success', text2: result.message || 'Transactions imported successfully!' });
      
      const successMsg = `I just imported ${transactions.length} transactions from a bank statement.`;
      handleSend(successMsg);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Import Failed', text2: 'Could not save transactions' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Feather name="x" size={22} color={C.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Image source={webotLogo} style={styles.headerLogo} resizeMode="cover" />
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>WeBot Pro</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setHistoryOpen(true)}>
            <Feather name="clock" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Empty / Chat Area ── */}
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyState} keyboardShouldPersistTaps="handled">
            {/* Logo orb */}
            <View style={[styles.orbGradient, { backgroundColor: C.primary + '22', borderColor: C.primary + '33', borderWidth: 1 }]}>
              <Image source={webotLogo} style={styles.orbLogo} resizeMode="cover" />
            </View>

            <Text style={[styles.emptyHello, { color: C.textPrimary }]}>
              Hello {firstName} 👋
            </Text>
            <Text style={[styles.emptyGreeting, { color: C.primary }]}>
              {getGreeting()}!{' '}
              <Text style={[styles.emptyGreetingSub, { color: C.textSecondary }]}>
                How Can I Assist You Today?
              </Text>
            </Text>

            {/* Inline input on empty state */}
            <View style={[styles.emptyInputRow, { backgroundColor: C.card, borderColor: C.border }]}>
              <TouchableOpacity style={styles.uploadBtnIcon} onPress={handleFileUpload} disabled={isUploading}>
                {isUploading ? <ActivityIndicator size="small" color={C.primary} /> : <Feather name="paperclip" size={20} color={C.textSecondary} />}
              </TouchableOpacity>
              <TextInput
                style={[styles.emptyInput, { color: C.textPrimary }]}
                placeholder="Initiate a query or send a command…"
                placeholderTextColor={C.textMuted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.emptyInputSend, { backgroundColor: input.trim() ? C.primary : C.primary + '44' }]}
                onPress={() => handleSend()}
                disabled={!input.trim()}
              >
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Quick-action pills */}
            <View style={styles.pillsRow}>
              <TouchableOpacity style={[styles.pill, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => handleSend('Analyze my latest spending trends')}>
                <Feather name="trending-up" size={14} color={C.primary} />
                <Text style={[styles.pillText, { color: C.textSecondary }]}>Analyze Spending</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pill, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => handleSend('What is my highest expense category?')}>
                <Feather name="pie-chart" size={14} color={C.primary} />
                <Text style={[styles.pillText, { color: C.textSecondary }]}>Categorize</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pill, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => handleSend('Can you give me budget tips?')}>
                <Feather name="zap" size={14} color={C.primary} />
                <Text style={[styles.pillText, { color: C.textSecondary }]}>Budget Tips</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={loading ? <TypingIndicator C={C} /> : null}
          />
        )}

        {/* ── Input Bar (active chat) ── */}
        {messages.length > 0 && (
          <View style={[styles.inputBar, { backgroundColor: C.bg, borderTopColor: C.border }]}>
            <View style={[styles.inputWrap, { backgroundColor: C.card, borderColor: C.border }]}>
              <TouchableOpacity style={styles.uploadBtnIcon} onPress={handleFileUpload} disabled={isUploading}>
                {isUploading ? <ActivityIndicator size="small" color={C.primary} /> : <Feather name="paperclip" size={20} color={C.textSecondary} />}
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
                placeholder="Ask me about your finances…"
                placeholderTextColor={C.textMuted}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                onSubmitEditing={() => handleSend()}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? C.primary : C.primary + '55' }]}
                onPress={() => handleSend()}
                disabled={!input.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Feather name="send" size={16} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── History Drawer ── */}
      <Modal visible={historyOpen} animationType="slide" transparent onRequestClose={() => setHistoryOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setHistoryOpen(false)} />
          <SafeAreaView style={[styles.drawer, { backgroundColor: C.bg, borderLeftColor: C.border }]}>
            {/* Drawer Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.drawerTitle, { color: C.textPrimary }]}>Conversations</Text>
              <TouchableOpacity onPress={() => setHistoryOpen(false)}>
                <Feather name="x" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* New Chat Button */}
            <TouchableOpacity style={[styles.newChatBtn, { backgroundColor: C.primary + '18', borderColor: C.primary }]} onPress={startNewChat}>
              <Feather name="plus" size={16} color={C.primary} />
              <Text style={[styles.newChatText, { color: C.primary }]}>New Chat</Text>
            </TouchableOpacity>

            <Text style={[styles.drawerSectionLabel, { color: C.textMuted }]}>RECENT</Text>

            <FlatList
              data={threads}
              keyExtractor={item => item.thread_id}
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => {
                const defaultTitle = item.messages?.find((m: any) => m.role === 'user')?.content || 'New Conversation';
                const displayTitle = item.title || defaultTitle;
                const isActive = item.thread_id === currentThreadId;
                return (
                  <TouchableOpacity
                    style={[styles.threadItem, {
                      backgroundColor: isActive ? C.primary + '18' : C.card,
                      borderColor: isActive ? C.primary : C.border,
                    }]}
                    onPress={() => { setCurrentThreadId(item.thread_id); setHistoryOpen(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      {editingId === item.thread_id ? (
                        <TextInput
                          style={[styles.threadEditInput, { color: C.textPrimary, borderColor: C.primary }]}
                          value={editTitle}
                          onChangeText={setEditTitle}
                          onBlur={() => saveTitle(item.thread_id)}
                          onSubmitEditing={() => saveTitle(item.thread_id)}
                          autoFocus
                        />
                      ) : (
                        <Text style={[styles.threadTitle, { color: isActive ? C.primary : C.textPrimary }]} numberOfLines={1}>
                          {displayTitle}
                        </Text>
                      )}
                      <Text style={[styles.threadTime, { color: C.textMuted }]}>{timeAgo(item.last_updated)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity style={styles.threadAction} onPress={() => { setEditingId(item.thread_id); setEditTitle(displayTitle); }}>
                        <Feather name="edit-2" size={14} color={C.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.threadAction} onPress={() => deleteChat(item.thread_id)}>
                        <Feather name="trash-2" size={14} color={C.red} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyHistory, { color: C.textMuted }]}>No conversations yet.</Text>
              }
            />
          </SafeAreaView>
        </View>
      </Modal>

      <UploadReviewModal
        isOpen={isUploadReviewOpen}
        transactions={extractedTransactions}
        loading={isUploading}
        onClose={() => setIsUploadReviewOpen(false)}
        onConfirm={handleUploadConfirm}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  headerLogo: { width: 28, height: 28, borderRadius: 8 },
  iconBtn: { padding: 8, borderRadius: 8 },

  // Empty state
  emptyState: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  orbGradient: { width: 120, height: 120, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 28, overflow: 'hidden' },
  orbInner: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  orbLogo: { width: 110, height: 110, borderRadius: 20 },
  emptyHello: { fontSize: 26, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  emptyGreeting: { fontSize: 17, fontWeight: '700', marginBottom: 28, textAlign: 'center' },
  emptyGreetingSub: { fontWeight: '400' },
  emptyInputRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20,
  },
  uploadBtnIcon: { paddingRight: 10, paddingVertical: 4 },
  emptyInput: { flex: 1, fontSize: 15, minHeight: 28, paddingVertical: 0 },
  emptyInputSend: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  pillsRow: { width: '100%', gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  pillText: { fontSize: 14, fontWeight: '600' },

  // Chat list
  chatList: { padding: 16, paddingBottom: 24 },
  msgWrapper: { marginBottom: 16, maxWidth: '85%', flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgModel: { alignSelf: 'flex-start' },
  botAvatar: { width: 30, height: 30, borderRadius: 15, marginBottom: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, flexShrink: 1 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleModel: { borderWidth: 1, borderBottomLeftRadius: 4 },
  msgTime: { fontSize: 10, marginTop: 6, alignSelf: 'flex-end' },

  // Markdown
  mdH1: { fontSize: 18, fontWeight: '800', marginBottom: 6, marginTop: 4 },
  mdH2: { fontSize: 16, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  mdH3: { fontSize: 15, fontWeight: '700', marginBottom: 3, marginTop: 4 },
  mdBulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, gap: 6 },
  mdBulletDot: { fontSize: 15, fontWeight: '700', lineHeight: 22 },

  // Active input bar
  inputBar: { padding: 12, borderTopWidth: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  input: { flex: 1, fontSize: 15, maxHeight: 100, minHeight: 32, paddingTop: 6, paddingBottom: 6 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginBottom: 2 },

  // History drawer
  drawerOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  drawer: { width: '82%', maxWidth: 360, height: '100%', borderLeftWidth: 1 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  drawerTitle: { fontSize: 18, fontWeight: '800' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  newChatText: { fontSize: 15, fontWeight: '700' },
  drawerSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginHorizontal: 16, marginBottom: 8 },
  threadItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  threadTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  threadTime: { fontSize: 11 },
  threadAction: { padding: 8, borderRadius: 8 },
  threadEditInput: { fontSize: 14, borderBottomWidth: 1, paddingBottom: 2, marginBottom: 4 },
  emptyHistory: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
