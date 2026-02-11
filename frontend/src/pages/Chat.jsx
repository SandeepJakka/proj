import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/api';
import { Send, Bot, User, Sparkles } from 'lucide-react';

const Chat = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your Healthora Assistant. How can I help you regarding your medical data or symptoms today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await sendMessage(userMsg);
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response, isMedical: res.data.is_medical }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting to the intelligence core.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-page">
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
                                {msg.content}
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
          justify-content: center;
        }

        .chat-container {
          width: 100%;
          max-width: 900px;
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
          line-height: 1.5;
          font-size: 15px;
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
