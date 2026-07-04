import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiSend, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiPieChart, FiTrendingUp, FiPenTool, FiLoader } from 'react-icons/fi';
import webotLogo from '../../assets/webot_logo.png';
import webotLogoCircle from '../../assets/webot_logo_circle.png';
import api from '../../services/api';
import axios from 'axios';
import { toast } from 'react-toastify';
import UploadReviewModal from '../UploadReviewModal/UploadReviewModal';
import CategoryChart from '../Charts/CategoryChart';
import IncomeExpenseChart from '../Charts/IncomeExpenseChart';
import SpendingChart from '../Charts/SpendingChart';
import { useDashboard } from '../../context/DashboardContext';
import { useAuth } from '../../context/AuthContext';
import ChatBotLoader from './ChatBotLoader';
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

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
};

const renderMarkdown = (text: string): React.ReactNode => {
  const clean = text
    .replace('[CHART:category_breakdown]', '')
    .replace('[CHART:income_expense]', '')
    .replace('[CHART:spending_trends]', '')
    .trim();

  const lines = clean.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="chat-md-list">
          {listItems.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: parseLine(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const parseLine = (line: string): string => {
    return line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<![*])\*(?![*])([^*\n]+)\*(?![*])/g, '<em>$1</em>');
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Headings: ### ## #
    const h3 = trimmed.match(/^###\s+(.+)/);
    const h2 = trimmed.match(/^##\s+(.+)/);
    const h1 = trimmed.match(/^#\s+(.+)/);
    const bulletMatch = trimmed.match(/^[*\-]\s+(.+)/);
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)/);

    if (h3) {
      flushList(`${idx}`);
      elements.push(<h4 key={`h3-${idx}`} className="chat-md-h3" dangerouslySetInnerHTML={{ __html: parseLine(h3[1]) }} />);
    } else if (h2) {
      flushList(`${idx}`);
      elements.push(<h3 key={`h2-${idx}`} className="chat-md-h2" dangerouslySetInnerHTML={{ __html: parseLine(h2[1]) }} />);
    } else if (h1) {
      flushList(`${idx}`);
      elements.push(<h2 key={`h1-${idx}`} className="chat-md-h1" dangerouslySetInnerHTML={{ __html: parseLine(h1[1]) }} />);
    } else if (bulletMatch) {
      listItems.push(bulletMatch[1]);
    } else if (numberedMatch) {
      listItems.push(numberedMatch[1]);
    } else {
      flushList(`${idx}`);
      if (trimmed !== '') {
        elements.push(
          <p key={`p-${idx}`} className="chat-md-p"
            dangerouslySetInnerHTML={{ __html: parseLine(trimmed) }} />
        );
      }
    }
  });
  flushList('end');
  return <>{elements}</>;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { charts, refreshDashboard } = useDashboard();
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'There';
  
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);

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

  const [preparingUpload, setPreparingUpload] = useState(false);

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    setPreparingUpload(true);
    // Add a slight delay to let the UI update and show the spinner before the browser blocks the thread
    setTimeout(() => {
      fileInputRef.current?.click();
      setPreparingUpload(false);
    }, 400);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const toastId = toast.loading('Analyzing statement with AI...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/api/upload/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
      });
      
      toast.update(toastId, { render: `Found ${response.data.count} transactions!`, type: 'info', isLoading: false, autoClose: 3000 });
      setParsedTransactions(response.data.transactions || []);
      setShowUploadModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      console.error('Chat Upload Error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to analyze file.';
      toast.update(toastId, { render: `Error: ${errorMsg}`, type: 'error', isLoading: false, autoClose: 5000 });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async (reviewedTransactions: any[]) => {
    const toastId = toast.loading('Importing transactions...');
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/api/upload/confirm`, { transactions: reviewedTransactions }, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      toast.update(toastId, { render: `Successfully imported ${response.data.count} transactions!`, type: 'success', isLoading: false, autoClose: 5000 });
      setShowUploadModal(false);
      setParsedTransactions([]);
      refreshDashboard();
      handleSendMessage(null, "I just uploaded a bank statement and saved new transactions. Can you review my updated expenses?");
    } catch (error: any) {
      toast.update(toastId, { render: `Error importing: ${error.response?.data?.detail || 'Unknown error'}`, type: 'error', isLoading: false, autoClose: 5000 });
    }
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
      <>
        <div className="chat-widget-container">
          <button className="chat-toggle-btn" onClick={() => setIsOpen(true)} style={{ background: 'none', border: 'none', padding: 0, width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 16px rgba(108,63,209,0.35)' }}>
            <img src={webotLogo} alt="WeBot" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
    <div className="beebot-overlay">
      <div className="beebot-layout">
        {/* Sidebar */}
        <div className="beebot-sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <img src={webotLogo} alt="WeBot Logo" style={{ width: 36, height: 36, borderRadius: '8px', objectFit: 'cover' }} />
            </div>
            <h2>WeBot</h2>
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
        <div className="beebot-main" style={{ position: 'relative' }}>
          {isUploading && <ChatBotLoader />}
          <div className="beebot-header">
            <div className="bot-selector"><span>☘️ WeBot Pro</span></div>
            <button className="close-beebot-btn" onClick={() => setIsOpen(false)}><FiX size={20} /></button>
          </div>

          {activeMessages.length === 0 ? (
            <div className="beebot-empty-state">
              <img src={webotLogo} alt="WeBot" className="orb-graphic" />
              <h1>Hello {firstName} 👋</h1>
              <h2 className="subtitle"><span className="highlight">{getGreeting()}!</span> How Can I Assist You Today?</h2>
              <div className="beebot-floating-input">
                <button className="chat-upload-btn" onClick={handleUploadClick} disabled={isUploading || isLoading || preparingUpload} title="Upload Statement">
                  {preparingUpload ? <FiLoader className="spin-icon" /> : <FiPlus />}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.csv,.xlsx,.xls" className="hidden" style={{ display: 'none' }} />
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
                      {msg.content.includes('[CHART:category_breakdown]') ? (
                        <>
                          <div className="chat-md-wrap">{renderMarkdown(msg.content.replace('[CHART:category_breakdown]', ''))}</div>
                          <div className="chat-chart-wrapper" style={{ marginTop: '0.75rem', background: '#f9fafb', borderRadius: '12px', padding: '12px', width: '100%', boxSizing: 'border-box' }}>
                            <CategoryChart data={charts?.category_breakdown || []} />
                          </div>
                        </>
                      ) : msg.content.includes('[CHART:income_expense]') ? (
                        <>
                          <div className="chat-md-wrap">{renderMarkdown(msg.content.replace('[CHART:income_expense]', ''))}</div>
                          <div className="chat-chart-wrapper" style={{ marginTop: '0.75rem', background: '#f9fafb', borderRadius: '12px', padding: '12px', width: '100%', boxSizing: 'border-box', height: '340px' }}>
                            <IncomeExpenseChart data={charts?.credit_vs_debit || []} />
                          </div>
                        </>
                      ) : msg.content.includes('[CHART:spending_trends]') ? (
                        <>
                          <div className="chat-md-wrap">{renderMarkdown(msg.content.replace('[CHART:spending_trends]', ''))}</div>
                          <div className="chat-chart-wrapper" style={{ marginTop: '0.75rem', background: '#f9fafb', borderRadius: '12px', padding: '12px', width: '100%', boxSizing: 'border-box' }}>
                            <SpendingChart />
                          </div>
                        </>
                      ) : (
                        <div className="chat-md-wrap">{renderMarkdown(msg.content)}</div>
                      )}
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
                  <button className="chat-upload-btn" onClick={handleUploadClick} disabled={isUploading || isLoading || preparingUpload} title="Upload Statement">
                    {preparingUpload ? <FiLoader className="spin-icon" /> : <FiPlus />}
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.csv,.xlsx,.xls" className="hidden" style={{ display: 'none' }} />
                  <input type="text" placeholder="Ask me about your finances..." value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)} />
                  <button className="beebot-send" onClick={(e) => handleSendMessage(e)} disabled={isLoading || !inputValue.trim()}><FiSend /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <UploadReviewModal 
        isOpen={showUploadModal} 
        transactions={parsedTransactions} 
        onConfirm={handleConfirmImport} 
        onClose={() => {
          setShowUploadModal(false);
          setParsedTransactions([]);
        }}
        loading={isUploading} 
      />
    </div>
    </>
  );
};

export default ChatWidget;
