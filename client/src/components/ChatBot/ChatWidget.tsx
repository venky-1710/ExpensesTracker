import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiPieChart, FiTrendingUp, FiPenTool } from 'react-icons/fi';
import api from '../../services/api';
import './ChatBot.css';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

interface ChatThread {
  thread_id: string;
  messages: ChatMessage[];
  last_updated: string;
  title?: string;
}

const timeAgo = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [dropdownActiveId, setDropdownActiveId] = useState<string | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeMessages = currentThreadId
    ? (threads.find(t => t.thread_id === currentThreadId)?.messages || [])
    : [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeMessages]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/chat/history');
      if (res.data && res.data.success) setThreads(res.data.data);
    } catch (error) { console.error('Failed to fetch chat history', error); }
  };

  useEffect(() => { if (isOpen) fetchHistory(); }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent | null, textOverride: string | null = null) => {
    if (e) e.preventDefault();
    const msgText = textOverride || inputValue.trim();
    if (!msgText || isLoading) return;

    const nowIso = new Date().toISOString();
    const userMsg: ChatMessage = { role: 'user', content: msgText, created_at: nowIso };

    let activeId = currentThreadId;
    if (!activeId) { activeId = 'pending'; setCurrentThreadId('pending'); }

    setThreads(prev => {
      const temp = [...prev];
      const activeIndex = temp.findIndex(t => t.thread_id === activeId);
      if (activeIndex === -1) {
        temp.unshift({ thread_id: activeId!, messages: [userMsg], last_updated: nowIso });
      } else {
        temp[activeIndex] = { ...temp[activeIndex], messages: [...temp[activeIndex].messages, userMsg], last_updated: nowIso };
      }
      return temp;
    });

    setInputValue('');
    setIsLoading(true);

    try {
      const payload: any = { message: msgText };
      if (currentThreadId && currentThreadId !== 'pending') payload.thread_id = currentThreadId;

      const response = await api.post('/api/chat', payload);
      const { thread_id: newTid } = response.data;

      if (activeId === 'pending') {
        setThreads(prev => prev.map(t => t.thread_id === 'pending' ? { ...t, thread_id: newTid } : t));
        setCurrentThreadId(newTid);
      }

      await fetchHistory();
    } catch (error) {
      console.error('Chat Error:', error);
      setThreads(prev => {
        const temp = [...prev];
        const active = temp.find(t => t.thread_id === currentThreadId || t.thread_id === 'pending');
        if (active) {
          active.messages.push({ role: 'model', content: 'Sorry, I encountered an error. Ensure backend is running.', created_at: new Date().toISOString() });
        }
        return temp;
      });
    } finally { setIsLoading(false); }
  };

  const startNewChat = () => setCurrentThreadId(null);

  const selectThread = (tid: string) => {
    if (editingThreadId === tid) return;
    setCurrentThreadId(tid);
  };

  const deleteChat = async (tid: string) => {
    try {
      await api.delete(`/api/chat/history/${tid}`);
      if (currentThreadId === tid) setCurrentThreadId(null);
      setDropdownActiveId(null);
      setThreads(prev => prev.filter(t => t.thread_id !== tid));
    } catch (error: any) {
      console.error('Failed to delete chat', error);
      if (error.response && error.response.status === 404) {
        if (currentThreadId === tid) setCurrentThreadId(null);
        setDropdownActiveId(null);
        setThreads(prev => prev.filter(t => t.thread_id !== tid));
      }
    }
  };

  const startEdit = (tid: string, currentTitle: string) => {
    setEditingThreadId(tid);
    setEditTitle(currentTitle);
    setDropdownActiveId(null);
  };

  const saveTitle = async (tid: string) => {
    if (!editTitle.trim()) { setEditingThreadId(null); return; }
    setThreads(prev => prev.map(t => t.thread_id === tid ? { ...t, title: editTitle } : t));
    setEditingThreadId(null);
    try { await api.put(`/api/chat/history/${tid}/title`, { title: editTitle }); }
    catch (error) { console.error('Failed to rename chat', error); }
  };

  if (!isOpen) {
    return (
      <div className="chat-widget-container">
        <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}><FiMessageSquare /></button>
      </div>
    );
  }

  return (
    <div className="beebot-overlay">
      <div className="beebot-layout">
        {/* Sidebar */}
        <div className="beebot-sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo"><FiMessageSquare /></div>
            <h2>BeeBot</h2>
          </div>
          <button className="new-chat-btn" onClick={startNewChat}><FiPlus /> New Chat</button>
          <div className="history-group">
            <h4>Recent Conversations</h4>
            <div className="history-list">
              {threads.length === 0 && <p className="empty-history">No history</p>}
              {threads.map((t) => {
                const firstUserMsg = t.messages.find(m => m.role === 'user');
                const defaultTitle = firstUserMsg ? firstUserMsg.content : 'New Conversation';
                const displayTitle = t.title || defaultTitle;
                return (
                  <div key={t.thread_id}
                    className={`history-item ${currentThreadId === t.thread_id ? 'active' : ''}`}
                    onClick={() => selectThread(t.thread_id)}
                    onMouseLeave={() => dropdownActiveId === t.thread_id && setDropdownActiveId(null)}
                  >
                    <div className="history-item-content">
                      {editingThreadId === t.thread_id ? (
                        <input className="history-edit-input" value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => saveTitle(t.thread_id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTitle(t.thread_id);
                            if (e.key === 'Escape') setEditingThreadId(null);
                          }}
                          autoFocus onClick={(e) => e.stopPropagation()} />
                      ) : (
                        <div className="history-title">{displayTitle}</div>
                      )}
                      <div className="history-time">{timeAgo(t.last_updated)}</div>
                    </div>
                    <div className="history-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="history-more-btn"
                        onClick={() => setDropdownActiveId(dropdownActiveId === t.thread_id ? null : t.thread_id)}>
                        <FiMoreVertical />
                      </button>
                      {dropdownActiveId === t.thread_id && (
                        <div className="history-dropdown">
                          <button onClick={() => startEdit(t.thread_id, displayTitle)}><FiEdit2 size={12} /> Rename</button>
                          <button className="del-btn" onClick={() => deleteChat(t.thread_id)}><FiTrash2 size={12} /> Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="beebot-main">
          <div className="beebot-header">
            <div className="bot-selector"><span>🐝 BeeBot Pro</span></div>
            <button className="close-beebot-btn" onClick={() => setIsOpen(false)}><FiX size={20} /></button>
          </div>

          {activeMessages.length === 0 ? (
            <div className="beebot-empty-state">
              <div className="orb-graphic"></div>
              <h1>Good Morning</h1>
              <h2 className="subtitle">How Can I <span className="highlight">Assist You Today?</span></h2>
              <div className="beebot-floating-input">
                <span className="magic-icon">✨</span>
                <input type="text" placeholder="Initiate a query or send a command to the AI..."
                  value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)} />
                <button className="beebot-send" onClick={(e) => handleSendMessage(e)} disabled={isLoading || !inputValue.trim()}><FiSend /></button>
              </div>
              <div className="beebot-action-pills">
                <button onClick={() => handleSendMessage(null, 'Analyze my latest spending trends')}><FiTrendingUp /> Analyze Spending</button>
                <button onClick={() => handleSendMessage(null, 'What is my highest expense category?')}><FiPieChart /> Categorize</button>
                <button onClick={() => handleSendMessage(null, 'Can you give me budget tips?')}><FiPenTool /> Budget Tips</button>
              </div>
            </div>
          ) : (
            <div className="beebot-chat-flow">
              <div className="chat-scroll-area">
                {activeMessages.map((msg, i) => (
                  <div key={i} className={`bee-msg ${msg.role}`}>
                    <div className="bee-bubble">
                      {msg.content}
                      <span className="msg-time">
                        {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: 'numeric' }).format(new Date(msg.created_at))}
                      </span>
                    </div>
                  </div>
                ))}
                {isLoading && <div className="bee-msg model"><div className="bee-bubble typing">AI is thinking...</div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="beebot-bottom-input">
                <div className="beebot-floating-input active-chat">
                  <span className="magic-icon">✨</span>
                  <input type="text" placeholder="Send a message..." value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)} />
                  <button className="beebot-send" onClick={(e) => handleSendMessage(e)} disabled={isLoading || !inputValue.trim()}><FiSend /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
