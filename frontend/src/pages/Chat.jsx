import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sendMessage, getChatSessions } from '../services/api';
import { Send, Bot, User, Sparkles, MessageSquare, Plus, Trash2 } from 'lucide-react';

const Chat = () => {
    const location = useLocation();
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your Healthora Assistant. How can I help you regarding your medical data or symptoms today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        loadSessions();
        
        // Check for session parameter in URL
        const params = new URLSearchParams(location.search);
        const sessionParam = params.get('session');
        if (sessionParam) {
            loadSession(sessionParam);
        }
    }, [location]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadSessions = async () => {
        try {
            const res = await getChatSessions();
            setSessions(res.data);
        } catch (err) {
            console.error('Failed to load sessions', err);
        }
    };

    const startNewChat = () => {
        setCurrentSessionId(null);
        setMessages([{ role: 'assistant', content: 'Hello! I am your Healthora Assistant. How can I help you regarding your medical data or symptoms today?' }]);
    };

    const formatMessage = (text) => {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>')
            .replace(/^(\d+\.\s)/gm, '<br/>$1')
            .replace(/^([-•]\s)/gm, '<br/>$1');
    };

    const loadSession = async (sessionId) => {
        setCurrentSessionId(sessionId);
        setLoading(true);
        try {
            const res = await sendMessage('', sessionId);
            const history = res.data.history || [];
            setMessages(history.length > 0 ? history : [{ role: 'assistant', content: 'Session loaded. How can I help you?' }]);
        } catch (err) {
            console.error('Failed to load session', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteSession = async (sessionId, e) => {
        e.stopPropagation();
        if (!confirm('Delete this chat?')) return;
        try {
            await fetch(`http://127.0.0.1:8000/api/chat/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (currentSessionId === sessionId) startNewChat();
            loadSessions();
        } catch (err) {
            console.error('Failed to delete session', err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await sendMessage(userMsg, currentSessionId);
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response, isMedical: res.data.is_medical }]);
            
            if (!currentSessionId) {
                setCurrentSessionId(res.data.session_id);
                loadSessions();
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting to the intelligence core.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-page">
            {sessions.length > 0 && (
                <aside className="chat-sidebar">
                    <button className="new-chat-btn" onClick={startNewChat}>
                        <Plus size={18} /> New Chat
                    </button>
                    <div className="sessions-list">
                        {sessions.map(session => (
                            <div 
                                key={session.session_id} 
                                className={`session-item ${currentSessionId === session.session_id ? 'active' : ''}`}
                                onClick={() => loadSession(session.session_id)}
                            >
                                <MessageSquare size={16} />
                                <span>{session.title}</span>
                                <button className="delete-btn" onClick={(e) => deleteSession(session.session_id, e)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>
            )}
            
            <div className="chat-container card">
                <div className="chat-header">
                    <Bot size={24} color="var(--accent-primary)" />
                    <div>
                        <h3>MediPhi Intelligence</h3>
                        <span className="typing-status">{loading ? 'AI is thinking...' : 'Ready to help'}</span>
                    </div>
                </div>

                <div className="messages-area" ref={scrollRef}>
                    {messages.map((msg, i) => (
                        <div key={i} className={`message-wrapper ${msg.role}`}>
                            <div className="msg-avatar">
                                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                            </div>
                            <div className={`message-bubble ${msg.isMedical ? 'medical-bubble' : ''}`}>
                                {msg.isMedical && (
                                    <div className="medical-tag">
                                        <Sparkles size={12} /> Medical Insight
                                    </div>
                                )}
                                <div className="message-content" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="message-wrapper assistant">
                            <div className="msg-avatar"><Bot size={16} /></div>
                            <div className="message-bubble typing-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                </div>

                <form className="chat-input-area" onSubmit={handleSend}>
                    <input
                        type="text"
                        placeholder="Ask anything about your health..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" className="send-btn btn-primary" disabled={!input.trim() || loading}>
                        <Send size={18} />
                    </button>
                </form>
            </div>

            <style jsx>{`
        .chat-page {
          height: calc(100vh - 160px);
          display: flex;
          gap: 20px;
        }

        .chat-sidebar {
          width: 280px;
          background: var(--surface-dark);
          border-radius: 20px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .new-chat-btn {
          background: var(--accent-primary);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .new-chat-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(58, 134, 255, 0.3);
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
        }

        .session-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          color: var(--text-secondary);
          position: relative;
        }

        .session-item span {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .delete-btn {
          opacity: 0;
          background: rgba(239, 68, 68, 0.1);
          border: none;
          color: #ef4444;
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .session-item:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .session-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .session-item.active {
          background: rgba(58, 134, 255, 0.1);
          color: var(--accent-primary);
          border: 1px solid rgba(58, 134, 255, 0.3);
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
        }

        .chat-header {
          padding: 20px 30px;
          display: flex;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.02);
        }

        .typing-status {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .messages-area {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .message-wrapper {
          display: flex;
          gap: 15px;
          max-width: 80%;
        }

        .message-wrapper.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .msg-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--surface-lighter);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid var(--border-color);
        }

        .user .msg-avatar {
          background: var(--accent-primary);
        }

        .message-bubble {
          padding: 16px 20px;
          border-radius: 20px;
          background: var(--surface-lighter);
          line-height: 1.6;
          font-size: 15px;
        }

        .message-content {
          line-height: 1.6;
        }

        .message-content strong {
          font-weight: 700;
          color: var(--accent-primary);
        }

        .user .message-bubble {
          background: var(--accent-primary);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .assistant .message-bubble {
          border-bottom-left-radius: 4px;
        }

        .medical-bubble {
          border: 1px solid rgba(58, 134, 255, 0.4);
          background: rgba(58, 134, 255, 0.05);
        }

        .medical-tag {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--accent-primary);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .chat-input-area {
          padding: 24px 30px;
          display: flex;
          gap: 15px;
          background: rgba(255, 255, 255, 0.01);
          border-top: 1px solid var(--border-color);
        }

        .chat-input-area input {
          flex: 1;
          background: var(--surface-lighter);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 14px 20px;
          color: white;
          outline: none;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
          padding: 12px 20px;
        }

        .typing-dots span {
          width: 6px;
          height: 6px;
          background: var(--text-secondary);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
        </div>
    );
};

export default Chat;
