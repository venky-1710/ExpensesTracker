import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, Alert, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatService } from '../../services/chatService';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import Toast from 'react-native-toast-message';

export default function ChatModal({ onClose }: { onClose: () => void }) {
  const { C } = useAppTheme();
  const s = getStyles(C);
  
  const [threads, setThreads] = useState<any[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const activeThread = threads.find(t => t.thread_id === currentThreadId);
  const messages = activeThread?.messages || [];

  const loadHistory = async () => {
    try {
      const data = await chatService.getHistory();
      if (data && data.success) {
        setThreads(data.data);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSend = async (overrideText: string | null = null) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;

    Keyboard.dismiss();
    setInput('');
    setLoading(true);

    const now = new Date().toISOString();
    const userMsg = { role: 'user', content: text, created_at: now };

    let tid = currentThreadId;
    if (!tid) {
      tid = 'pending';
      setCurrentThreadId('pending');
    }

    setThreads(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(t => t.thread_id === tid);
      if (idx === -1) {
        arr.unshift({ thread_id: tid, messages: [userMsg], last_updated: now });
      } else {
        arr[idx] = { ...arr[idx], messages: [...arr[idx].messages, userMsg], last_updated: now };
      }
      return arr;
    });

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const data = await chatService.sendMessage(text, tid);
      
      if (tid === 'pending') {
        const newTid = data.thread_id;
        setCurrentThreadId(newTid);
        setThreads(prev => prev.map(t => t.thread_id === 'pending' ? { ...t, thread_id: newTid } : t));
      }
      
      await loadHistory();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send message' });
      // Add error message to thread
      setThreads(prev => {
        const arr = [...prev];
        const active = arr.find(t => t.thread_id === currentThreadId || t.thread_id === 'pending');
        if (active) {
          active.messages.push({ role: 'model', content: "Sorry, I encountered an error.", created_at: new Date().toISOString() });
        }
        return arr;
      });
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentThreadId(null);
    setHistoryOpen(false);
  };

  const deleteChat = (tid: string) => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await chatService.deleteThread(tid);
            if (currentThreadId === tid) setCurrentThreadId(null);
            setThreads(prev => prev.filter(t => t.thread_id !== tid));
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete chat' });
          }
      }}
    ]);
  };

  const renameChat = (tid: string, oldTitle: string) => {
    Alert.prompt(
      'Rename Chat',
      'Enter a new title for this conversation',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: async (newTitle) => {
            if (!newTitle?.trim()) return;
            setThreads(prev => prev.map(t => t.thread_id === tid ? { ...t, title: newTitle } : t));
            try {
              await chatService.renameThread(tid, newTitle);
            } catch (e) {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to rename chat' });
            }
        }}
      ],
      'plain-text',
      oldTitle
    );
  };

  const renderFormattedText = (text: string, isUser: boolean) => {
    return (
      <Text style={[s.msgText, isUser ? s.msgTextUser : s.msgTextModel]}>
        {text.split('\n').map((line, lineIndex) => {
          // Replace starting * or - with a proper bullet character
          let processedLine = line;
          if (processedLine.trim().startsWith('* ')) {
            processedLine = processedLine.replace(/^\s*\*\s/, '•  ');
          } else if (processedLine.trim().startsWith('- ')) {
            processedLine = processedLine.replace(/^\s*-\s/, '•  ');
          }

          // Handle bold text
          const parts = processedLine.split(/(\*\*.*?\*\*)/g);
          
          return (
            <Text key={lineIndex}>
              {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                  return <Text key={index} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>;
                }
                return <Text key={index}>{part}</Text>;
              })}
              {lineIndex < text.split('\n').length - 1 ? '\n' : ''}
            </Text>
          );
        })}
      </Text>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgWrapper, isUser ? s.msgUser : s.msgModel]}>
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleModel]}>
          {renderFormattedText(item.content, isUser)}
          <Text style={[s.msgTime, isUser ? s.msgTimeUser : s.msgTimeModel]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={onClose}>
            <Text style={s.iconText}>✕</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>🐝 BeeBot Pro</Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => setHistoryOpen(true)}>
            <Text style={s.iconText}>📜</Text>
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        {messages.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>✨</Text>
            <Text style={s.emptyTitle}>Good Morning</Text>
            <Text style={s.emptySub}>How can I assist you today?</Text>
            <View style={s.suggestions}>
              <TouchableOpacity style={s.sugBtn} onPress={() => handleSend("Analyze my latest spending trends")}>
                <Text style={s.sugBtnText}>📈 Analyze Spending</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sugBtn} onPress={() => handleSend("What is my highest expense category?")}>
                <Text style={s.sugBtnText}>📊 Categorize</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sugBtn} onPress={() => handleSend("Can you give me budget tips?")}>
                <Text style={s.sugBtnText}>💡 Budget Tips</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderMessage}
            contentContainerStyle={s.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={loading ? (
              <View style={[s.msgWrapper, s.msgModel]}>
                <View style={[s.bubble, s.bubbleModel, { paddingVertical: 12 }]}>
                  <ActivityIndicator color={C.primary} size="small" />
                </View>
              </View>
            ) : null}
          />
        )}

        {/* Input Area */}
        <View style={s.inputContainer}>
          <View style={s.inputWrapper}>
            <TextInput
              style={s.input}
              placeholder="Message BeeBot..."
              placeholderTextColor={C.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]} 
              onPress={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              <Text style={s.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* History Modal */}
      <Modal visible={historyOpen} animationType="fade" transparent={true} onRequestClose={() => setHistoryOpen(false)}>
        <View style={s.historyOverlay}>
          <SafeAreaView style={s.historyDrawer}>
            <View style={s.historyHeader}>
              <Text style={s.historyTitle}>Conversations</Text>
              <TouchableOpacity style={s.iconBtn} onPress={() => setHistoryOpen(false)}>
                <Text style={s.iconText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={s.newChatBtn} onPress={startNewChat}>
              <Text style={s.newChatText}>+ New Chat</Text>
            </TouchableOpacity>

            <FlatList
              data={threads}
              keyExtractor={item => item.thread_id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const title = item.title || item.messages?.[0]?.content || 'New Conversation';
                const isActive = item.thread_id === currentThreadId;
                return (
                  <TouchableOpacity 
                    style={[s.historyItem, isActive && s.historyItemActive]} 
                    onPress={() => { setCurrentThreadId(item.thread_id); setHistoryOpen(false); }}
                  >
                    <View style={s.historyItemContent}>
                      <Text style={[s.historyItemTitle, isActive && s.historyItemTitleActive]} numberOfLines={1}>{title}</Text>
                      <Text style={s.historyItemTime}>{new Date(item.last_updated).toLocaleDateString()}</Text>
                    </View>
                    <View style={s.historyItemActions}>
                      <TouchableOpacity onPress={() => renameChat(item.thread_id, title)} style={{ padding: 8 }}>
                        <Text style={s.historyActionText}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteChat(item.thread_id)} style={{ padding: 8 }}>
                        <Text style={[s.historyActionText, { color: C.red }]}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={s.emptyHistory}>No chat history found.</Text>}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border,
    backgroundColor: C.card
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  iconBtn: { padding: 8 },
  iconText: { fontSize: 20, color: C.textSecondary },
  
  chatList: { padding: 16, paddingBottom: 32 },
  msgWrapper: { marginBottom: 16, maxWidth: '85%' },
  msgUser: { alignSelf: 'flex-end' },
  msgModel: { alignSelf: 'flex-start' },
  bubble: { padding: 14, borderRadius: 20 },
  bubbleUser: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleModel: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { color: '#ffffff' },
  msgTextModel: { color: C.textPrimary },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeUser: { color: 'rgba(255,255,255,0.7)' },
  msgTimeModel: { color: C.textMuted },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 16, color: C.textMuted, marginBottom: 32 },
  suggestions: { width: '100%', gap: 12 },
  sugBtn: { 
    backgroundColor: C.card, paddingVertical: 14, paddingHorizontal: 16, 
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center' 
  },
  sugBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },

  inputContainer: { padding: 16, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.border },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: C.inputBg,
    borderRadius: 24, borderWidth: 1, borderColor: C.inputBorder, paddingHorizontal: 16, paddingVertical: 8
  },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, maxHeight: 100, minHeight: 32, paddingTop: 8, paddingBottom: 8 },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginBottom: 2
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendIcon: { color: '#fff', fontSize: 16, marginLeft: 2 },

  historyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', justifyContent: 'flex-end' },
  historyDrawer: { width: '80%', maxWidth: 400, backgroundColor: C.bg, height: '100%' },
  historyHeader: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 20, borderBottomWidth: 1, borderColor: C.border 
  },
  historyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  newChatBtn: {
    margin: 16, padding: 14, backgroundColor: 'rgba(109,74,255,0.1)', 
    borderRadius: 12, borderWidth: 1, borderColor: C.primary, alignItems: 'center'
  },
  newChatText: { color: C.primary, fontWeight: '700', fontSize: 15 },
  historyItem: { 
    padding: 16, backgroundColor: C.card, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center'
  },
  historyItemActive: { borderColor: C.primary },
  historyItemContent: { flex: 1, paddingRight: 8 },
  historyItemTitle: { fontSize: 15, color: C.textPrimary, fontWeight: '600', marginBottom: 4 },
  historyItemTitleActive: { color: C.primary },
  historyItemTime: { fontSize: 11, color: C.textMuted },
  historyItemActions: { flexDirection: 'row' },
  historyActionText: { fontSize: 16, color: C.textMuted },
  emptyHistory: { textAlign: 'center', color: C.textMuted, marginTop: 32 },
});
