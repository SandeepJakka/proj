import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { startDietConsultation, startWorkoutConsultation, sendMessage as apiSend, getCurrentPlans, saveHealthPlan } from '../services/api';
import { Utensils, Dumbbell, MessageCircle, Loader, X, Bot, User, Send, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useT } from '../context/LanguageContext';

const isLoggedIn = () => !!localStorage.getItem('access_token');

const Lifestyle = () => {
  const t = useT();
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

  const [savedPlans, setSavedPlans] = useState({});
  const [planGenerated, setPlanGenerated] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const [plansOpen, setPlansOpen] = useState(false);
  const [allPlans, setAllPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [activePlanTab, setActivePlanTab] = useState('nutrition');

  const [userMessageCount, setUserMessageCount] = useState(0);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (isLoggedIn()) {
      loadSavedPlans();
    }
  }, []);

  const loadSavedPlans = async () => {
    try {
      const res = await getCurrentPlans();
      setSavedPlans(res.data || {});
    } catch { }
  };

  const loadAllPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await getCurrentPlans();
      const data = res.data || {};
      const plans = [];
      if (data.nutrition) plans.push({ ...data.nutrition, plan_type: 'nutrition' });
      if (data.fitness) plans.push({ ...data.fitness, plan_type: 'fitness' });
      setAllPlans(plans);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setPlansLoading(false);
    }
  };

  const openPlansPanel = () => {
    setPlansOpen(true);
    loadAllPlans();
  };

  const PREFILLS = {
    diet: "I need a personalized nutrition plan. Please ask me questions about my eating habits and health goals.",
    workout: "I need a personalized fitness plan. Please ask me questions about my fitness level and goals."
  };

  const openConsultation = async (type) => {
    if (!isLoggedIn()) {
      toast.error('Please sign in to start a consultation');
      navigate('/login');
      return;
    }
    setLoadingType(type);
    try {
      const res = type === 'diet'
        ? await startDietConsultation("General Health")
        : await startWorkoutConsultation("General Fitness");

      const sid = res.data.session_id;
      const greeting = res.data.initial_message;

      setSessionId(sid);
      setModalType(type);
      setPlanGenerated(false);
      setUserMessageCount(0);
      // Show AI greeting directly — no fake user message
      setChatMessages([{ role: 'assistant', content: greeting }]);
      setModalOpen(true);
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

  const isPlanContent = (content) => {
    if (!content || content.length < 400) return false;
    const planKeywords = [
      '##', '**Day', '**Week', 'Breakfast', 'Lunch', 'Dinner',
      'Exercise', 'Workout', 'Monday', 'Tuesday', 'Wednesday',
      'Day 1', 'Week 1', 'Morning', 'Evening routine',
      'Meal Plan', 'Fitness Plan', 'Nutrition Plan'
    ];
    return planKeywords.some(kw => content.includes(kw));
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setUserMessageCount(prev => prev + 1);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await apiSend(text, 'english', sessionId);
      const response = res.data.response;

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response
      }]);

      if (res.data.session_id) setSessionId(res.data.session_id);

      // Detect if AI generated a full plan
      if (isPlanContent(response)) {
        setPlanGenerated(true);
      }
    } catch (_) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Connection error. Please try again.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const savePlan = async () => {
    // Find last AI message that looks like a plan
    const planMsg = [...chatMessages]
      .reverse()
      .find(m => m.role === 'assistant' && isPlanContent(m.content));

    if (!planMsg) {
      // No plan yet — just copy last AI message
      const lastAI = [...chatMessages]
        .reverse()
        .find(m => m.role === 'assistant');
      if (lastAI) {
        navigator.clipboard.writeText(lastAI.content);
        toast.success('Copied to clipboard');
      } else {
        toast.error('No content to save yet');
      }
      return;
    }

    setSavingPlan(true);
    try {
      await saveHealthPlan({
        plan_type: modalType === 'diet' ? 'nutrition' : 'fitness',
        plan_content: planMsg.content,
        goal: 'General Health'
      });
      toast.success('✅ Plan saved to your profile!');
      // Also copy to clipboard
      navigator.clipboard.writeText(planMsg.content);
      toast('Also copied to clipboard', { icon: '📋', duration: 2000 });
      // Reload saved plans
      loadSavedPlans();
      setPlanGenerated(false);
    } catch {
      toast.error('Failed to save plan. Please try again.');
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="lifestyle-page page-enter">
      <header className="page-header" style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, rowGap: 10
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>{t('life_title')}</h1>
          <p style={{ fontSize: 'clamp(0.85rem, 3vw, 1rem)', color: '#9CA3AF' }}>{t('life_subtitle')}</p>
        </div>
        {isLoggedIn() && (
          <button
            onClick={openPlansPanel}
            style={{
              background: 'rgba(37,99,235,0.1)',
              border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: 10, padding: 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 18px)',
              color: '#60A5FA', cursor: 'pointer',
              fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(37,99,235,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(37,99,235,0.1)';
            }}
          >
            {t('life_view_plans')}
          </button>
        )}
      </header>

      <div className="plans-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Nutritional Guide */}
        <section className="plan-section card card-hover stagger-item">
          <div className="p-header">
            <div className="p-icon" style={{ background: 'rgba(255,107,107,.1)', color: '#ff6b6b' }}>
              <Utensils size={28} />
            </div>
            <div className="p-title">
              <h2>{t('life_nutrition_title')}</h2>
              <p>{t('life_nutrition_sub')}</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => openConsultation('diet')}
              disabled={loadingType === 'diet'}
              style={{ marginLeft: 'auto' }}
            >
              {loadingType === 'diet' ? <Loader className="spin" size={18} /> : <><MessageCircle size={18} /> {t('life_start_consult')}</>}
            </button>
          </div>

          <div className="plan-body">
            {savedPlans.nutrition ? (
              <div style={{
                height: '100%', display: 'flex',
                flexDirection: 'column', gap: 12
              }}>
                <div className="animate-in" style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexShrink: 0
                }}>
                  <span style={{
                    color: '#10B981', fontSize: '0.8rem',
                    fontWeight: 600, display: 'flex', alignItems: 'center',
                    gap: 6
                  }}>
                    ✓ Saved {new Date(savedPlans.nutrition.created_at)
                      .toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                  </span>
                  <button
                    onClick={() => openConsultation('diet')}
                    className="btn btn-ghost btn-sm"
                    disabled={loadingType === 'diet'}
                  >
                    {loadingType === 'diet'
                      ? <Loader className="spin" size={14} />
                      : '🔄 Regenerate'}
                  </button>
                </div>
                <div className="markdown-content animate-in"
                  style={{
                    flex: 1, overflowY: 'auto',
                    fontSize: '0.85rem', lineHeight: 1.7
                  }}>
                  <ReactMarkdown>
                    {savedPlans.nutrition.plan_content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="plan-info animate-in">
                <MessageCircle size={48} color="#2563EB" />
                <h3>{t('life_nutrition_heading')}</h3>
                <p>
                  {t('life_nutrition_desc')}
                </p>
                <ul>
                  <li>✓ Reviews your health profile and lab results</li>
                  <li>✓ Asks about your food preferences and restrictions</li>
                  <li>✓ Creates a customized 7-day meal plan</li>
                  <li>✓ Saves your plan for future reference</li>
                </ul>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openConsultation('diet')}
                  disabled={loadingType === 'diet'}
                >
                  {loadingType === 'diet'
                    ? <Loader className="spin" size={18} />
                    : <><MessageCircle size={18} /> {t('life_start_consult')}</>}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Adaptive Fitness */}
        <section className="plan-section card card-hover stagger-item">
          <div className="p-header">
            <div className="p-icon" style={{ background: 'rgba(77,150,255,.1)', color: '#4d96ff' }}>
              <Dumbbell size={28} />
            </div>
            <div className="p-title">
              <h2>{t('life_fitness_title')}</h2>
              <p>{t('life_fitness_sub')}</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => openConsultation('workout')}
              disabled={loadingType === 'workout'}
              style={{ marginLeft: 'auto' }}
            >
              {loadingType === 'workout' ? <Loader className="spin" size={18} /> : <><MessageCircle size={18} /> {t('life_start_consult')}</>}
            </button>
          </div>

          <div className="plan-body">
            {savedPlans.fitness ? (
              <div style={{
                height: '100%', display: 'flex',
                flexDirection: 'column', gap: 12
              }}>
                <div className="animate-in" style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexShrink: 0
                }}>
                  <span style={{
                    color: '#10B981', fontSize: '0.8rem',
                    fontWeight: 600, display: 'flex', alignItems: 'center',
                    gap: 6
                  }}>
                    ✓ Saved {new Date(savedPlans.fitness.created_at)
                      .toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                  </span>
                  <button
                    onClick={() => openConsultation('workout')}
                    className="btn btn-ghost btn-sm"
                    disabled={loadingType === 'workout'}
                  >
                    {loadingType === 'workout'
                      ? <Loader className="spin" size={14} />
                      : '🔄 Regenerate'}
                  </button>
                </div>
                <div className="markdown-content animate-in"
                  style={{
                    flex: 1, overflowY: 'auto',
                    fontSize: '0.85rem', lineHeight: 1.7
                  }}>
                  <ReactMarkdown>
                    {savedPlans.fitness.plan_content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="plan-info animate-in">
                <MessageCircle size={48} color="#2563EB" />
                <h3>{t('life_fitness_heading')}</h3>
                <p>
                  {t('life_fitness_desc')}
                </p>
                <ul>
                  <li>✓ Assesses your current fitness level</li>
                  <li>✓ Identifies physical limitations or injuries</li>
                  <li>✓ Creates a personalized weekly workout routine</li>
                  <li>✓ Saves your plan for future reference</li>
                </ul>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => openConsultation('workout')}
                  disabled={loadingType === 'workout'}
                >
                  {loadingType === 'workout'
                    ? <Loader className="spin" size={18} />
                    : <><MessageCircle size={18} /> {t('life_start_consult')}</>}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Saved Plans Drawer */}
      {plansOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }} onClick={() => setPlansOpen(false)}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: '100%', maxWidth: '100%',
            background: '#1A1D27',
            borderLeft: '1px solid #2A2D3A',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.4)'
          }} onClick={e => e.stopPropagation()}>

            {/* Panel Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #2A2D3A',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky', top: 0,
              background: '#1A1D27', zIndex: 1
            }}>
              <div>
                <h2 style={{
                  color: '#F8F9FA', fontSize: '1.1rem',
                  fontWeight: 700, margin: 0
                }}>
                  {t('life_saved_plans')}
                </h2>
                <p style={{
                  color: '#9CA3AF', fontSize: '0.8rem',
                  margin: '4px 0 0'
                }}>
                  {t('life_nutrition_sub')}
                </p>
              </div>
              <button
                onClick={() => setPlansOpen(false)}
                style={{
                  background: 'none', border: 'none',
                  color: '#9CA3AF', cursor: 'pointer',
                  fontSize: '1.2rem', padding: 4
                }}
              >
                ✕
              </button>
            </div>

            {/* Tab switcher */}
            <div style={{
              display: 'flex', borderBottom: '1px solid #2A2D3A',
              padding: '0 24px'
            }}>
              {[
                { key: 'nutrition', label: `🥗 ${t('life_nutrition_title')}`, color: '#FF6B6B' },
                { key: 'fitness', label: `💪 ${t('life_fitness_title')}`, color: '#4D96FF' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActivePlanTab(tab.key)}
                  style={{
                    padding: '14px 20px',
                    background: 'none', border: 'none',
                    borderBottom: activePlanTab === tab.key
                      ? `2px solid ${tab.color}` : '2px solid transparent',
                    color: activePlanTab === tab.key ? tab.color : '#6B7280',
                    cursor: 'pointer', fontWeight: 600,
                    fontSize: '0.85rem', marginBottom: -1
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Plan Content */}
            <div style={{ padding: '24px', flex: 1 }}>
              {plansLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  Loading plans...
                </div>
              ) : (
                <>
                  {activePlanTab === 'nutrition' && (
                    allPlans.find(p => p.plan_type === 'nutrition') ? (
                      <div>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: 20
                        }}>
                          <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>
                            Saved {new Date(
                              allPlans.find(p => p.plan_type === 'nutrition').created_at
                            ).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => {
                                const plan = allPlans.find(p => p.plan_type === 'nutrition');
                                navigator.clipboard.writeText(plan.plan_content);
                                toast.success('Plan copied!');
                              }}
                              className="btn btn-ghost btn-sm"
                            >
                              📋 Copy
                            </button>
                            <button
                              onClick={() => { setPlansOpen(false); openConsultation('diet'); }}
                              className="btn btn-ghost btn-sm"
                            >
                              {t('life_regenerate')}
                            </button>
                          </div>
                        </div>
                        <div className="markdown-content plan-content">
                          <ReactMarkdown>
                            {allPlans.find(p => p.plan_type === 'nutrition').plan_content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state" style={{ padding: 60 }}>
                        <div className="empty-state-icon">📋</div>
                        <h3>{t('life_no_plans')}</h3>
                        <p style={{ marginBottom: 20 }}>Start a consultation to generate your custom plan.</p>
                        <button
                          onClick={() => { setPlansOpen(false); openConsultation('diet'); }}
                          className="btn btn-primary"
                        >
                          {t('life_start_consult')}
                        </button>
                      </div>
                    )
                  )}

                  {activePlanTab === 'fitness' && (
                    allPlans.find(p => p.plan_type === 'fitness') ? (
                      <div>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: 20
                        }}>
                          <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>
                            Saved {new Date(
                              allPlans.find(p => p.plan_type === 'fitness').created_at
                            ).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => {
                                const plan = allPlans.find(p => p.plan_type === 'fitness');
                                navigator.clipboard.writeText(plan.plan_content);
                                toast.success('Plan copied!');
                              }}
                              className="btn btn-ghost btn-sm"
                            >
                              📋 Copy
                            </button>
                            <button
                              onClick={() => { setPlansOpen(false); openConsultation('workout'); }}
                              className="btn btn-ghost btn-sm"
                            >
                              {t('life_regenerate')}
                            </button>
                          </div>
                        </div>
                        <div className="markdown-content plan-content">
                          <ReactMarkdown>
                            {allPlans.find(p => p.plan_type === 'fitness').plan_content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state" style={{ padding: 60 }}>
                        <div className="empty-state-icon">📋</div>
                        <h3>{t('life_no_plans')}</h3>
                        <p style={{ marginBottom: 20 }}>Start a consultation to generate your custom plan.</p>
                        <button
                          onClick={() => { setPlansOpen(false); openConsultation('workout'); }}
                          className="btn btn-primary"
                        >
                          {t('life_start_consult')}
                        </button>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Consultation Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px, 3vw, 20px)',
        }} onClick={() => setModalOpen(false)}>
          <div style={{
            background: '#1A1D27', border: '1px solid #2A2D3A', borderRadius: 16,
            width: '100%', maxWidth: 680, height: '90vh', maxHeight: '90vh', margin: '0 auto',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: 'clamp(10px, 3vw, 14px) clamp(12px, 4vw, 20px)', borderBottom: '1px solid #2A2D3A',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(37,99,235,.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <Bot size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {modalType === 'diet' ? t('life_nutrition_title') : t('life_fitness_title')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#10B981' }}>
                    {chatLoading ? 'Thinking…' : 'Online'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {planGenerated && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={savePlan}
                    disabled={savingPlan}
                    style={{
                      background: '#10B981', border: 'none',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {savingPlan ? '...' : t('life_save_plan')}
                  </button>
                )}
                {!planGenerated && chatMessages.length > 1 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={savePlan}
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Copy size={12} /> Copy
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setModalOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 'clamp(10px, 3vw, 16px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 8, maxWidth: 'min(85%, 480px)',
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
                      <div className={`markdown-content ${isPlanContent(msg.content) ? 'plan-content' : ''}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {userMessageCount >= 4 && !planGenerated && !chatLoading && (
                <div style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => {
                      setChatInput('Generate my plan');
                      setTimeout(() => {
                        document.querySelector('.lifestyle-chat-input')?.focus();
                      }, 100);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none', borderRadius: 20,
                      padding: 'clamp(7px, 2vw, 8px) clamp(12px, 3vw, 18px)', color: '#fff',
                      cursor: 'pointer', fontSize: 'clamp(0.72rem, 2.5vw, 0.8rem)',
                      fontWeight: 600, display: 'flex',
                      alignItems: 'center', gap: 6,
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                    }}
                  >
                    ✨ Generate my plan
                  </button>
                </div>
              )}
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
                  className="form-input lifestyle-chat-input"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="..."
                  disabled={chatLoading}
                  style={{ flex: 1, padding: '10px 14px', fontSize: '16px' }}
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
        .plan-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.82rem; border-radius: 10px; overflow: hidden; border: 1px solid #2A2D3A; }
        .plan-content table th { background: #2563EB; color: #fff; padding: 10px 14px; text-align: left; font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .plan-content table td { padding: 10px 14px; border-bottom: 1px solid #2A2D3A; color: #E5E7EB; vertical-align: top; }
        .plan-content table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .plan-content table tr:hover td { background: rgba(37,99,235,0.07); }
        .plan-content h2 { color: #60A5FA; font-size: 1rem; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #2A2D3A; }
        .plan-content h3 { color: #34D399; font-size: 0.9rem; margin: 16px 0 8px; }
        .plan-content h4 { color: #FBBF24; font-size: 0.85rem; margin: 12px 0 6px; }
        .plan-content ul { padding-left: 18px; color: #D1D5DB; }
        .plan-content li { margin: 4px 0; line-height: 1.6; }
        .plan-content strong { color: #F8F9FA; }
        .plan-content p { color: #D1D5DB; line-height: 1.7; margin: 8px 0; }
        @media (max-width: 768px) {
          .plan-section {
            min-height: auto !important;
            height: auto;
          }
          .p-header {
            flex-wrap: wrap;
            gap: 12px;
          }
          .p-header button {
            width: 100%;
            justify-content: center;
          }
          .p-icon {
            width: 48px; height: 48px;
            border-radius: 14px;
          }
          .p-icon svg {
            width: 22px; height: 22px;
          }
          .p-title h2 {
            font-size: 1.15rem;
          }
          .p-title p {
            font-size: 0.8rem;
          }
          .plan-body {
            padding: 20px !important;
          }
          .plan-info {
            padding: 20px !important;
            gap: 16px !important;
          }
          .plan-info h3 {
            font-size: 1.25em !important;
          }
          .plan-content table {
            font-size: 0.75rem !important;
          }
          .plan-content table th,
          .plan-content table td {
            padding: 7px 10px !important;
          }
        }
        @media (max-width: 480px) {
          .plan-content table {
            font-size: 0.7rem !important;
            display: block;
            overflow-x: auto;
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
};

export default Lifestyle;
