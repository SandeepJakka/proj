import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { startDietConsultation, startWorkoutConsultation, sendMessage as apiSend } from '../services/api';
import { Utensils, Dumbbell, MessageCircle, Loader, X, Bot, User, Send, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const isLoggedIn = () => !!localStorage.getItem('access_token');

const Lifestyle = () => {
  const navigate = useNavigate();
  const [loadingType, setLoadingType] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages, chatLoading]);

  const PREFILLS = {
    diet: "I need a personalized nutrition plan. Please ask me questions about my eating habits and health goals.",
    workout: "I need a personalized fitness plan. Please ask me questions about my fitness level and goals."
  };

  const openConsultation = async (type) => {
    setLoadingType(type);
    try {
      const res = type === 'diet'
        ? await startDietConsultation("General Health")
        : await startWorkoutConsultation("General Fitness");

      const sid = res.data.session_id;
      setSessionId(sid);
      setModalType(type);
      setChatMessages([]);
      setModalOpen(true);

      // Auto-send prefill message
      const prefill = PREFILLS[type];
      setChatMessages([{ role: 'user', content: prefill }]);
      setChatLoading(true);

      try {
        const aiRes = await apiSend(prefill, 'english', sid);
        setChatMessages(prev => [...prev, { role: 'assistant', content: aiRes.data.response }]);
        if (aiRes.data.session_id) setSessionId(aiRes.data.session_id);
      } catch (e) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Failed to connect. Please try again.' }]);
      } finally {
        setChatLoading(false);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail.toLowerCase().includes('profile')) {
        toast('Please set up your health profile first', { icon: '👤', duration: 3000 });
        setTimeout(() => navigate('/profile'), 1500);
      } else {
        toast.error(detail || 'Failed to start consultation');
      }
    } finally {
      setLoadingType(null);
    }
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await apiSend(text, 'english', sessionId);
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
      if (res.data.session_id) setSessionId(res.data.session_id);
    } catch (_) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const savePlan = () => {
    const lastAI = [...chatMessages].reverse().find(m => m.role === 'assistant');
    if (lastAI) {
      navigator.clipboard.writeText(lastAI.content);
      toast.success('Plan copied to clipboard');
    } else {
      toast.error('No plan to copy yet');
    }
  };

  return (
    <div className="lifestyle-page">
      <header className="page-header">
        <h1>Lifestyle Intelligence</h1>
        <p>AI-generated routines focused on longevity and safety.</p>
      </header>

      <div className="plans-grid">
        {/* Nutritional Guide */}
        <section className="plan-section card">
          <div className="p-header">
            <div className="p-icon" style={{ background: 'rgba(255,107,107,.1)', color: '#ff6b6b' }}>
              <Utensils size={28} />
            </div>
            <div className="p-title">
              <h2>Nutritional Guide</h2>
              <p>Personalized meal plans</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => openConsultation('diet')}
              disabled={loadingType === 'diet'}
              style={{ marginLeft: 'auto' }}
            >
              {loadingType === 'diet' ? <Loader className="spin" size={18} /> : <><MessageCircle size={18} /> Start Consultation</>}
            </button>
          </div>

          <div className="plan-body">
            <div className="plan-info">
              <MessageCircle size={48} color="#2563EB" />
              <h3>Interactive Consultation</h3>
              <p>I'll ask you questions about your eating habits, preferences, and lifestyle to create a truly personalized nutrition plan.</p>
              <ul>
                <li>✓ Review your lab results and health profile</li>
                <li>✓ Understand your dietary preferences and restrictions</li>
                <li>✓ Learn about your daily routine and goals</li>
                <li>✓ Create a customized 7-day meal plan</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Adaptive Fitness */}
        <section className="plan-section card">
          <div className="p-header">
            <div className="p-icon" style={{ background: 'rgba(77,150,255,.1)', color: '#4d96ff' }}>
              <Dumbbell size={28} />
            </div>
            <div className="p-title">
              <h2>Adaptive Fitness</h2>
              <p>Condition-aware workouts</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => openConsultation('workout')}
              disabled={loadingType === 'workout'}
              style={{ marginLeft: 'auto' }}
            >
              {loadingType === 'workout' ? <Loader className="spin" size={18} /> : <><MessageCircle size={18} /> Start Consultation</>}
            </button>
          </div>

          <div className="plan-body">
            <div className="plan-info">
              <MessageCircle size={48} color="#2563EB" />
              <h3>Interactive Consultation</h3>
              <p>I'll ask about your fitness level, any injuries or limitations, and your goals to design a safe and effective workout plan.</p>
              <ul>
                <li>✓ Assess your current fitness level</li>
                <li>✓ Identify any physical limitations or injuries</li>
                <li>✓ Understand your schedule and preferences</li>
                <li>✓ Create a personalized weekly workout routine</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Consultation Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setModalOpen(false)}>
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 16,
            width: '100%', maxWidth: 680, height: '80vh', maxHeight: 700,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #2A2D3A',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(37,99,235,.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <Bot size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {modalType === 'diet' ? 'Nutrition Consultation' : 'Fitness Consultation'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#10B981' }}>
                    {chatLoading ? 'Thinking…' : 'Online'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={savePlan}>
                  <Copy size={14} /> Save Plan
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 8, maxWidth: '85%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'user' ? '#2563EB' : '#0F1117',
                    border: '1px solid #2A2D3A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: msg.role === 'user' ? '#fff' : '#9CA3AF', fontSize: '0.75rem',
                  }}>
                    {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? '#2563EB' : '#0F1117',
                    borderLeft: msg.role === 'assistant' ? '3px solid #2563EB' : 'none',
                    color: msg.role === 'user' ? '#fff' : '#F8F9FA',
                    fontSize: '0.84rem', lineHeight: 1.6,
                  }}>
                    {msg.role === 'assistant' ? (
                      <div className="markdown-content"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F1117', border: '1px solid #2A2D3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                    <Bot size={12} />
                  </div>
                  <div style={{ padding: '10px 14px', background: '#0F1117', borderRadius: '14px 14px 14px 4px', borderLeft: '3px solid #2563EB' }}>
                    <div className="typing-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid #2A2D3A' }}>
              <form onSubmit={handleChatSend} style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Reply to Healthora AI…"
                  disabled={chatLoading}
                  style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn-primary" disabled={!chatInput.trim() || chatLoading} style={{ padding: '10px 14px' }}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .lifestyle-page { display: flex; flex-direction: column; gap: 32px; }
        .plans-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .plan-section { display: flex; flex-direction: column; gap: 30px; min-height: 500px; }
        .p-header { display: flex; align-items: center; gap: 20px; }
        .p-icon { width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; }
        .p-title h2 { font-size: 22px; margin-bottom: 4px; }
        .p-title p { font-size: 14px; }
        .plan-body { flex: 1; background: rgba(255,255,255,.02); border-radius: 20px; padding: 30px; overflow-y: auto; border: 1px solid var(--border); }
        .plan-info { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px; padding: 40px; }
        .plan-info h3 { font-size: 24px; color: var(--text); margin: 0; }
        .plan-info p { font-size: 16px; color: var(--text2); max-width: 500px; line-height: 1.6; }
        .plan-info ul { list-style: none; padding: 0; text-align: left; color: var(--text); }
        .plan-info li { padding: 8px 0; font-size: 15px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .plans-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default Lifestyle;
