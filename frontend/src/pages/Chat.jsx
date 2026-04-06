import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { guestChat, sendMessage as apiSend, getChatHistory, clearChatHistory, analyzeGuestReport, analyzeReport, deleteChatSession } from '../services/api';
import { Send, Bot, User, Plus, Paperclip, Trash2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const WELCOME = 'Hello! I am **Vaidya Assist AI**, your personal health assistant. Ask me anything about health, symptoms, diet, or your medical reports.\n\nI can respond in **English or Telugu** 🇮🇳';

const isLoggedIn = () => !!localStorage.getItem('access_token');

const Chat = () => {
  const { language, toggleLanguage } = useLanguage();
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => uuidv4());
  const [sessions, setSessions] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [hoveredSessionId, setHoveredSessionId] = useState(null);
  const [lastDocId, setLastDocId] = useState(null);

  const [appointmentMode, setAppointmentMode] = useState(false)
  const [appointmentSymptoms, setAppointmentSymptoms] = useState('')
  const [appointmentCity, setAppointmentCity] = useState('Hyderabad')
  const [appointmentLoading, setAppointmentLoading] = useState(false)
  const [appointmentResult, setAppointmentResult] = useState(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const msgCount = messages.filter(m => m.role === 'user').length;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Fix 2 step 3: Only load sessions list on mount, do NOT flatten all history
  useEffect(() => {
    if (isLoggedIn()) {
      loadSessions();
    }
  }, []);

  // Fix 4: loadSessions uses getChatHistory() (no session_id) to get structured sessions
  const loadSessions = () => {
    if (!isLoggedIn()) return;
    getChatHistory()
      .then(r => {
        if (r.data?.sessions) {
          setSessions(r.data.sessions);
        }
      })
      .catch(() => { });
  };

  // Fix 2 step 1: Load a specific session's messages when clicked
  const loadSession = async (session) => {
    try {
      setLoading(true);
      setSessionId(session.session_id);
      const res = await getChatHistory(session.session_id);
      if (res.data?.messages?.length) {
        setMessages(res.data.messages.map(m => ({ role: m.role, content: m.content })));
      } else if (Array.isArray(res.data) && res.data.length) {
        // Handle flat array fallback
        setMessages(res.data.map(m => ({ role: m.role, content: m.content })));
      } else {
        setMessages([{ role: 'assistant', content: WELCOME }]);
      }
    } catch (err) {
      toast.error('Could not load chat session');
      setMessages([{ role: 'assistant', content: WELCOME }]);
    } finally {
      setLoading(false);
      if (isMobile) setSidebarOpen(false);
    }
  };

  const startNewChat = () => {
    setSessionId(uuidv4());
    setMessages([{ role: 'assistant', content: WELCOME }]);
    setLastDocId(null);
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return;
    try {
      await clearChatHistory();
      toast.success('Chat history cleared');
      startNewChat();
      setSessions([]);
    } catch (_) {
      toast.error('Failed to clear history');
    }
  };

  const handleDeleteSession = async (e, sessionToDelete) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat session?')) return;
    try {
      await deleteChatSession(sessionToDelete.session_id);
      toast.success('Chat session deleted');
      if (sessionId === sessionToDelete.session_id) {
        startNewChat();
      }
      loadSessions();
    } catch (_) {
      toast.error('Failed to delete session');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      let res;
      if (isLoggedIn()) {
        res = await apiSend(text, language, sessionId, lastDocId);
        if (res.data.session_id) setSessionId(res.data.session_id);
        loadSessions();
      } else {
        const history = messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content }));
        history.push({ role: 'user', content: text });
        res = await guestChat(history, language);
        if (res.data.session_id) setSessionId(res.data.session_id);
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        isMedical: res.data.is_medical,
        documentType: res.data.document_type,
        sourceDetail: res.data.source_detail
      }]);
    } catch (err) {
      toast.error('Failed to get a response. Please try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Sorry, I could not connect right now. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentPrep = async () => {
    if (!appointmentSymptoms.trim()) {
      toast.error('Please describe your symptoms first')
      return
    }
    setAppointmentLoading(true)
    setAppointmentResult(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        'http://localhost:8000/api/chat/appointment-prep',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            symptoms: appointmentSymptoms,
            language: language,
            city: appointmentCity
          })
        }
      )
      const data = await res.json()
      if (data.success) {
        setAppointmentResult(data.data)
      } else {
        toast.error(data.error || 'Failed to generate guide')
      }
    } catch {
      toast.error('Connection error. Please try again.')
    } finally {
      setAppointmentLoading(false)
    }
  }

  // Fix 5: File upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, PDF files allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: `📎 Uploaded: ${file.name}` }]);
    setLoading(true);
    const uploadToast = toast.loading('Analyzing your report...');

    try {
      let res;
      if (isLoggedIn()) {
        res = await analyzeReport(file, language);
      } else {
        res = await analyzeGuestReport(file, language);
      }

      const data = res.data;
      if (data.doc_id) setLastDocId(data.doc_id);
      const explanation = data.explanation
        || data.gemini_extraction?.raw_findings
        || 'Could not analyze this file.';

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: explanation,
        isMedical: true,
        documentType: data.document_type,
        sourceDetail: data.source_detail
      }]);
      toast.success('Report analyzed', { id: uploadToast });
    } catch (err) {
      toast.error('Failed to analyze report', { id: uploadToast });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Could not analyze the file. Please try again or use the Reports page.'
      }]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const SIDEBAR_W = 260;

  return (
    <div className="page-enter" style={{
      height: 'calc(100vh - 52px)',
      display: 'flex',
      background: '#0F1117',
      overflow: 'hidden'
    }}>
      <Toaster position="top-right" toastOptions={{ className: 'toast-dark' }} />

      {/* Left Sidebar */}
      <div style={{
        width: sidebarOpen ? (isMobile ? '100%' : SIDEBAR_W) : 0,
        minWidth: sidebarOpen ? (isMobile ? '100%' : SIDEBAR_W) : 0,
        position: isMobile && sidebarOpen ? 'absolute' : 'relative',
        top: isMobile && sidebarOpen ? 0 : 'auto',
        left: isMobile && sidebarOpen ? 0 : 'auto',
        bottom: isMobile && sidebarOpen ? 0 : 'auto',
        zIndex: isMobile && sidebarOpen ? 100 : 'auto',
        background: '#1A1D27',
        borderRight: '1px solid #2A2D3A',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width .2s ease, min-width .2s ease',
        flexShrink: 0,
      }}>
        {sidebarOpen && (
          <>
            {/* New Chat */}
            <div style={{ padding: '16px 12px', borderBottom: '1px solid #2A2D3A', display: 'flex', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={startNewChat}
              >
                <Plus size={16} /> New Chat
              </button>
              {isMobile && sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'none', border: 'none',
                    color: '#9CA3AF', cursor: 'pointer',
                    padding: 4, marginLeft: 'auto'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sessions list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {isLoggedIn() ? (
                sessions.length > 0 ? (
                  sessions.map((s, i) => (
                    <div
                      key={s.session_id || i}
                      onClick={() => loadSession(s)}
                      className="stagger-item"
                      style={{
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8,
                        background: s.session_id === sessionId ? 'rgba(37,99,235,.15)' : 'transparent',
                        color: s.session_id === sessionId ? '#2563EB' : '#9CA3AF',
                        fontSize: '0.8rem',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        setHoveredSessionId(s.session_id);
                        if (s.session_id !== sessionId)
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={e => {
                        setHoveredSessionId(null);
                        if (s.session_id !== sessionId)
                          e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <MessageSquare size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {s.title || 'Chat Session'}
                      </span>
                      {hoveredSessionId === s.session_id && (
                        <button
                          onClick={(e) => handleDeleteSession(e, s)}
                          style={{
                            background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                            color: '#EF4444', display: 'flex', alignItems: 'center', opacity: 0.8
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = 0.8; }}
                          title="Delete Session"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px 12px', color: '#6B7280', fontSize: '0.8rem' }}>
                    No past sessions yet
                  </div>
                )
              ) : (
                <div style={{ padding: '16px 12px' }}>
                  <div style={{ color: '#F8F9FA', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                    Current Session
                  </div>
                  <div style={{ color: '#6B7280', fontSize: '0.75rem', lineHeight: 1.5 }}>
                    Sign in to save your conversation history
                  </div>
                  <Link to="/login" className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center', display: 'flex' }}>
                    Sign In
                  </Link>
                </div>
              )}
            </div>

            {/* Clear History (logged in only) */}
            {isLoggedIn() && (
              <div style={{ padding: '10px 12px', borderTop: '1px solid #2A2D3A' }}>
                <button
                  className="btn btn-sm"
                  style={{ width: '100%', justifyContent: 'center', color: '#EF4444', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}
                  onClick={handleClearHistory}
                >
                  <Trash2 size={13} /> Clear History
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{
          padding: isMobile ? '10px 12px' : '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #2A2D3A',
          background: 'rgba(26,29,39,.95)', backdropFilter: 'blur(10px)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Sidebar toggle */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSidebarOpen(v => !v)}
              style={{ padding: '6px 8px' }}
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            <div style={{ width: 34, height: 34, background: 'rgba(37,99,235,.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Bot size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Vaidya Assist AI</div>
              <div style={{ fontSize: '0.7rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="status-dot" />
                {loading ? 'Thinking…' : 'Online'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isLoggedIn() && (
              <Link to="/register" style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Sign up to save chat</Link>
            )}
            
            {isLoggedIn() && (
              <button
                onClick={() => {
                  setAppointmentMode(v => !v)
                  setAppointmentResult(null)
                  setAppointmentSymptoms('')
                }}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  border: appointmentMode
                    ? '1.5px solid #F59E0B'
                    : '1px solid #2A2D3A',
                  background: appointmentMode
                    ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: appointmentMode ? '#F59E0B' : '#9CA3AF',
                  cursor: 'pointer', fontSize: '0.75rem',
                  fontWeight: appointmentMode ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
              >
                🏥 {appointmentMode ? 'Back to Chat' : 'Pre-appointment'}
              </button>
            )}

            <div className="lang-toggle">
              <button className={language === 'english' ? 'active' : ''} onClick={() => language !== 'english' && toggleLanguage()}>EN</button>
              <button className={language === 'telugu' ? 'active' : ''} onClick={() => language !== 'telugu' && toggleLanguage()}>తె</button>
            </div>
          </div>
        </div>

        {/* Appointment Mode Panel */}
        {appointmentMode && (
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: 'clamp(14px, 3vw, 24px)',
            display: 'flex', flexDirection: 'column', gap: 16
          }}>

            {/* Header */}
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 12, padding: '14px 18px'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: 10, marginBottom: 6
              }}>
                <span style={{ fontSize: '1.3rem' }}>🏥</span>
                <div>
                  <div style={{
                    color: '#F8F9FA', fontWeight: 700,
                    fontSize: '0.95rem'
                  }}>
                    Pre-appointment Preparation
                  </div>
                  <div style={{
                    color: '#9CA3AF', fontSize: '0.75rem'
                  }}>
                    Describe your symptoms → AI prepares your visit
                  </div>
                </div>
              </div>
            </div>

            {/* Input area */}
            {!appointmentResult && (
              <div style={{
                background: '#1A1D27',
                border: '1px solid #2A2D3A',
                borderRadius: 12, padding: 20
              }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{
                    color: '#9CA3AF', fontSize: '0.8rem',
                    fontWeight: 600, display: 'block', marginBottom: 8
                  }}>
                    📍 Your city in Andhra Pradesh
                  </label>
                  <select
                    value={appointmentCity}
                    onChange={e => setAppointmentCity(e.target.value)}
                    style={{
                      width: '100%', background: '#0F1117',
                      border: '1px solid #2A2D3A', borderRadius: 8,
                      padding: '9px 12px', color: '#F8F9FA',
                      fontSize: '0.85rem'
                    }}
                  >
                    {[
                      'Hyderabad', 'Vijayawada', 'Visakhapatnam',
                      'Tirupati', 'Guntur', 'Nellore', 'Kurnool',
                      'Rajahmundry', 'Kakinada', 'Peddapuram',
                      'Eluru', 'Ongole', 'Anantapur', 'Kadapa',
                      'Srikakulam', 'Vizianagaram'
                    ].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    color: '#9CA3AF', fontSize: '0.8rem',
                    fontWeight: 600, display: 'block', marginBottom: 8
                  }}>
                    🩺 Describe your symptoms
                  </label>
                  <textarea
                    value={appointmentSymptoms}
                    onChange={e => setAppointmentSymptoms(e.target.value)}
                    placeholder="e.g. I have chest pain for 3 days, mild fever, and shortness of breath when climbing stairs..."
                    rows={4}
                    style={{
                      width: '100%', background: '#0F1117',
                      border: '1px solid #2A2D3A', borderRadius: 8,
                      padding: '10px 12px', color: '#F8F9FA',
                      fontSize: '16px', resize: 'vertical',
                      fontFamily: 'inherit', lineHeight: 1.6
                    }}
                  />
                </div>

                {/* Quick symptom chips */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    color: '#6B7280', fontSize: '0.72rem',
                    marginBottom: 8
                  }}>
                    Common symptoms (tap to add):
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      'Chest pain', 'Fever', 'Headache',
                      'Joint pain', 'Diabetes symptoms',
                      'Eye problems', 'Skin rash',
                      'Stomach pain', 'Back pain',
                      'High BP'
                    ].map(symptom => (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => setAppointmentSymptoms(
                          prev => prev
                            ? prev + ', ' + symptom.toLowerCase()
                            : symptom.toLowerCase()
                        )}
                        style={{
                          padding: '4px 10px', borderRadius: 20,
                          border: '1px solid #2A2D3A',
                          background: 'rgba(255,255,255,0.03)',
                          color: '#9CA3AF', cursor: 'pointer',
                          fontSize: '0.72rem', transition: 'all 0.15s'
                        }}
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAppointmentPrep}
                  disabled={appointmentLoading || !appointmentSymptoms.trim()}
                  style={{
                    width: '100%', padding: '12px',
                    background: appointmentLoading || !appointmentSymptoms.trim()
                      ? 'rgba(245,158,11,0.3)' : '#F59E0B',
                    border: 'none', borderRadius: 10,
                    color: '#000', cursor: appointmentLoading
                      ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 10
                  }}
                >
                  {appointmentLoading ? (
                    <>
                      <div style={{
                        width: 18, height: 18,
                        border: '2px solid rgba(0,0,0,0.3)',
                        borderTop: '2px solid #000',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Preparing your guide...
                    </>
                  ) : (
                    '🏥 Generate Pre-appointment Guide'
                  )}
                </button>
              </div>
            )}

            {/* Results */}
            {appointmentResult && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 12
              }}>

                {/* Reset button */}
                <button
                  onClick={() => {
                    setAppointmentResult(null)
                    setAppointmentSymptoms('')
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 14px', borderRadius: 8,
                    background: 'rgba(107,114,128,0.1)',
                    border: '1px solid #2A2D3A',
                    color: '#9CA3AF', cursor: 'pointer',
                    fontSize: '0.78rem'
                  }}
                >
                  ← Try different symptoms
                </button>

                {/* Specialist card */}
                <div style={{
                  background: appointmentResult.specialist?.urgency === 'emergency'
                    ? 'rgba(239,68,68,0.1)'
                    : appointmentResult.specialist?.urgency === 'urgent'
                      ? 'rgba(245,158,11,0.1)'
                      : 'rgba(37,99,235,0.1)',
                  border: `1px solid ${
                    appointmentResult.specialist?.urgency === 'emergency'
                      ? 'rgba(239,68,68,0.3)'
                      : appointmentResult.specialist?.urgency === 'urgent'
                        ? 'rgba(245,158,11,0.3)'
                        : 'rgba(37,99,235,0.3)'
                  }`,
                  borderRadius: 12, padding: '16px 18px'
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', flexWrap: 'wrap', gap: 8
                  }}>
                    <div>
                      <div style={{
                        color: '#9CA3AF', fontSize: '0.7rem',
                        fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: 4
                      }}>
                        👨‍⚕️ See this specialist
                      </div>
                      <div style={{
                        color: '#F8F9FA', fontWeight: 700,
                        fontSize: '1.1rem'
                      }}>
                        {appointmentResult.specialist?.type}
                      </div>
                      {appointmentResult.specialist?.telugu_name && (
                        <div style={{
                          color: '#9CA3AF', fontSize: '0.8rem'
                        }}>
                          {appointmentResult.specialist.telugu_name}
                        </div>
                      )}
                      <div style={{
                        color: '#9CA3AF', fontSize: '0.8rem',
                        marginTop: 4
                      }}>
                        {appointmentResult.specialist?.reason}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20,
                      fontSize: '0.72rem', fontWeight: 700,
                      textTransform: 'uppercase',
                      background: appointmentResult.specialist?.urgency === 'emergency'
                        ? '#EF4444'
                        : appointmentResult.specialist?.urgency === 'urgent'
                          ? '#F59E0B'
                          : appointmentResult.specialist?.urgency === 'soon'
                            ? 'rgba(245,158,11,0.2)'
                            : 'rgba(16,185,129,0.2)',
                      color: appointmentResult.specialist?.urgency === 'emergency'
                        ? '#fff'
                        : appointmentResult.specialist?.urgency === 'urgent'
                          ? '#000'
                          : appointmentResult.specialist?.urgency === 'soon'
                            ? '#F59E0B'
                            : '#10B981'
                    }}>
                      {appointmentResult.specialist?.urgency}
                    </span>
                  </div>
                </div>

                {/* Red flags */}
                {appointmentResult.red_flags?.length > 0 && (
                  <div style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 10, padding: '12px 16px'
                  }}>
                    <div style={{
                      color: '#EF4444', fontWeight: 700,
                      fontSize: '0.75rem', marginBottom: 8,
                      textTransform: 'uppercase', letterSpacing: '0.06em'
                    }}>
                      🚨 Seek Emergency Care If:
                    </div>
                    {appointmentResult.red_flags.map((flag, i) => (
                      <div key={i} style={{
                        color: '#FCA5A5', fontSize: '0.82rem',
                        marginBottom: 4, display: 'flex',
                        alignItems: 'flex-start', gap: 6
                      }}>
                        <span style={{ flexShrink: 0 }}>•</span>
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Two column grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 12
                }}>
                  {/* Questions to ask */}
                  {appointmentResult.questions?.length > 0 && (
                    <div style={{
                      background: '#1A1D27',
                      border: '1px solid #2A2D3A',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#60A5FA', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 10,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        ❓ Questions to Ask Doctor
                      </div>
                      {appointmentResult.questions.map((q, i) => (
                        <div key={i} style={{
                          color: '#D1D5DB', fontSize: '0.82rem',
                          marginBottom: 6, display: 'flex',
                          alignItems: 'flex-start', gap: 6
                        }}>
                          <span style={{
                            color: '#2563EB', fontWeight: 700,
                            flexShrink: 0, fontSize: '0.72rem'
                          }}>
                            {i + 1}.
                          </span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tests beforehand */}
                  {appointmentResult.tests_beforehand?.length > 0 && (
                    <div style={{
                      background: '#1A1D27',
                      border: '1px solid #2A2D3A',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#10B981', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 10,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        🧪 Tests to Get Beforehand
                      </div>
                      {appointmentResult.tests_beforehand.map((t, i) => (
                        <div key={i} style={{
                          color: '#D1D5DB', fontSize: '0.82rem',
                          marginBottom: 6, display: 'flex',
                          alignItems: 'flex-start', gap: 6
                        }}>
                          <span style={{
                            color: '#10B981', flexShrink: 0
                          }}>✓</span>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Documents to bring */}
                  {appointmentResult.documents_to_bring?.length > 0 && (
                    <div style={{
                      background: '#1A1D27',
                      border: '1px solid #2A2D3A',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#8B5CF6', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 10,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        📁 Documents to Bring
                      </div>
                      {appointmentResult.documents_to_bring.map((d, i) => (
                        <div key={i} style={{
                          color: '#D1D5DB', fontSize: '0.82rem',
                          marginBottom: 6, display: 'flex',
                          alignItems: 'flex-start', gap: 6
                        }}>
                          <span style={{
                            color: '#8B5CF6', flexShrink: 0
                          }}>📄</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cost estimate */}
                  {appointmentResult.estimated_cost && (
                    <div style={{
                      background: '#1A1D27',
                      border: '1px solid #2A2D3A',
                      borderRadius: 10, padding: '14px 16px'
                    }}>
                      <div style={{
                        color: '#F59E0B', fontWeight: 700,
                        fontSize: '0.75rem', marginBottom: 10,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>
                        💰 Estimated Cost in {appointmentCity}
                      </div>
                      {Object.entries(appointmentResult.estimated_cost)
                        .map(([key, value]) => (
                        <div key={key} style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'flex-start', marginBottom: 8,
                          gap: 8
                        }}>
                          <span style={{
                            color: '#9CA3AF', fontSize: '0.75rem',
                            textTransform: 'capitalize',
                            flex: 1
                          }}>
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span style={{
                            color: '#FDE68A', fontSize: '0.78rem',
                            fontWeight: 500, textAlign: 'right'
                          }}>
                            {value}
                          </span>
                        </div>
                      ))}
                      <div style={{
                        marginTop: 8, padding: '6px 10px',
                        background: 'rgba(16,185,129,0.08)',
                        borderRadius: 6, fontSize: '0.7rem',
                        color: '#10B981'
                      }}>
                        💡 Aarogyasri scheme may cover costs at
                        government hospitals
                      </div>
                    </div>
                  )}
                </div>

                {/* What to expect */}
                {appointmentResult.what_to_expect && (
                  <div style={{
                    background: 'rgba(37,99,235,0.06)',
                    border: '1px solid rgba(37,99,235,0.15)',
                    borderRadius: 10, padding: '14px 16px'
                  }}>
                    <div style={{
                      color: '#60A5FA', fontWeight: 700,
                      fontSize: '0.75rem', marginBottom: 8,
                      textTransform: 'uppercase', letterSpacing: '0.06em'
                    }}>
                      ℹ️ What to Expect During Visit
                    </div>
                    <p style={{
                      color: '#D1D5DB', fontSize: '0.85rem',
                      lineHeight: 1.6, margin: 0
                    }}>
                      {appointmentResult.what_to_expect}
                    </p>
                  </div>
                )}

                {/* AP Tip */}
                {appointmentResult.tip && (
                  <div style={{
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.15)',
                    borderRadius: 10, padding: '12px 16px',
                    display: 'flex', gap: 10, alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                      💡
                    </span>
                    <p style={{
                      color: '#A7F3D0', fontSize: '0.82rem',
                      lineHeight: 1.6, margin: 0
                    }}>
                      {appointmentResult.tip}
                    </p>
                  </div>
                )}

                {/* Hospitals */}
                {appointmentResult.hospitals?.length > 0 && (
                  <div style={{
                    background: '#1A1D27',
                    border: '1px solid #2A2D3A',
                    borderRadius: 10, padding: '14px 16px'
                  }}>
                    <div style={{
                      color: '#F59E0B', fontWeight: 700,
                      fontSize: '0.75rem', marginBottom: 10,
                      textTransform: 'uppercase', letterSpacing: '0.06em'
                    }}>
                      🏥 Recommended Facilities in {appointmentCity}
                    </div>
                    {appointmentResult.hospitals.map((h, i) => (
                      <div key={i} style={{
                        color: '#D1D5DB', fontSize: '0.82rem',
                        marginBottom: 4, display: 'flex',
                        alignItems: 'flex-start', gap: 6
                      }}>
                        <span style={{ color: '#F59E0B', flexShrink: 0 }}>
                          🏥
                        </span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Disclaimer */}
                <div style={{
                  fontSize: '0.7rem', color: '#6B7280',
                  padding: '8px 12px',
                  background: 'rgba(107,114,128,0.05)',
                  borderRadius: 8, lineHeight: 1.5
                }}>
                  ⚕️ This guide is AI-generated for informational purposes.
                  Always consult a qualified doctor for diagnosis and treatment.
                  In case of emergency, call 108 (ambulance) immediately.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} style={{ 
          flex: 1, overflowY: 'auto', padding: '20px 16px', 
          display: appointmentMode ? 'none' : 'flex', flexDirection: 'column', gap: 14 
        }}>
          {messages.length <= 1 && !loading && (
            <div className="empty-state" style={{ flex: 1, justifyContent: 'center' }}>
              <div className="empty-state-icon">🤖</div>
              <h3>Welcome to Vaidya Assist AI</h3>
              <p>Ask anything about your health, symptoms, or upload a report for a quick breakdown.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
                {[
                  'What are common flu symptoms?',
                  'Healthy dinner ideas',
                  'Explain my CBC report'
                ].map(q => (
                  <button 
                    key={q} 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setInput(q)}
                    style={{ fontSize: '0.75rem', borderRadius: 20 }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className="stagger-item"
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: 10, maxWidth: isMobile ? '90%' : '80%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? '#2563EB' : '#1A1D27',
                border: '1px solid #2A2D3A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: msg.role === 'user' ? '#fff' : '#9CA3AF',
              }}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? '#2563EB' : '#1A1D27',
                borderLeft: msg.role === 'assistant' ? '3px solid #2563EB' : 'none',
                color: msg.role === 'user' ? '#fff' : '#F8F9FA',
                fontSize: '0.875rem', lineHeight: 1.65,
              }}>
                {msg.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.documentType && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {msg.documentType === 'report' && <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(37,99,235,0.15)', color: '#60A5FA', fontSize: '0.65rem', fontWeight: 600 }}>🏥 Report</span>}
                        {msg.documentType === 'insurance' && <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontSize: '0.65rem', fontWeight: 600 }}>📑 Insurance</span>}
                        {msg.documentType === 'general' && <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: '0.65rem', fontWeight: 600 }}>🧠 General</span>}
                      </div>
                    )}
                    {msg.sourceDetail && (
                      <div style={{ marginTop: 4, fontSize: '0.65rem', color: '#6B7280' }}>
                        {msg.sourceDetail}
                      </div>
                    )}
                    {(msg.isMedical || msg.documentType) && (
                      <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#4B5563', borderTop: '1px solid #2A2D3A', paddingTop: 6, opacity: 0.8 }}>
                        ⚕️ Medical Insight • Always consult a qualified doctor
                      </div>
                    )}
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1A1D27', border: '1px solid #2A2D3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                <Bot size={14} />
              </div>
              <div style={{ padding: '12px 16px', background: '#1A1D27', borderRadius: '16px 16px 16px 4px', borderLeft: '3px solid #2563EB' }}>
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            </div>
          )}

          {/* 5-message nudge for guests */}
          {!isLoggedIn() && msgCount === 5 && (
            <div style={{ background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.2)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
              <p style={{ color: '#F8F9FA', marginBottom: 8, fontWeight: 600, fontSize: '0.875rem' }}>
                Sign up to save your conversation and get personalized insights
              </p>
              <Link to="/register" className="btn btn-primary btn-sm">Create free account</Link>
            </div>
          )}
        </div>

        {/* Input */}
        {!appointmentMode && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #2A2D3A', background: 'rgba(26,29,39,.95)', flexShrink: 0 }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              {/* Fix 5: File upload button */}
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload medical report"
                  disabled={loading}
                >
                  <Paperclip size={15} />
                </button>
              </>
              <input
                className="form-input"
                placeholder={language === 'telugu' ? 'ఆరోగ్య ప్రశ్న అడగండి...' : 'Ask a health question...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                style={{ flex: 1, fontSize: '16px' }}
              />
              <button type="submit" className="btn btn-primary" disabled={!input.trim() || loading}>
                <Send size={15} />
              </button>
            </form>
            <div style={{ fontSize: '0.68rem', color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
              Vaidya Assist is for informational purposes only — not a substitute for medical advice
            </div>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .chat-message-content {
            font-size: 0.875rem !important;
          }
          .chat-input-area {
            padding: 10px 12px !important;
          }
        }
        @media (max-width: 480px) {
          .chat-message-content {
            font-size: 0.82rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Chat;
